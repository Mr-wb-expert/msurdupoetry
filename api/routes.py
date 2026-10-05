"""HTTP routes.

Three routers in one file: public reads, public review submission, and the
admin mutations. Kept together because each is short and they share the
serialisation helpers.
"""

import time
from collections import defaultdict
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session, joinedload

from .auth import (
    clear_session_cookie,
    make_token,
    optional_admin,
    require_admin,
    set_session_cookie,
    verify_password,
)
from .db import get_db
from .models import Admin, Book, ContactMessage, MediaFile, Poem, Review, Video
from .schemas import (
    AdminOut,
    BookCreate,
    BookOut,
    BookUpdate,
    ContactIn,
    ContactOut,
    LoginIn,
    MessageOut,
    PoemCreate,
    PoemOut,
    PoemUpdate,
    ReviewIn,
    ReviewModerationIn,
    ReviewOut,
    SLUG_RE,
    VideoIn,
    VideoOut,
    slugify,
)

# ---------------------------------------------------------------------------
# Cover uploads
# ---------------------------------------------------------------------------

MAX_COVER_BYTES = 8 * 1024 * 1024

# Keyed by extension: the magic bytes each format must start with. Checking the
# declared content-type alone would let anything through, since the client
# chooses it.
IMAGE_TYPES = {
    "png": b"\x89PNG\r\n\x1a\n",
    "jpg": b"\xff\xd8\xff",
    "jpeg": b"\xff\xd8\xff",
    "webp": b"RIFF",
    "avif": b"\x00\x00\x00 ftypavif",
}

# What the browser is allowed to claim it is sending.
IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp", "image/avif"}


def _sniff_image(data: bytes, ext: str) -> bool:
    return data.startswith(IMAGE_TYPES[ext])


# ---------------------------------------------------------------------------
# Review rate limiting
# ---------------------------------------------------------------------------
# ponytail: per-instance in-memory limit — Vercel keeps several instances, so a
# determined caller can multiply this by the instance count. A shared counter
# (Postgres table or Upstash) if spam ever becomes a real problem.

RATE_LIMIT = 3
RATE_WINDOW = 3600
_hits: dict[str, list[float]] = defaultdict(list)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limited(ip: str) -> bool:
    now = time.time()
    recent = [t for t in _hits[ip] if now - t < RATE_WINDOW]
    if len(recent) >= RATE_LIMIT:
        _hits[ip] = recent
        return True
    recent.append(now)
    _hits[ip] = recent
    return False


def _review_out(review: Review) -> ReviewOut | None:
    # book_title is resolved here so the carousel can caption a card without
    # also being handed the whole book list. A review whose book has gone is
    # skipped rather than raised, so one bad row cannot take the page down.
    if review.book is None:
        return None
    return ReviewOut(
        id=review.id,
        book_slug=review.book.slug,
        book_title=review.book.title,
        name=review.name,
        body=review.body,
        is_approved=review.is_approved,
    )


def _review_outs(reviews) -> list[ReviewOut]:
    return [out for out in (_review_out(r) for r in reviews) if out is not None]


def _books_query(db: Session):
    return db.query(Book).order_by(Book.sort_order.asc(), Book.title.asc())


# ---------------------------------------------------------------------------
# Public reads
# ---------------------------------------------------------------------------

public = APIRouter()


@public.get("/health")
def health():
    return {"ok": True}


@public.get("/books", response_model=list[BookOut])
def list_books(db: Session = Depends(get_db)):
    return _books_query(db).all()


@public.get("/books/{slug}", response_model=BookOut)
def read_book(slug: str, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.slug == slug).first()
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return book


@public.get("/poems", response_model=list[PoemOut])
def list_poems(db: Session = Depends(get_db)):
    return db.query(Poem).order_by(Poem.created_at.desc()).all()


@public.get("/poems/{slug}", response_model=PoemOut)
def read_poem(slug: str, db: Session = Depends(get_db)):
    poem = db.query(Poem).filter(Poem.slug == slug).first()
    if poem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return poem


@public.get("/videos", response_model=list[VideoOut])
def list_videos(db: Session = Depends(get_db)):
    return db.query(Video).order_by(Video.created_at.desc()).all()


@public.get("/reviews", response_model=list[ReviewOut])
def list_reviews(limit: int = 12, db: Session = Depends(get_db)) -> list[ReviewOut]:
    rows = (
        db.query(Review)
        .options(joinedload(Review.book))
        .filter(Review.is_approved.is_(True))
        .order_by(Review.created_at.desc())
        .limit(max(1, min(limit, 100)))
        .all()
    )
    return _review_outs(rows)


@public.get("/books/{slug}/reviews", response_model=list[ReviewOut])
def list_reviews_for_book(slug: str, db: Session = Depends(get_db)) -> list[ReviewOut]:
    rows = (
        db.query(Review)
        .options(joinedload(Review.book))
        .join(Book)
        .filter(Book.slug == slug, Review.is_approved.is_(True))
        .order_by(Review.created_at.desc())
        .all()
    )
    return _review_outs(rows)


# ---------------------------------------------------------------------------
# Public review submission
# ---------------------------------------------------------------------------

public_review = APIRouter()


@public_review.post("/reviews", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def submit_review(payload: ReviewIn, request: Request, db: Session = Depends(get_db)):
    # Honeypot filled: answer as if it worked, so a bot learns nothing.
    if payload.website:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Submission rejected."
        )

    book = db.query(Book).filter(Book.slug == payload.book_slug).first()
    if book is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="That book is not on this site."
        )

    if _rate_limited(_client_ip(request)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many submissions. Try again later.",
        )

    # Published immediately: honeypot and rate limit are the spam defence, and
    # the admin can still unpublish anything that slips through.
    review = Review(book=book, name=payload.name, body=payload.body, is_approved=True)
    db.add(review)
    db.commit()
    return MessageOut(detail="Thank you. Your review has been published.")


@public_review.post("/contact", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def submit_contact(payload: ContactIn, request: Request, db: Session = Depends(get_db)):
    """Store a contact message for the author to read in the admin.

    Answers as if it worked when the honeypot is filled, for the same reason
    the review endpoint does: a bot that gets an error learns it was detected.
    """
    if payload.website:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Submission rejected."
        )

    if _rate_limited(_client_ip(request)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many messages. Try again later.",
        )

    db.add(
        ContactMessage(
            name=payload.name, email=payload.email, topic=payload.topic, body=payload.body
        )
    )
    db.commit()
    # No address is echoed back in the response.
    return MessageOut(detail="Thank you. Your message has been sent.")


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

admin = APIRouter(prefix="/admin", tags=["admin"])


@admin.post("/login", tags=["auth"])
def login(payload: LoginIn, response: Response, db: Session = Depends(get_db)):
    admin_user = db.query(Admin).filter(Admin.username == payload.username).first()
    # Same message and roughly the same work either way, so the response does
    # not reveal whether the username exists.
    if admin_user is None or not verify_password(payload.password, admin_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong username or password."
        )
    set_session_cookie(response, make_token(admin_user.username))
    return AdminOut(username=admin_user.username)


@admin.post("/logout", tags=["auth"])
def logout(response: Response):
    clear_session_cookie(response)
    return MessageOut(detail="Signed out.")


@admin.get("/me", response_model=AdminOut | None, tags=["auth"])
def me(username: str | None = Depends(optional_admin)):
    """Always 200. `null` means signed out; an error here would be a server
    fault, and the SPA should not confuse the two."""
    return AdminOut(username=username) if username else None


def _resolve_slug(db: Session, table, requested: str | None, title: str) -> str:
    slug = (requested or "").strip() or slugify(title)
    if not SLUG_RE.match(slug):
        raise HTTPException(
            status_code=422,
            detail="Slug must be lowercase words separated by hyphens.",
        )
    clash = db.query(table).filter(table.slug == slug).first()
    if clash is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=f"The slug '{slug}' is taken."
        )
    return slug


@admin.post("/books", response_model=BookOut, status_code=status.HTTP_201_CREATED)
def create_book(payload: BookCreate, db: Session = Depends(get_db), _: Admin = Depends(require_admin)):
    slug = _resolve_slug(db, Book, payload.slug, payload.title)
    book = Book(**payload.model_dump(exclude={"slug"}), slug=slug)
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@admin.put("/books/{slug}", response_model=BookOut)
def update_book(
    slug: str, payload: BookUpdate, db: Session = Depends(get_db), _: Admin = Depends(require_admin)
):
    book = db.query(Book).filter(Book.slug == slug).first()
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    new_slug = (payload.slug or "").strip()
    if new_slug and new_slug != book.slug:
        if not SLUG_RE.match(new_slug):
            raise HTTPException(
                status_code=422,
                detail="Slug must be lowercase words separated by hyphens.",
            )
        if db.query(Book).filter(Book.slug == new_slug).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=f"The slug '{new_slug}' is taken."
            )
        book.slug = new_slug

    for field, value in payload.model_dump(exclude={"slug"}).items():
        setattr(book, field, value)

    db.commit()
    db.refresh(book)
    return book


@admin.delete("/books/{slug}")
def delete_book(slug: str, db: Session = Depends(get_db), _: Admin = Depends(require_admin)):
    book = db.query(Book).filter(Book.slug == slug).first()
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    db.delete(book)
    db.commit()
    return {"ok": True}


@admin.post("/books/{slug}/cover", response_model=BookOut)
def upload_cover(
    slug: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: Admin = Depends(require_admin),
):
    """Store an uploaded cover and point the book at it.

    The filename is generated, never taken from the client, so a crafted
    `../../etc/passwd` has nowhere to land. The extension is checked against an
    allowlist and the bytes are sniffed, so a `.png` that is really something
    else never reaches storage. Storage is a database row, not a file: the
    production filesystem is read-only.
    """
    book = db.query(Book).filter(Book.slug == slug).first()
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    ext = Path(file.filename or "").suffix.lower().lstrip(".")
    if (file.content_type or "") not in IMAGE_CONTENT_TYPES or ext not in IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload a PNG, JPEG, WebP or AVIF image.",
        )

    data = file.file.read(MAX_COVER_BYTES + 1)
    if len(data) > MAX_COVER_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Cover must be under {MAX_COVER_BYTES // (1024 * 1024)} MB.",
        )
    if not _sniff_image(data, ext):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="That file is not a readable image.",
        )

    name = f"{uuid4().hex}.{ext}"
    db.add(MediaFile(name=name, content_type=file.content_type or "", data=data))

    book.cover_image = f"/media/{name}"
    db.commit()
    db.refresh(book)
    return book


@admin.post("/poems", response_model=PoemOut, status_code=status.HTTP_201_CREATED)
def create_poem(payload: PoemCreate, db: Session = Depends(get_db), _: Admin = Depends(require_admin)):
    slug = _resolve_slug(db, Poem, payload.slug, payload.title)
    poem = Poem(**payload.model_dump(exclude={"slug"}), slug=slug)
    db.add(poem)
    db.commit()
    db.refresh(poem)
    return poem


@admin.put("/poems/{slug}", response_model=PoemOut)
def update_poem(
    slug: str, payload: PoemUpdate, db: Session = Depends(get_db), _: Admin = Depends(require_admin)
):
    poem = db.query(Poem).filter(Poem.slug == slug).first()
    if poem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    new_slug = (payload.slug or "").strip()
    if new_slug and new_slug != poem.slug:
        if not SLUG_RE.match(new_slug):
            raise HTTPException(
                status_code=422,
                detail="Slug must be lowercase words separated by hyphens.",
            )
        if db.query(Poem).filter(Poem.slug == new_slug).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=f"The slug '{new_slug}' is taken."
            )
        poem.slug = new_slug

    for field, value in payload.model_dump(exclude={"slug"}).items():
        setattr(poem, field, value)

    db.commit()
    db.refresh(poem)
    return poem


@admin.delete("/poems/{slug}")
def delete_poem(slug: str, db: Session = Depends(get_db), _: Admin = Depends(require_admin)):
    poem = db.query(Poem).filter(Poem.slug == slug).first()
    if poem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    db.delete(poem)
    db.commit()
    return {"ok": True}


@admin.post("/videos", response_model=VideoOut, status_code=status.HTTP_201_CREATED)
def create_video(
    payload: VideoIn, db: Session = Depends(get_db), _: Admin = Depends(require_admin)
):
    video = Video(**payload.model_dump())
    db.add(video)
    db.commit()
    db.refresh(video)
    return video


@admin.put("/videos/{video_id}", response_model=VideoOut)
def update_video(
    video_id: int,
    payload: VideoIn,
    db: Session = Depends(get_db),
    _: Admin = Depends(require_admin),
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    video.url = payload.url
    video.description = payload.description
    db.commit()
    db.refresh(video)
    return video


@admin.delete("/videos/{video_id}")
def delete_video(
    video_id: int, db: Session = Depends(get_db), _: Admin = Depends(require_admin)
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if video is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    db.delete(video)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Review moderation
# ---------------------------------------------------------------------------


def _review_by_id(db: Session, review_id: int) -> Review:
    review = db.query(Review).filter(Review.id == review_id).first()
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return review


@admin.get("/reviews", response_model=list[ReviewOut])
def list_all_reviews(
    pending_only: bool = False, db: Session = Depends(get_db), _: Admin = Depends(require_admin)
):
    query = db.query(Review).options(joinedload(Review.book))
    if pending_only:
        query = query.filter(Review.is_approved.is_(False))
    return _review_outs(query.order_by(Review.created_at.desc()).all())


@admin.put("/reviews/{review_id}", response_model=ReviewOut)
def moderate_review(
    review_id: int,
    payload: ReviewModerationIn,
    db: Session = Depends(get_db),
    _: Admin = Depends(require_admin),
):
    review = _review_by_id(db, review_id)
    review.is_approved = payload.is_approved
    db.commit()
    db.refresh(review)
    return _review_out(review)


@admin.delete("/reviews/{review_id}")
def delete_review(
    review_id: int, db: Session = Depends(get_db), _: Admin = Depends(require_admin)
):
    db.delete(_review_by_id(db, review_id))
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Contact messages
# ---------------------------------------------------------------------------


@admin.get("/messages", response_model=list[ContactOut])
def list_messages(
    limit: int = 100, db: Session = Depends(get_db), _: Admin = Depends(require_admin)
):
    return (
        db.query(ContactMessage)
        .order_by(ContactMessage.created_at.desc())
        .limit(max(1, min(limit, 500)))
        .all()
    )


@admin.delete("/messages/{message_id}")
def delete_message(
    message_id: int, db: Session = Depends(get_db), _: Admin = Depends(require_admin)
):
    message = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    db.delete(message)
    db.commit()
    return {"ok": True}