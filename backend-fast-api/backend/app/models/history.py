from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta
from ..db.base_class import Base
from .user import User  # Import User for relationship

class History(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    pdf_name = Column(String(255), nullable=False)
    title = Column(String(500), nullable=False)  # Title derived from the first part of the result
    result = Column(Text, nullable=False)  # Store the full generated markdown result
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)

    # Define the relationship to the User model
    user = relationship("User")

    # Automatically set expires_at on creation
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not self.created_at:
            self.created_at = datetime.utcnow()
        self.expires_at = self.created_at + timedelta(days=10)

# Optional: Add an index on user_id and created_at for efficient querying of user history
Index("ix_history_user_created", History.user_id, History.created_at) 