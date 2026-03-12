"""Authentication schemas."""
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    """Bearer token response."""

    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class MessageResponse(BaseModel):
    message: str
