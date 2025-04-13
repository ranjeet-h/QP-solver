from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
import logging

from ..models.user import User
from ..core.exceptions import NotFoundException, DatabaseError

class AuthRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str) -> Optional[User]:
        try:
            return self.db.query(User).filter(User.email == email).first()
        except SQLAlchemyError as e:
            raise DatabaseError(f"Error fetching user by email: {str(e)}")

    def get_user_by_phone(self, phone_number: str) -> Optional[User]:
        try:
            return self.db.query(User).filter(User.phone_number == phone_number).first()
        except SQLAlchemyError as e:
            raise DatabaseError(f"Error fetching user by phone: {str(e)}")

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise NotFoundException(f"User with id {user_id} not found")
            return user
        except SQLAlchemyError as e:
            raise DatabaseError(f"Error fetching user by id: {str(e)}")

    def create_user(self, user_data: dict) -> User:
        try:
            # Explicitly create User instance and set attributes
            user = User()
            user.email = user_data.get('email')
            user.password = user_data.get('password') # Hashed password
            user.first_name = user_data.get('first_name')
            user.last_name = user_data.get('last_name') # Optional
            user.phone_number = user_data.get('phone_number') # Optional
            user.latitude = user_data.get('latitude') # Optional
            user.longitude = user_data.get('longitude') # Optional
            user.ip_address = user_data.get('ip_address') # Optional
            
            # is_active and is_superuser have defaults in the model, 
            # but can be overridden if present in user_data
            if 'is_active' in user_data:
                user.is_active = user_data['is_active']
            if 'is_superuser' in user_data:
                user.is_superuser = user_data['is_superuser']

            # Add logging to see the constructed user object before adding
            logging.info(f"Constructed User object: {user.__dict__}")

            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
            return user
        except SQLAlchemyError as e:
            self.db.rollback()
            logging.error(f"SQLAlchemyError in create_user: {e}") # More specific log
            logging.error(f"Data attempted: {user_data}") # Log input data again on error
            raise DatabaseError(f"Error creating user: {str(e)}")

    def update_user(self, user: User, update_data: dict) -> User:
        try:
            for field, value in update_data.items():
                setattr(user, field, value)
            self.db.commit()
            self.db.refresh(user)
            return user
        except SQLAlchemyError as e:
            self.db.rollback()
            raise DatabaseError(f"Error updating user: {str(e)}")

    def update_password(self, user: User, new_password: str) -> User:
        try:
            user.password = new_password
            self.db.commit()
            self.db.refresh(user)
            return user
        except SQLAlchemyError as e:
            self.db.rollback()
            raise DatabaseError(f"Error updating password: {str(e)}")

    def get_all_users(self) -> list[User]:
        """Get all users from the database"""
        try:
            return self.db.query(User).all()
        except SQLAlchemyError as e:
            raise DatabaseError(f"Error fetching all users: {str(e)}") 