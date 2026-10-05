"""SQLAlchemy models.

Field names mirror the TypeScript `Book` type so the existing UI needs no
renaming when data moves out of `lib/books.ts` and into the database.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base, utcnow


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="")
    # Optional path under /public. Omit to render the typographic cover.
    cover_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Google Drive view URL or a direct HTTPS link.
    pdf_url: Mapped[str] = mapped_column(String(500), default="")
    category: Mapped[str] = mapped_column(String(40), default="other")
    author: Mapped[str] = mapped_column(String(200), default="")
    published_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pages: Mapped[int | None] = mapped_column(Integer, nullable=True)
    publication: Mapped[str | None] = mapped_column(String(300), nullable=True)
    # Display order. The first book by the site author is the featured one.
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    # Nullable only so a table created before this column can be altered in
    # place; the default fills it from then on. The home page features the
    # newest book by this timestamp.
    created_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, default=utcnow)

    reviews: Mapped[list["Review"]] = relationship(
        back_populates="book", cascade="all, delete-orphan", passive_deletes=True
    )


class Poem(Base):
    __tablename__ = "poems"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(300))
    # Null only for a row written before this field existed; the admin form
    # always sends one.
    author: Mapped[str | None] = mapped_column(String(200), nullable=True)
    body: Mapped[str] = mapped_column(Text, default="")
    # Ghazal, Nazm or Poem. Nullable so rows written before this field existed
    # keep loading; the admin form always sends one.
    type: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    book: Mapped[Book] = relationship(back_populates="reviews")
    # ON DELETE CASCADE means deleting a book takes its reviews with it,
    # instead of leaving rows pointing at nothing.
    book_id: Mapped[int] = mapped_column(
        ForeignKey("books.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(60))
    body: Mapped[str] = mapped_column(Text)
    # Reviews arrive unapproved and only reach the public feeds once an admin
    # has read them. Defaulting to False is the safe direction: a forgotten
    # moderation queue shows an empty section, never unvetted praise.
    is_approved: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ContactMessage(Base):
    """A message sent through the contact form.

    Newest first when listed. `topic` is free text rather than an enum so a new
    reason can be added on the form without a schema migration.
    """

    __tablename__ = "contact_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(200))
    topic: Mapped[str] = mapped_column(String(60), default="general")
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Video(Base):
    """A video on the public /videos page, newest first.

    Only the URL and a description are stored — the embed id is derived from
    the URL by `youtubeId()` in the frontend, so no two copies can drift.
    """

    __tablename__ = "videos"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Full YouTube URL; validated against YOUTUBE_RE on the way in.
    url: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class MediaFile(Base):
    """An uploaded file, kept in the database rather than on disk.

    Vercel's function filesystem is read-only and ephemeral: a file written
    there is refused with a 500 (or silently lost on the next cold start).
    The bytes travel with the database instead — SQLite locally, Postgres in
    production — and /media serves them from the row.
    """

    __tablename__ = "media"

    name: Mapped[str] = mapped_column(String(64), primary_key=True)
    content_type: Mapped[str] = mapped_column(String(64))
    data: Mapped[bytes] = mapped_column(LargeBinary)