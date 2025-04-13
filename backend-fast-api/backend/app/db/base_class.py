from typing import Any
from datetime import datetime

from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, DateTime

class Base(DeclarativeBase):
    """
    Base class for all database models.
    Automatically generates table name and includes common columns.
    """
    
    @declared_attr
    def __tablename__(cls) -> str:
        """
        Generate __tablename__ automatically from the class name.
        Converts CamelCase to snake_case.
        """
        return ''.join(['_' + c.lower() if c.isupper() else c for c in cls.__name__]).lstrip('_')
    
    # Common columns for all models
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        """String representation of the model."""
        attrs = []
        for key in self.__mapper__.columns.keys():
            if not key.startswith('_'):
                value = getattr(self, key)
                attrs.append(f"{key}={value!r}")
        return f"{self.__class__.__name__}({', '.join(attrs)})" 