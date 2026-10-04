import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from auth import hash_password
from models import Book, User, UserRole, AuditLog

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///booknest.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
Session = sessionmaker(bind=engine)
db = Session()

# 1. Seed Users if not present
if not db.query(User).filter(User.email == "student@example.com").first():
    student = User(
        name="Alex Student",
        email="student@example.com",
        password_hash=hash_password("student123"),
        role=UserRole.STUDENT,
        is_active=True,
    )
    db.add(student)

if not db.query(User).filter(User.email == "librarian@example.com").first():
    librarian = User(
        name="Elena Librarian",
        email="librarian@example.com",
        password_hash=hash_password("librarian123"),
        role=UserRole.LIBRARIAN,
        is_active=True,
    )
    db.add(librarian)

if not db.query(User).filter(User.email == "admin@example.com").first():
    admin = User(
        name="Sarah Admin",
        email="admin@example.com",
        password_hash=hash_password("admin123"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(admin)

# 2. Seed Books if empty
sample_books = [
    {
        "title": "Clean Code: A Handbook of Agile Software Craftsmanship",
        "author": "Robert C. Martin",
        "isbn": "978-0132350884",
        "category": "Software Engineering",
        "publisher": "Prentice Hall",
        "publication_year": 2008,
        "total_copies": 4,
        "available_copies": 4,
        "description": "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees. Every year, countless hours and significant resources are lost because of poorly written code.",
    },
    {
        "title": "Fluent Python: Clear, Concise, and Effective Programming",
        "author": "Luciano Ramalho",
        "isbn": "978-1491946008",
        "category": "Programming Languages",
        "publisher": "O'Reilly Media",
        "publication_year": 2022,
        "total_copies": 5,
        "available_copies": 5,
        "description": "Don't waste time trying to bend Python to fit patterns you learned in other languages. Python's simplicity lets you quickly write clean, readable code, and this book teaches you how to write effective, idiomatic Python 3 code.",
    },
    {
        "title": "Designing Data-Intensive Applications",
        "author": "Martin Kleppmann",
        "isbn": "978-1449373320",
        "category": "Databases & Systems",
        "publisher": "O'Reilly Media",
        "publication_year": 2017,
        "total_copies": 3,
        "available_copies": 3,
        "description": "Data is at the center of many challenges in system design today. Difficult issues need to be figured out, such as scalability, consistency, reliability, efficiency, and maintainability.",
    },
    {
        "title": "Refactoring: Improving the Design of Existing Code",
        "author": "Martin Fowler",
        "isbn": "978-0201485677",
        "category": "Software Engineering",
        "publisher": "Addison-Wesley",
        "publication_year": 2018,
        "total_copies": 2,
        "available_copies": 2,
        "description": "Refactoring is about improving the design of existing code. It is the process of changing a software system in such a way that it does not alter the external behavior of the code, yet improves its internal structure.",
    },
    {
        "title": "Introduction to Algorithms (CLRS)",
        "author": "Thomas H. Cormen",
        "isbn": "978-0262033848",
        "category": "Computer Science",
        "publisher": "MIT Press",
        "publication_year": 2009,
        "total_copies": 6,
        "available_copies": 6,
        "description": "A comprehensive textbook on modern algorithms covering a wide range of algorithms in depth, yet making their design and analysis accessible to all levels of readers.",
    },
]

for b_data in sample_books:
    if not db.query(Book).filter(Book.isbn == b_data["isbn"]).first():
        book = Book(**b_data)
        db.add(book)

db.commit()

# 3. Seed initial AuditLog if empty
if db.query(AuditLog).count() == 0:
    admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
    init_audit = AuditLog(
        user_id=admin_user.id if admin_user else None,
        action="SYSTEM_INIT",
        entity_type="SYSTEM",
        entity_id="1",
        description="BookNest initial library system baseline initialized.",
    )
    db.add(init_audit)
    db.commit()

db.close()
print("Seeding completed successfully.")
