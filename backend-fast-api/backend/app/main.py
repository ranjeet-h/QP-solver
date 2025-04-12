from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import api_router
from app.db.database import engine, Base
import asyncio
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

# Disable noisy logs
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)

# Get logger for this file
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully")
        logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}")
        logger.info("API documentation available at /docs and /redoc")
    except Exception as e:
        logger.error("Failed to initialize database tables", exc_info=False)
        raise
    yield
    # Shutdown
    # Add any cleanup code here if needed

# Create FastAPI app
app = FastAPI(
    lifespan=lifespan,
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    �� Question Paper Solver API

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
    openapi_url="/api/v1/openapi.json",  # Customize OpenAPI schema URL
    docs_url="/docs",  # Keep default Swagger UI URL
    redoc_url="/redoc",  # Keep default ReDoc URL
    swagger_ui_parameters={"defaultModelsExpandDepth": -1}  # Hide schemas section by default
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
