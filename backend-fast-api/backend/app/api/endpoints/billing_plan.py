from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from sqlalchemy.orm import Session

from ...db.session import get_db
from ...core.auth import get_current_user
from ...schemas.billing import (
    BillingPlanResponse,
    CreditPurchaseRequest,
    CreditTransactionResponse,
    UserCreditResponse
)
from ...repositories.billing_repository import BillingRepository
from ...services.billing_service import BillingService

router = APIRouter()

def get_billing_service(db: Session = Depends(get_db)) -> BillingService:
    repository = BillingRepository(db)
    return BillingService(repository)

@router.get(
    "/plans",
    response_model=List[BillingPlanResponse],
    summary="Get All Billing Plans",
    description="Retrieves a list of all available billing plans with their details including credits and pricing.",
    response_description="List of billing plans with their complete details",
    tags=["Billing Plans"]
)
async def get_billing_plans(
    billing_service: BillingService = Depends(get_billing_service)
):
    """
    Get all available billing plans.
    
    Returns:
        List[BillingPlanResponse]: A list of billing plans containing:
        - plan_id: Unique identifier for the plan
        - name: Name of the plan
        - credits: Number of credits included
        - price: Price in INR
        - description: Detailed plan description
    """
    return await billing_service.get_all_plans()

@router.get(
    "/plans/{plan_id}",
    response_model=BillingPlanResponse,
    summary="Get Plan Details",
    description="Retrieves detailed information about a specific billing plan.",
    response_description="Detailed information about the requested billing plan",
    tags=["Billing Plans"],
    responses={
        404: {
            "description": "Plan not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Plan with specified ID not found"}
                }
            }
        }
    }
)
async def get_plan_details(
    plan_id: str,
    billing_service: BillingService = Depends(get_billing_service)
):
    """
    Get details for a specific plan.
    
    Parameters:
        plan_id (str): The unique identifier of the billing plan
        
    Returns:
        BillingPlanResponse: Detailed plan information
        
    Raises:
        HTTPException: 404 if plan is not found
    """
    try:
        return await billing_service.get_plan_by_id(plan_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.post(
    "/purchase",
    response_model=CreditTransactionResponse,
    summary="Purchase Credits",
    description="Initiates a credit purchase transaction for the authenticated user.",
    response_description="Transaction details for the credit purchase",
    tags=["Credit Transactions"],
    responses={
        400: {
            "description": "Bad Request",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid purchase request"}
                }
            }
        }
    }
)
async def purchase_credits(
    request: CreditPurchaseRequest,
    current_user: dict = Depends(get_current_user),
    billing_service: BillingService = Depends(get_billing_service)
):
    """
    Initiate credit purchase for the current user.
    
    Parameters:
        request (CreditPurchaseRequest): Purchase details including:
            - plan_id: ID of the plan to purchase
            - payment_method: Payment method (e.g., 'razorpay')
            
    Returns:
        CreditTransactionResponse: Transaction details including:
            - transaction_id: Unique transaction identifier
            - status: Transaction status
            - payment_details: Payment gateway specific details
            
    Raises:
        HTTPException: 400 if purchase request is invalid
    """
    try:
        return await billing_service.initiate_credit_purchase(
            user_id=current_user["id"],
            purchase_request=request
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get(
    "/credits/balance",
    response_model=UserCreditResponse,
    summary="Get Credit Balance",
    description="Retrieves the current credit balance for the authenticated user.",
    response_description="User's current credit balance information",
    tags=["Credit Balance"]
)
async def get_credit_balance(
    current_user: dict = Depends(get_current_user),
    billing_service: BillingService = Depends(get_billing_service)
):
    """
    Get current credit balance for the authenticated user.
    
    Returns:
        UserCreditResponse: Credit balance information containing:
            - user_id: ID of the user
            - credits: Current credit balance
            - last_updated: Timestamp of last balance update
    """
    return await billing_service.get_user_credits(current_user["id"])

@router.post(
    "/purchase/callback",
    summary="Razorpay Callback Handler",
    description="Handles the payment callback from Razorpay after payment completion.",
    response_description="Payment verification and credit allocation status",
    tags=["Payment Callbacks"],
    responses={
        400: {
            "description": "Invalid Payment",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid payment signature"}
                }
            }
        }
    }
)
async def razorpay_callback(
    transaction_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    billing_service: BillingService = Depends(get_billing_service)
):
    """
    Handle Razorpay payment callback.
    
    Parameters:
        transaction_id (str): Our internal transaction ID
        razorpay_payment_id (str): Payment ID from Razorpay
        razorpay_signature (str): Payment signature for verification
        
    Returns:
        dict: Transaction completion status
        
    Raises:
        HTTPException: 400 if payment verification fails
    """
    try:
        # Verify the payment signature
        is_valid = await billing_service.verify_payment(
            razorpay_payment_id,
            razorpay_signature
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment signature"
            )
        
        # Complete the purchase
        return await billing_service.complete_credit_purchase(
            transaction_id=transaction_id,
            razorpay_payment_id=razorpay_payment_id,
            payment_status="completed"
        )
    except Exception as e:
        # Mark transaction as failed
        await billing_service.complete_credit_purchase(
            transaction_id=transaction_id,
            razorpay_payment_id=razorpay_payment_id,
            payment_status="failed"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
