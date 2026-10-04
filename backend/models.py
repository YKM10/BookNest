import enum
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from database import Base


class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    LIBRARIAN = "LIBRARIAN"
    ADMIN = "ADMIN"


class BorrowingStatus(str, enum.Enum):
    BORROWED = "BORROWED"
    RETURNED = "RETURNED"
    OVERDUE = "OVERDUE"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        Enum(UserRole, name="user_role", native_enum=False),
        nullable=False,
        default=UserRole.STUDENT,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    borrowings = relationship(
        "Borrowing",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    favorites = relationship(
        "Favorite",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    audit_logs = relationship(
        "AuditLog",
        back_populates="user",
    )


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    author = Column(String(255), nullable=False, index=True)
    isbn = Column(String(20), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True, index=True)
    publisher = Column(String(255), nullable=True)
    publication_year = Column(Integer, nullable=True)
    cover_url = Column(String(500), nullable=True)
    total_copies = Column(Integer, default=1, nullable=False)
    available_copies = Column(Integer, default=1, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "total_copies >= 0",
            name="check_total_copies_non_negative",
        ),
        CheckConstraint(
            "available_copies >= 0",
            name="check_available_copies_non_negative",
        ),
        CheckConstraint(
            "available_copies <= total_copies",
            name="check_available_copies_lte_total",
        ),
    )

    # Relationships
    borrowings = relationship(
        "Borrowing",
        back_populates="book",
    )
    favorites = relationship(
        "Favorite",
        back_populates="book",
        cascade="all, delete-orphan",
    )


class Borrowing(Base):
    __tablename__ = "borrowings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    book_id = Column(
        Integer,
        ForeignKey("books.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    borrowed_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    due_date = Column(DateTime(timezone=True), nullable=False)
    returned_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(
        Enum(BorrowingStatus, name="borrowing_status", native_enum=False),
        nullable=False,
        default=BorrowingStatus.BORROWED,
    )
    fine_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "fine_amount >= 0",
            name="check_fine_amount_non_negative",
        ),
    )

    # Relationships
    user = relationship(
        "User",
        back_populates="borrowings",
    )
    book = relationship(
        "Book",
        back_populates="borrowings",
    )


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    book_id = Column(
        Integer,
        ForeignKey("books.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "book_id", name="uq_user_book_favorite"),
    )

    # Relationships
    user = relationship(
        "User",
        back_populates="favorites",
    )
    book = relationship(
        "Book",
        back_populates="favorites",
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    user = relationship(
        "User",
        back_populates="audit_logs",
    )
