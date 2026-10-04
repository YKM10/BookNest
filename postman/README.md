# BookNest Postman API Testing Suite

This directory contains the complete Postman collection and environment configurations for the **BookNest Digital Library** FastAPI backend.

## Files

- [`BookNest_Postman_Collection.json`](./BookNest_Postman_Collection.json): Full Postman Collection (v2.1.0) with automated JavaScript test assertions, dynamic JWT token captures, and variable propagation.
- [`BookNest_Postman_Environment.json`](./BookNest_Postman_Environment.json): Pre-configured Postman environment holding target host and execution variables.

---

## Postman Environment Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `base_url` | `http://localhost:8000` | FastAPI server base URL |
| `student_token` | `""` | Populated dynamically upon student login |
| `librarian_token` | `""` | Populated dynamically upon librarian login |
| `admin_token` | `""` | Populated dynamically upon admin login |
| `book_id` | `1` | Catalog book identifier for tests |
| `temp_book_id` | `1` | Ephemeral book identifier for create/update/delete tests |
| `borrowing_id` | `1` | Loan identifier for borrow/return tests |

---

## Collection Structure

### 01 Authentication
1. **Register Student** (`POST /api/auth/register`): Validates automatic assignment of the `STUDENT` role (HTTP 201).
2. **Login Student** (`POST /api/auth/login`): Authenticates student (`student@example.com` / `student123`) and saves `student_token`.
3. **Login Librarian** (`POST /api/auth/login`): Authenticates librarian (`librarian@example.com` / `librarian123`) and saves `librarian_token`.
4. **Login Admin** (`POST /api/auth/login`): Authenticates administrator (`admin@example.com` / `admin123`) and saves `admin_token`.
5. **Get Current User** (`GET /api/auth/me`): Validates profile retrieval with JWT bearer token (HTTP 200).

### 02 Books
1. **Create Book** (`POST /api/books`): Staff book creation with ISBN and copy stock (HTTP 201).
2. **Get All Books** (`GET /api/books`): Lists catalog items and captures fallback `book_id` (HTTP 200).
3. **Get Book** (`GET /api/books/{{book_id}}`): Retrieves individual book metadata (HTTP 200).
4. **Update Book** (`PUT /api/books/{{temp_book_id}}`): Updates book details and inventory counts (HTTP 200).
5. **Delete Book** (`DELETE /api/books/{{temp_book_id}}`): Deletes book from catalog (HTTP 200).

### 03 Search and Filters
1. **Search by title** (`GET /api/books?search=Python`): Keyword query matching title/description (HTTP 200).
2. **Search by author** (`GET /api/books?author=Martin`): Author substring filter (HTTP 200).
3. **Search by category** (`GET /api/books?category=Software Engineering`): Exact category filter (HTTP 200).
4. **Filter available books** (`GET /api/books?available=true`): Only returns books with available copies > 0 (HTTP 200).

### 04 Borrowing
1. **Borrow Book** (`POST /api/borrowings/borrow/{{book_id}}`): Decreases available copies and creates loan (HTTP 201 / 409).
2. **Return Book** (`POST /api/borrowings/return/{{borrowing_id}}`): Returns book and checks fine calculation (HTTP 200 / 409).
3. **My Borrowings** (`GET /api/borrowings/my`): Lists active student loans (HTTP 200).
4. **Borrowing History** (`GET /api/borrowings/history`): Lists complete loan history (HTTP 200).
5. **Overdue Books** (`GET /api/borrowings/overdue`): Displays overdue books across the library for staff (HTTP 200).

### 05 RBAC
1. **Student accessing Librarian endpoint** (`POST /api/books`): Student denied book creation (HTTP 403 Forbidden).
2. **Student accessing Admin endpoint** (`GET /api/admin/users`): Student denied user administration (HTTP 403 Forbidden).
3. **Librarian accessing Admin endpoint** (`GET /api/admin/stats`): Librarian denied system metrics (HTTP 403 Forbidden).
4. **Admin accessing Admin endpoint** (`GET /api/admin/stats`): Admin successfully accesses system stats (HTTP 200 OK).

### 06 Validation and Errors
1. **Invalid login** (`POST /api/auth/login`): Wrong password rejected (HTTP 401 Unauthorized).
2. **Missing JWT** (`GET /api/auth/me`): Calling protected route without token rejected (HTTP 401 Unauthorized).
3. **Invalid book ID** (`GET /api/books/999999`): Requesting non-existent book returns HTTP 404 Not Found.
4. **Duplicate ISBN** (`POST /api/books`): Existing ISBN rejected (HTTP 409 Conflict).
5. **No available copies** (`POST /api/borrowings/borrow/999999`): Borrowing non-existent or zero-copy book rejected (HTTP 404 / 409).
6. **Duplicate active borrowing** (`POST /api/borrowings/borrow/{{book_id}}`): Holding active loan of same book rejected (HTTP 409 Conflict).
7. **Invalid request data** (`POST /api/books`): Empty required fields rejected by Pydantic (HTTP 422 Unprocessable Entity).
8. **Unauthorized role** (`DELETE /api/books/{{book_id}}`): Student attempting book deletion rejected (HTTP 403 Forbidden).

---

## How to Import & Run in Postman

1. Open **Postman**.
2. Click **Import** (top left).
3. Drag & drop or select:
   - `postman/BookNest_Postman_Collection.json`
   - `postman/BookNest_Postman_Environment.json`
4. Select the **BookNest Local Environment** in the top-right environment dropdown.
5. Make sure the FastAPI backend is running (`uvicorn main:app --reload --port 8000`).
6. Run requests in folder order (or use Postman's **Run collection** feature). The login requests automatically set the tokens for subsequent folder requests.
