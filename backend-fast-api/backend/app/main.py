from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import api_router
from app.db.database import engine, Base
import asyncio

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    🚀 Question Paper Solver API

    This API provides endpoints for:
    * 👤 User Authentication and Management
    * 📝 PDF Question Paper Processing
    * 💳 Payment and Credit Management
    
    ## Features
    * Process question papers using Gemini AI
    * User authentication with JWT
    * Credit-based system for paper processing
    * Secure payment integration
    
    ## Authentication
    All protected endpoints require a valid JWT token obtained through the login endpoint.
    Include the token in the Authorization header as: `Bearer <token>`
    """,
    openapi_tags=[
        {
            "name": "authentication",
            "description": "Operations for user registration, login, and profile management"
        },
        {
            "name": "pdf-processing",
            "description": "Endpoints for processing question papers and reference materials"
        },
        {
            "name": "payment",
            "description": "Payment operations and credit management"
        }
    ],
    contact={
        "name": "API Support",
        "email": "support@qpsolver.com",
    },
    license_info={
        "name": "MIT",
    }
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")

# Create tables if they don't exist
@app.on_event("startup")
async def init_db():
    """Initialize the database on startup"""
    Base.metadata.create_all(bind=engine)

@app.get("/")
async def root():
    """Root endpoint to check if the API is running"""
    return {
        "message": "Welcome to the PDF Processing API",
        "docs": "/docs",
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
