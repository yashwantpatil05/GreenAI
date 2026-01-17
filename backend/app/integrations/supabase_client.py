from supabase import Client, create_client

from backend.app.core.config import get_settings

_settings = get_settings()


def get_supabase_admin() -> Client:
    return create_client(
        _settings.supabase_url,
        _settings.supabase_service_role_key.get_secret_value(),
    )
