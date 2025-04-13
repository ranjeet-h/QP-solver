from typing import List, Optional
from datetime import datetime
import uuid

from ..repositories.billing_repository import BillingRepository
from ..schemas.billing import (
    BillingPlanResponse,
    CreditPurchaseRequest,
    CreditTransactionResponse,
    UserCreditResponse,
    CreditTransactionCreate
)
from ..core.exceptions import PaymentError
from ..core.config import settings

class BillingService:
    def __init__(self, repository: BillingRepository):
        self.repository = repository

    async def get_all_plans(self) -> List[BillingPlanResponse]:
        plans = self.repository.get_all_plans()
        return [BillingPlanResponse.from_orm(plan) for plan in plans]

    async def get_plan_by_id(self, plan_id: str) -> BillingPlanResponse:
        plan = self.repository.get_plan_by_id(plan_id)
        return BillingPlanResponse.from_orm(plan)

    async def get_user_credits(self, user_id: str) -> UserCreditResponse:
        credits = self.repository.get_user_credits(user_id)
        return UserCreditResponse.from_orm(credits)

    async def initiate_credit_purchase(
        self, 
        user_id: str,
        purchase_request: CreditPurchaseRequest
    ) -> CreditTransactionResponse:
        # Get the plan details
        plan = self.repository.get_plan_by_id(purchase_request.plan_id)
        
        # Generate unique transaction ID
        transaction_id = f"txn_{uuid.uuid4().hex}"
        
        # Create Razorpay order (mock implementation)
        razorpay_order_id = f"order_{uuid.uuid4().hex}"
        
        # Create initial transaction record
        transaction_data = {
            "transaction_id": transaction_id,
            "user_id": user_id,
            "plan_id": plan.id,
            "credits_added": plan.credits,
            "amount_paid": plan.price,
            "payment_method": purchase_request.payment_method,
            "payment_status": "pending",
            "razorpay_order_id": razorpay_order_id
        }
        
        transaction = self.repository.create_transaction(transaction_data)
        return CreditTransactionResponse.from_orm(transaction)

    async def complete_credit_purchase(
        self,
        transaction_id: str,
        razorpay_payment_id: str,
        payment_status: str
    ) -> CreditTransactionResponse:
        # Update transaction status
        transaction = self.repository.update_transaction_status(
            transaction_id,
            payment_status,
            razorpay_payment_id
        )
        
        if payment_status == "completed":
            # Add credits to user's balance
            self.repository.update_user_credits(
                transaction.user_id,
                transaction.credits_added
            )
        
        return CreditTransactionResponse.from_orm(transaction)

    async def verify_payment(self, razorpay_payment_id: str, razorpay_signature: str) -> bool:
        """Mock implementation of Razorpay payment verification"""
        # In real implementation, verify the payment signature with Razorpay
        return True 