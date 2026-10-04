import sys
import unittest
from datetime import timedelta

from fastapi import Depends, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from auth import (
    create_access_token,
    get_current_user,
    hash_password,
    require_admin,
    require_librarian,
    require_student,
    verify_access_token,
    verify_password,
)
from database import Base, get_db
from main import app
from models import User, UserRole


class TestAuth(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Attach temporary test routes for role dependencies to app
        @app.get("/api/test-role/student")
        def route_student(user: User = Depends(require_student)):
            return {"role": user.role.value, "allowed": True}

        @app.get("/api/test-role/librarian")
        def route_librarian(user: User = Depends(require_librarian)):
            return {"role": user.role.value, "allowed": True}

        @app.get("/api/test-role/admin")
        def route_admin(user: User = Depends(require_admin)):
            return {"role": user.role.value, "allowed": True}

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

    def tearDown(self):
        app.dependency_overrides.clear()
        self.engine.dispose()

    # --- Unit Tests: Hashing & Tokens ---

    def test_password_hashing_and_verification(self):
        password = "SuperSecretPassword123!"
        hashed = hash_password(password)

        self.assertNotEqual(password, hashed)
        self.assertTrue(hashed.startswith("$2b$"))
        self.assertTrue(verify_password(password, hashed))
        self.assertFalse(verify_password("WrongPassword!", hashed))

    def test_jwt_creation_and_verification(self):
        token = create_access_token(data={"sub": "42", "role": "STUDENT"})
        payload = verify_access_token(token)
        self.assertEqual(payload.get("sub"), "42")
        self.assertEqual(payload.get("role"), "STUDENT")

    def test_jwt_expired_token(self):
        token = create_access_token(
            data={"sub": "42"},
            expires_delta=timedelta(seconds=-10),
        )
        with self.assertRaises(HTTPException) as ctx:
            verify_access_token(token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("expired", ctx.exception.detail.lower())

    # --- API Tests: Registration ---

    def test_register_success_default_role_student(self):
        payload = {
            "name": "John Doe",
            "email": "john.doe@example.com",
            "password": "Password123!",
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 201)

        data = res.json()
        self.assertEqual(data["name"], "John Doe")
        self.assertEqual(data["email"], "john.doe@example.com")
        self.assertEqual(data["role"], "STUDENT")  # Default role must be STUDENT
        self.assertTrue(data["is_active"])
        self.assertNotIn("password", data)
        self.assertNotIn("password_hash", data)

        # Verify password is not plaintext in DB
        db = self.Session()
        user = db.query(User).filter(User.email == "john.doe@example.com").first()
        self.assertIsNotNone(user)
        self.assertNotEqual(user.password_hash, "Password123!")
        self.assertTrue(user.password_hash.startswith("$2b$"))
        db.close()

    def test_register_disallows_custom_role(self):
        # Attempting to supply a role during registration must be rejected
        payload = {
            "name": "Malicious Admin",
            "email": "hacker@example.com",
            "password": "Password123!",
            "role": "ADMIN",
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 422)  # Extra field forbidden

    def test_register_duplicate_email_fails(self):
        payload = {
            "name": "Original",
            "email": "duplicate@example.com",
            "password": "Password123!",
        }
        res1 = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res1.status_code, 201)

        res2 = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res2.status_code, 400)
        self.assertIn("already registered", res2.json()["detail"].lower())

    # --- API Tests: Login ---

    def test_login_success(self):
        # First register
        self.client.post(
            "/api/auth/register",
            json={
                "name": "Jane User",
                "email": "jane@example.com",
                "password": "SecretPassword123!",
            },
        )

        # Login
        login_res = self.client.post(
            "/api/auth/login",
            json={
                "email": "jane@example.com",
                "password": "SecretPassword123!",
            },
        )
        self.assertEqual(login_res.status_code, 200)
        token_data = login_res.json()
        self.assertIn("access_token", token_data)
        self.assertEqual(token_data["token_type"], "bearer")

    def test_login_invalid_password(self):
        self.client.post(
            "/api/auth/register",
            json={
                "name": "Jane User",
                "email": "jane@example.com",
                "password": "SecretPassword123!",
            },
        )

        res = self.client.post(
            "/api/auth/login",
            json={
                "email": "jane@example.com",
                "password": "WrongPassword!",
            },
        )
        self.assertEqual(res.status_code, 401)
        self.assertIn("invalid", res.json()["detail"].lower())

    def test_login_nonexistent_email(self):
        res = self.client.post(
            "/api/auth/login",
            json={
                "email": "nobody@example.com",
                "password": "SecretPassword123!",
            },
        )
        self.assertEqual(res.status_code, 401)

    # --- API Tests: Protected /api/auth/me ---

    def test_get_me_protected(self):
        # Unauthenticated request
        res = self.client.get("/api/auth/me")
        self.assertEqual(res.status_code, 401)

        # Register and login
        self.client.post(
            "/api/auth/register",
            json={
                "name": "Protected User",
                "email": "protected@example.com",
                "password": "SecretPassword123!",
            },
        )
        login_res = self.client.post(
            "/api/auth/login",
            json={
                "email": "protected@example.com",
                "password": "SecretPassword123!",
            },
        )
        token = login_res.json()["access_token"]

        # Authenticated request with Bearer header
        headers = {"Authorization": f"Bearer {token}"}
        me_res = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(me_res.status_code, 200)
        me_data = me_res.json()
        self.assertEqual(me_data["name"], "Protected User")
        self.assertEqual(me_data["email"], "protected@example.com")
        self.assertEqual(me_data["role"], "STUDENT")

    # --- Role Authorization Dependencies ---

    def test_role_authorization_enforcement(self):
        db = self.Session()
        # Create users with 3 distinct roles directly in DB
        student = User(
            name="Student User",
            email="student@library.com",
            password_hash=hash_password("pw"),
            role=UserRole.STUDENT,
        )
        librarian = User(
            name="Librarian User",
            email="librarian@library.com",
            password_hash=hash_password("pw"),
            role=UserRole.LIBRARIAN,
        )
        admin = User(
            name="Admin User",
            email="admin@library.com",
            password_hash=hash_password("pw"),
            role=UserRole.ADMIN,
        )
        db.add_all([student, librarian, admin])
        db.commit()

        student_token = create_access_token(data={"sub": str(student.id)})
        librarian_token = create_access_token(data={"sub": str(librarian.id)})
        admin_token = create_access_token(data={"sub": str(admin.id)})
        db.close()

        student_hdr = {"Authorization": f"Bearer {student_token}"}
        librarian_hdr = {"Authorization": f"Bearer {librarian_token}"}
        admin_hdr = {"Authorization": f"Bearer {admin_token}"}

        # 1. Student route: Student, Librarian, Admin allowed
        self.assertEqual(self.client.get("/api/test-role/student", headers=student_hdr).status_code, 200)
        self.assertEqual(self.client.get("/api/test-role/student", headers=librarian_hdr).status_code, 200)
        self.assertEqual(self.client.get("/api/test-role/student", headers=admin_hdr).status_code, 200)

        # 2. Librarian route: Student denied (403), Librarian and Admin allowed
        self.assertEqual(self.client.get("/api/test-role/librarian", headers=student_hdr).status_code, 403)
        self.assertEqual(self.client.get("/api/test-role/librarian", headers=librarian_hdr).status_code, 200)
        self.assertEqual(self.client.get("/api/test-role/librarian", headers=admin_hdr).status_code, 200)

        # 3. Admin route: Student denied (403), Librarian denied (403), Admin allowed (200)
        self.assertEqual(self.client.get("/api/test-role/admin", headers=student_hdr).status_code, 403)
        self.assertEqual(self.client.get("/api/test-role/admin", headers=librarian_hdr).status_code, 403)
        self.assertEqual(self.client.get("/api/test-role/admin", headers=admin_hdr).status_code, 200)


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestAuth)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(not result.wasSuccessful())
