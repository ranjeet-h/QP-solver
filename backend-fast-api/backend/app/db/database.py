from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create the SQLAlchemy engine with MySQL
logger.info("Initializing database connection")
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Reconnect on stale connections
    pool_recycle=3600,   # Recycle connections after 1 hour
    echo=False,          # Set to True to see SQL queries in logs
    echo_pool=False      # Disable connection pool logging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    """
    Dependency for getting a database session.
    To be used with FastAPI Depends.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
