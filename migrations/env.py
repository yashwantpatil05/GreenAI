"""Alembic environment configuration."""

import os
import sys

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context
from backend.app.core.config import get_settings
from backend.app.core.database import Base
from backend.app import models  # noqa: F401


config = context.config
fileConfig(config.config_file_name)

settings = get_settings()
# config.set_main_option("sqlalchemy.url", settings.database_url)
config.set_main_option("sqlalchemy.url", settings.database_url.replace("%", "%%"))



target_metadata = Base.metadata


def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
