from typing import Optional
from fastapi import HTTPException, status, Request
from datetime import datetime

from ..repositories.auth_repository import AuthRepository
from ..core.security import get_password_hash, verify_password, create_access_token
from ..schemas.user import UserCreate, UserUpdate, UserResponse, Token
from ..models.user import User

class AuthService:
    def __init__(self, repository: AuthRepository):
        self.repository = repository

    async def register_user(self, user_data: UserCreate, request: Optional[Request] = None) -> User:
        """Register a new user"""
        # Check for existing user
        if user_data.email:
            if self.repository.get_user_by_email(user_data.email):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
        elif user_data.phone_number:
            if self.repository.get_user_by_phone(user_data.phone_number):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already registered"
                )

        # Hash password
        hashed_password = get_password_hash(user_data.password)

        # Prepare user data
        user_dict = user_data.model_dump(exclude={'password', 'email_phone'})
        user_dict.update({
            'password': hashed_password,
            'ip_address': request.client.host if request else None,
            'is_active': True,
            'is_superuser': False,
        })

        # Create user
        return self.repository.create_user(user_dict)

    async def authenticate_user(self, email: Optional[str] = None, phone_number: Optional[str] = None, password: str = None) -> Token:
        """Authenticate a user and return a token"""
        # Get user by email or phone
        if email:
            user = self.repository.get_user_by_email(email)
        elif phone_number:
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
            if self.repository.get_user_by_email(user_data.email):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )

        # Check phone number uniqueness
        if user_data.phone_number and user_data.phone_number != current_user.phone_number:
            if self.repository.get_user_by_phone(user_data.phone_number):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already registered"
                )

        return self.repository.update_user(current_user, update_data)

    async def change_password(self, current_user: User, current_password: str, new_password: str) -> User:
        """Change user password"""
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