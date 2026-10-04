from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


# --- User Schemas ---

class UserRegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=255, description="Full name of user")
    email: EmailStr = Field(..., description="Unique email address")
    password: str = Field(..., min_length=6, max_length=128, description="Account password")


class UserLoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr = Field(..., description="Account email")
    password: str = Field(..., min_length=1, max_length=128, description="Account password")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserUpdateAdmin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    role: Optional[str] = Field(None, description="STUDENT, LIBRARIAN, or ADMIN")
    is_active: Optional[bool] = None


# --- Book Schemas ---

class BookCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=255, description="Book title")
    author: str = Field(..., min_length=1, max_length=255, description="Author name")
    isbn: str = Field(..., min_length=1, max_length=20, description="Unique ISBN")
    description: Optional[str] = Field(None, description="Detailed book description")
    category: Optional[str] = Field(None, max_length=100, description="Category / Genre")
    publisher: Optional[str] = Field(None, max_length=255, description="Publisher name")
    publication_year: Optional[int] = Field(None, description="Year of publication")
    cover_url: Optional[str] = Field(None, max_length=500, description="Book cover image URL")
    total_copies: int = Field(default=1, ge=0, description="Total inventory count (>= 0)")
    available_copies: Optional[int] = Field(default=None, ge=0, description="Available copies (>= 0 and <= total_copies)")

    @model_validator(mode="after")
    def validate_copies(self):
        if self.available_copies is None:
            self.available_copies = self.total_copies
        if self.available_copies < 0:
            raise ValueError("available_copies cannot be negative")
        if self.available_copies > self.total_copies:
            raise ValueError("available_copies cannot exceed total_copies")
        return self


class BookUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    author: Optional[str] = Field(None, min_length=1, max_length=255)
    isbn: Optional[str] = Field(None, min_length=1, max_length=20)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    publisher: Optional[str] = Field(None, max_length=255)
    publication_year: Optional[int] = None
    cover_url: Optional[str] = Field(None, max_length=500)
    total_copies: Optional[int] = Field(None, ge=0)
    available_copies: Optional[int] = Field(None, ge=0)

    @model_validator(mode="after")
    def validate_copies_if_both_provided(self):
        if self.total_copies is not None and self.available_copies is not None:
            if self.available_copies > self.total_copies:
                raise ValueError("available_copies cannot exceed total_copies")
        return self


class BookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    author: str
    isbn: str
    description: Optional[str]
    category: Optional[str]
    publisher: Optional[str]
    publication_year: Optional[int]
    cover_url: Optional[str]
    total_copies: int
    available_copies: int
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    message: str
    id: Optional[int] = None


# --- Borrowing Schemas ---

class BorrowingBookSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    author: str
    isbn: str
    cover_url: Optional[str] = None


class BorrowingUserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class BorrowingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    book_id: int
    borrowed_at: datetime
    due_date: datetime
    returned_at: Optional[datetime] = None
    status: str
    fine_amount: Decimal
    created_at: datetime
    book: Optional[BorrowingBookSummary] = None
    user: Optional[BorrowingUserSummary] = None


class ReturnResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    message: str
    borrowing_id: int
    returned_at: datetime
    status: str
    fine_amount: Decimal
    days_overdue: int
    book_id: int
    available_copies: int


# --- Admin & Audit Schemas ---

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime


class SystemStatsResponse(BaseModel):
    total_users: int
    total_students: int
    total_librarians: int
    total_admins: int
    total_books: int
    total_inventory_copies: int
    total_available_copies: int
    total_borrowings: int
    active_borrowings: int
    returned_borrowings: int
    overdue_borrowings: int
    total_fines_accrued: float


# --- AI Librarian Schemas ---

class AIChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    content: str = Field(..., min_length=1)


class AIChatRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=2000, description="User prompt or question")
    history: Optional[list[AIChatMessage]] = Field(default=[], description="Recent conversation turns")
    book_id: Optional[int] = Field(default=None, description="Optional book context ID")


class AIChatResponse(BaseModel):
    reply: str
    suggestions: list[str] = Field(default_factory=list)
    books: list[BookResponse] = Field(default_factory=list)
    source: str = "gemini"


class AIRecommendRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    preference: Optional[str] = Field(default=None, max_length=500, description="Reading preferences or topics")
    category: Optional[str] = Field(default=None, max_length=100, description="Genre or topic category")
    limit: Optional[int] = Field(default=5, ge=1, le=20)


class AIRecommendResponse(BaseModel):
    recommendations: list[BookResponse]
    explanation: str
    source: str = "gemini"


class AISearchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    query: str = Field(..., min_length=1, max_length=500, description="Natural language search query")
    available_only: Optional[bool] = Field(default=False, description="Filter for currently available titles")


class AISearchResponse(BaseModel):
    results: list[BookResponse]
    explanation: str
    total: int
    source: str = "gemini"

