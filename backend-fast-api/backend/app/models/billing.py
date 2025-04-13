from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from ..db.base_class import Base

class BillingPlan(Base):
    __tablename__ = "billing_plans"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    credits = Column(Integer, nullable=False)
    features = Column(JSON, nullable=False)  # Store features as JSON array
    is_best_value = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserCredit(Base):
    __tablename__ = "user_credits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)  # Reference to user table
    credits_balance = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow)

class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, unique=True, index=True)
    user_id = Column(String, nullable=False, index=True)  # Reference to user table
    plan_id = Column(String, ForeignKey("billing_plans.id"))
    credits_added = Column(Integer, nullable=False)
    amount_paid = Column(Float, nullable=False)
    payment_method = Column(String, nullable=False)  # e.g., "razorpay"
    payment_status = Column(String, nullable=False)  # "pending", "completed", "failed"
    razorpay_order_id = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    plan = relationship("BillingPlan", backref="transactions") 