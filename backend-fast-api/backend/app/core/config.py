import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    PROJECT_NAME: str = "PDF Processing Backend"
    VERSION: str = "0.1.0"

    # Database settings for MySQL
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "password")
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
    MYSQL_DB = os.getenv("MYSQL_DB", "pdf_backend_db")
    
    # Using pymysql as connector - this is safer than using raw passwords in connection strings
    DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"

    # JWT settings for authentication
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or "supersecretkey-changeme-in-production"
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM") or "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # Google API Key for Gemini
    GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY", "")

settings = Settings()
