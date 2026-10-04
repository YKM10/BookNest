from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from auth import require_librarian, require_student
from database import get_db
from models import Book, User
from schemas import BookCreate, BookResponse, BookUpdate, MessageResponse

router = APIRouter(prefix="/api/books", tags=["Books"])


@router.post(
    "",
    response_model=BookResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new book (Librarian/Admin only)",
)
def create_book(
    book_in: BookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian),
):
    """
    Add a new book to the library catalog.
    - Requires LIBRARIAN or ADMIN role.
    - Enforces unique ISBN (returns 409 Conflict if duplicate).
    - Enforces available_copies <= total_copies and non-negative counts.
    """
    clean_isbn = book_in.isbn.strip()
    existing_book = db.query(Book).filter(Book.isbn == clean_isbn).first()
    if existing_book:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A book with ISBN '{clean_isbn}' already exists",
        )

    book = Book(
        title=book_in.title.strip(),
        author=book_in.author.strip(),
        isbn=clean_isbn,
        description=book_in.description.strip() if book_in.description else None,
        category=book_in.category.strip() if book_in.category else None,
        publisher=book_in.publisher.strip() if book_in.publisher else None,
        publication_year=book_in.publication_year,
        cover_url=book_in.cover_url.strip() if book_in.cover_url else None,
        total_copies=book_in.total_copies,
        available_copies=book_in.available_copies if book_in.available_copies is not None else book_in.total_copies,
    )

    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@router.get(
    "",
    response_model=List[BookResponse],
    status_code=status.HTTP_200_OK,
    summary="List, search, and filter books (Student/Librarian/Admin)",
)
def get_books(
    search: Optional[str] = Query(None, description="Search term across title, author, description, and ISBN"),
    author: Optional[str] = Query(None, description="Filter by author name"),
    category: Optional[str] = Query(None, description="Filter by category / genre"),
    available: Optional[bool] = Query(None, description="Filter by availability (true = copies > 0, false = copies == 0)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """
    Retrieve books with optional search and filtering.
    - Accessible by STUDENT, LIBRARIAN, and ADMIN roles.
    - Query parameters supported:
      - `search`: case-insensitive partial match on title, author, description, or ISBN
      - `author`: case-insensitive partial match on author
      - `category`: case-insensitive partial match on category
      - `available`: boolean flag for availability
    """
    query = db.query(Book)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Book.title.ilike(search_term),
                Book.author.ilike(search_term),
                Book.description.ilike(search_term),
                Book.isbn.ilike(search_term),
            )
        )

    if author:
        query = query.filter(Book.author.ilike(f"%{author.strip()}%"))

    if category:
        query = query.filter(Book.category.ilike(f"%{category.strip()}%"))

    if available is not None:
        if available:
            query = query.filter(Book.available_copies > 0)
        else:
            query = query.filter(Book.available_copies == 0)

    books = query.order_by(Book.id.asc()).all()
    return books


@router.get(
    "/{book_id}",
    response_model=BookResponse,
    status_code=status.HTTP_200_OK,
    summary="Get book by ID (Student/Librarian/Admin)",
)
def get_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """
    Retrieve a specific book by its ID.
    - Returns 404 Not Found if the book does not exist.
    """
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found",
        )
    return book


@router.put(
    "/{book_id}",
    response_model=BookResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a book by ID (Librarian/Admin only)",
)
def update_book(
    book_id: int,
    book_update: BookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian),
):
    """
    Update an existing book's details.
    - Requires LIBRARIAN or ADMIN role.
    - Returns 404 Not Found if book does not exist.
    - Returns 409 Conflict if new ISBN is already used by another book.
    - Returns 400 Bad Request if available_copies > total_copies or negative values.
    """
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found",
        )

    # Validate ISBN uniqueness if ISBN is being updated
    if book_update.isbn is not None:
        clean_isbn = book_update.isbn.strip()
        if clean_isbn != book.isbn:
            conflict = db.query(Book).filter(Book.isbn == clean_isbn, Book.id != book_id).first()
            if conflict:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Another book with ISBN '{clean_isbn}' already exists",
                )
            book.isbn = clean_isbn

    # Validate copies logic
    new_total = book_update.total_copies if book_update.total_copies is not None else book.total_copies
    new_available = book_update.available_copies if book_update.available_copies is not None else book.available_copies

    if new_available > new_total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="available_copies cannot exceed total_copies",
        )
    if new_available < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="available_copies cannot be negative",
        )
    if new_total < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="total_copies cannot be negative",
        )

    # Apply updates
    if book_update.title is not None:
        book.title = book_update.title.strip()
    if book_update.author is not None:
        book.author = book_update.author.strip()
    if book_update.description is not None:
        book.description = book_update.description.strip() if book_update.description else None
    if book_update.category is not None:
        book.category = book_update.category.strip() if book_update.category else None
    if book_update.publisher is not None:
        book.publisher = book_update.publisher.strip() if book_update.publisher else None
    if book_update.publication_year is not None:
        book.publication_year = book_update.publication_year
    if book_update.cover_url is not None:
        book.cover_url = book_update.cover_url.strip() if book_update.cover_url else None
    if book_update.total_copies is not None:
        book.total_copies = book_update.total_copies
    if book_update.available_copies is not None:
        book.available_copies = book_update.available_copies

    db.commit()
    db.refresh(book)
    return book


@router.delete(
    "/{book_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a book by ID (Librarian/Admin only)",
)
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian),
):
    """
    Delete a book from the library catalog.
    - Requires LIBRARIAN or ADMIN role.
    - Returns 404 Not Found if the book does not exist.
    """
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found",
        )

    db.delete(book)
    db.commit()
    return MessageResponse(message="Book deleted successfully", id=book_id)
