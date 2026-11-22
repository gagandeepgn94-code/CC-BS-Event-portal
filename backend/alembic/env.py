"""
Alembic environment configuration.

- Reads DATABASE_URL from app.core.database.settings (which loads .env).
- Uses Base.metadata for autogenerate support.
- Supports both offline (SQL script) and online (live DB) migration modes.
"""
from __future__ import annotations

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# ── Load app settings & metadata ───────────────────────────────────────────────
# Import settings and Base so Alembic can discover all models for autogenerate.
from app.core.database import Base, settings  # noqa: E402

# Import all models so their tables are registered on Base.metadata
import app.models.models  # noqa: F401, E402

# ── Alembic Config object ──────────────────────────────────────────────────────
config = context.config

# Override sqlalchemy.url with the value from our settings (reads .env)
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# ── Logging ────────────────────────────────────────────────────────────────────
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Target metadata for autogenerate ──────────────────────────────────────────
target_metadata = Base.metadata


# ── Offline mode ───────────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    """
    Run migrations without a live DB connection.
    Outputs SQL to stdout / a file.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


# ── Online mode ────────────────────────────────────────────────────────────────

def run_migrations_online() -> None:
    """
    Run migrations with a live DB connection.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


# ── Entry point ────────────────────────────────────────────────────────────────

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
