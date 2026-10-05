"""Create tables and, on first run, seed the admin user and the existing books.

Run once per database:

    DATABASE_URL=postgres://... ADMIN_USERNAME=you ADMIN_PASSWORD=... python -m api.seed

It is safe to run again: books are only inserted when the table is empty, and
the admin is only created when the username is not taken.

Descriptions are copied verbatim from the previous hardcoded list. The honesty
rule from that file still applies — only verifiable facts, no invented years,
page counts or reception.
"""

import os
import sys
from datetime import timedelta

from sqlalchemy import inspect, text

from . import models  # noqa: F401  (imported so the metadata is registered)
from .auth import hash_password
from .db import Base, SessionLocal, engine, utcnow
from .models import Admin, Book

# Slugs are written out explicitly rather than derived from the title: these
# URLs are already public, and slugify() would turn "An Article on the Poetry
# of Mujahid Sajjad" into "an-article-on-...", which would 404 the live link.
SEED_BOOKS = [
    {
        "slug": "magar-manzar-nahi-mera",
        "title": "Magar Manzar Nahi Mera",
        "description": (
            "Mujahid Sajjad's collection of Urdu poetry — ghazals and nazms written "
            "from observation rather than abstraction. The poems attend to ordinary "
            "scenes: the street, the classroom, the people passing through, and turn "
            "them into material for reflection. The collection is available here to "
            "read in full online or download as a PDF, free of charge."
        ),
        "pdf_url": "https://drive.google.com/file/d/1L00osyWDKYZFbT4bMrYxjpaDDtxD7YBv/view",
        "cover_image": "/images/magar-manzar-nahi-mera.webp",
        "category": "poetry",
        "author": "Mujahid Sajjad",
        "published_year": 2026,
        "sort_order": 0,
    },
    {
        "slug": "article-on-the-poetry-of-mujahid-sajjad",
        "title": "An Article on the Poetry of Mujahid Sajjad",
        "description": (
            "A critical study of Mujahid Sajjad's poetry by Ghazala Anjum — a reading "
            "of the collection's images, its plainspoken idiom and the way it holds "
            "observation and feeling in balance. Included in the library because it "
            "is the one sustained piece of criticism written about this work, and "
            "students of Urdu poetry will find it useful alongside the poems themselves."
        ),
        "pdf_url": "https://drive.google.com/file/d/1AN6iPEFLu2960HJJFQDtBAzv7sUBgKZd/view",
        "cover_image": "/images/article-on-the-poetry-of-mujahid-sajjad.webp",
        "category": "criticism",
        "author": "Ghazala Anjum",
        "published_year": 2026,
        "sort_order": 1,
    },
    {
        "slug": "the-listening-eye-the-seeing-heart",
        "title": "The Listening Eye, the Seeing Heart",
        "description": (
            "A book by Dr Syed Shabih ul Hassan Rizvi, to which Mujahid Sajjad also "
            "contributed. It gathers literary writing that moves between looking and "
            "listening — essays on attention, on reading, and on the habits of "
            "attention that reading and teaching ask of us. The full text is free to "
            "read online or download as a PDF."
        ),
        "pdf_url": "https://drive.google.com/file/d/1jhbyT_cVtr59vFO33kU6IHm8AeLaF-hA/view",
        "cover_image": "/images/the-listening-eye-the-seeing-heart.webp",
        "category": "other",
        "author": "Dr Syed Shabih ul Hassan Rizvi",
        "published_year": 2026,
        "sort_order": 2,
    },
]


def _add_missing_columns() -> None:
    """Bring an existing database up to the current models.

    `create_all` only ever creates tables, so a column added to a model later
    is silently absent from a database that already existed. Reviews gained
    `is_approved` and verses gained `type` after the first release, and this
    is the only place those differences can be reconciled. Both databases
    spell booleans differently, so the DDL differs; neither statement is
    allowed to fail twice.
    """
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    if "reviews" in tables and "is_approved" not in {
        c["name"] for c in inspector.get_columns("reviews")
    }:
        # `BOOLEAN NOT NULL DEFAULT 0` is accepted by SQLite and Postgres alike.
        # The default matters on SQLite, which cannot add a NOT NULL column without
        # one.
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE reviews ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT 0")
            )
        print("added reviews.is_approved")

    if "poems" in tables and "type" not in {
        c["name"] for c in inspector.get_columns("poems")
    }:
        # Nullable on purpose: rows written before the field existed stay
        # readable, and the admin form supplies a value from then on.
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE poems ADD COLUMN type VARCHAR(16)"))
        print("added poems.type")

    if "poems" in tables and "author" not in {
        c["name"] for c in inspector.get_columns("poems")
    }:
        # Same reasoning as type: nullable so old rows keep loading.
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE poems ADD COLUMN author VARCHAR(200)"))
        print("added poems.author")

    if "books" in tables and "created_at" not in {
        c["name"] for c in inspector.get_columns("books")
    }:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE books ADD COLUMN created_at TIMESTAMP"))
        # Backfill so the row inserted last is the newest: the home page
        # features the book with the latest created_at.
        db = SessionLocal()
        now = utcnow()
        for offset, book in enumerate(db.query(Book).order_by(Book.id.desc()).all()):
            book.created_at = now - timedelta(seconds=offset)
        db.commit()
        db.close()
        print("added books.created_at")


def main() -> int:
    Base.metadata.create_all(engine)
    _add_missing_columns()
    db = SessionLocal()

    username = os.environ.get("ADMIN_USERNAME")
    password = os.environ.get("ADMIN_PASSWORD")

    if username and password:
        existing = db.query(Admin).filter(Admin.username == username).first()
        if existing is None:
            db.add(Admin(username=username, password_hash=hash_password(password)))
            db.commit()
            print(f"created admin '{username}'")
        else:
            print(f"admin '{username}' already exists, left alone")
    elif username or password:
        print("set both ADMIN_USERNAME and ADMIN_PASSWORD, or neither", file=sys.stderr)
        return 1

    if db.query(Book).count() == 0:
        for row in SEED_BOOKS:
            db.add(Book(**row))
        db.commit()
        print(f"seeded {len(SEED_BOOKS)} books")
    else:
        print("books table not empty, left alone")

    db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())