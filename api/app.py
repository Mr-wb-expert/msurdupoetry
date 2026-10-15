"""FastAPI application entrypoint.

Serves the API and the built single-page app from one origin. That single
origin is the whole reason there is no CORS middleware: the browser's admin
cookie is same-origin with every request it makes, so there is no
cross-origin request to allow and no `credentials` handling to get wrong.

Every API route lives under /api. That prefix is not decoration: the SPA owns
/books, /poems and /admin as page routes, so without it a GET /books would
return a JSON list instead of the catalogue page. The catch-all below is
registered last, and the /api prefix is what keeps the two sets of routes from
ever meeting.
"""

import os
import sys
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape


def _load_env_file() -> None:
    """Read the project `.env` into os.environ.

    Two rules that keep this safe: a value already in the environment always
    wins (so `api.check` and any real deployment are untouched), and empty
    values are skipped rather than set — `ADMIN_TOKEN_TTL=` in `.env` means
    "unset", not "empty string", and auth.py parses it with int().

    Runs before the relative imports below, because SITE_URL, DATABASE_URL and
    the token secret are all read at import time.
    """
    path = Path(__file__).resolve().parent.parent / ".env"
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip('"').strip("'")
        if value:
            os.environ.setdefault(key.strip(), value)


_load_env_file()

# Vercel loads this file directly rather than as part of the `api` package, so
# the project root — the directory the package lives in — is put on the path
# before anything inside the package is imported. Locally it is already there
# and this is a no-op.
_ROOT = str(Path(__file__).resolve().parent.parent)
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from fastapi import Depends, FastAPI  # noqa: E402
from fastapi.responses import FileResponse, Response  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from api.db import Base, engine, get_db  # noqa: E402
from api.models import Book, MediaFile, Poem  # noqa: E402
from api.poets import POETS  # noqa: E402
from api.routes import _books_query, admin, public, public_review  # noqa: E402
from api import seo  # noqa: E402
from api.seed import _add_missing_columns  # noqa: E402

# `create_all` only ever creates, so `_add_missing_columns` is what keeps an
# existing database in step with the models — a column added later is silently
# absent from it, and every insert then 500s. Runs here, not only in
# `python -m api.seed`, so a deploy or a --reload restart migrates the database
# it is about to serve.
# ponytail: check-then-alter races two simultaneous cold starts; the loser
# fails its import once and succeeds on retry, against the migrated schema.
Base.metadata.create_all(engine)
_add_missing_columns()

DIST = Path(__file__).resolve().parent.parent / "web" / "dist"
SITE_URL = os.environ.get("SITE_URL", "").rstrip("/")

app = FastAPI(
    title="Mujahid Sajjad - site API",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.include_router(public, prefix="/api")
app.include_router(public_review, prefix="/api")
app.include_router(admin, prefix="/api")


# Public lists barely change and every visitor used to hit Neon for them.
# max-age keeps repeat visits in the browser; s-maxage lets Vercel's edge hold
# the response for a minute, so the database is touched on a miss only.
# Admin routes are private and /health must answer freshly, so both are left
# out; non-GETs never reach this branch.
#
# A single-verse/book read must reflect an admin edit immediately, so those
# are not edge-cached at all: the admin saves, then the public page (and the
# admin form) read the fresh row. Vercel's edge cache is keyed on the URL and
# cannot be purged from this function without a deploy token, so a stale
# window on the lists is the cost of the caching.
@app.middleware("http")
async def cache_public_reads(request, call_next):
    import time
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000.0

    path = request.url.path
    if (
        request.method == "GET"
        and path.startswith("/api/")
        and not path.startswith("/api/admin")
        and path != "/api/health"
    ):
        single_read = path.count("/") == 3 and (
            path.startswith("/api/poems/")
            or path.startswith("/api/poets/")
            or path.startswith("/api/books/")
        )
        # Protect database by caching public lists at edge for 3 minutes, while allowing instant reads on singles
        response.headers["Cache-Control"] = (
            "no-store" if single_read else "public, max-age=180, s-maxage=180, stale-while-revalidate=120"
        )

    # Diagnostic header to observe processing latency in network tab
    response.headers["X-Response-Time"] = f"{duration_ms:.1f}ms"
    return response

# Uploaded covers, served from their database row: the production filesystem
# is read-only and ephemeral, so a file written there could never be kept or
# read back (the 500 the admin saw on every upload).
@app.get("/media/{name}", include_in_schema=False)
def serve_media(name: str, db: Session = Depends(get_db)) -> Response:
    row = db.get(MediaFile, name)
    if row is None:
        return Response(status_code=404)
    # Cache uploaded media at edge & browser for 7 days so it is not repeatedly
    # read from Neon Postgres bytea column.
    return Response(
        content=row.data,
        media_type=row.content_type,
        headers={"Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400"},
    )

# Pages that always exist. The catalogue entries are added below.
STATIC_PAGES = ["", "books", "poems", "poets", "videos", "about"]

# Cached set of known slugs and sitemap XML to avoid touching Neon on every SPA or bot hit
_sitemap_cache: str | None = None
_sitemap_cache_time: float = 0
_sitemap_ttl = 3600.0  # 1 hour

_known_slugs_cache: set[str] | None = None
_known_slugs_cache_time: float = 0
_known_slugs_ttl = 600.0  # 10 minutes


def _get_known_slugs(db: Session) -> set[str]:
    import time
    global _known_slugs_cache, _known_slugs_cache_time
    now = time.time()
    if _known_slugs_cache is not None and (now - _known_slugs_cache_time) < _known_slugs_ttl:
        return _known_slugs_cache

    known = set(STATIC_PAGES) | {"admin"}
    # Project ONLY the slug column across the wire: transferring slugs takes ~2 KB
    # instead of fetching entire Poem/Book rows (~800 KB)
    book_slugs = [slug for (slug,) in db.query(Book.slug).all()]
    poem_slugs = [slug for (slug,) in db.query(Poem.slug).all()]

    known.update(f"books/{slug}" for slug in book_slugs)
    known.update(f"poems/{slug}" for slug in poem_slugs)
    known.update(f"poets/{poet['slug']}" for poet in POETS)

    _known_slugs_cache = known
    _known_slugs_cache_time = now
    return known


@app.get("/sitemap.xml", include_in_schema=False)
def sitemap(db: Session = Depends(get_db)) -> Response:
    """Built from the database and cached in-memory for 1 hour so crawlers hitting
    sitemap.xml do not query Neon continuously."""
    import time
    global _sitemap_cache, _sitemap_cache_time
    now = time.time()
    if _sitemap_cache is not None and (now - _sitemap_cache_time) < _sitemap_ttl:
        return Response(content=_sitemap_cache, media_type="application/xml")

    origin = SITE_URL or "http://localhost:8000"
    urls = list(STATIC_PAGES)
    # Query only slug columns
    urls += [f"books/{slug}" for (slug,) in db.query(Book.slug).all()]
    urls += [f"poems/{slug}" for (slug,) in db.query(Poem.slug).order_by(Poem.created_at.desc()).all()]
    urls += [f"poets/{poet['slug']}" for poet in POETS]

    body = "".join(
        f"<url><loc>{escape(origin)}/{escape(path)}</loc>"
        f"<lastmod>{date.today().isoformat()}</lastmod></url>"
        for path in urls
    )
    xml_content = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{body}</urlset>"
    )
    _sitemap_cache = xml_content
    _sitemap_cache_time = now
    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600, s-maxage=86400"},
    )


@app.get("/robots.txt", include_in_schema=False)
def robots() -> Response:
    """Served rather than shipped as a static file: the Sitemap line has to be
    an absolute URL, and only the server knows the origin it is served from."""
    origin = SITE_URL or "http://localhost:8000"
    return Response(
        content=(
            "User-agent: *\n"
            "Allow: /\n"
            "\n"
            "# Private by design: the admin holds the site's whole catalogue.\n"
            "Disallow: /admin\n"
            "\n"
            f"Sitemap: {origin}/sitemap.xml\n"
        ),
        media_type="text/plain",
        headers={"Cache-Control": "public, max-age=86400"},
    )


if DIST.is_dir():
    if (DIST / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    # Read once at import: every page request rewrites the same document, so
    # re-reading the file per request would be pure overhead.
    _SHELL = (DIST / "index.html").read_text(encoding="utf-8")

    @app.get("/{spa_path:path}", include_in_schema=False)
    def spa(spa_path: str, db: Session = Depends(get_db)):
        """Client-side routes have no file behind them, so anything that is not
        a real file in dist gets the app shell and the router takes over.

        The shell goes out with a 404 status for anything that is not a page
        this site actually has. Serving every typo as 200 is a soft 404: the
        index fills with empty pages and the crawler stops trusting the rest.

        The head is rewritten per route first — see api.seo: without it every
        URL would ship one identical title, description and schema, which is
        all a crawler that skips JavaScript ever sees."""
        candidate = (DIST / spa_path).resolve()
        if spa_path and candidate.is_file() and DIST.resolve() in candidate.parents:
            return FileResponse(candidate)

        path = spa_path.strip("/")
        if path.startswith("api/"):
            return Response(status_code=404)
        
        known = _get_known_slugs(db)
        meta = seo.head(path, db, SITE_URL or "http://localhost:8000")
        return Response(
            content=seo.apply(_SHELL, meta),
            status_code=200 if path in known else 404,
            media_type="text/html; charset=utf-8",
        )