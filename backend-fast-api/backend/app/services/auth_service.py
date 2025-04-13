from typing import Optional
from fastapi import HTTPException, status, Request
from datetime import datetime
import logging

from ..repositories.auth_repository import AuthRepository
from ..core.security import get_password_hash, verify_password, create_access_token
from ..schemas.user import UserCreate, UserUpdate, UserResponse, Token
from ..models.user import User

class AuthService:
    def __init__(self, repository: AuthRepository):
        self.repository = repository

    async def create_user(self, user_data: UserCreate) -> User:
        """ Register a new user after validating and processing data. """
        # Validation for email/phone presence is now handled by UserCreate schema validator
        # Removed explicit check here

        # Check for existing user by email (if provided)
        if user_data.email:
            existing_email_user = self.repository.get_user_by_email(user_data.email)
            if existing_email_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
        
        # Check for existing user by phone number (if provided)
        if user_data.phone_number:
            existing_phone_user = self.repository.get_user_by_phone(user_data.phone_number)
            if existing_phone_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already registered"
                )

        # Hash password
        hashed_password = get_password_hash(user_data.password)

        # Prepare user data dictionary for repository
        # Now we don't need to exclude 'email_phone' as it's removed from the schema
        user_dict = user_data.model_dump(exclude={'password'}) 

        # Assign the hashed password
        user_dict['password'] = hashed_password

        # Log the dictionary being passed to the repository
        logging.info(f"Prepared user_dict for repository: {user_dict}")

        # Ensure first_name is present (guaranteed by UserCreate schema)

        # Create user via repository
        try:
            # Pass the dictionary directly, not as keyword arguments
            db_user = self.repository.create_user(user_dict) 
            return db_user
        except Exception as e:
            # Log the detailed database error for debugging
            logging.error(f"Database error during user creation: {e}") # Ensure logging is configured
            # Check if the error is the integrity error we saw
            if "IntegrityError" in str(e) and "first_name" in str(e):
                 logging.error(f"Data passed to repository: {user_dict}") # Log data for debugging
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An internal error occurred while creating the user." # Generic message to user
            )

    async def authenticate_user(self, email: Optional[str] = None, phone_number: Optional[str] = None, password: str = None) -> Token:
        """Authenticate a user and return a token"""
        user = None # Initialize user to None
        # Get user by email or phone
        if email:
            # Repository methods are synchronous
            user = self.repository.get_user_by_email(email)
        elif phone_number:
            # Repository methods are synchronous
            user = self.repository.get_user_by_phone(phone_number)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or phone number required"
            )

        if not user or not verify_password(password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create access token
        access_token = create_access_token(subject=str(user.id))
        return Token(access_token=access_token, token_type="bearer")

    async def update_user_profile(self, current_user: User, user_data: UserUpdate) -> User:
        """Update user profile"""
        update_data = user_data.model_dump(exclude_unset=True)

        # Check email uniqueness
        if user_data.email and user_data.email != current_user.email:
            existing_user = self.repository.get_user_by_email(user_data.email)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )

        # Check phone number uniqueness
        if user_data.phone_number and user_data.phone_number != current_user.phone_number:
            existing_user = self.repository.get_user_by_phone(user_data.phone_number)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already registered"
                )

        return self.repository.update_user(current_user, update_data)

    async def change_password(self, user_id: int, current_password: str, new_password: str) -> User:
        """Change user password"""
        current_user = self.repository.get_user_by_id(user_id)
        
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        if not verify_password(current_password, current_user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )

        hashed_password = get_password_hash(new_password)
        return self.repository.update_password(current_user, hashed_password)

    async def get_user_by_id(self, user_id: int) -> User:
        """Get user by ID"""
        return self.repository.get_user_by_id(user_id)

    async def get_all_users(self) -> list[User]:
        """Get all users"""
        return self.repository.get_all_users() 