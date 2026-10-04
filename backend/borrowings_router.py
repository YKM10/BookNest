import math
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Book, Borrowing, BorrowingStatus, User, UserRole
from schemas import BorrowingResponse, ReturnResponse

router = APIRouter(prefix="/api/borrowings", tags=["Borrowings"])

# Configurable library borrowing settings
MAX_ACTIVE_BORROWINGS = int(os.getenv("MAX_ACTIVE_BORROWINGS", "5"))
BORROW_DURATION_DAYS = int(os.getenv("BORROW_DURATION_DAYS", "14"))
DAILY_FINE_RATE = Decimal(os.getenv("DAILY_FINE_RATE", "1.00"))


def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure datetime is timezone-aware UTC for safe comparisons across all SQL engines."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _calculate_overdue(due_date: datetime, compare_time: datetime):
    """Calculate days overdue and fine amount."""
    due = _ensure_utc(due_date)
    compare = _ensure_utc(compare_time)

    if compare <= due:
        return 0, Decimal("0.00")

    delta = compare - due
    days_overdue = max(1, delta.days)
    fine_amount = Decimal(days_overdue) * DAILY_FINE_RATE
    return days_overdue, fine_amount


@router.post(
    "/borrow/{book_id}",
    response_model=BorrowingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Borrow a book (Authenticated user)",
)
def borrow_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Borrow a book by ID.
    - User must be authenticated.
    - Book must exist (404 if not found).
    - available_copies must be > 0 (409 if unavailable).
    - User cannot have duplicate active borrowing of the same book (409).
    - User cannot exceed maximum active borrowing limit (409).
    - Decreases available_copies by 1.
    - Automatically sets due date.
    """
    # 1. Check book existence
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found",
        )

    # 2. Check available copies
    if book.available_copies <= 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Book '{book.title}' has no copies currently available for borrowing",
        )

    # 3. Check for existing active borrowing of the same book
    existing_active = (
        db.query(Borrowing)
        .filter(
            Borrowing.user_id == current_user.id,
            Borrowing.book_id == book_id,
            Borrowing.returned_at.is_(None),
        )
        .first()
    )
    if existing_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"You already have an active borrowing for '{book.title}'",
        )

    # 4. Check active borrowing limit
    active_count = (
        db.query(Borrowing)
        .filter(
            Borrowing.user_id == current_user.id,
            Borrowing.returned_at.is_(None),
        )
        .count()
    )
    if active_count >= MAX_ACTIVE_BORROWINGS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Maximum active borrowing limit of {MAX_ACTIVE_BORROWINGS} reached",
        )

    # 5. Decrement available copies & create borrowing
    book.available_copies -= 1

    now = datetime.now(timezone.utc)
    due_date = now + timedelta(days=BORROW_DURATION_DAYS)

    borrowing = Borrowing(
        user_id=current_user.id,
        book_id=book.id,
        borrowed_at=now,
        due_date=due_date,
        returned_at=None,
        status=BorrowingStatus.BORROWED,
        fine_amount=Decimal("0.00"),
    )

    db.add(borrowing)
    db.commit()
    db.refresh(borrowing)

    return borrowing


@router.post(
    "/return/{borrowing_id}",
    response_model=ReturnResponse,
    status_code=status.HTTP_200_OK,
    summary="Return a borrowed book",
)
def return_book(
    borrowing_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return a borrowed book by borrowing ID.
    - Borrowing must exist (404 if not found).
    - Cannot return twice (409 if already returned).
    - Only borrower or librarian/admin can return (403 if unauthorized).
    - Increases available_copies by 1.
    - Backend calculates overdue fine automatically (client cannot manipulate fine).
    """
    borrowing = db.query(Borrowing).filter(Borrowing.id == borrowing_id).first()
    if not borrowing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Borrowing with id {borrowing_id} not found",
        )

    # Check permission: must be borrower or staff
    is_staff = current_user.role in [UserRole.LIBRARIAN, UserRole.ADMIN]
    if borrowing.user_id != current_user.id and not is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to return this borrowing",
        )

    # Check duplicate return
    if borrowing.returned_at is not None or borrowing.status == BorrowingStatus.RETURNED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This borrowing has already been returned",
        )

    now = datetime.now(timezone.utc)
    borrowing.returned_at = now

    # Calculate fine backend-side
    days_overdue, fine_amount = _calculate_overdue(borrowing.due_date, now)
    borrowing.fine_amount = fine_amount
    borrowing.status = BorrowingStatus.RETURNED

    # Increment available copies
    book = db.query(Book).filter(Book.id == borrowing.book_id).first()
    if book:
        book.available_copies = min(book.total_copies, book.available_copies + 1)

    db.commit()
    db.refresh(borrowing)

    return ReturnResponse(
        message="Book returned successfully",
        borrowing_id=borrowing.id,
        returned_at=borrowing.returned_at,
        status=borrowing.status.value if hasattr(borrowing.status, "value") else str(borrowing.status),
        fine_amount=borrowing.fine_amount,
        days_overdue=days_overdue,
        book_id=borrowing.book_id,
        available_copies=book.available_copies if book else 0,
    )


@router.get(
    "/my",
    response_model=List[BorrowingResponse],
    status_code=status.HTTP_200_OK,
    summary="Get current user's active borrowings",
)
def get_my_borrowings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve active borrowings for the authenticated user.
    """
    borrowings = (
        db.query(Borrowing)
        .filter(
            Borrowing.user_id == current_user.id,
            Borrowing.returned_at.is_(None),
        )
        .order_by(Borrowing.borrowed_at.desc())
        .all()
    )

    now = datetime.now(timezone.utc)
    for b in borrowings:
        due = _ensure_utc(b.due_date)
        if now > due:
            b.status = BorrowingStatus.OVERDUE
            _, accrued_fine = _calculate_overdue(b.due_date, now)
            b.fine_amount = accrued_fine

    return borrowings


@router.get(
    "/history",
    response_model=List[BorrowingResponse],
    status_code=status.HTTP_200_OK,
    summary="Get borrowing history",
)
def get_borrowing_history(
    user_id: Optional[int] = Query(None, description="Filter history by user ID (Librarian/Admin only)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve borrowing history.
    - Students can only view their own history.
    - Librarians and Admins can view all history or filter by user_id.
    """
    is_staff = current_user.role in [UserRole.LIBRARIAN, UserRole.ADMIN]

    query = db.query(Borrowing)

    if not is_staff:
        # Students restricted to their own borrowings
        query = query.filter(Borrowing.user_id == current_user.id)
    else:
        if user_id is not None:
            query = query.filter(Borrowing.user_id == user_id)

    history = query.order_by(Borrowing.borrowed_at.desc()).all()
    return history


@router.get(
    "/overdue",
    response_model=List[BorrowingResponse],
    status_code=status.HTTP_200_OK,
    summary="Get overdue borrowings",
)
def get_overdue_borrowings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve all currently overdue borrowings.
    - Students see their own overdue borrowings.
    - Librarians and Admins see all overdue borrowings across the library.
    """
    now = datetime.now(timezone.utc)
    is_staff = current_user.role in [UserRole.LIBRARIAN, UserRole.ADMIN]

    query = db.query(Borrowing).filter(
        Borrowing.returned_at.is_(None),
    )

    if not is_staff:
        query = query.filter(Borrowing.user_id == current_user.id)

    all_active = query.order_by(Borrowing.due_date.asc()).all()

    overdue_list = []
    for b in all_active:
        due = _ensure_utc(b.due_date)
        if now > due:
            b.status = BorrowingStatus.OVERDUE
            _, accrued_fine = _calculate_overdue(b.due_date, now)
            b.fine_amount = accrued_fine
            overdue_list.append(b)

    return overdue_list
