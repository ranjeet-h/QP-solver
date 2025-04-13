from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.api import models
from app.schemas import HistoryListItem, HistoryDetail, HistoryListResponse
# from app.core.security import get_current_user # Remove incorrect import
from app.api.dependencies import get_current_active_user # Import the correct dependency

router = APIRouter()

# Remove the placeholder function as the real one is imported now
# async def get_current_active_user(user: models.User = Depends(get_current_user)) -> models.User:
#     # In a real app, you might check if the user is active
#     if not user: # Or based on a flag like user.is_active
#         raise HTTPException(status_code=400, detail="Inactive user")
#     return user

@router.get(
    "/", 
    response_model=HistoryListResponse, 
    summary="Get User History List",
    description="Retrieves a list of processed PDF history items for the current user, ordered by creation date."
)
def get_history_list(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user) # Use the correct dependency
):
    """
    Fetches the processing history for the logged-in user.
    
    - **Requires authentication.**
    - Returns a list containing ID, PDF name, title, and creation date for each history item.
    - Items are ordered from newest to oldest.
    """
    # Log the user ID being used for the query
    print(f"Fetching history for User ID: {current_user.id}") 
    
    history_items = db.query(models.History)\
                      .filter(models.History.user_id == current_user.id)\
                      .order_by(models.History.created_at.desc())\
                      .all()
    print(f"History items: {history_items}")
    return HistoryListResponse(history=history_items)

@router.get(
    "/{history_id}", 
    response_model=HistoryDetail, 
    summary="Get History Item Detail",
    description="Retrieves the full details, including the generated result, for a specific history item."
)
def get_history_detail(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user) # Use the correct dependency
):
    """
    Fetches the complete details of a specific history item by its ID.

    - **Requires authentication.**
    - Ensures the requested item belongs to the current user.
    - Returns full details including the generated Markdown result.
    """
    history_item = db.query(models.History)\
                     .filter(models.History.id == history_id, models.History.user_id == current_user.id)\
                     .first()
                     
    if not history_item:
        raise HTTPException(status_code=404, detail="History item not found or not owned by user")
        
    return history_item 