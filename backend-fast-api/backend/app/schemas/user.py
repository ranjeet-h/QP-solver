from pydantic import BaseModel, EmailStr, Field, model_validator
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: Optional[EmailStr] = Field(None, description="User's email address")
    phone_number: Optional[str] = Field(None, description="User's phone number")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    ip_address: Optional[str] = None

    @model_validator(mode="after")
    def normalize_fields(self):
        if self.email:
            self.email = self.email.strip().lower()
        if self.phone_number:
            self.phone_number = ''.join(filter(str.isdigit, self.phone_number.strip()))
        return self

    @model_validator(mode="after")
    def check_email_or_phone(self):
        if not self.email and not self.phone_number:
            raise ValueError("Either email or phone number must be provided")
        return self

    class Config:
        from_attributes = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    first_name: str

    @model_validator(mode="after")
    def check_email_or_phone_required(self):
        if not self.email and not self.phone_number:
            raise ValueError("Either email or phone number is required for signup")
        return self

class UserLogin(BaseModel):
    email: Optional[EmailStr] = Field(None, description="User's email address for login")
    phone_number: Optional[str] = Field(None, description="User's phone number for login")
    password: str

    @model_validator(mode="after")
    def check_login_identifier(self):
        if not self.email and not self.phone_number:
            raise ValueError("Either email or phone number must be provided for login")
        if self.email and self.phone_number:
            raise ValueError("Provide either email or phone number for login, not both")

        if self.email:
            self.email = self.email.strip().lower()
        elif self.phone_number:
            self.phone_number = ''.join(filter(str.isdigit, self.phone_number.strip()))

        return self

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=255)
    last_name: Optional[str] = Field(None, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=20)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    email: Optional[EmailStr] = Field(None, max_length=255)

    @model_validator(mode="after")
    def validate_fields(self):
        update_fields = {k: v for k, v in self.model_dump().items() if v is not None}
        if not update_fields:
            raise ValueError("At least one field must be provided for update")

        if self.first_name is not None:
            first_name = self.first_name.strip()
            if not first_name:
                raise ValueError("First name cannot be empty or just whitespace")
            if not first_name.replace(" ", "").isalpha():
                raise ValueError("First name should only contain letters and spaces")
            self.first_name = first_name

        if self.last_name is not None:
            last_name = self.last_name.strip()
            if last_name and not last_name.replace(" ", "").isalpha():
                raise ValueError("Last name should only contain letters and spaces")
            self.last_name = last_name if last_name else None

        if self.phone_number is not None:
            phone = self.phone_number.strip()
            if not phone:
                raise ValueError("Phone number cannot be empty or just whitespace")
            cleaned_number = ''.join(filter(str.isdigit, phone))
            if not cleaned_number:
                raise ValueError("Phone number must contain only digits")
            if not 8 <= len(cleaned_number) <= 15:
                raise ValueError("Phone number length must be between 8 and 15 digits")
            self.phone_number = cleaned_number

        if self.latitude is not None or self.longitude is not None:
            if self.latitude is None or self.longitude is None:
                raise ValueError("Both latitude and longitude must be provided together")

        return self

class UserResponse(BaseModel):
    id: int
    email: Optional[EmailStr]
    phone_number: Optional[str]
    first_name: str
    last_name: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    ip_address: Optional[str]
    is_active: bool
    is_superuser: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = Field(None, description="User ID stored in the token")
    exp: Optional[int] = Field(None, description="Token expiration timestamp")

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