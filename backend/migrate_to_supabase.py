"""
Utility script to initialize Supabase PostgreSQL database tables
and migrate data from local booknest.db.

Usage:
  python migrate_to_supabase.py
"""

import os
import sys
from datetime import datetime, timezone
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

import models
from database import Base

def get_target_db_url():
    url = os.getenv("DATABASE_URL")
    if not url or "sqlite" in url:
        env_path = os.path.join(os.path.dirname(__file__), ".env")
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip().startswith("DATABASE_URL="):
                        url = line.strip().split("=", 1)[1].strip().strip("'\"")
                        break
    return url or ""


def main():
    db_url = get_target_db_url()
    print(f"[*] Target Supabase DB URL: {db_url[:40]}... (Seoul Pooler)")

    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            # 1. Ensure 'users' table has is_active and updated_at columns if missing
            print("[*] Checking and updating users table schema if needed...")
            conn.execute(
                text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;")
            )
            conn.execute(
                text("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();")
            )
            conn.commit()
            print("[+] users table schema checked and ready.")

        # 2. Create tables for books, borrowings, favorites, audit_logs
        print("[*] Creating all tables in Supabase (books, borrowings, favorites, audit_logs)...")
        Base.metadata.create_all(bind=engine)
        print("[+] Tables successfully verified / created in Supabase!")

        # 3. Migrate seed data from local SQLite
        sqlite_path = os.path.join(os.path.dirname(__file__), "booknest.db")
        if os.path.exists(sqlite_path):
            print(f"[*] Migrating data from local {sqlite_path}...")
            from sqlalchemy import create_engine as sqlite_create
            sqlite_engine = sqlite_create(f"sqlite:///{sqlite_path}")
            SqliteSession = sessionmaker(bind=sqlite_engine)
            SupabaseSession = sessionmaker(bind=engine)

            s_sqlite = SqliteSession()
            s_supa = SupabaseSession()

            # --- Users migration ---
            local_users = s_sqlite.query(models.User).all()
            user_id_map = {}  # old_sqlite_id -> supa_id

            for u in local_users:
                # Match by email
                existing_u = s_supa.query(models.User).filter(models.User.email == u.email).first()
                if existing_u:
                    user_id_map[u.id] = existing_u.id
                    print(f"    Existing user: {u.email} (id: {existing_u.id})")
                else:
                    new_u = models.User(
                        name=u.name,
                        email=u.email,
                        password_hash=u.password_hash,
                        role=u.role,
                        is_active=u.is_active,
                    )
                    s_supa.add(new_u)
                    s_supa.flush()
                    user_id_map[u.id] = new_u.id
                    print(f"    Added new user: {u.email} -> id: {new_u.id}")
            s_supa.commit()
            print(f"[+] Synced users.")

            # --- Books migration ---
            local_books = s_sqlite.query(models.Book).all()
            book_id_map = {}  # old_sqlite_id -> supa_id

            for b in local_books:
                existing_b = s_supa.query(models.Book).filter(models.Book.isbn == b.isbn).first()
                if existing_b:
                    book_id_map[b.id] = existing_b.id
                    print(f"    Existing book: '{b.title}' (id: {existing_b.id})")
                else:
                    new_b = models.Book(
                        title=b.title,
                        author=b.author,
                        isbn=b.isbn,
                        description=b.description,
                        category=b.category,
                        publisher=b.publisher,
                        publication_year=b.publication_year,
                        cover_url=b.cover_url,
                        total_copies=b.total_copies,
                        available_copies=b.available_copies,
                    )
                    s_supa.add(new_b)
                    s_supa.flush()
                    book_id_map[b.id] = new_b.id
                    print(f"    Added book: '{b.title}' -> id: {new_b.id}")
            s_supa.commit()
            print(f"[+] Synced books.")

            # --- Borrowings migration ---
            local_borrows = s_sqlite.query(models.Borrowing).all()
            for br in local_borrows:
                supa_user_id = user_id_map.get(br.user_id)
                supa_book_id = book_id_map.get(br.book_id)

                if supa_user_id and supa_book_id:
                    existing_br = (
                        s_supa.query(models.Borrowing)
                        .filter(
                            models.Borrowing.user_id == supa_user_id,
                            models.Borrowing.book_id == supa_book_id,
                            models.Borrowing.status == br.status,
                        )
                        .first()
                    )
                    if not existing_br:
                        new_br = models.Borrowing(
                            user_id=supa_user_id,
                            book_id=supa_book_id,
                            borrowed_at=br.borrowed_at,
                            due_date=br.due_date,
                            returned_at=br.returned_at,
                            status=br.status,
                            fine_amount=br.fine_amount,
                        )
                        s_supa.add(new_br)
            s_supa.commit()
            print(f"[+] Synced borrowings.")

            s_sqlite.close()
            s_supa.close()

            print("\n=======================================================")
            print("[SUCCESS] All BookNest data successfully saved in Supabase!")
            print("=======================================================")

    except Exception as exc:
        print(f"[!] Error connecting or migrating to Supabase: {exc}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
