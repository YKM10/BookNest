import unittest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from auth import create_access_token, hash_password
from database import Base, get_db
from main import app
from models import Book, User, UserRole, Borrowing, BorrowingStatus


class TestAIEndpoints(unittest.TestCase):
    def setUp(self):
        # Create an isolated in-memory SQLite database
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

        # Seed users
        db = self.Session()
        self.student = User(
            name="Alice Student",
            email="alice@booknest.test",
            password_hash=hash_password("password123"),
            role=UserRole.STUDENT,
            is_active=True,
        )
        self.other_student = User(
            name="Bob Student",
            email="bob@booknest.test",
            password_hash=hash_password("password123"),
            role=UserRole.STUDENT,
            is_active=True,
        )
        db.add_all([self.student, self.other_student])
        db.commit()
        db.refresh(self.student)
        db.refresh(self.other_student)

        # Seed books
        self.book1 = Book(
            title="Fluent Python: Clear, Concise, and Effective Programming",
            author="Luciano Ramalho",
            isbn="9781491957661",
            category="Programming",
            description="Python's simplicity lets you become productive quickly, but this often means you aren't using everything it has to offer.",
            total_copies=5,
            available_copies=4,
        )
        self.book2 = Book(
            title="Clean Architecture: A Craftsman's Guide",
            author="Robert C. Martin",
            isbn="9780134494164",
            category="Architecture",
            description="By applying universal rules of software architecture, you can dramatically improve developer productivity.",
            total_copies=3,
            available_copies=0,  # Out of stock
        )
        self.book3 = Book(
            title="Designing Data-Intensive Applications",
            author="Martin Kleppmann",
            isbn="9781449373320",
            category="Databases",
            description="The definitive guide to the architecture of modern data storage and processing systems.",
            total_copies=4,
            available_copies=4,
        )
        db.add_all([self.book1, self.book2, self.book3])
        db.commit()
        db.refresh(self.book1)
        db.refresh(self.book2)
        db.refresh(self.book3)

        # Seed a borrowing for Alice (overdue) and Bob (active)
        now = datetime.now(timezone.utc)
        self.borrowing_alice = Borrowing(
            user_id=self.student.id,
            book_id=self.book1.id,
            borrowed_at=now - timedelta(days=20),
            due_date=now - timedelta(days=6),
            status=BorrowingStatus.OVERDUE,
            fine_amount=6.00,
        )
        self.borrowing_bob = Borrowing(
            user_id=self.other_student.id,
            book_id=self.book2.id,
            borrowed_at=now - timedelta(days=2),
            due_date=now + timedelta(days=12),
            status=BorrowingStatus.BORROWED,
            fine_amount=0.00,
        )
        db.add_all([self.borrowing_alice, self.borrowing_bob])
        db.commit()

        self.student_id = self.student.id
        self.book1_id = self.book1.id
        db.close()

        # Generate JWT tokens
        self.student_token = create_access_token({"sub": str(self.student_id), "role": "STUDENT"})
        self.student_headers = {"Authorization": f"Bearer {self.student_token}"}

    def tearDown(self):
        app.dependency_overrides.clear()
        Base.metadata.drop_all(self.engine)

    def test_ai_chat_requires_auth(self):
        resp = self.client.post("/api/ai/chat", json={"message": "Hello!"})
        self.assertEqual(resp.status_code, 401)

    def test_ai_chat_general_query(self):
        resp = self.client.post(
            "/api/ai/chat",
            json={"message": "What is BookNest's borrowing policy?"},
            headers=self.student_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("reply", data)
        self.assertTrue(len(data["reply"]) > 0)
        self.assertIn("source", data)
        self.assertIn("suggestions", data)

    def test_ai_chat_overdue_check_respects_rbac(self):
        # Alice asks about overdue books; should return her overdue loan and not Bob's
        resp = self.client.post(
            "/api/ai/chat",
            json={"message": "Do I have any overdue books or fines?"},
            headers=self.student_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        reply = data["reply"]
        # Alice has an overdue book: Fluent Python with $6.00 fine
        self.assertTrue("overdue" in reply.lower() or "fluent python" in reply.lower() or "6" in reply)
        # Should not reveal Bob's book
        self.assertNotIn("Bob", reply)

    def test_ai_chat_book_explanation(self):
        resp = self.client.post(
            "/api/ai/chat",
            json={
                "message": "What is this book about?",
                "book_id": self.book1_id,
            },
            headers=self.student_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(len(data["reply"]) > 0)
        self.assertTrue(len(data["books"]) >= 1)
        self.assertEqual(data["books"][0]["id"], self.book1_id)

    def test_ai_recommend_requires_auth(self):
        resp = self.client.post("/api/ai/recommend", json={})
        self.assertEqual(resp.status_code, 401)

    def test_ai_recommend_success(self):
        resp = self.client.post(
            "/api/ai/recommend",
            json={"preference": "Python programming", "category": "Programming", "limit": 3},
            headers=self.student_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("recommendations", data)
        self.assertIn("explanation", data)
        self.assertTrue(len(data["recommendations"]) >= 1)

    def test_ai_search_requires_auth(self):
        resp = self.client.post("/api/ai/search", json={"query": "Python"})
        self.assertEqual(resp.status_code, 401)

    def test_ai_search_natural_language(self):
        resp = self.client.post(
            "/api/ai/search",
            json={"query": "Find books about python programming that are available"},
            headers=self.student_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("results", data)
        self.assertIn("explanation", data)
        self.assertTrue(data["total"] >= 1)
        titles = [b["title"] for b in data["results"]]
        self.assertTrue(any("Python" in t for t in titles))

    def test_ai_search_available_only(self):
        # book2 (Clean Architecture) has available_copies = 0
        resp = self.client.post(
            "/api/ai/search",
            json={"query": "architecture", "available_only": True},
            headers=self.student_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        # book2 should not be in results because available_only is True
        for b in data["results"]:
            self.assertTrue(b["available_copies"] > 0)


if __name__ == "__main__":
    unittest.main()
