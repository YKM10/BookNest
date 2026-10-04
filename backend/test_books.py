import sys
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from auth import create_access_token, hash_password
from database import Base, get_db
from main import app
from models import Book, User, UserRole


class TestBookEndpoints(unittest.TestCase):
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

        # Create test users with distinct roles
        db = self.Session()
        self.student = User(
            name="Alice Student",
            email="student@booknest.test",
            password_hash=hash_password("pw"),
            role=UserRole.STUDENT,
        )
        self.librarian = User(
            name="Bob Librarian",
            email="librarian@booknest.test",
            password_hash=hash_password("pw"),
            role=UserRole.LIBRARIAN,
        )
        self.admin = User(
            name="Charlie Admin",
            email="admin@booknest.test",
            password_hash=hash_password("pw"),
            role=UserRole.ADMIN,
        )
        db.add_all([self.student, self.librarian, self.admin])
        db.commit()

        self.student_token = create_access_token(data={"sub": str(self.student.id)})
        self.librarian_token = create_access_token(data={"sub": str(self.librarian.id)})
        self.admin_token = create_access_token(data={"sub": str(self.admin.id)})

        self.student_headers = {"Authorization": f"Bearer {self.student_token}"}
        self.librarian_headers = {"Authorization": f"Bearer {self.librarian_token}"}
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        db.close()

    def tearDown(self):
        app.dependency_overrides.clear()
        self.engine.dispose()

    # --- POST /api/books (Create) ---

    def test_create_book_success_librarian(self):
        payload = {
            "title": "Fluent Python",
            "author": "Luciano Ramalho",
            "isbn": "978-1491946008",
            "category": "Programming",
            "total_copies": 4,
            "available_copies": 4,
        }
        res = self.client.post("/api/books", json=payload, headers=self.librarian_headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["title"], "Fluent Python")
        self.assertEqual(data["isbn"], "978-1491946008")
        self.assertEqual(data["available_copies"], 4)
        self.assertIn("id", data)

    def test_create_book_success_admin(self):
        payload = {
            "title": "Clean Architecture",
            "author": "Robert C. Martin",
            "isbn": "978-0134494166",
            "total_copies": 2,
        }
        res = self.client.post("/api/books", json=payload, headers=self.admin_headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["available_copies"], 2)  # Defaults to total_copies

    def test_create_book_forbidden_student(self):
        payload = {
            "title": "Student Book",
            "author": "Author",
            "isbn": "111-222",
        }
        res = self.client.post("/api/books", json=payload, headers=self.student_headers)
        self.assertEqual(res.status_code, 403)

    def test_create_book_unauthorized(self):
        res = self.client.post("/api/books", json={"title": "T", "author": "A", "isbn": "I"})
        self.assertEqual(res.status_code, 401)

    def test_create_book_duplicate_isbn_conflict(self):
        payload = {
            "title": "Book 1",
            "author": "Author 1",
            "isbn": "DUPLICATE-ISBN",
        }
        res1 = self.client.post("/api/books", json=payload, headers=self.librarian_headers)
        self.assertEqual(res1.status_code, 201)

        res2 = self.client.post("/api/books", json=payload, headers=self.librarian_headers)
        self.assertEqual(res2.status_code, 409)
        self.assertIn("already exists", res2.json()["detail"].lower())

    def test_create_book_validation_negative_copies(self):
        payload = {
            "title": "Invalid Copies",
            "author": "Author",
            "isbn": "INV-1",
            "total_copies": -1,
        }
        res = self.client.post("/api/books", json=payload, headers=self.librarian_headers)
        self.assertEqual(res.status_code, 422)

    def test_create_book_validation_available_exceeds_total(self):
        payload = {
            "title": "Invalid Copies 2",
            "author": "Author",
            "isbn": "INV-2",
            "total_copies": 2,
            "available_copies": 5,
        }
        res = self.client.post("/api/books", json=payload, headers=self.librarian_headers)
        self.assertEqual(res.status_code, 422)

    # --- GET /api/books (List, Search, Filter) ---

    def test_get_books_search_and_filters(self):
        # Seed 3 books
        b1 = {
            "title": "Learning Python",
            "author": "Mark Lutz",
            "isbn": "978-1449355739",
            "category": "Programming",
            "total_copies": 3,
            "available_copies": 3,
        }
        b2 = {
            "title": "Python Crash Course",
            "author": "Eric Matthes",
            "isbn": "978-1593279288",
            "category": "Education",
            "total_copies": 2,
            "available_copies": 0,  # unavailable
        }
        b3 = {
            "title": "Database Internals",
            "author": "Alex Petrov",
            "isbn": "978-1492040347",
            "category": "Databases",
            "total_copies": 5,
            "available_copies": 5,
        }
        for b in [b1, b2, b3]:
            self.client.post("/api/books", json=b, headers=self.librarian_headers)

        # 1. Unfiltered list (Student can view)
        res = self.client.get("/api/books", headers=self.student_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 3)

        # 2. Search term "python"
        res_search = self.client.get("/api/books?search=python", headers=self.student_headers)
        self.assertEqual(res_search.status_code, 200)
        self.assertEqual(len(res_search.json()), 2)

        # 3. Filter by author "Petrov"
        res_author = self.client.get("/api/books?author=Petrov", headers=self.student_headers)
        self.assertEqual(res_author.status_code, 200)
        self.assertEqual(len(res_author.json()), 1)
        self.assertEqual(res_author.json()[0]["title"], "Database Internals")

        # 4. Filter by category "Education"
        res_cat = self.client.get("/api/books?category=Education", headers=self.student_headers)
        self.assertEqual(res_cat.status_code, 200)
        self.assertEqual(len(res_cat.json()), 1)
        self.assertEqual(res_cat.json()[0]["title"], "Python Crash Course")

        # 5. Filter available=true
        res_avail = self.client.get("/api/books?available=true", headers=self.student_headers)
        self.assertEqual(res_avail.status_code, 200)
        self.assertEqual(len(res_avail.json()), 2)

        # 6. Filter available=false
        res_unavail = self.client.get("/api/books?available=false", headers=self.student_headers)
        self.assertEqual(res_unavail.status_code, 200)
        self.assertEqual(len(res_unavail.json()), 1)
        self.assertEqual(res_unavail.json()[0]["title"], "Python Crash Course")

    # --- GET /api/books/{book_id} ---

    def test_get_book_by_id_success(self):
        b = {
            "title": "Design Patterns",
            "author": "GoF",
            "isbn": "978-0201633610",
        }
        create_res = self.client.post("/api/books", json=b, headers=self.librarian_headers)
        book_id = create_res.json()["id"]

        res = self.client.get(f"/api/books/{book_id}", headers=self.student_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["title"], "Design Patterns")

    def test_get_book_by_id_not_found(self):
        res = self.client.get("/api/books/99999", headers=self.student_headers)
        self.assertEqual(res.status_code, 404)

    # --- PUT /api/books/{book_id} (Update) ---

    def test_update_book_success(self):
        b = {
            "title": "Initial Title",
            "author": "Initial Author",
            "isbn": "INIT-ISBN",
            "total_copies": 5,
            "available_copies": 5,
        }
        create_res = self.client.post("/api/books", json=b, headers=self.librarian_headers)
        book_id = create_res.json()["id"]

        update_payload = {
            "title": "Updated Title",
            "available_copies": 3,
        }
        res = self.client.put(f"/api/books/{book_id}", json=update_payload, headers=self.librarian_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["title"], "Updated Title")
        self.assertEqual(res.json()["available_copies"], 3)
        self.assertEqual(res.json()["total_copies"], 5)

    def test_update_book_forbidden_student(self):
        b = {"title": "Book", "author": "A", "isbn": "ISBN-UPD-1"}
        book_id = self.client.post("/api/books", json=b, headers=self.librarian_headers).json()["id"]

        res = self.client.put(f"/api/books/{book_id}", json={"title": "Hacked"}, headers=self.student_headers)
        self.assertEqual(res.status_code, 403)

    def test_update_book_conflict_isbn(self):
        b1 = {"title": "Book 1", "author": "A1", "isbn": "ISBN-A"}
        b2 = {"title": "Book 2", "author": "A2", "isbn": "ISBN-B"}
        self.client.post("/api/books", json=b1, headers=self.librarian_headers)
        b2_id = self.client.post("/api/books", json=b2, headers=self.librarian_headers).json()["id"]

        # Try to change b2's isbn to b1's isbn
        res = self.client.put(f"/api/books/{b2_id}", json={"isbn": "ISBN-A"}, headers=self.librarian_headers)
        self.assertEqual(res.status_code, 409)

    def test_update_book_bad_request_available_exceeds_total(self):
        b = {"title": "Book Copies", "author": "A", "isbn": "COPIES-1", "total_copies": 2, "available_copies": 2}
        book_id = self.client.post("/api/books", json=b, headers=self.librarian_headers).json()["id"]

        # Update available_copies to 10 when total_copies is 2
        res = self.client.put(f"/api/books/{book_id}", json={"available_copies": 10}, headers=self.librarian_headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("exceed", res.json()["detail"].lower())

    # --- DELETE /api/books/{book_id} ---

    def test_delete_book_success(self):
        b = {"title": "To Delete", "author": "Author", "isbn": "DEL-1"}
        book_id = self.client.post("/api/books", json=b, headers=self.librarian_headers).json()["id"]

        res = self.client.delete(f"/api/books/{book_id}", headers=self.librarian_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["id"], book_id)

        # Verify it's gone
        get_res = self.client.get(f"/api/books/{book_id}", headers=self.student_headers)
        self.assertEqual(get_res.status_code, 404)

    def test_delete_book_forbidden_student(self):
        b = {"title": "To Delete", "author": "Author", "isbn": "DEL-2"}
        book_id = self.client.post("/api/books", json=b, headers=self.librarian_headers).json()["id"]

        res = self.client.delete(f"/api/books/{book_id}", headers=self.student_headers)
        self.assertEqual(res.status_code, 403)

    def test_delete_book_not_found(self):
        res = self.client.delete("/api/books/88888", headers=self.librarian_headers)
        self.assertEqual(res.status_code, 404)


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestBookEndpoints)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(not result.wasSuccessful())
