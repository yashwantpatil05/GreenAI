"""Database session and base model setup."""
from typing import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session

from .config import get_settings


settings = get_settings()

# Configure engine based on database type
if settings.database_url.startswith("sqlite"):
    # SQLite doesn't support connection pooling parameters
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False},
        echo_pool=False,
    )
else:
    # PostgreSQL with connection pooling
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=20,  # Increased from 5 for better concurrency
        max_overflow=30,  # Increased from 10 for peak loads
        pool_recycle=300,  # Recycle connections after 5 minutes
        pool_timeout=30,  # Wait up to 30 seconds for a connection
        echo_pool=False,  # Set to True for debugging connection pool
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Provide a transactional scope around a series of operations."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Context manager for manual session handling (non-dependency injection)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
