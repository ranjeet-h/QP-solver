import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from ...db.database import get_db
from ...schemas.user import UserCreate, UserLogin, UserResponse, Token, PasswordChange, UserUpdate
from ...models.user import User
from ...repositories.auth_repository import AuthRepository
from ...services.auth_service import AuthService
from ...api.dependencies import get_current_active_user

router = APIRouter()

def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    repository = AuthRepository(db)
    return AuthService(repository)

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register New User",
    description="Create a new user account with email/phone and password.",
    response_description="Newly created user details",
    tags=["User Management"],
    responses={
        201: {
            "description": "User successfully created",
            "content": {
                "application/json": {
                    "example": {
                        "id": "123",
                        "email": "user@example.com",
                        "phone_number": "+1234567890",
                        "is_active": True,
                        "created_at": "2024-03-21T10:00:00"
                    }
                }
            }
        },
        400: {
            "description": "Bad Request",
            "content": {
                "application/json": {
                    "example": {"detail": "Email or phone number already registered"}
                }
            }
        }
    }
)
async def register_user(
    user_data: UserCreate,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Register a new user.
    
    Parameters:
        user_data (UserCreate):
            - email: Valid email address
            - phone_number: Valid phone number (optional)
            - password: Strong password (min 8 chars)
            - full_name: User's full name
    
    Returns:
        UserResponse: Created user details (excluding password)
    
    Raises:
        HTTPException: 400 if email/phone already exists
    """
    try:
        return await auth_service.create_user(user_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post(
    "/login",
    response_model=Token,
    summary="User Login",
    description="Authenticate user with email/phone and password to get access token.",
    response_description="JWT access token for authentication",
    tags=["Authentication"],
    responses={
        200: {
            "description": "Successful login",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
                        "token_type": "bearer"
                    }
                }
            }
        },
        401: {
            "description": "Authentication failed",
            "content": {
                "application/json": {
                    "example": {"detail": "Incorrect email/phone or password"}
                }
            }
        }
    }
)
async def user_login(
    login_data: UserLogin,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Authenticate user and return JWT token.

    Parameters:
        login_data (UserLogin):
            - email: Registered email address
            - phone_number: Registered phone number (alternative to email)
            - password: User's password
    
    Returns:
        Token: JWT access token and type
    
    Raises:
        HTTPException: 401 if authentication fails
    """
    try:
        return await auth_service.authenticate_user(
            email=login_data.email,
            phone_number=login_data.phone_number,
            password=login_data.password
        )
    except Exception as e:
        logging.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/phone or password"
        )

@router.post(
    "/change-password",
    response_model=dict,
    summary="Change Password",
    description="Allow authenticated user to change their password.",
    response_description="Success message",
    tags=["User Management"],
    responses={
        200: {
            "description": "Password successfully changed",
            "content": {
                "application/json": {
                    "example": {"message": "Password updated successfully"}
                }
            }
        },
        401: {
            "description": "Authentication failed",
            "content": {
                "application/json": {
                    "example": {"detail": "Current password is incorrect"}
                }
            }
        }
    }
)
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Change user's password.
    
    Parameters:
        password_data (PasswordChange):
            - current_password: Current password for verification
            - new_password: New password to set
    
    Returns:
        dict: Success message
    
    Raises:
        HTTPException: 401 if current password is incorrect
    """
    try:
        await auth_service.change_password(
            user_id=current_user.id,
            current_password=password_data.current_password,
            new_password=password_data.new_password
        )
        return {"message": "Password updated successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

@router.put("/edit-profile", 
    response_model=UserResponse)
async def edit_user_details(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Update profile details for the currently authenticated user.

    Parameters:
    - **email**: New email address (optional)
    - **phone_number**: New phone number (optional)
    - **first_name**: New first name (optional)
    - **last_name**: New last name (optional)
    - **latitude**: New latitude (optional)
    - **longitude**: New longitude (optional)

    Returns:
    - Updated user object
    """
    try:
        return await auth_service.update_user_profile(current_user, user_data)
    except Exception as e:
        logging.error(f"Profile update error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

@router.get(
    "/get/user",
    response_model=UserResponse,
    summary="Get Current User",
    description="Get details of the currently authenticated user.",
    response_description="Current user's profile information",
    tags=["User Management"],
    responses={
        200: {
            "description": "User details retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "123",
                        "email": "user@example.com",
                        "phone_number": "+1234567890",
                        "full_name": "John Doe",
                        "is_active": True,
                        "created_at": "2024-03-21T10:00:00"
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
        }
    }
)
async def get_current_user_details(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get details of the currently authenticated user.

    Returns:
        UserResponse: Current user's details (excluding password)
    
    Raises:
        HTTPException: 401 if not authenticated
    """
    try:
        return current_user
    except Exception as e:
        logging.error(f"Error fetching user details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to fetch user details"
        )

@router.get(
    "/users",
    response_model=list[UserResponse],
    summary="Get All Users",
    description="Get a list of all users in the system (admin only).",
    response_description="List of all user profiles",
    tags=["Admin"],
    responses={
        200: {
            "description": "List of users retrieved successfully",
            "content": {
                "application/json": {
                    "example": [{
                        "id": "123",
                        "email": "user1@example.com",
                        "phone_number": "+1234567890",
                        "full_name": "John Doe",
                        "is_active": True,
                        "created_at": "2024-03-21T10:00:00"
                    }]
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
        403: {
            "description": "Not authorized",
            "content": {
                "application/json": {
                    "example": {"detail": "Not authorized to view all users"}
                }
            }
        }
    }
)
async def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Get a list of all users in the system.
    Note: This endpoint should be restricted to admin users in production.

    Returns:
        List[UserResponse]: List of all users' details (excluding passwords)
    
    Raises:
        HTTPException: 401 if not authenticated, 403 if not authorized
    """
    try:
        return await auth_service.get_all_users()
    except Exception as e:
        logging.error(f"Error fetching users list: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users list"
        )
    
