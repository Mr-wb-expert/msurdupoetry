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

from api.db import get_db  # noqa: E402
from api.models import Poem  # noqa: E402
from api.routes import MEDIA_DIR, _books_query, admin, public, public_review  # noqa: E402

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

# Uploaded covers. The directory is created lazily by the upload route, never
# here: a serverless filesystem is read-only, so creating it at import time
# would crash the whole app before a single route is served. check_dir=False
# lets the mount exist while the directory does not — requests just 404 until
# the first upload makes it.
app.mount("/media", StaticFiles(directory=MEDIA_DIR, check_dir=False), name="media")

# Pages that always exist. The catalogue entries are added below.
STATIC_PAGES = ["", "books", "poems", "videos", "about"]


@app.get("/sitemap.xml", include_in_schema=False)
def sitemap(db: Session = Depends(get_db)) -> Response:
    """Built from the database rather than shipped as a static file, so a book
    added in the admin is discoverable without a redeploy."""
    origin = SITE_URL or "http://localhost:8000"
    urls = list(STATIC_PAGES)
    urls += [f"books/{book.slug}" for book in _books_query(db).all()]
    urls += [f"poems/{poem.slug}" for poem in db.query(Poem).order_by(Poem.created_at.desc()).all()]

    body = "".join(
        f"<url><loc>{escape(origin)}/{escape(path)}</loc>"
        f"<lastmod>{date.today().isoformat()}</lastmod></url>"
        for path in urls
    )
    return Response(
        content=(
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            f"{body}</urlset>"
        ),
        media_type="application/xml",
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
    )


if DIST.is_dir():
    if (DIST / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{spa_path:path}", include_in_schema=False)
    def spa(spa_path: str, db: Session = Depends(get_db)):
        """Client-side routes have no file behind them, so anything that is not
        a real file in dist gets the app shell and the router takes over.

        The shell goes out with a 404 status for anything that is not a page
        this site actually has. Serving every typo as 200 is a soft 404: the
        index fills with empty pages and the crawler stops trusting the rest."""
        candidate = (DIST / spa_path).resolve()
        if spa_path and candidate.is_file() and DIST.resolve() in candidate.parents:
            return FileResponse(candidate)

        path = spa_path.strip("/")
        if path.startswith("api/"):
            return Response(status_code=404)
        # /admin is a real page — it is simply not a public one, so robots.txt
        # keeps it out of the index instead of the status code doing it.
        known = set(STATIC_PAGES) | {"admin"}
        known.update(f"books/{book.slug}" for book in _books_query(db).all())
        known.update(f"poems/{poem.slug}" for poem in db.query(Poem).all())
        return FileResponse(DIST / "index.html", status_code=200 if path in known else 404)