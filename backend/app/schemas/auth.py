"""Authentication schemas."""
from pydantic import BaseModel


class Token(BaseModel):
    """Bearer token response."""

    access_token: str
    token_type: str = "bearer"
