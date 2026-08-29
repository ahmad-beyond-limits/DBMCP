from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64, description="Unique username")
    password: str = Field(..., min_length=6, max_length=128, description="User password")
    first_name: str = Field(..., min_length=1, max_length=64, description="User first name")
    last_name: str = Field(..., min_length=1, max_length=64, description="User last name")


class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=64)
    last_name: Optional[str] = Field(None, min_length=1, max_length=64)


class UserLoginRequest(BaseModel):
    username: str
    password: str


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_superuser: bool = False
    is_active: bool = True
    created_at: datetime


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., description="Current password for verification")
    new_password: str = Field(..., min_length=6, max_length=128, description="New password (min 6 characters)")


class DeleteAccountRequest(BaseModel):
    password: str = Field(..., description="User password for confirming account deletion")
