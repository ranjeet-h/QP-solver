from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional

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
            user = User(**user_data)
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
            return user
        except SQLAlchemyError as e:
            self.db.rollback()
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