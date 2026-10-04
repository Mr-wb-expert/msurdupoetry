"""Database engine and session.

One code path for two databases: local SQLite for development and tests,
hosted Postgres (Neon) in production. The only difference is the URL, so
`DATABASE_URL` decides and nothing in the routers needs to know.

SQLite cannot be used on Vercel — function filesystems are ephemeral — which
is why production points at Postgres.
"""

import os
from datetime import datetime, timezone

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./api.db")

# Neon and Vercel hand out plain postgres:// / postgresql:// URLs, which
# SQLAlchemy routes to the legacy psycopg2 driver. requirements.txt ships
# psycopg3 instead, so the scheme is upgraded here and any Neon URL pasted
# as-is connects with the driver that is actually installed.
if DATABASE_URL.startswith(("postgres://", "postgresql://")):
    DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL.split("//", 1)[1]

# SQLite needs the connection thread check relaxed; Postgres does not accept
# the argument at all.
_connect_args = (
    {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args,
    # Neon closes idle pooled connections; pre-ping avoids handing out dead ones.
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False)


if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _sqlite_enforce_foreign_keys(dbapi_connection, _record):
        # SQLite ignores ON DELETE CASCADE unless this is switched on per
        # connection. Without it, deleting a book leaves its reviews behind and
        # the home feed crashes on the orphaned row — while Postgres, which does
        # enforce it, would have quietly deleted them. Turning it on keeps
        # development behaving like production.
        dbapi_connection.execute("PRAGMA foreign_keys=ON")


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: one session per request, always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def utcnow() -> datetime:
    """Naive UTC timestamp.

    Naive on purpose: SQLite has no timezone type, so storing an aware value
    would serialise an offset into the column and break ordering. Everything
    in this project is UTC anyway.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)