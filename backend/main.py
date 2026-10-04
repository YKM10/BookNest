from fastapi import FastAPI
from auth_router import router as auth_router
from books_router import router as books_router
from borrowings_router import router as borrowings_router
from admin_router import router as admin_router
from ai_router import router as ai_router

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="BookNest API",
    version="0.1.0",
    description="Backend API for BookNest Digital Library",
)

import os

# Enable CORS for Next.js frontend (localhost + all Vercel deployments)
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(books_router)
app.include_router(borrowings_router)
app.include_router(admin_router)
app.include_router(ai_router)


@app.get("/")
def read_root():
    return {"message": "Welcome to BookNest API"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
