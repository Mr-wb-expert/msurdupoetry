"""Pydantic request/response schemas.

`Book` and `Poem` are identified by slug in the wire format, not by the
integer primary key — every URL in the site is slug-based, so exposing the id
would only add a type mismatch for the frontend to reconcile.
"""

import re
import unicodedata
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
CATEGORIES = {"poetry", "criticism", "essays", "research", "other"}
# The URL shapes YouTube actually hands out: watch?v= (extra params allowed),
# youtu.be/, /shorts/ and /embed/. A video id is exactly 11 word characters.
YOUTUBE_RE = re.compile(
    r"^(?:https?://)?(?:www\.|m\.)?"
    r"(?:youtube\.com/watch\?(?:[^#]*&)?v=|youtu\.be/|youtube\.com/(?:shorts|embed)/)"
    r"[\w-]{11}/?(?:[?&#].*)?$"
)


def slugify(value: str) -> str:
    """Turn a title into a URL slug. ASCII-folded so Urdu titles still work."""
    folded = unicodedata.normalize("NFKD", value)
    ascii_only = folded.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_only).strip("-").lower()
    return slug[:120]


class WireModel(BaseModel):
    """Serialises as camelCase while the Python attributes stay snake_case.

    FastAPI serialises response models by alias, so the JSON the browser and
    the Next.js server receive uses `coverImage` / `pdfUrl` — the same names
    the React components already use. `populate_by_name` keeps snake_case
    usable as input, so server actions can post either spelling.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class BookBase(WireModel):
    title: str = Field(min_length=1, max_length=300)
    description: str = Field(default="", max_length=8000)
    cover_image: str | None = Field(default=None, max_length=500)
    pdf_url: str = Field(default="", max_length=500)
    category: str = Field(default="other")
    author: str = Field(default="", max_length=200)
    published_year: int | None = Field(default=None, ge=1000, le=2100)
    pages: int | None = Field(default=None, ge=1)
    publication: str | None = Field(default=None, max_length=300)
    sort_order: int = Field(default=0)

    @field_validator("title", "author", "category", "pdf_url", "description")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()

    @field_validator("cover_image", "publication")
    @classmethod
    def _blank_to_none(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        return v.strip()

    @field_validator("category")
    @classmethod
    def _known_category(cls, v: str) -> str:
        if v not in CATEGORIES:
            raise ValueError(f"category must be one of {sorted(CATEGORIES)}")
        return v

    @field_validator("pdf_url", "cover_image")
    @classmethod
    def _safe_url(cls, v: str | None) -> str | None:
        # Site-relative paths (/images/x.png) are the normal case; anything
        # absolute must be http(s) so a `javascript:` URL cannot reach an href.
        if not v:
            return v
        if v.startswith("/"):
            return v
        if not v.startswith(("http://", "https://")):
            raise ValueError("must be a site path starting with / or an http(s) URL")
        return v


class BookCreate(BookBase):
    slug: str | None = Field(default=None, max_length=120)


class BookUpdate(BookBase):
    slug: str | None = Field(default=None, max_length=120)


class BookOut(BookBase):
    slug: str
    # Present so the home page can feature the newest book first. Null only
    # for a row written before the column existed and never migrated.
    created_at: datetime | None = None
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class PoemBase(WireModel):
    title: str = Field(min_length=1, max_length=300)
    body: str = Field(default="", max_length=20000)
    # Null only for a row read from before the field existed; a write without
    # it lands on the same default the form starts on.
    type: Literal["Ghazal", "Nazm", "Poem"] | None = "Ghazal"

    @field_validator("title", "body")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()


class PoemCreate(PoemBase):
    slug: str | None = Field(default=None, max_length=160)


class PoemUpdate(PoemBase):
    slug: str | None = Field(default=None, max_length=160)


class PoemOut(PoemBase):
    slug: str
    # Present so a listing can be ordered and dated: the admin dashboard sorts
    # by it, and the sitemap already reads it off the model.
    created_at: datetime
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class VideoIn(WireModel):
    url: str = Field(min_length=10, max_length=500)
    description: str = Field(min_length=1, max_length=500)

    @field_validator("url", "description")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()

    @field_validator("url")
    @classmethod
    def _youtube_only(cls, v: str) -> str:
        # Only YouTube links get in: everything the public page embeds is
        # built from the extracted id, so a foreign URL would silently vanish.
        if not YOUTUBE_RE.match(v):
            raise ValueError("paste a YouTube link (watch, youtu.be or shorts)")
        return v


class VideoOut(WireModel):
    id: int
    url: str
    description: str
    created_at: datetime
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class LoginIn(WireModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=200)


class ReviewIn(WireModel):
    book_slug: str = Field(max_length=120)
    name: str = Field(min_length=2, max_length=60)
    body: str = Field(min_length=20, max_length=1500)
    # Honeypot. A real reader never fills this; bots fill everything.
    website: str = Field(default="", max_length=200)

    @field_validator("name", "book_slug")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()

    @field_validator("body")
    @classmethod
    def _strip_body(cls, v: str) -> str:
        # Trim the ends but keep interior newlines: reviewers use paragraphs.
        return v.strip()


class ReviewOut(WireModel):
    """`book_title` and `book_slug` are resolved server-side so the carousel
    does not need the full book list just to caption a card."""

    id: int
    book_slug: str
    book_title: str
    name: str
    body: str
    is_approved: bool = False
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class ReviewModerationIn(WireModel):
    is_approved: bool


class ContactIn(WireModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=200)
    topic: str = Field(default="general", max_length=60)
    body: str = Field(min_length=10, max_length=5000)
    # Same honeypot as reviews.
    website: str = Field(default="", max_length=200)

    @field_validator("name", "email", "topic")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()

    @field_validator("email")
    @classmethod
    def _email_shape(cls, v: str) -> str:
        # Deliberately shape-only. Pydantic's EmailStr would need the optional
        # email-validator package for no gain here: this address is only ever
        # shown in the admin, and a malformed one is obvious on sight.
        if "@" not in v or v.startswith("@") or v.endswith("@") or " " in v:
            raise ValueError("that does not look like an email address")
        return v


class ContactOut(WireModel):
    id: int
    name: str
    email: str
    topic: str
    body: str
    created_at: datetime
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class AdminOut(WireModel):
    username: str


class MessageOut(WireModel):
    ok: bool = True
    detail: str = ""