from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class PlanFeatureSchema(BaseModel):
    feature: str
    included: bool

    class Config:
        from_attributes = True

class BillingPlanBase(BaseModel):
    name: str
    price: float = Field(ge=0)
    credits: int = Field(ge=0)
    features: List[PlanFeatureSchema]
    is_best_value: bool = False

class BillingPlanCreate(BillingPlanBase):
    id: str

class BillingPlanResponse(BillingPlanBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserCreditBase(BaseModel):
    credits_balance: int = Field(ge=0)

class UserCreditResponse(UserCreditBase):
    user_id: str
    last_updated: datetime

    class Config:
        from_attributes = True

class CreditPurchaseRequest(BaseModel):
    plan_id: str
    payment_method: str = Field(pattern="^(razorpay)$")

class CreditTransactionBase(BaseModel):
    credits_added: int = Field(ge=0)
    amount_paid: float = Field(ge=0)
    payment_method: str
    payment_status: str = Field(pattern="^(pending|completed|failed)$")

class CreditTransactionCreate(CreditTransactionBase):
    user_id: str
    plan_id: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None

class CreditTransactionResponse(CreditTransactionBase):
    transaction_id: str
    user_id: str
    plan_id: str
    razorpay_order_id: Optional[str]
    razorpay_payment_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 