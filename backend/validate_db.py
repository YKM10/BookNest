import sys
import unittest
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from sqlalchemy import create_engine, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from database import Base
from models import User, Book, Borrowing, Favorite, AuditLog, UserRole, BorrowingStatus


class TestBookNestDatabase(unittest.TestCase):
    def setUp(self):
        # Create a fresh in-memory SQLite database for each test
        self.engine = create_engine("sqlite:///:memory:")
        with self.engine.connect() as conn:
            conn.execute(text("PRAGMA foreign_keys=ON"))

        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.session = self.Session()

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_user_creation_and_roles(self):
        user1 = User(
            name="Alice Student",
            email="alice@example.com",
            password_hash="hashed_pw_1",
            role=UserRole.STUDENT,
        )
        user2 = User(
            name="Bob Librarian",
            email="bob@example.com",
            password_hash="hashed_pw_2",
            role=UserRole.LIBRARIAN,
        )
        user3 = User(
            name="Charlie Admin",
            email="charlie@example.com",
            password_hash="hashed_pw_3",
            role=UserRole.ADMIN,
        )
        self.session.add_all([user1, user2, user3])
        self.session.commit()

        users = self.session.scalars(select(User)).all()
        self.assertEqual(len(users), 3)
        self.assertEqual(user1.role, UserRole.STUDENT)
        self.assertEqual(user2.role, UserRole.LIBRARIAN)
        self.assertEqual(user3.role, UserRole.ADMIN)
        self.assertTrue(user1.is_active)
        self.assertIsNotNone(user1.created_at)

    def test_unique_email_constraint(self):
        u1 = User(
            name="Duplicate 1",
            email="unique@example.com",
            password_hash="pw1",
        )
        self.session.add(u1)
        self.session.commit()

        u2 = User(
            name="Duplicate 2",
            email="unique@example.com",
            password_hash="pw2",
        )
        self.session.add(u2)
        with self.assertRaises(IntegrityError):
            self.session.commit()
        self.session.rollback()

    def test_book_creation_and_constraints(self):
        book = Book(
            title="Clean Code",
            author="Robert C. Martin",
            isbn="978-0132350884",
            description="A Handbook of Agile Software Craftsmanship",
            category="Programming",
            publisher="Prentice Hall",
            publication_year=2008,
            cover_url="https://example.com/clean_code.jpg",
            total_copies=5,
            available_copies=5,
        )
        self.session.add(book)
        self.session.commit()

        fetched = self.session.scalar(select(Book).where(Book.isbn == "978-0132350884"))
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.title, "Clean Code")
        self.assertEqual(fetched.available_copies, 5)

    def test_unique_isbn_constraint(self):
        b1 = Book(
            title="Book 1",
            author="Author 1",
            isbn="111-222-333",
            total_copies=2,
            available_copies=2,
        )
        self.session.add(b1)
        self.session.commit()

        b2 = Book(
            title="Book 2",
            author="Author 2",
            isbn="111-222-333",
            total_copies=1,
            available_copies=1,
        )
        self.session.add(b2)
        with self.assertRaises(IntegrityError):
            self.session.commit()
        self.session.rollback()

    def test_book_copies_check_constraints(self):
        # available_copies > total_copies must fail
        invalid_book_1 = Book(
            title="Invalid Copies 1",
            author="Author",
            isbn="ISBN-INV-1",
            total_copies=2,
            available_copies=5,
        )
        self.session.add(invalid_book_1)
        with self.assertRaises(IntegrityError):
            self.session.commit()
        self.session.rollback()

        # total_copies < 0 must fail
        invalid_book_2 = Book(
            title="Invalid Copies 2",
            author="Author",
            isbn="ISBN-INV-2",
            total_copies=-1,
            available_copies=0,
        )
        self.session.add(invalid_book_2)
        with self.assertRaises(IntegrityError):
            self.session.commit()
        self.session.rollback()

        # available_copies < 0 must fail
        invalid_book_3 = Book(
            title="Invalid Copies 3",
            author="Author",
            isbn="ISBN-INV-3",
            total_copies=5,
            available_copies=-1,
        )
        self.session.add(invalid_book_3)
        with self.assertRaises(IntegrityError):
            self.session.commit()
        self.session.rollback()

    def test_borrowing_lifecycle_and_constraints(self):
        user = User(
            name="Borrower User",
            email="borrower@example.com",
            password_hash="pw",
        )
        book = Book(
            title="Design Patterns",
            author="Gang of Four",
            isbn="978-0201633610",
            total_copies=3,
            available_copies=3,
        )
        self.session.add_all([user, book])
        self.session.commit()

        now = datetime.now(timezone.utc)
        borrowing = Borrowing(
            user_id=user.id,
            book_id=book.id,
            borrowed_at=now,
            due_date=now + timedelta(days=14),
            status=BorrowingStatus.BORROWED,
            fine_amount=Decimal("0.00"),
        )
        self.session.add(borrowing)
        self.session.commit()

        self.assertEqual(len(user.borrowings), 1)
        self.assertEqual(user.borrowings[0].book.title, "Design Patterns")
        self.assertEqual(borrowing.status, BorrowingStatus.BORROWED)

        # Negative fine amount must fail
        invalid_borrowing = Borrowing(
            user_id=user.id,
            book_id=book.id,
            borrowed_at=now,
            due_date=now + timedelta(days=14),
            status=BorrowingStatus.BORROWED,
            fine_amount=Decimal("-5.00"),
        )
        self.session.add(invalid_borrowing)
        with self.assertRaises(IntegrityError):
            self.session.commit()
        self.session.rollback()

    def test_favorite_unique_constraint(self):
        user = User(
            name="Fav User",
            email="fav@example.com",
            password_hash="pw",
        )
        book = Book(
            title="Refactoring",
            author="Martin Fowler",
            isbn="978-0201485677",
            total_copies=2,
            available_copies=2,
        )
        self.session.add_all([user, book])
        self.session.commit()

        fav1 = Favorite(user_id=user.id, book_id=book.id)
        self.session.add(fav1)
        self.session.commit()

        # Duplicate favorite must fail unique constraint
        fav2 = Favorite(user_id=user.id, book_id=book.id)
        self.session.add(fav2)
        with self.assertRaises(IntegrityError):
            self.session.commit()
        self.session.rollback()

    def test_audit_log(self):
        user = User(
            name="Admin User",
            email="admin_audit@example.com",
            password_hash="pw",
            role=UserRole.ADMIN,
        )
        self.session.add(user)
        self.session.commit()

        log = AuditLog(
            user_id=user.id,
            action="CREATE_BOOK",
            entity_type="Book",
            entity_id="1",
            description="Added new book Clean Code",
        )
        self.session.add(log)
        self.session.commit()

        self.assertEqual(len(user.audit_logs), 1)
        self.assertEqual(user.audit_logs[0].action, "CREATE_BOOK")
        self.assertEqual(user.audit_logs[0].user.email, "admin_audit@example.com")


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestBookNestDatabase)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(not result.wasSuccessful())
