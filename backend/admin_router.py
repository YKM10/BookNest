from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import require_admin
from database import get_db
from models import AuditLog, Book, Borrowing, BorrowingStatus, User, UserRole
from schemas import (
    AuditLogResponse,
    SystemStatsResponse,
    UserResponse,
    UserUpdateAdmin,
)

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get(
    "/stats",
    response_model=SystemStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get library system statistics (Admin only)",
)
def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Return comprehensive library metrics:
    - User counts across roles
    - Book inventory numbers
    - Circulation and loan activity
    - Overdue loans and fines
    """
    total_users = db.query(User).count()
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()
    total_librarians = db.query(User).filter(User.role == UserRole.LIBRARIAN).count()
    total_admins = db.query(User).filter(User.role == UserRole.ADMIN).count()

    total_books = db.query(Book).count()
    total_inventory = db.query(func.coalesce(func.sum(Book.total_copies), 0)).scalar() or 0
    total_available = db.query(func.coalesce(func.sum(Book.available_copies), 0)).scalar() or 0

    total_borrowings = db.query(Borrowing).count()
    active_borrowings = (
        db.query(Borrowing)
        .filter(Borrowing.returned_at.is_(None))
        .count()
    )
    returned_borrowings = (
        db.query(Borrowing)
        .filter(Borrowing.returned_at.is_not(None))
        .count()
    )

    now = datetime.now(timezone.utc)
    all_active = db.query(Borrowing).filter(Borrowing.returned_at.is_(None)).all()
    overdue_count = 0
    for b in all_active:
        due = b.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        if now > due:
            overdue_count += 1

    total_fines = db.query(func.coalesce(func.sum(Borrowing.fine_amount), 0.00)).scalar() or Decimal("0.00")

    return SystemStatsResponse(
        total_users=total_users,
        total_students=total_students,
        total_librarians=total_librarians,
        total_admins=total_admins,
        total_books=total_books,
        total_inventory_copies=int(total_inventory),
        total_available_copies=int(total_available),
        total_borrowings=total_borrowings,
        active_borrowings=active_borrowings,
        returned_borrowings=returned_borrowings,
        overdue_borrowings=overdue_count,
        total_fines_accrued=float(total_fines),
    )


@router.get(
    "/users",
    response_model=List[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="List all users with filtering (Admin only)",
)
def get_users(
    role: Optional[str] = Query(None, description="Filter by role: STUDENT, LIBRARIAN, ADMIN"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    is_active: Optional[bool] = Query(None, description="Filter active/inactive"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    List library users with role and search filters.
    Requires ADMIN privilege.
    """
    query = db.query(User)

    if role:
        clean_role = role.strip().upper()
        if clean_role in UserRole.__members__:
            query = query.filter(User.role == UserRole[clean_role])

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if search:
        pattern = f"%{search.strip().lower()}%"
        query = query.filter(
            (func.lower(User.name).like(pattern)) | (func.lower(User.email).like(pattern))
        )

    return query.order_by(User.id.asc()).all()


@router.get(
    "/users/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user details by ID (Admin only)",
)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Retrieve single user by ID.
    Requires ADMIN privilege.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )
    return user


@router.put(
    "/users/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Manage user role and status (Admin only)",
)
def update_user(
    user_id: int,
    request: UserUpdateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Update user name, role, or active status.
    Requires ADMIN privilege.
    Cannot deactivate the last active Admin.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    # Prevent demoting or deactivating own admin account if it's the only one
    if user.id == current_user.id:
        if request.role and request.role.upper() != "ADMIN":
            admin_count = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active == True).count()
            if admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot change role: You are the sole active Administrator",
                )
        if request.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Administrators cannot deactivate their own active account",
            )

    action_details = []

    if request.name is not None and request.name.strip():
        user.name = request.name.strip()
        action_details.append(f"name='{user.name}'")

    if request.role is not None:
        clean_role = request.role.strip().upper()
        if clean_role not in UserRole.__members__:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role '{request.role}'. Valid roles: STUDENT, LIBRARIAN, ADMIN",
            )
        old_role = user.role.value if hasattr(user.role, "value") else str(user.role)
        user.role = UserRole[clean_role]
        action_details.append(f"role: {old_role} -> {clean_role}")

    if request.is_active is not None:
        user.is_active = request.is_active
        action_details.append(f"active={request.is_active}")

    # Log to AuditLog
    desc = f"Admin #{current_user.id} updated User #{user.id}: {', '.join(action_details)}"
    audit = AuditLog(
        user_id=current_user.id,
        action="UPDATE_USER",
        entity_type="USER",
        entity_id=str(user.id),
        description=desc,
    )
    db.add(audit)

    db.commit()
    db.refresh(user)
    return user


@router.get(
    "/audit-logs",
    response_model=List[AuditLogResponse],
    status_code=status.HTTP_200_OK,
    summary="View system audit logs (Admin only)",
)
def get_audit_logs(
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Retrieve chronological audit logs of administrative actions.
    Requires ADMIN privilege.
    """
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return logs
