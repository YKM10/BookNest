import os
import json
import logging
from typing import Optional, List, Dict, Any
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import or_

from models import User, Book, Borrowing, BorrowingStatus

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

SYSTEM_INSTRUCTION = (
    "You are the official BookNest AI Librarian. You assist university students, "
    "librarians, and patrons with book recommendations, literature explanations, "
    "catalog searches, and borrowing guidance. "
    "Guidelines:\n"
    "1. Be polite, concise, encouraging, and academically helpful.\n"
    "2. BookNest Library Policies: Standard loan period is 14 days; maximum 5 active "
    "borrowings per student; overdue fines accrue at $1.00 per day after the due date.\n"
    "3. Security Rules: NEVER execute SQL. NEVER bypass permissions. NEVER claim you can "
    "directly alter database records, waive fines, or borrow books directly on behalf of users.\n"
    "4. Instruct users to use the 'Borrow' button on book pages to check out books.\n"
    "5. When recommending or discussing books, prioritize titles present in the BookNest catalog."
)


def get_env_variable(key: str, default: str = "") -> str:
    val = os.getenv(key)
    if val and val.strip():
        return val.strip()
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith(f"{key}="):
                        return line.split("=", 1)[1].strip().strip("'\"")
        except Exception:
            pass
    return default


async def call_gemini(
    prompt: str,
    system_instruction: str = SYSTEM_INSTRUCTION,
    temperature: float = 0.3,
    max_tokens: int = 800,
) -> Optional[str]:
    """Call Google Gemini API via official REST endpoint using server-side API key."""
    api_key = get_env_variable("GEMINI_API_KEY", "")
    model_name = get_env_variable("GEMINI_MODEL", "gemini-1.5-flash")

    if not api_key:
        logger.info("GEMINI_API_KEY is not configured; using intelligent fallback engine.")
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
            else:
                logger.warning(
                    f"Gemini API returned status {resp.status_code}: {resp.text[:200]}"
                )
    except Exception as exc:
        logger.warning(f"Gemini API request failed ({exc}); falling back gracefully.")

    return None


def get_user_borrowing_context(db: Session, user: User) -> str:
    """Retrieve ONLY the current authenticated user's borrowings (strictly respecting RBAC)."""
    user_borrowings = (
        db.query(Borrowing)
        .filter(Borrowing.user_id == user.id)
        .order_by(Borrowing.borrowed_at.desc())
        .all()
    )

    active = [b for b in user_borrowings if b.status in [BorrowingStatus.BORROWED, BorrowingStatus.OVERDUE]]
    overdue = [b for b in user_borrowings if b.status == BorrowingStatus.OVERDUE]
    total_fines = sum(float(b.fine_amount or 0) for b in user_borrowings)

    lines = [
        f"Authenticated Patron: {user.name} ({user.email}), Role: {user.role}",
        f"Current Active Loans: {len(active)} (Max limit: 5)",
        f"Overdue Items: {len(overdue)}",
        f"Total Accrued Fines: ${total_fines:.2f}",
    ]

    if active:
        lines.append("Active Checked-out Titles:")
        for b in active:
            title = b.book.title if b.book else f"Book #{b.book_id}"
            due_str = b.due_date.strftime("%Y-%m-%d")
            status_str = f"OVERDUE (${float(b.fine_amount):.2f} fine)" if b.status == BorrowingStatus.OVERDUE else "ON TIME"
            lines.append(f"- \"{title}\" (Due: {due_str}) [{status_str}]")
    else:
        lines.append("Active Checked-out Titles: None (Patron has no active borrowings).")

    return "\n".join(lines)


def get_catalog_summary(db: Session, limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve catalog titles for grounding AI recommendations."""
    books = db.query(Book).limit(limit).all()
    return [
        {
            "id": b.id,
            "title": b.title,
            "author": b.author,
            "category": b.category or "General",
            "available_copies": b.available_copies,
            "total_copies": b.total_copies,
            "description": (b.description or "")[:180],
        }
        for b in books
    ]


async def handle_ai_chat(
    message: str,
    history: List[Any],
    book_id: Optional[int],
    user: User,
    db: Session,
) -> Dict[str, Any]:
    """Process natural-language conversation with the AI Librarian."""
    # Build user-specific borrowing context (RBAC enforced: user only accesses their own borrowings)
    user_ctx = get_user_borrowing_context(db, user)

    # Optional book context
    book_ctx = ""
    target_book = None
    if book_id:
        target_book = db.query(Book).filter(Book.id == book_id).first()
        if target_book:
            book_ctx = (
                f"\nFocused Book Context:\n"
                f"- Title: {target_book.title}\n"
                f"- Author: {target_book.author}\n"
                f"- Category: {target_book.category}\n"
                f"- ISBN: {target_book.isbn}\n"
                f"- Description: {target_book.description}\n"
                f"- Available Copies: {target_book.available_copies} of {target_book.total_copies}\n"
            )

    # Catalog brief
    catalog = get_catalog_summary(db, limit=25)
    catalog_text = "\n".join(
        f"- ID {b['id']}: \"{b['title']}\" by {b['author']} [{b['category']}] ({b['available_copies']} available)"
        for b in catalog
    )

    prompt = (
        f"{user_ctx}\n"
        f"{book_ctx}\n"
        f"\nAvailable BookNest Catalog Highlights:\n{catalog_text}\n\n"
        f"Patron Message: \"{message}\"\n\n"
        f"Respond as the AI Librarian with a clear, helpful answer."
    )

    ai_reply = await call_gemini(prompt)

    # Determine matched books if relevant
    matched_books: List[Book] = []
    if target_book:
        matched_books.append(target_book)
    else:
        # Match any titles mentioned in catalog
        msg_lower = message.lower()
        for b in catalog:
            if b["title"].lower() in msg_lower or b["category"].lower() in msg_lower:
                bk_obj = db.query(Book).filter(Book.id == b["id"]).first()
                if bk_obj and bk_obj not in matched_books:
                    matched_books.append(bk_obj)
                    if len(matched_books) >= 3:
                        break

    if ai_reply:
        suggestions = [
            "What books do you recommend for programming?",
            "Do I have any overdue books?",
            "What is BookNest's loan policy?",
        ]
        return {
            "reply": ai_reply,
            "suggestions": suggestions,
            "books": matched_books,
            "source": "gemini",
        }

    # Intelligent Fallback Engine
    msg_lower = message.lower()
    fallback_reply = ""
    suggestions = [
        "Find beginner Python books that are available",
        "Do I have any overdue books?",
        "Recommend books about architecture",
    ]

    # Check for overdue/borrowing intent
    if any(k in msg_lower for k in ["overdue", "due date", "fine", "my books", "borrowed", "checked out"]):
        user_borrowings = db.query(Borrowing).filter(Borrowing.user_id == user.id).all()
        active = [b for b in user_borrowings if b.status in [BorrowingStatus.BORROWED, BorrowingStatus.OVERDUE]]
        overdue = [b for b in user_borrowings if b.status == BorrowingStatus.OVERDUE]
        fines = sum(float(b.fine_amount or 0) for b in user_borrowings)

        if overdue:
            titles = ", ".join(f'"{b.book.title}"' for b in overdue if b.book)
            fallback_reply = (
                f"Hello {user.name}, you currently have {len(overdue)} overdue book(s): {titles}. "
                f"Your total accrued fines are ${fines:.2f}. "
                f"Please return them to the library desk or via your dashboard to prevent additional daily fines ($1.00/day)."
            )
        elif active:
            titles = ", ".join(f'"{b.book.title}"' for b in active if b.book)
            fallback_reply = (
                f"Hello {user.name}, you currently have {len(active)} active loan(s): {titles}. "
                f"None of your books are overdue, and you have $0.00 in outstanding fines."
            )
        else:
            fallback_reply = (
                f"Hello {user.name}, you have no books currently checked out. "
                f"You can borrow up to 5 books at a time with a standard 14-day loan period."
            )

    # Check for book explanation intent
    elif target_book or any(k in msg_lower for k in ["what is this book about", "summary", "explain", "about"]):
        b = target_book or (matched_books[0] if matched_books else None)
        if b:
            fallback_reply = (
                f'"{b.title}" by {b.author} is categorized under {b.category or "General Literature"}. '
                f'{b.description or "This title is part of the BookNest academic collection."} '
                f'Currently, {b.available_copies} of {b.total_copies} copies are available to borrow.'
            )
        else:
            fallback_reply = (
                "BookNest offers a rich catalog of academic literature, programming texts, and reference manuals. "
                "You can ask me to explain any specific book by visiting its details page or searching by title!"
            )

    # Check for recommendations/search
    elif any(k in msg_lower for k in ["recommend", "suggest", "popular", "find", "search"]):
        if matched_books:
            titles = ", ".join(f'"{b.title}" by {b.author}' for b in matched_books)
            fallback_reply = (
                f"Here are titles from our catalog that match your interests: {titles}. "
                f"You can review them in the catalog or click to view full details."
            )
        else:
            fallback_reply = (
                "Based on the BookNest catalog, popular categories include Programming, Software Architecture, "
                "and System Design. Explore titles like 'Fluent Python' or 'Clean Architecture'!"
            )
    else:
        fallback_reply = (
            f"Hello {user.name}! I am your BookNest AI Librarian. I can assist you with natural-language book search, "
            f"recommendations across genres, explaining book topics, or checking your borrowing status and due dates. "
            f"How can I help you today?"
        )

    return {
        "reply": fallback_reply,
        "suggestions": suggestions,
        "books": matched_books,
        "source": "fallback",
    }


async def handle_ai_recommend(
    preference: Optional[str],
    category: Optional[str],
    limit: int,
    user: User,
    db: Session,
) -> Dict[str, Any]:
    """Provide intelligent book recommendations based on user preference or category."""
    query = db.query(Book)
    if category and category.strip():
        query = query.filter(Book.category.ilike(f"%{category.strip()}%"))

    available_books = query.all()
    if not available_books:
        # Fallback to all books if specific category was empty
        available_books = db.query(Book).all()

    catalog_summaries = [
        {"id": b.id, "title": b.title, "author": b.author, "category": b.category, "desc": b.description or ""}
        for b in available_books[:30]
    ]

    prompt = (
        f"You are the BookNest AI Librarian. Recommend up to {limit} books from the following catalog "
        f"matching the patron's request.\n"
        f"Patron Preference: \"{preference or 'High quality academic and programming literature'}\"\n"
        f"Category Focus: \"{category or 'Any'}\"\n"
        f"Catalog Books JSON:\n{json.dumps(catalog_summaries)}\n\n"
        f"Return your response strictly in the following JSON format:\n"
        f'{{"recommended_ids": [ids], "explanation": "Why these books were selected"}}\n'
        f"Do not include any Markdown ticks around the JSON."
    )

    raw_response = await call_gemini(prompt)
    if raw_response:
        try:
            # Clean JSON if model returned markdown codeblocks
            clean_json = raw_response.strip()
            if clean_json.startswith("```"):
                clean_json = clean_json.split("\n", 1)[1]
                if clean_json.endswith("```"):
                    clean_json = clean_json.rsplit("```", 1)[0]
            parsed = json.loads(clean_json.strip())
            rec_ids = parsed.get("recommended_ids", [])
            explanation = parsed.get("explanation", "Recommended based on your preferences.")

            rec_books = (
                db.query(Book).filter(Book.id.in_(rec_ids)).all()
                if rec_ids
                else available_books[:limit]
            )
            return {
                "recommendations": rec_books[:limit],
                "explanation": explanation,
                "source": "gemini",
            }
        except Exception as err:
            logger.warning(f"Failed to parse Gemini recommendation JSON: {err}")

    # Fallback recommendations: Prioritize available books
    sorted_books = sorted(available_books, key=lambda b: (b.available_copies > 0, b.title), reverse=True)
    results = sorted_books[:limit]
    pref_desc = f" for '{preference}'" if preference else ""
    cat_desc = f" in {category}" if category else ""
    explanation = (
        f"Recommended {len(results)} titles from the BookNest catalog{pref_desc}{cat_desc}. "
        f"These books are currently in stock and ready for checkout."
    )

    return {
        "recommendations": results,
        "explanation": explanation,
        "source": "fallback",
    }


async def handle_ai_search(
    query: str,
    available_only: bool,
    user: User,
    db: Session,
) -> Dict[str, Any]:
    """Execute natural-language semantic catalog search."""
    tokens = [t.strip().lower() for t in query.split() if len(t.strip()) > 2]
    # Filter out common stop words
    stop_words = {"the", "and", "for", "that", "this", "with", "about", "are", "books", "book", "find", "show"}
    search_tokens = [t for t in tokens if t not in stop_words]

    catalog = db.query(Book).all()

    # Score each book based on token match in title, author, category, description
    scored: List[tuple[int, Book]] = []
    for b in catalog:
        if available_only and b.available_copies <= 0:
            continue

        score = 0
        text_corpus = f"{b.title} {b.author} {b.category or ''} {b.description or ''}".lower()

        for t in search_tokens:
            if t in b.title.lower():
                score += 5
            elif t in (b.category or "").lower():
                score += 4
            elif t in b.author.lower():
                score += 3
            elif t in text_corpus:
                score += 1

        if score > 0 or not search_tokens:
            scored.append((score, b))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = [item[1] for item in scored[:10]]

    # If nothing matched tokens, return top available if query was generic
    if not results and catalog:
        results = [b for b in catalog if (not available_only or b.available_copies > 0)][:5]

    prompt = (
        f"You are the BookNest AI Librarian. A patron searched: \"{query}\"\n"
        f"Found {len(results)} matching titles from the database:\n"
        + "\n".join(f"- {b.title} by {b.author} ({b.available_copies} available)" for b in results)
        + "\nProvide a 2-sentence explanation of why these search results fit the user's intent."
    )

    ai_exp = await call_gemini(prompt, max_tokens=150)
    explanation = ai_exp or (
        f"Found {len(results)} titles in the BookNest catalog matching your natural language query: \"{query}\"."
    )

    return {
        "results": results,
        "explanation": explanation,
        "total": len(results),
        "source": "gemini" if ai_exp else "fallback",
    }
