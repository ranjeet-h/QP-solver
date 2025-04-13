from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional
from datetime import datetime

from ..models.billing import BillingPlan, UserCredit, CreditTransaction
from ..core.exceptions import NotFoundException, DatabaseError

class BillingRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all_plans(self) -> List[BillingPlan]:
        try:
            return self.db.query(BillingPlan).all()
        except SQLAlchemyError as e:
            raise DatabaseError(f"Error fetching billing plans: {str(e)}")

    def get_plan_by_id(self, plan_id: str) -> Optional[BillingPlan]:
        try:
            plan = self.db.query(BillingPlan).filter(BillingPlan.id == plan_id).first()
            if not plan:
                raise NotFoundException(f"Plan with id {plan_id} not found")
            return plan
        except SQLAlchemyError as e:
            raise DatabaseError(f"Error fetching plan: {str(e)}")

    def get_user_credits(self, user_id: str) -> Optional[UserCredit]:
        try:
            credits = self.db.query(UserCredit).filter(UserCredit.user_id == user_id).first()
            if not credits:
                # Initialize credits for new user
                credits = UserCredit(user_id=user_id, credits_balance=0)
                self.db.add(credits)
                self.db.commit()
            return credits
        except SQLAlchemyError as e:
            raise DatabaseError(f"Error fetching user credits: {str(e)}")

    def create_transaction(self, transaction_data: dict) -> CreditTransaction:
        try:
            transaction = CreditTransaction(**transaction_data)
            self.db.add(transaction)
            self.db.commit()
            self.db.refresh(transaction)
            return transaction
        except SQLAlchemyError as e:
            self.db.rollback()
            raise DatabaseError(f"Error creating transaction: {str(e)}")

    def update_user_credits(self, user_id: str, credits_to_add: int) -> UserCredit:
        try:
            user_credits = self.get_user_credits(user_id)
            user_credits.credits_balance += credits_to_add
            user_credits.last_updated = datetime.utcnow()
            self.db.commit()
            self.db.refresh(user_credits)
            return user_credits
        except SQLAlchemyError as e:
            self.db.rollback()
            raise DatabaseError(f"Error updating user credits: {str(e)}")

    def update_transaction_status(
        self, 
        transaction_id: str, 
        status: str,
        razorpay_payment_id: Optional[str] = None
    ) -> CreditTransaction:
        try:
            transaction = self.db.query(CreditTransaction).filter(
                CreditTransaction.transaction_id == transaction_id
            ).first()
            if not transaction:
                raise NotFoundException(f"Transaction {transaction_id} not found")
            
            transaction.payment_status = status
            if razorpay_payment_id:
                transaction.razorpay_payment_id = razorpay_payment_id
            transaction.updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(transaction)
            return transaction
        except SQLAlchemyError as e:
            self.db.rollback()
            raise DatabaseError(f"Error updating transaction: {str(e)}") 