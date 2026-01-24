"""Entry point for uvicorn - re-exports the FastAPI app."""
import sys
from pathlib import Path

# Ensure the parent directory is in path for proper module resolution
_parent = Path(__file__).resolve().parent.parent
if str(_parent) not in sys.path:
    sys.path.insert(0, str(_parent))

from backend.app.main import app

__all__ = ["app"]
