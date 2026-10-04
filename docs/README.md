# BookNest Documentation

This directory contains architecture design, API specifications, and database schema documentation for the BookNest Digital Library project.

## Architecture Guidelines
- Frontend: Next.js + TypeScript
- Backend: Python + FastAPI
- Database: PostgreSQL hosted on Supabase
- **Important Rule**: The frontend communicates with PostgreSQL **ONLY** through FastAPI. Direct database connections or queries from the frontend are strictly prohibited.
