"""Entry point for FastAPI application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api import router as api_router
from backend.app.api.system import router as system_router
from backend.app.core.config import get_settings
from backend.app.middleware.request_id import request_id_middleware
from backend.app.middleware.logging import logging_middleware


settings = get_settings()
app = FastAPI(title=settings.app_name, redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(request_id_middleware)
app.middleware("http")(logging_middleware)

app.include_router(api_router, prefix="/api")
# Health endpoints at root (internal access)
app.include_router(system_router)
# Also register health endpoints under /api for external access via ingress
app.include_router(system_router, prefix="/api")
