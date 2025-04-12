from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.dependencies import get_current_active_user
from app.api import models
from app.db.database import get_db
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter()

class PaymentRequest(BaseModel):
    amount: float
    currency: str = "USD"
    description: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "amount": 500.00,
                "currency": "INR",
                "description": "Purchase 500 credits"
            }
        }

class PaymentResponse(BaseModel):
    payment_id: str
    amount: float
    currency: str
    status: str
    checkout_url: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "payment_id": "pay_123456789",
                "amount": 500.00,
                "currency": "INR",
                "status": "pending",
                "checkout_url": "https://razorpay.com/checkout/pay_123456789"
            }
        }

@router.post(
    "/create-session",
    response_model=PaymentResponse,
    summary="Create Payment Session",
    description="Initialize a new payment session for credit purchase using Razorpay.",
    response_description="Payment session details with checkout URL",
    tags=["Payments"],
    responses={
        200: {
            "description": "Payment session created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "payment_id": "pay_123456789",
                        "amount": 500.00,
                        "currency": "INR",
                        "status": "pending",
                        "checkout_url": "https://razorpay.com/checkout/pay_123456789"
                    }
                }
            }
        },
        401: {
            "description": "Not authenticated",
            "content": {
                "application/json": {
                    "example": {"detail": "Not authenticated"}
                }
            }
        },
        400: {
            "description": "Invalid request",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid amount or currency"}
                }
            }
        }
    }
)
async def create_payment_session(
    payment_request: PaymentRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a payment session for credit purchase.
    
    Parameters:
        payment_request (PaymentRequest):
            - amount: Payment amount (in specified currency)
            - currency: Currency code (default: INR)
            - description: Optional payment description
        current_user: Authenticated user making the payment
    
    Returns:
        PaymentResponse: Payment session details including:
            - payment_id: Unique payment identifier
            - amount: Payment amount
            - currency: Currency code
            - status: Current payment status
            - checkout_url: URL to complete payment
    
    Raises:
        HTTPException: 401 if not authenticated, 400 if invalid request
    """
    # Generate a unique payment ID
    payment_id = str(uuid.uuid4())
    
    # In a real implementation, you would:
    # 1. Create a payment intent/session with Razorpay
    # 2. Store payment details in your database
    # 3. Return checkout URL or payment token
    
    return PaymentResponse(
        payment_id=payment_id,
        amount=payment_request.amount,
        currency=payment_request.currency,
        status="pending",
        checkout_url=f"https://razorpay.com/checkout/{payment_id}"
    )

@router.get(
    "/status/{payment_id}",
    response_model=PaymentResponse,
    summary="Get Payment Status",
    description="Check the current status of a payment transaction.",
    response_description="Current payment status and details",
    tags=["Payments"],
    responses={
        200: {
            "description": "Payment status retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "payment_id": "pay_123456789",
                        "amount": 500.00,
                        "currency": "INR",
                        "status": "completed"
                    }
                }
            }
        },
        404: {
            "description": "Payment not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Payment not found"}
                }
            }
        },
        401: {
            "description": "Not authenticated",
            "content": {
                "application/json": {
                    "example": {"detail": "Not authenticated"}
                }
            }
        }
    }
)
async def get_payment_status(
    payment_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get the current status of a payment transaction.
    
    Parameters:
        payment_id (str): The unique identifier of the payment
        current_user: Authenticated user requesting status
    
    Returns:
        PaymentResponse: Current payment status and details
    
    Raises:
        HTTPException: 401 if not authenticated, 404 if payment not found
    """
    # In a real implementation, you would:
    # 1. Retrieve payment details from your database
    # 2. Check payment status with Razorpay
    
    return PaymentResponse(
        payment_id=payment_id,
        amount=500.00,  # Placeholder
        currency="INR", # Placeholder
        status="completed"  # Placeholder
    )

@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
    summary="Payment Webhook",
    description="Handle payment status updates from Razorpay.",
    response_description="Webhook processing acknowledgment",
    tags=["Payments"],
    responses={
        200: {
            "description": "Webhook processed successfully",
            "content": {
                "application/json": {
                    "example": {"status": "received"}
                }
            }
        },
        400: {
            "description": "Invalid webhook payload",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid signature"}
                }
            }
        }
    }
)
async def payment_webhook(
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Handle payment webhook notifications from Razorpay.
    
    Parameters:
        payload (dict): Webhook payload from Razorpay containing:
            - event: Event type (payment.success, payment.failed, etc.)
            - payment_id: Razorpay payment ID
            - signature: Webhook signature for verification
    
    Returns:
        dict: Webhook processing acknowledgment
    
    Raises:
        HTTPException: 400 if webhook signature is invalid
    """
    # In a real implementation, you would:
    # 1. Verify the webhook signature
    # 2. Parse the event type (payment succeeded, failed, etc.)
    # 3. Update your database and trigger appropriate actions
    
    return {"status": "received"}
