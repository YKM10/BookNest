from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import create_access_token, get_current_user, hash_password, verify_password
from database import get_db
from models import User, UserRole
from schemas import TokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register_user(
    request: UserRegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Register a new user.
    - Password is encrypted using bcrypt.
    - Default role is strictly set to STUDENT.
    - Users cannot choose or set their role during registration.
    """
    existing_user = db.query(User).filter(User.email == request.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email is already registered",
        )

    hashed_pw = hash_password(request.password)

    # Security: Explicitly enforce UserRole.STUDENT
    new_user = User(
        name=request.name.strip(),
        email=request.email.lower(),
        password_hash=hashed_pw,
        role=UserRole.STUDENT,
        is_active=True,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User login with email and password",
)
def login_user(
    request: UserLoginRequest,
    db: Session = Depends(get_db),
):
    """
    Authenticate user and issue a JWT access token.
    """
    user = db.query(User).filter(User.email == request.email.lower()).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
    }
    access_token = create_access_token(data=token_data)

    return TokenResponse(access_token=access_token, token_type="bearer")


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile",
)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Return profile data of the currently authenticated user.
    """
    return current_user
