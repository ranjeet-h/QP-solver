from sqlalchemy import (Column, 
                        Integer, 
                        String, 
                        Boolean, 
                        DateTime, 
                        ForeignKey, 
                        Text,
                        Enum)
from sqlalchemy.sql import func
from app.db.database import Base
import uuid

class PDFStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)  # Single password field
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=func.now())

class PDF(Base):
    __tablename__ = "pdfs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))

    status = Column(Enum(
        PDFStatus.PENDING,
        PDFStatus.PROCESSING,
        PDFStatus.COMPLETED,
        PDFStatus.FAILED,
        name='pdf_status_enum'
    ), 
    default=PDFStatus.PENDING, 
    nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    result_path = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)  # Store error messages for failed processing
