import sys
import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth import create_access_token, hash_password
from database import Base, get_db
from main import app
from models import Book, Borrowing, BorrowingStatus, User, UserRole


class TestBorrowingEndpoints(unittest.TestCase):
    def setUp(self):
        # Create an isolated in-memory SQLite database sharing the same memory space
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        with self.engine.connect() as conn:
            conn.execute(text("PRAGMA foreign_keys=ON"))

        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

        def override_get_db():
            db = self.Session()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

        # Create test users: Student 1, Student 2, Librarian
        db = self.Session()
        self.student1 = User(
            name="Alice Student",
            email="alice@example.com",
            password_hash=hash_password("pw"),
            role=UserRole.STUDENT,
        )
        self.student2 = User(
            name="Bob Student",
            email="bob@example.com",
            password_hash=hash_password("pw"),
            role=UserRole.STUDENT,
        )
        self.librarian = User(
            name="Carol Librarian",
            email="carol@example.com",
            password_hash=hash_password("pw"),
            role=UserRole.LIBRARIAN,
        )
        db.add_all([self.student1, self.student2, self.librarian])
        db.commit()

        self.student1_id = self.student1.id
        self.student2_id = self.student2.id
        self.librarian_id = self.librarian.id

        self.student1_token = create_access_token(data={"sub": str(self.student1_id)})
        self.student2_token = create_access_token(data={"sub": str(self.student2_id)})
        self.librarian_token = create_access_token(data={"sub": str(self.librarian_id)})

        self.s1_headers = {"Authorization": f"Bearer {self.student1_token}"}
        self.s2_headers = {"Authorization": f"Bearer {self.student2_token}"}
        self.lib_headers = {"Authorization": f"Bearer {self.librarian_token}"}

        # Create test books
        self.book1 = Book(
            title="Clean Code",
            author="Robert C. Martin",
            isbn="978-0132350884",
            total_copies=2,
            available_copies=2,
        )
        self.book_single_copy = Book(
            title="Domain-Driven Design",
            author="Eric Evans",
            isbn="978-0321125217",
            total_copies=1,
            available_copies=1,
        )
        self.book_no_copies = Book(
            title="Refactoring",
            author="Martin Fowler",
            isbn="978-0201485677",
            total_copies=1,
            available_copies=0,  # 0 available
        )
        db.add_all([self.book1, self.book_single_copy, self.book_no_copies])
        db.commit()

        self.b1_id = self.book1.id
        self.b_single_id = self.book_single_copy.id
        self.b_none_id = self.book_no_copies.id
        db.close()

    def tearDown(self):
        app.dependency_overrides.clear()
        self.engine.dispose()

    # --- 1. Successful Borrowing & Decrement of Copies ---

    def test_successful_borrowing(self):
        res = self.client.post(f"/api/borrowings/borrow/{self.b1_id}", headers=self.s1_headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()

        self.assertEqual(data["book_id"], self.b1_id)
        self.assertEqual(data["user_id"], self.student1_id)
        self.assertEqual(data["status"], "BORROWED")
        self.assertIsNotNone(data["due_date"])

        # Verify available_copies decreased from 2 to 1 in DB
        db = self.Session()
        book = db.query(Book).filter(Book.id == self.b1_id).first()
        self.assertEqual(book.available_copies, 1)
        db.close()

    # --- 2. Unavailable Book (Copies <= 0) ---

    def test_borrow_unavailable_book_fails(self):
        # book_no_copies has 0 available copies
        res = self.client.post(f"/api/borrowings/borrow/{self.b_none_id}", headers=self.s1_headers)
        self.assertEqual(res.status_code, 409)
        self.assertIn("no copies currently available", res.json()["detail"].lower())

    # --- 3. Duplicate Active Borrowing of Same Book ---

    def test_duplicate_active_borrowing_fails(self):
        # First borrow succeeds
        res1 = self.client.post(f"/api/borrowings/borrow/{self.b1_id}", headers=self.s1_headers)
        self.assertEqual(res1.status_code, 201)

        # Second borrow by same user of same book must fail with 409
        res2 = self.client.post(f"/api/borrowings/borrow/{self.b1_id}", headers=self.s1_headers)
        self.assertEqual(res2.status_code, 409)
        self.assertIn("already have an active borrowing", res2.json()["detail"].lower())

    # --- 4. Maximum Active Borrowing Limit ---

    def test_max_active_borrowing_limit(self):
        db = self.Session()
        # Seed 5 books and borrow all of them
        book_ids = []
        for i in range(5):
            b = Book(
                title=f"Book {i}",
                author="Author",
                isbn=f"ISBN-LIMIT-{i}",
                total_copies=1,
                available_copies=1,
            )
            db.add(b)
            db.commit()
            book_ids.append(b.id)
        db.close()

        for b_id in book_ids:
            res = self.client.post(f"/api/borrowings/borrow/{b_id}", headers=self.s1_headers)
            self.assertEqual(res.status_code, 201)

        # 6th book borrow should fail due to MAX_ACTIVE_BORROWINGS limit of 5
        res_limit = self.client.post(f"/api/borrowings/borrow/{self.b1_id}", headers=self.s1_headers)
        self.assertEqual(res_limit.status_code, 409)
        self.assertIn("limit", res_limit.json()["detail"].lower())

    # --- 5. Non-existent Book (404) ---

    def test_borrow_nonexistent_book(self):
        res = self.client.post("/api/borrowings/borrow/99999", headers=self.s1_headers)
        self.assertEqual(res.status_code, 404)

    # --- 6. Successful Return & Increment of Copies ---

    def test_successful_return_on_time(self):
        # Borrow book
        borrow_res = self.client.post(f"/api/borrowings/borrow/{self.b_single_id}", headers=self.s1_headers)
        self.assertEqual(borrow_res.status_code, 201)
        borrowing_id = borrow_res.json()["id"]

        # Return book
        return_res = self.client.post(f"/api/borrowings/return/{borrowing_id}", headers=self.s1_headers)
        self.assertEqual(return_res.status_code, 200)
        data = return_res.json()

        self.assertEqual(data["status"], "RETURNED")
        self.assertEqual(float(data["fine_amount"]), 0.0)
        self.assertEqual(data["days_overdue"], 0)
        self.assertEqual(data["available_copies"], 1)

        # Verify in DB: available_copies restored to 1
        db = self.Session()
        book = db.query(Book).filter(Book.id == self.b_single_id).first()
        self.assertEqual(book.available_copies, 1)
        db.close()

    # --- 7. Duplicate Return of Already Returned Borrowing ---

    def test_duplicate_return_fails(self):
        # Borrow and return once
        borrow_res = self.client.post(f"/api/borrowings/borrow/{self.b_single_id}", headers=self.s1_headers)
        borrowing_id = borrow_res.json()["id"]
        self.client.post(f"/api/borrowings/return/{borrowing_id}", headers=self.s1_headers)

        # Second return must fail with 409 Conflict
        second_return_res = self.client.post(f"/api/borrowings/return/{borrowing_id}", headers=self.s1_headers)
        self.assertEqual(second_return_res.status_code, 409)
        self.assertIn("already been returned", second_return_res.json()["detail"].lower())

    # --- 8. Overdue Borrowing and Backend Fine Calculation ---

    def test_overdue_borrowing_fine_calculation(self):
        # Create an overdue borrowing directly in DB (due 3 days ago)
        db = self.Session()
        now = datetime.now(timezone.utc)
        overdue_borrowing = Borrowing(
            user_id=self.student1_id,
            book_id=self.b1_id,
            borrowed_at=now - timedelta(days=17),
            due_date=now - timedelta(days=3),  # 3 days overdue
            returned_at=None,
            status=BorrowingStatus.BORROWED,
            fine_amount=Decimal("0.00"),
        )
        db.add(overdue_borrowing)
        db.commit()
        borrowing_id = overdue_borrowing.id
        db.close()

        # Return the overdue book
        return_res = self.client.post(f"/api/borrowings/return/{borrowing_id}", headers=self.s1_headers)
        self.assertEqual(return_res.status_code, 200)
        data = return_res.json()

        self.assertEqual(data["status"], "RETURNED")
        self.assertEqual(data["days_overdue"], 3)
        # Daily rate is $1.00, so 3 days = $3.00
        self.assertEqual(float(data["fine_amount"]), 3.00)

        # Verify DB persisted fine_amount
        db = self.Session()
        b_record = db.query(Borrowing).filter(Borrowing.id == borrowing_id).first()
        self.assertEqual(b_record.fine_amount, Decimal("3.00"))
        self.assertEqual(b_record.status, BorrowingStatus.RETURNED)
        db.close()

    # --- 9. Unauthorized Return Attempt by Another Student ---

    def test_return_forbidden_for_other_student(self):
        # Student 1 borrows book
        borrow_res = self.client.post(f"/api/borrowings/borrow/{self.b1_id}", headers=self.s1_headers)
        borrowing_id = borrow_res.json()["id"]

        # Student 2 attempts to return it -> 403 Forbidden
        return_res = self.client.post(f"/api/borrowings/return/{borrowing_id}", headers=self.s2_headers)
        self.assertEqual(return_res.status_code, 403)

        # Librarian can return it on behalf of student -> 200 OK
        lib_return_res = self.client.post(f"/api/borrowings/return/{borrowing_id}", headers=self.lib_headers)
        self.assertEqual(lib_return_res.status_code, 200)

    # --- 10. Querying Endpoints: /my, /history, /overdue ---

    def test_get_my_borrowings(self):
        # Alice borrows book1
        self.client.post(f"/api/borrowings/borrow/{self.b1_id}", headers=self.s1_headers)

        res = self.client.get("/api/borrowings/my", headers=self.s1_headers)
        self.assertEqual(res.status_code, 200)
        my_list = res.json()
        self.assertEqual(len(my_list), 1)
        self.assertEqual(my_list[0]["book_id"], self.b1_id)

    def test_get_history(self):
        # Alice borrows and returns book1
        b_res = self.client.post(f"/api/borrowings/borrow/{self.b1_id}", headers=self.s1_headers)
        b_id = b_res.json()["id"]
        self.client.post(f"/api/borrowings/return/{b_id}", headers=self.s1_headers)

        # Student can view own history
        res = self.client.get("/api/borrowings/history", headers=self.s1_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)

        # Librarian can view all history
        res_lib = self.client.get("/api/borrowings/history", headers=self.lib_headers)
        self.assertEqual(res_lib.status_code, 200)
        self.assertGreaterEqual(len(res_lib.json()), 1)

    def test_get_overdue_list(self):
        # Insert overdue borrowing in DB
        db = self.Session()
        now = datetime.now(timezone.utc)
        overdue_b = Borrowing(
            user_id=self.student1_id,
            book_id=self.b1_id,
            borrowed_at=now - timedelta(days=20),
            due_date=now - timedelta(days=6),  # 6 days overdue
            returned_at=None,
            status=BorrowingStatus.BORROWED,
            fine_amount=Decimal("0.00"),
        )
        db.add(overdue_b)
        db.commit()
        db.close()

        # Alice checks overdue
        res = self.client.get("/api/borrowings/overdue", headers=self.s1_headers)
        self.assertEqual(res.status_code, 200)
        overdue_list = res.json()
        self.assertEqual(len(overdue_list), 1)
        self.assertEqual(overdue_list[0]["status"], "OVERDUE")
        self.assertEqual(float(overdue_list[0]["fine_amount"]), 6.00)


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestBorrowingEndpoints)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(not result.wasSuccessful())
