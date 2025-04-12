import phonenumbers
from pydantic import BaseModel, EmailStr, Field, model_validator
from datetime import datetime
from typing import Optional, List

# User schemas
# Base schema: shared fields
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    first_name: Optional[str] = None  # Optional here, required in UserCreate
    last_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    ip_address: Optional[str] = None

    @model_validator(mode="after")
    def normalize_fields(self):
        # Access and modify attributes directly on self
        if self.email:
            self.email = self.email.strip().lower()
        if self.phone_number:
            self.phone_number = self.phone_number.strip()
        return self # Must return the model instance

    @model_validator(mode="after")
    def check_email_or_phone(self):
        # Access attributes directly on self
        email, phone = self.email, self.phone_number
        if not email and not phone:
            raise ValueError("Either email or phone number must be provided")
        return self # Must return the model instance

# User creation (signup)
class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    first_name: str  # Required here

# User login (email or phone + password)
class UserLogin(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    password: str

    @model_validator(mode="after")
    def check_login_identifier(self):
        # Access attributes directly for mode="after" validator
        email, phone = self.email, self.phone_number
        if not email and not phone:
            raise ValueError("Either email or phone number must be provided to login")
        return self  # Must return the model instance

# Response schema (used in API responses)
class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    first_name: str  # Required in response too

    class Config:
        from_attributes = True  # For Pydantic v2 + SQLAlchemy compatibility

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

# PDF Processing schemas
class PDFResponse(BaseModel):
    id: int
    filename: str
    status: str
    created_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # For Pydantic v2 compatibility with SQLAlchemy
