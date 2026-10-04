import os
import unittest
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth import create_access_token, hash_password
from database import Base, get_db
from main import app
from models import AuditLog, Book, Borrowing, BorrowingStatus, User, UserRole


class TestAdminEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestingSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=cls.engine
        )

    def setUp(self):
        Base.metadata.create_all(bind=self.engine)
        self.db = self.TestingSessionLocal()

        def override_get_db():
            try:
                yield self.db
            finally:
                pass

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

        # Create test users
        self.student = User(
            name="Alice Student",
            email="student@example.com",
            password_hash=hash_password("student123"),
            role=UserRole.STUDENT,
            is_active=True,
        )
        self.librarian = User(
            name="Bob Librarian",
            email="librarian@example.com",
            password_hash=hash_password("librarian123"),
            role=UserRole.LIBRARIAN,
            is_active=True,
        )
        self.admin = User(
            name="Charlie Admin",
            email="admin@example.com",
            password_hash=hash_password("admin123"),
            role=UserRole.ADMIN,
            is_active=True,
        )
        self.db.add_all([self.student, self.librarian, self.admin])
        self.db.commit()

        self.student_token = create_access_token(data={"sub": str(self.student.id)})
        self.librarian_token = create_access_token(data={"sub": str(self.librarian.id)})
        self.admin_token = create_access_token(data={"sub": str(self.admin.id)})

        self.student_headers = {"Authorization": f"Bearer {self.student_token}"}
        self.librarian_headers = {"Authorization": f"Bearer {self.librarian_token}"}
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        app.dependency_overrides.clear()

    def test_admin_stats_access(self):
        # Student and Librarian cannot access stats
        res_stu = self.client.get("/api/admin/stats", headers=self.student_headers)
        self.assertEqual(res_stu.status_code, 403)

        res_lib = self.client.get("/api/admin/stats", headers=self.librarian_headers)
        self.assertEqual(res_lib.status_code, 403)

        # Admin can access stats
        res_adm = self.client.get("/api/admin/stats", headers=self.admin_headers)
        self.assertEqual(res_adm.status_code, 200)
        data = res_adm.json()
        self.assertEqual(data["total_users"], 3)
        self.assertEqual(data["total_students"], 1)
        self.assertEqual(data["total_librarians"], 1)
        self.assertEqual(data["total_admins"], 1)

    def test_admin_list_users(self):
        # Student forbidden
        res = self.client.get("/api/admin/users", headers=self.student_headers)
        self.assertEqual(res.status_code, 403)

        # Admin gets all users
        res = self.client.get("/api/admin/users", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 3)

        # Filter by role
        res_stu = self.client.get("/api/admin/users?role=STUDENT", headers=self.admin_headers)
        self.assertEqual(res_stu.status_code, 200)
        self.assertEqual(len(res_stu.json()), 1)
        self.assertEqual(res_stu.json()[0]["email"], "student@example.com")

        res_lib = self.client.get("/api/admin/users?role=LIBRARIAN", headers=self.admin_headers)
        self.assertEqual(res_lib.status_code, 200)
        self.assertEqual(len(res_lib.json()), 1)
        self.assertEqual(res_lib.json()[0]["email"], "librarian@example.com")

    def test_admin_update_user(self):
        # Promote student to librarian
        update_payload = {"role": "LIBRARIAN", "is_active": True}
        res = self.client.put(
            f"/api/admin/users/{self.student.id}",
            json=update_payload,
            headers=self.admin_headers,
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["role"], "LIBRARIAN")

        # Verify audit log was generated
        audit_res = self.client.get("/api/admin/audit-logs", headers=self.admin_headers)
        self.assertEqual(audit_res.status_code, 200)
        logs = audit_res.json()
        self.assertGreater(len(logs), 0)
        self.assertEqual(logs[0]["action"], "UPDATE_USER")

    def test_admin_cannot_deactivate_self_if_sole_admin(self):
        res = self.client.put(
            f"/api/admin/users/{self.admin.id}",
            json={"is_active": False},
            headers=self.admin_headers,
        )
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
