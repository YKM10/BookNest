# BookNest — Enterprise Digital Library & AI Assistant

A modern, full-stack digital library management system featuring **Role-Based Access Control (RBAC)**, an interactive **3D WebGL visual layer**, an integrated **Gemini AI Librarian**, and cloud persistence powered by **Supabase PostgreSQL**.

---

## Table of Contents
1. [Architecture & System Flow](#architecture--system-flow)
2. [Tech Stack](#tech-stack)
3. [Complete Directory & File Structure](#complete-directory--file-structure)
4. [How BookNest Works (System Workflows)](#how-booknest-works-system-workflows)
5. [Complete API Endpoints Catalog](#complete-api-endpoints-catalog)
6. [Complete Code Methods & Functions Reference](#complete-code-methods--functions-reference)
7. [Database Schema (Supabase PostgreSQL)](#database-schema-supabase-postgresql)
8. [Setup & Running Locally](#setup--running-locally)
9. [Pre-configured Demo Accounts](#pre-configured-demo-accounts)

---

## Architecture & System Flow

```text
       Browser / Client (Next.js 16 App Router)
           │
           ├── React Three Fiber (3D WebGL Book Inspection)
           ├── AI Librarian Chat Interface & Floating Widget
           ├── Role Dashboards (Student, Librarian, Admin)
           │
           ▼ HTTP / REST (JWT Bearer Token in Authorization Header)
     FastAPI Backend (Port 8000)
           │
           ├── Auth & RBAC Security Middleware (Student / Librarian / Admin)
           ├── Business Logic: Borrow limits, 14-day loan terms, fine calculation
           ├── AI Librarian Service (Prompt synthesis, schema validation, rate-limiting)
           │          │
           │          ▼ HTTPS
           │     Google Gemini API (models/gemini-flash-latest)
           │     (Graceful fallback to internal DB semantic reasoning)
           ▼
     Supabase Connection Pooler (Port 5432 / 6543)
           │
     PostgreSQL 17 (efcvhgpproauptczhgqm)
     ├── users
     ├── books
     ├── borrowings
     ├── favorites
     └── audit_logs
```

---

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (React 19, TypeScript, App Router)
- **Styling:** Tailwind CSS with custom glassmorphism design tokens
- **3D Graphics:** Three.js + React Three Fiber (`@react-three/fiber`, `@react-three/drei`)
- **Animation:** Framer Motion (page transitions, parallax hero, float physics)
- **Icons:** Lucide React

### Backend
- **Framework:** FastAPI (Python 3.12/3.13)
- **Server:** Uvicorn (ASGI)
- **ORM:** SQLAlchemy 2.0 with connection pooling
- **Migrations:** Alembic
- **Security:** PyJWT, Passlib (Argon2 / Bcrypt), OAuth2 Password Bearer
- **Validation:** Pydantic v2 schemas with strict typing

### Database & AI
- **Database:** Supabase Managed PostgreSQL 17
- **AI Engine:** Google Gemini Generative AI API + Dynamic DB Context Retrieval

---

## Complete Directory & File Structure

```text
BookNest/
├── backend/
│   ├── alembic/
│   │   ├── versions/
│   │   │   └── b20e79645b1f_create_booknest_tables.py   # Initial migration schema
│   │   ├── env.py                                       # Alembic environment configuration
│   │   ├── README
│   │   └── script.py.mako                               # Migration template
│   ├── .env                                            # Active environment variables (Supabase + Gemini)
│   ├── .env.example                                    # Environment variable documentation
│   ├── admin_router.py                                 # Admin endpoints (users, stats, audit logs)
│   ├── ai_router.py                                    # AI Librarian endpoints (/chat, /recommend, /search)
│   ├── ai_service.py                                   # Gemini API caller + local DB fallback reasoning
│   ├── alembic.ini                                     # Alembic configuration
│   ├── auth.py                                         # Password hashing, JWT token creation, RBAC dependencies
│   ├── auth_router.py                                  # Auth endpoints (/register, /login, /me)
│   ├── booknest.db                                     # Local SQLite backup database
│   ├── books_router.py                                 # Book catalog & search endpoints
│   ├── borrowings_router.py                            # Borrow, return, overdue, and history endpoints
│   ├── database.py                                     # SQLAlchemy engine and session dependency
│   ├── main.py                                         # FastAPI app bootstrap, CORS, routers registration
│   ├── migrate_to_supabase.py                          # Migration script syncing local data to Supabase
│   ├── models.py                                       # SQLAlchemy database models & constraints
│   ├── requirements.txt                                # Python backend dependencies
│   ├── schemas.py                                      # Pydantic request and response schemas
│   ├── seed_data.py                                    # Seed database with sample books & users
│   ├── test_admin.py                                   # Test suite for Admin endpoints
│   ├── test_ai.py                                      # Test suite for AI Librarian service
│   ├── test_auth.py                                    # Test suite for Authentication & JWT
│   ├── test_books.py                                   # Test suite for Book catalog & search
│   ├── test_borrowings.py                              # Test suite for Borrowing & Overdue rules
│   └── validate_db.py                                  # Script to validate schema integrity
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/
│   │   │   │   └── page.tsx                            # Admin control panel page
│   │   │   ├── ai/
│   │   │   │   └── page.tsx                            # Full-page AI Librarian Hub
│   │   │   ├── books/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx                        # Book Details view with 3D Canvas
│   │   │   │   └── page.tsx                            # Book Catalog with search & filter
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx                            # Student Dashboard (active loans, due dates)
│   │   │   ├── history/
│   │   │   │   └── page.tsx                            # Borrowing history and fines log
│   │   │   ├── librarian/
│   │   │   │   └── page.tsx                            # Librarian Dashboard
│   │   │   ├── login/
│   │   │   │   └── page.tsx                            # Sign-in page
│   │   │   ├── register/
│   │   │   │   └── page.tsx                            # Student self-registration page
│   │   │   ├── globals.css                             # Tailwind CSS setup and animations
│   │   │   ├── layout.tsx                              # Root layout with AuthProvider & AI Widget
│   │   │   └── page.tsx                                # Landing page with floating 3D hero
│   │   ├── components/
│   │   │   ├── 3d/
│   │   │   │   ├── BookLoader.tsx                      # 3D canvas fallback spinner
│   │   │   │   ├── BookScene3D.tsx                     # Interactive 3D hardcover book model
│   │   │   │   └── FloatingBooksBackground.tsx         # Subtle 3D floating books background
│   │   │   ├── AdminDashboard.tsx                      # Admin UI: user management, stats, audit
│   │   │   ├── AILibrarianWidget.tsx                   # Global floating AI chat drawer
│   │   │   ├── AuthenticatedLayout.tsx                 # Protected route wrapper
│   │   │   ├── BookFormModal.tsx                       # Add/Edit book modal for Librarians
│   │   │   ├── BorrowingTable.tsx                      # Tabular view of borrowing records
│   │   │   ├── ConfirmationModal.tsx                   # Delete/Action confirmation dialog
│   │   │   ├── LibrarianDashboard.tsx                  # Librarian UI: loans, inventory, returns
│   │   │   ├── Navbar.tsx                              # Role-aware responsive navigation bar
│   │   │   ├── OverdueTable.tsx                        # Overdue books & fine summary table
│   │   │   ├── Sidebar.tsx                             # Dashboard sidebar navigation
│   │   │   └── UserManagementModal.tsx                 # Admin user role assignment modal
│   │   ├── context/
│   │   │   └── AuthContext.tsx                         # React Auth Context (JWT, user state, login/logout)
│   │   └── lib/
│   │       └── api.ts                                  # Axios API client with automatic JWT injection
│   ├── .env.example                                    # Frontend environment template
│   ├── .env.local                                      # Local frontend configuration
│   ├── next.config.ts                                  # Next.js build configuration
│   ├── package.json                                    # Node dependencies & build scripts
│   └── tsconfig.json                                   # TypeScript configuration
├── postman/
│   ├── BookNest_Postman_Collection.json                # Complete automated Postman test suite
│   ├── BookNest_Postman_Environment.json               # Environment variables (tokens, base_url)
│   └── README.md                                       # Postman usage instructions
├── test_e2e_live.py                                    # Live end-to-end integration test script
└── README.md                                           # Master project documentation
```

---

## How BookNest Works (System Workflows)

### 1. Authentication & Role-Based Authorization
- **Registration:** Students register via `/api/auth/register`. Passwords are encrypted using Argon2/Bcrypt.
- **Login:** Users log in with email and password via `/api/auth/login`. The server issues a signed JWT containing `sub` (User ID), `email`, and `role`.
- **Token Verification:** Every secured request sends `Authorization: Bearer <token>`. FastAPI dependency functions `require_role(...)` enforce role restrictions on the backend.
- **Role Permissions:**
  - **STUDENT:** Search books, borrow/return books, view personal history/fines, chat with AI Librarian.
  - **LIBRARIAN:** All Student privileges + Add, edit, delete books, view all student loans, manage overdue records.
  - **ADMIN:** Full system access + System metrics, user role management (promote/demote), system audit logs.

### 2. Borrowing Rules Engine
- **Max Active Loans:** A student can borrow up to **5 books** concurrently.
- **Loan Duration:** Default loan period is **14 days**.
- **Overdue Calculations:** If a book is returned after its `due_date`, the system computes fines dynamically at **$1.00 per overdue day**.
- **Inventory Updates:** Borrowing atomically decrements `available_copies`; returning increments `available_copies` while respecting constraint `available_copies <= total_copies`.

### 3. 3D WebGL Layer
- Implemented using **Three.js** and **React Three Fiber**.
- **Landing Page:** Interactive floating books responding to mouse parallax.
- **Book Details Page:** A 3D realistic hardcover book that rotates on mouse drag, features page thickness, binding foil, and dynamic lighting.
- Visual-only: All HTML controls remain fully keyboard-accessible and screen-reader compliant.

### 4. AI Librarian (Gemini + Local Semantic Engine)
- **Natural Language Chat:** Users ask conversational questions (e.g., *"Can you recommend beginner Python books?"*, *"Do I have any overdue loans?"*).
- **Security Barrier:** Gemini never has direct SQL access. The backend queries PostgreSQL securely within the caller's authorized scope, creates a context summary, and prompts Gemini.
- **High Resilience:** If the external Gemini API is unreachable, times out, or reaches rate limits, the system seamlessly falls back to the internal database semantic reasoning engine.

---

## Complete API Endpoints Catalog

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Access | Request Body | Description |
|:---|:---|:---|:---|:---|
| `POST` | `/api/auth/register` | Public | `UserCreate` (name, email, password) | Register new student account |
| `POST` | `/api/auth/login` | Public | `UserLogin` (email, password) | Authenticate user & return JWT token |
| `GET` | `/api/auth/me` | Authenticated | None | Retrieve authenticated user profile |

### 2. Books Catalog (`/api/books`)
| Method | Endpoint | Access | Query / Body | Description |
|:---|:---|:---|:---|:---|
| `GET` | `/api/books` | Authenticated | `search`, `category`, `available_only`, `skip`, `limit` | Paginated catalog with search/filter |
| `GET` | `/api/books/{id}` | Authenticated | Path `id` | Get book details by ID |
| `POST` | `/api/books` | Librarian, Admin | `BookCreate` schema | Add new book to catalog |
| `PUT` | `/api/books/{id}` | Librarian, Admin | `BookUpdate` schema | Modify existing book information |
| `DELETE` | `/api/books/{id}` | Librarian, Admin | Path `id` | Remove book (blocked if actively borrowed) |

### 3. Borrowing Management (`/api/borrowings`)
| Method | Endpoint | Access | Query / Body | Description |
|:---|:---|:---|:---|:---|
| `POST` | `/api/borrowings` | Student, Librarian, Admin | `BorrowingCreate` (book_id) | Borrow a copy of a book |
| `POST` | `/api/borrowings/{id}/return` | Student, Librarian, Admin | Path `id` | Return a borrowed book |
| `GET` | `/api/borrowings/my` | Authenticated | `status` (optional) | View current user's active borrowings |
| `GET` | `/api/borrowings/history` | Authenticated | `skip`, `limit` | View user's borrowing history |
| `GET` | `/api/borrowings/all` | Librarian, Admin | `status`, `skip`, `limit` | View all borrowings across all users |
| `GET` | `/api/borrowings/overdue` | Librarian, Admin | None | List all currently overdue borrowings |

### 4. Admin Operations (`/api/admin`)
| Method | Endpoint | Access | Query / Body | Description |
|:---|:---|:---|:---|:---|
| `GET` | `/api/admin/stats` | Admin | None | System dashboard metrics (totals, counts, fines) |
| `GET` | `/api/admin/users` | Admin | `role`, `skip`, `limit` | List all registered users |
| `PUT` | `/api/admin/users/{id}/role` | Admin | `UserRoleUpdate` (role) | Update user role (Student/Librarian/Admin) |
| `PUT` | `/api/admin/users/{id}/status`| Admin | `UserStatusUpdate` (is_active)| Enable or disable user account |
| `GET` | `/api/admin/audit-logs` | Admin | `skip`, `limit` | Retrieve system audit logs |

### 5. AI Librarian (`/api/ai`)
| Method | Endpoint | Access | Request Body | Description |
|:---|:---|:---|:---|:---|
| `POST` | `/api/ai/chat` | Authenticated | `AIChatRequest` (message, conversation_history) | Context-aware library assistant |
| `POST` | `/api/ai/recommend` | Authenticated | `AIRecommendRequest` (interests, previous_books) | Personalized recommendations |
| `POST` | `/api/ai/search` | Authenticated | `AISearchRequest` (query) | Natural language semantic search |

---

## Complete Code Methods & Functions Reference

### Backend Core & Routers

#### `auth.py`
- `verify_password(plain_password: str, hashed_password: str) -> bool`: Validates password hash.
- `get_password_hash(password: str) -> str`: Generates secure Argon2/Bcrypt hash.
- `create_access_token(data: dict, expires_delta: Optional[timedelta]) -> str`: Encodes JWT token.
- `get_current_user(token: str, db: Session) -> User`: Decodes JWT, validates user in database.
- `require_role(required_roles: list[UserRole])`: Dependency factory checking user permission.

#### `ai_service.py`
- `chat_with_librarian(user_message: str, user: User, db: Session, history: list) -> str`: Main AI reasoning entrypoint. Formats user loans, library catalog, and prompts Gemini model.
- `recommend_books(interests: str, user: User, db: Session) -> list`: Recommends books based on catalog matching.
- `search_books_semantic(query: str, db: Session) -> list`: Natural language filter over catalog fields.
- `_fallback_reasoning_engine(prompt: str, context: dict) -> str`: Deterministic local NLP fallback engine.

#### `books_router.py`
- `get_books(db, search, category, available_only, skip, limit)`: Paginated query filter.
- `create_book(book_in, db, current_user)`: Inserts new book, logs audit event.
- `update_book(book_id, book_in, db, current_user)`: Updates book attributes and checks copy count constraints.
- `delete_book(book_id, db, current_user)`: Deletes book if no active borrowings exist.

#### `borrowings_router.py`
- `borrow_book(borrow_in, db, current_user)`: Validates 5-book limit, decrements copy count, creates record with 14-day due date.
- `return_book(borrowing_id, db, current_user)`: Marks return, computes fine if overdue, increments available copies.
- `get_my_borrowings(db, current_user)`: Returns current active loans for authenticated user.
- `get_overdue_borrowings(db, current_user)`: Finds all unreturned books past due date.

#### `admin_router.py`
- `get_admin_stats(db, current_user)`: Aggregates total books, active loans, overdue counts, and collected fines.
- `update_user_role(user_id, role_in, db, current_user)`: Promotes/demotes user role.
- `toggle_user_status(user_id, status_in, db, current_user)`: Activates or deactivates user accounts.

---

### Frontend Services & Components

#### `src/lib/api.ts`
- `authApi.login(credentials)`: Calls `/api/auth/login`, saves JWT to `localStorage`.
- `authApi.register(data)`: Calls `/api/auth/register`.
- `authApi.getMe()`: Calls `/api/auth/me`.
- `booksApi.getAll(params)`: Retrieves book list with search/filter.
- `booksApi.getById(id)`: Retrieves single book details.
- `borrowingsApi.borrow(bookId)`: Submits borrow request.
- `borrowingsApi.returnBook(borrowingId)`: Submits return request.
- `borrowingsApi.getMy()`: Fetches user loans.
- `adminApi.getStats()`: Fetches admin metrics.
- `aiApi.chat(message, history)`: Submits chat message to AI assistant.

#### `src/components/3d/BookScene3D.tsx`
- `<BookScene3D coverUrl title author />`: Renders canvas with lighting, rotation controls, and 3D mesh.
- `<BookModel />`: Procedural 3D hardcover mesh with page texture and shadow mapping.

#### `src/components/AILibrarianWidget.tsx`
- Floating drawer available across all pages with animated chat bubbles, quick prompt suggestions, and book link cards.

---

## Database Schema (Supabase PostgreSQL)

```sql
-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'STUDENT',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Books Table
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100),
    publisher VARCHAR(255),
    publication_year INT,
    cover_url VARCHAR(500),
    total_copies INT NOT NULL DEFAULT 1,
    available_copies INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_total_copies_non_negative CHECK (total_copies >= 0),
    CONSTRAINT check_available_copies_non_negative CHECK (available_copies >= 0),
    CONSTRAINT check_available_copies_lte_total CHECK (available_copies <= total_copies)
);

-- 3. Borrowings Table
CREATE TABLE borrowings (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INT NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
    borrowed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ NOT NULL,
    returned_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'BORROWED',
    fine_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Favorites Table
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_book_favorite UNIQUE (user_id, book_id)
);

-- 5. Audit Logs Table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Setup & Running Locally

### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate       # Windows PowerShell
pip install -r requirements.txt
```

Verify your `backend/.env` file contains:
```ini
DATABASE_URL=postgresql://postgres.your_project_ref:your_password@your_pooler_host:5432/postgres
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-flash-latest
JWT_SECRET=your_jwt_secret_key_here
```

Run database migration & sync to Supabase:
```bash
python migrate_to_supabase.py
```

Start the FastAPI server:
```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
Swagger UI will be available at: `http://127.0.0.1:8000/docs`

---

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open: `http://localhost:3000`

---

## Pre-configured Demo Accounts

| Role | Email | Password | Access Highlights |
|:---|:---|:---|:---|
| **Student** | `student@example.com` | `student123` | Book search, 3D viewer, 14-day borrowing, AI assistant |
| **Librarian** | `librarian@example.com` | `librarian123` | Add/Edit/Delete books, return books, overdue tracking |
| **Admin** | `admin@example.com` | `admin123` | User roles, system metrics, audit logs |

---

## Automated Postman Test Suite
Import `postman/BookNest_Postman_Collection.json` into Postman to run automated tests across:
1. `01 Authentication`
2. `02 Books`
3. `03 Search and Filters`
4. `04 Borrowing`
5. `05 RBAC`
6. `06 Validation and Errors`
7. `07 AI Librarian`
