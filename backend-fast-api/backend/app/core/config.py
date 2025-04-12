import os
from dotenv import load_dotenv
from typing import Any

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
    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

    # JWT settings for authentication
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or "supersecretkey-changeme-in-production"
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM") or "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # Google API Key for Gemini
    GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY", "")

    def __str__(self) -> str:
        """Override string representation to hide sensitive data"""
        return f"Settings(PROJECT_NAME={self.PROJECT_NAME}, VERSION={self.VERSION})"

    def __repr__(self) -> str:
        """Override repr to hide sensitive data"""
        return self.__str__()

    def dict(self, exclude_sensitive: bool = True) -> dict[str, Any]:
        """Return settings as dictionary, optionally excluding sensitive data"""
        settings_dict = {
            "PROJECT_NAME": self.PROJECT_NAME,
            "VERSION": self.VERSION,
            "JWT_ALGORITHM": self.JWT_ALGORITHM,
            "ACCESS_TOKEN_EXPIRE_MINUTES": self.ACCESS_TOKEN_EXPIRE_MINUTES,
        }
        
        if not exclude_sensitive:
            sensitive_settings = {
                "MYSQL_USER": self.MYSQL_USER,
                "MYSQL_HOST": self.MYSQL_HOST,
                "MYSQL_PORT": self.MYSQL_PORT,
                "MYSQL_DB": self.MYSQL_DB,
            }
            settings_dict.update(sensitive_settings)
        
        return settings_dict

settings = Settings()
