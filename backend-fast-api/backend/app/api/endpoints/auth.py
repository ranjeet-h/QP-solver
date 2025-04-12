from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api import schemas, models
from app.core.security import get_password_hash, verify_password, create_access_token
from app.db.database import get_db
import logging

router = APIRouter()

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
    request: Request = None  # to extract IP if needed
):
    """Register a new user with email or phone number, password, and first name"""
    try:
        # Check for duplicate email or phone
        if user_data.email:
            existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )

        if user_data.phone_number:
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
        raise  # Don't swallow HTTPExceptions
    except Exception as e:
        logging.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=schemas.Token)
async def user_login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user using email or phone and return JWT token
    """
    try:
        user_query = db.query(models.User)

        # Determine if login is via email or phone
        if login_data.email:
            user = user_query.filter(models.User.email == login_data.email.lower().strip()).first()
        elif login_data.phone_number:
            user = user_query.filter(models.User.phone_number == login_data.phone_number.strip()).first()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or phone number must be provided"
            )

        if not user or not verify_password(login_data.password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = create_access_token(subject=str(user.id))
        return {"access_token": access_token, "token_type": "bearer"}
    
    except Exception as e:
        logging.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login"
        )