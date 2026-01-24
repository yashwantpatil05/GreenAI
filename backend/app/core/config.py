from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


_ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    # Loads .env in project root (same folder where you run uvicorn/alembic)
    model_config = SettingsConfigDict(
        env_file=_ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Core
    app_name: str = Field(default="GreenAI")
    env: str = Field(default="local")

    # DB
    database_url: str = Field(..., alias="DATABASE_URL")

    # Auth/JWT
    jwt_secret_key: SecretStr = Field(..., alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=60 * 24, alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    # Redis (safe default so app boots even if redis not configured)
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    # Supabase (needed once you enable Supabase Auth signup)
    supabase_url: str = Field(..., alias="SUPABASE_URL")
    supabase_service_role_key: SecretStr = Field(..., alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_anon_key: SecretStr | None = Field(default=None, alias="SUPABASE_ANON_KEY")

    # Supabase JWT verification (for direct Supabase tokens)
    supabase_jwt_secret: SecretStr = Field(..., alias="SUPABASE_JWT_SECRET")
    supabase_jwt_audience: str | None = Field(default=None, alias="SUPABASE_JWT_AUD")
    supabase_jwt_issuer: str | None = Field(default=None, alias="SUPABASE_JWT_ISS")

    # Workers / compute
    sync_compute: bool = Field(default=True, alias="SYNC_COMPUTE")

    # Rate limiting
    rate_limit_ingest_per_minute: int = Field(default=120, alias="RATE_LIMIT_INGEST_PER_MINUTE")
    rate_limit_user_per_minute: int = Field(default=60, alias="RATE_LIMIT_USER_PER_MINUTE")
    rate_limit_burst_multiplier: int = Field(default=2, alias="RATE_LIMIT_BURST_MULTIPLIER")

    # Observability
    enable_metrics: bool = Field(default=False, alias="ENABLE_METRICS")
    log_json: bool = Field(default=False, alias="LOG_JSON")

    # Dev seed
    enable_dev_seed: bool = Field(default=False, alias="ENABLE_DEV_SEED")

    # Razorpay
    razorpay_key_id: str = Field(default="", alias="RAZORPAY_KEY_ID")
    razorpay_key_secret: SecretStr = Field(default=SecretStr(""), alias="RAZORPAY_KEY_SECRET")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
