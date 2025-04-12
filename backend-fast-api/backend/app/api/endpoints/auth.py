import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api import schemas, models
from app.core.security import get_password_hash, verify_password, create_access_token
from app.db.database import get_db
from app.api.dependencies import get_current_active_user

router = APIRouter()

@router.post("/register", 
    response_model=schemas.UserResponse, 
    status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
    request: Request = None  # to extract IP if needed
):
    """
    Register a new user in the system.

    Parameters:
    - **email_phone**: Either an email address or phone number. The system will automatically identify the type:
        - If it contains '@', it will be treated as an email
        - Otherwise, it will be treated as a phone number (only digits will be kept)
    - **password**: Strong password (min 8 characters)
    - **first_name**: User's first name (required)
    - **last_name**: User's last name (optional)
    - **latitude**: User's latitude (optional)
    - **longitude**: User's longitude (optional)

    Returns:
    - User object with created user details (password excluded)
        - If email was provided in email_phone, it will be in the email field
        - If phone was provided in email_phone, it will be in the phone_number field

    Raises:
    - 400: Email/Phone already registered
    - 422: Validation Error (invalid email format or phone number)
    - 500: Internal Server Error
    """
    try:
        # Check for duplicate email or phone based on identified type
        if user_data.email:
            existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
        elif user_data.phone_number:
            existing_phone_user = db.query(models.User).filter(models.User.phone_number == user_data.phone_number).first()
            if existing_phone_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already registered"
                )

        # Hash password
        hashed_password = get_password_hash(user_data.password)

        # Extract IP address if available
        ip_address = request.client.host if request else None

        # Create the user
        user = models.User(
            email=user_data.email,
            phone_number=user_data.phone_number,
            password=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            latitude=user_data.latitude,
            longitude=user_data.longitude,
            ip_address=ip_address,
            is_active=True,
            is_superuser=False,
        )

        # Save to DB
        db.add(user)
        db.commit()
        db.refresh(user)

        return user

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", 
    response_model=schemas.Token)
async def user_login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT token.

    Parameters:
    - **email_phone**: Either an email address or phone number. The system will automatically identify the type:
        - If it contains '@', it will be treated as an email
        - Otherwise, it will be treated as a phone number (only digits will be kept)
    - **password**: User's password

    Returns:
    - **access_token**: JWT token for authentication
    - **token_type**: Type of token (always "bearer")

    Raises:
    - 400: Invalid email or phone number format
    - 401: Invalid credentials
    - 422: Validation Error
    - 500: Internal Server Error
    """
    try:
        user_query = db.query(models.User)

        # Use the identified email or phone from the validator
        if login_data.email:
            user = user_query.filter(models.User.email == login_data.email).first()
        elif login_data.phone_number:
            user = user_query.filter(models.User.phone_number == login_data.phone_number).first()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email or phone number format"
            )

        if not user or not verify_password(login_data.password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = create_access_token(subject=str(user.id))
        return {"access_token": access_token, "token_type": "bearer"}
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login"
        )

@router.post("/change-password", 
    status_code=status.HTTP_200_OK)
async def change_password(
    password_data: schemas.PasswordChange,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Change the password for the currently authenticated user.

    Requires authentication token.

    Parameters:
    - **current_password**: Current password for verification
    - **new_password**: New password to set

    Returns:
    - Success message

    Raises:
    - 401: Current password incorrect or invalid token
    - 422: Validation Error
    - 500: Internal Server Error
    """
    try:
        # Verify current password
        if not verify_password(password_data.current_password, current_user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )

        # Hash new password
        hashed_password = get_password_hash(password_data.new_password)

        # Update password in database
        current_user.password = hashed_password
        db.commit()

        return {"message": "Password changed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Password change error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )

@router.put("/edit-profile", 
    response_model=schemas.UserResponse)
async def edit_user_details(
    user_data: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update profile details for the currently authenticated user.

    Requires authentication token.

    Parameters:
    - **email**: New email address (optional)
    - **phone_number**: New phone number (optional)
    - **first_name**: New first name (optional)
    - **last_name**: New last name (optional)
    - **latitude**: New latitude (optional)
    - **longitude**: New longitude (optional)

    Returns:
    - Updated user object (password excluded)

    Raises:
    - 400: Email/Phone already taken
    - 401: Invalid token
    - 422: Validation Error
    - 500: Internal Server Error
    """
    try:
        # Check if email is being updated and if it's already taken
        if user_data.email and user_data.email != current_user.email:
            existing_user = db.query(models.User).filter(
                models.User.email == user_data.email,
                models.User.id != current_user.id
            ).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )

        # Check if phone number is being updated and if it's already taken
        if user_data.phone_number and user_data.phone_number != current_user.phone_number:
            existing_phone_user = db.query(models.User).filter(
                models.User.phone_number == user_data.phone_number,
                models.User.id != current_user.id
            ).first()
            if existing_phone_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already registered"
                )

        # Update user fields
        for field, value in user_data.model_dump(exclude_unset=True).items():
            setattr(current_user, field, value)

        db.commit()
        db.refresh(current_user)

        return current_user

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Profile update error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )
    
