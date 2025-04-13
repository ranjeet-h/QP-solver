from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# Base model for common fields
class HistoryBase(BaseModel):
    pdf_name: str
    title: str

# Schema for items displayed in the history list (like the screenshot)
class HistoryListItem(HistoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True # Enable ORM mode for SQLAlchemy model conversion

# Schema for the detailed view of a single history item (when user clicks on one)
class HistoryDetail(HistoryListItem):
    result: str # Include the full result

    class Config:
        from_attributes = True

# Schema for the response containing a list of history items
class HistoryListResponse(BaseModel):
    history: List[HistoryListItem] 