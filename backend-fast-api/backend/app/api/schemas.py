import phonenumbers
from pydantic import BaseModel, EmailStr, Field, model_validator
from datetime import datetime
from typing import Optional, List

# User schemas
# Base schema: shared fields
class UserBase(BaseModel):
    email_phone: str = Field(..., description="Either email or phone number")
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    first_name: Optional[str] = None  # Optional here, required in UserCreate
    last_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    ip_address: Optional[str] = None

    @model_validator(mode="after")
    def identify_and_set_email_phone(self):
        # Try to identify if input is email or phone
        input_value = self.email_phone.strip()
        
        # Check if it looks like an email (contains @)
        if '@' in input_value:
            self.email = input_value.lower()
        else:
            # Assume it's a phone number if not email
            # Remove any spaces or special characters
            cleaned_number = ''.join(filter(str.isdigit, input_value))
            self.phone_number = cleaned_number
            
        return self

    @model_validator(mode="after")
    def normalize_fields(self):
        if self.email:
            self.email = self.email.strip().lower()
        if self.phone_number:
            self.phone_number = self.phone_number.strip()
        return self

    @model_validator(mode="after")
    def check_email_or_phone(self):
        email, phone = self.email, self.phone_number
        if not email and not phone:
            raise ValueError("Failed to identify valid email or phone number from input")
        return self

# User creation (signup)
class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    first_name: str  # Required here

# User login (email or phone + password)
class UserLogin(BaseModel):
    email_phone: str = Field(..., description="Either email or phone number")
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    password: str

    @model_validator(mode="after")
    def identify_and_set_email_phone(self):
        # Try to identify if input is email or phone
        input_value = self.email_phone.strip()
        
        # Check if it looks like an email (contains @)
        if '@' in input_value:
            self.email = input_value.lower()
        else:
            # Assume it's a phone number if not email
            # Remove any spaces or special characters
            cleaned_number = ''.join(filter(str.isdigit, input_value))
            self.phone_number = cleaned_number
            
        return self

    @model_validator(mode="after")
    def check_login_identifier(self):
        email, phone = self.email, self.phone_number
        if not email and not phone:
            raise ValueError("Failed to identify valid email or phone number from input")
        return self

# User Update schema
class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=255)
    last_name: Optional[str] = Field(None, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=20)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    email: Optional[EmailStr] = Field(None, max_length=255)

    @model_validator(mode="after")
    def validate_fields(self):
        # Ensure at least one field is provided for update
        update_fields = {k: v for k, v in self.model_dump().items() if v is not None}
        if not update_fields:
            raise ValueError("At least one field must be provided for update")

        # Validate first_name
        if self.first_name is not None:
            first_name = self.first_name.strip()
            if not first_name:
                raise ValueError("First name cannot be empty or just whitespace")
            if not first_name.replace(" ", "").isalpha():
                raise ValueError("First name should only contain letters and spaces")
            self.first_name = first_name

        # Validate last_name if provided
        if self.last_name is not None:
            last_name = self.last_name.strip()
            if last_name and not last_name.replace(" ", "").isalpha():
                raise ValueError("Last name should only contain letters and spaces")
            self.last_name = last_name if last_name else None

        # Validate phone_number
        if self.phone_number is not None:
            phone = self.phone_number.strip()
            if not phone:
                raise ValueError("Phone number cannot be empty or just whitespace")
            # Remove any spaces or special characters
            cleaned_number = ''.join(filter(str.isdigit, phone))
            if not cleaned_number:
                raise ValueError("Phone number must contain only digits")
            if not 8 <= len(cleaned_number) <= 15:  # Standard phone number length
                raise ValueError("Phone number length must be between 8 and 15 digits")
            self.phone_number = cleaned_number

        # Validate coordinates if either is provided
        if self.latitude is not None or self.longitude is not None:
            if self.latitude is None or self.longitude is None:
                raise ValueError("Both latitude and longitude must be provided together")

        return self

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
    """JWT token payload containing user ID"""
    sub: Optional[str] = Field(None, description="User ID stored in the token")
    exp: Optional[int] = Field(None, description="Token expiration timestamp")

# PDF Processing schemas
class PDFResponse(BaseModel):
    id: int
    filename: str
    status: str
    created_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # For Pydantic v2 compatibility with SQLAlchemy

# Password change schema
class PasswordChange(BaseModel):
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")
    confirm_password: str = Field(..., min_length=8, description="Confirm new password")

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("New password and confirm password do not match")
        if self.current_password == self.new_password:
            raise ValueError("New password must be different from current password")
        return self
    