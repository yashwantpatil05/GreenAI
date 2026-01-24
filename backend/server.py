"""Entry point for uvicorn - re-exports the FastAPI app."""
from backend.app.main import app

__all__ = ["app"]
