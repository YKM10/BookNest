import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from auth import get_current_user
from schemas import (
    AIChatRequest,
    AIChatResponse,
    AIRecommendRequest,
    AIRecommendResponse,
    AISearchRequest,
    AISearchResponse,
)
import ai_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI Librarian"])


@router.post("/chat", response_model=AIChatResponse)
async def ai_chat(
    req: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Interact conversationally with the BookNest AI Librarian.
    Supports natural-language book explanations, borrowing policy queries,
    and user-specific loan status checks respecting RBAC.
    """
    try:
        result = await ai_service.handle_ai_chat(
            message=req.message,
            history=req.history or [],
            book_id=req.book_id,
            user=current_user,
            db=db,
        )
        return AIChatResponse(
            reply=result["reply"],
            suggestions=result.get("suggestions", []),
            books=result.get("books", []),
            source=result.get("source", "gemini"),
        )
    except Exception as exc:
        logger.error(f"Error in /api/ai/chat: {exc}", exc_info=True)
        # Graceful fallback response rather than 500 error
        return AIChatResponse(
            reply="The BookNest AI Librarian encountered a temporary issue processing your request. Please try asking again in a moment.",
            suggestions=["Search catalog", "Check borrowing limits"],
            books=[],
            source="fallback",
        )


@router.post("/recommend", response_model=AIRecommendResponse)
async def ai_recommend(
    req: AIRecommendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get personalized book recommendations grounded in the BookNest catalog.
    """
    try:
        result = await ai_service.handle_ai_recommend(
            preference=req.preference,
            category=req.category,
            limit=req.limit or 5,
            user=current_user,
            db=db,
        )
        return AIRecommendResponse(
            recommendations=result["recommendations"],
            explanation=result["explanation"],
            source=result.get("source", "gemini"),
        )
    except Exception as exc:
        logger.error(f"Error in /api/ai/recommend: {exc}", exc_info=True)
        return AIRecommendResponse(
            recommendations=[],
            explanation="Unable to generate recommendations at this time. Please try browsing the catalog directly.",
            source="fallback",
        )


@router.post("/search", response_model=AISearchResponse)
async def ai_search(
    req: AISearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Semantic natural-language catalog search with AI explanation of results.
    """
    try:
        result = await ai_service.handle_ai_search(
            query=req.query,
            available_only=bool(req.available_only),
            user=current_user,
            db=db,
        )
        return AISearchResponse(
            results=result["results"],
            explanation=result["explanation"],
            total=result["total"],
            source=result.get("source", "gemini"),
        )
    except Exception as exc:
        logger.error(f"Error in /api/ai/search: {exc}", exc_info=True)
        return AISearchResponse(
            results=[],
            explanation="Semantic search service temporarily unavailable.",
            total=0,
            source="fallback",
        )
