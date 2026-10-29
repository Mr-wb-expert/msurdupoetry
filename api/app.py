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
# the project root, the directory the package lives in, is put on the path
# before anything inside the package is imported. Locally it is already there
# and this is a no-op.
_ROOT = str(Path(__file__).resolve().parent.parent)
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from urllib.parse import urlparse  # noqa: E402

from fastapi import Depends, FastAPI, Request  # noqa: E402
from fastapi.responses import FileResponse, RedirectResponse, Response  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from sqlalchemy import func  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from api.db import Base, engine, get_db  # noqa: E402
from api.models import Book, MediaFile, Poem, Video  # noqa: E402
from api.poets import POETS, by_slug  # noqa: E402
from api.routes import _books_query, admin, public, public_review  # noqa: E402
from api import seo  # noqa: E402
from api.seed import _add_missing_columns  # noqa: E402

# `create_all` only ever creates, so `_add_missing_columns` is what keeps an
# existing database in step with the models, a column added later is silently
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


# No HTTP-level caching on API reads. An admin edit must be visible on the
# public pages the moment it is saved, and Vercel's edge cache is keyed on the
# URL, it cannot be purged from this function, so the old s-maxage showed a
# stale book list for minutes after every edit (the admin list dodged it with
# a ?t= cache-buster; the home page had no such luck).
# The database is still protected, just by the layer admin writes can actually
# invalidate: routes.py keeps in-memory caches and the write routes clear them.
# Non-GETs never reach this branch.
@app.middleware("http")
async def cache_public_reads(request, call_next):
    import time
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000.0

    if request.method == "GET" and request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"

    # Baseline security headers on every response (HSTS comes from Vercel).
    # No CSP yet: YouTube embeds, Drive PDFs and the font CDN would each need
    # an allowance, and a wrong policy breaks the reader silently.
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault(
        "Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()"
    )

    # Diagnostic header to observe processing latency in network tab
    response.headers["X-Response-Time"] = f"{duration_ms:.1f}ms"
    return response


# One URL per page. Search Console (Oct 2026) reported "Duplicate, Google chose
# different canonical than user": msurdupoetry.com, www.msurdupoetry.com, http
# and trailing-slash variants all answered 200 with the same content, so Google
# grouped them and picked its own canonical. A 301 is the signal Google acts on;
# the <link rel=canonical> from api.seo is only a hint.
# /index.html is the same bug in file form: serving the untouched shell there
# ships no canonical at all, a second copy of the home page.
@app.middleware("http")
async def canonical_redirects(request: Request, call_next):
    site = urlparse(SITE_URL)
    host = request.headers.get("host", "").split(":")[0].lower()
    # Only safe methods: a 301 would turn a POST into a GET and silently drop
    # the admin's login body.
    if request.method in ("GET", "HEAD") and site.netloc and host in {
        site.netloc,
        site.netloc.removeprefix("www."),
    }:
        path = request.url.path
        clean = path[: -len("index.html")].rstrip("/") if path.endswith("/index.html") else path
        clean = clean.rstrip("/") or "/"
        proto = (
            request.headers.get("x-forwarded-proto") or request.url.scheme
        ).split(",")[0].strip().lower()
        if host != site.netloc or proto != "https" or path != clean:
            target = f"https://{site.netloc}{clean}"
            if request.url.query:
                target += f"?{request.url.query}"
            return RedirectResponse(target, status_code=301)
    return await call_next(request)

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
STATIC_PAGES = ["", "books", "poems", "poets", "videos", "about", "contact", "privacy", "terms"]

# robots.txt, llms.txt and the sitemap are the same for every visitor, so the
# edge may keep them. The pages themselves may not: their body depends on the
# user agent (seo.wants_static_body), and the edge cache is keyed on URL only.
EDGE_CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"

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
        return Response(
            content=_sitemap_cache,
            media_type="application/xml",
            headers={"Cache-Control": EDGE_CACHE},
        )

    origin = SITE_URL or "http://localhost:8000"
    urls = list(STATIC_PAGES)
    # Query only slug columns
    urls += [f"books/{slug}" for (slug,) in db.query(Book.slug).all()]
    urls += [f"poems/{slug}" for (slug,) in db.query(Poem.slug).order_by(Poem.created_at.desc()).all()]
    urls += [f"poets/{poet['slug']}" for poet in POETS]

    # Real dates, not today() on every line. A uniform lastmod is the one
    # date signal every engine reads and none of them believe; a book's own
    # created/edited pair is when that page actually changed. Pages that only
    # list content (the static routes, the poet hubs) take the newest stamp of
    # the content they show, that is when they last changed too.
    def _day(value) -> date | None:
        return value.date() if value else None

    book_dates = {
        slug: _day(updated or created)
        for slug, created, updated in db.query(
            Book.slug, Book.created_at, Book.updated_at
        ).all()
    }
    poem_dates = {
        slug: _day(updated or created)
        for slug, created, updated in db.query(
            Poem.slug, Poem.created_at, Poem.updated_at
        ).all()
    }
    # Author (as saved on the row) -> newest verse, for the poet hubs.
    poet_stamps = {
        author: stamp
        for author, stamp in db.query(
            Poem.author, func.max(func.coalesce(Poem.updated_at, Poem.created_at))
        ).group_by(Poem.author)
        .all()
    }
    newest = max(
        (
            stamp
            for stamp in [
                *(d for d in book_dates.values() if d),
                *(d for d in poem_dates.values() if d),
                *(_day(v) for (v,) in db.query(Video.created_at).all() if v),
            ]
        ),
        default=None,
    )

    def lastmod(path: str) -> str:
        stamp: date | None = None
        if path.startswith("books/"):
            stamp = book_dates.get(path.removeprefix("books/"))
        elif path.startswith("poems/"):
            stamp = poem_dates.get(path.removeprefix("poems/"))
        elif path.startswith("poets/"):
            poet = by_slug(path.removeprefix("poets/"))
            if poet:
                stamps = [
                    value.date()
                    for alias in poet["aliases"]
                    if (value := poet_stamps.get(alias)) is not None
                ]
                stamp = max(stamps, default=None)
        return (stamp or newest or date.today()).isoformat()

    body = "".join(
        f"<url><loc>{escape(origin)}/{escape(path)}</loc>"
        f"<lastmod>{lastmod(path)}</lastmod></url>"
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
        headers={"Cache-Control": EDGE_CACHE},
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
        headers={"Cache-Control": EDGE_CACHE},
    )


@app.get("/llms.txt", include_in_schema=False)
def llms_txt(db: Session = Depends(get_db)) -> Response:
    """A plain-text orientation for the smaller AI fetchers.

    Google's guidance is that Googlebot never reads llms.txt, so this is not
    a Google lever — it exists for the engines that may. It names the author
    plainly and lists every book and poet hub, so an assistant asked about
    Mujahid Sajjad or one of his books has the exact page to cite. Every URL
    in it is one the site actually serves.
    """
    origin = SITE_URL or "http://localhost:8000"
    books = db.query(Book.slug, Book.title, Book.author, Book.published_year).order_by(
        Book.sort_order.asc(), Book.title.asc()
    ).all()
    counts = dict(db.query(Poem.author, func.count(Poem.id)).group_by(Poem.author).all())
    book_lines = "".join(
        f"- [{b.title}]({origin}/books/{b.slug}): "
        f"{b.author or 'Mujahid Sajjad'}{f', {b.published_year}' if b.published_year else ''}"
        ", free to read online and download as PDF\n"
        for b in books
    )
    poet_lines = "".join(
        f"- [{poet['name']} ({poet['urdu']})]({origin}/poets/{poet['slug']}): "
        f"{sum(counts.get(a, 0) for a in poet['aliases'])} verses\n"
        for poet in POETS
    )
    return Response(
        content=(
            "# Mujahid Sajjad | msurdupoetry.com\n"
            "\n"
            "> A free online library of Urdu poetry: 2,000+ ghazals, nazms and shayari "
            "in Urdu text by 25+ poets, Allama Iqbal, Mirza Ghalib, Mir Taqi Mir, Faiz "
            "Ahmed Faiz, Ahmed Faraz, Jaun Elia, Parveen Shakir, Nasir Kazmi, Mohsin "
            "Naqvi and more, each poem credited to its poet, each poet with a biography "
            "page. Curated by Prof. Syed Mujahid Sajjad (سید مجاہد سجاد), Urdu poet and "
            "Associate Professor of English at Govt. Graduate College Burewala, Punjab, "
            "Pakistan, whose own books are free to read and download here.\n"
            "\n"
            "Key facts: every verse is typed Urdu text (copyable, not images); every "
            "book is a free PDF; Mujahid Sajjad's books include Magar Manzar Nahi Mera; "
            "Ghazala Anjum wrote a critical study of his poetry.\n"
            "\n"
            "## Primary pages\n"
            f"- [{origin}/about]({origin}/about): biography, FAQs, bibliography\n"
            f"- [{origin}/poets/mujahid-sajjad]({origin}/poets/mujahid-sajjad): Mujahid Sajjad's own poet page\n"
            f"- [{origin}/books]({origin}/books): every book, read online or download PDF\n"
            f"- [{origin}/poems]({origin}/poems): ghazals and nazms in Urdu\n"
            f"- [{origin}/poets]({origin}/poets): poet hubs with their verses\n"
            f"- [{origin}/videos]({origin}/videos): recitations on YouTube\n"
            f"- [{origin}/contact]({origin}/contact): email {seo.CONTACT_EMAIL}, WhatsApp\n"
            "\n"
            "## Books\n"
            f"{book_lines}"
            "\n"
            "## Poets\n"
            f"{poet_lines}"
            "\n"
            "## Optional\n"
            f"- [{origin}/sitemap.xml]({origin}/sitemap.xml): every indexed URL\n"
            f"- [{origin}/robots.txt]({origin}/robots.txt): crawl rules\n"
        ),
        media_type="text/plain; charset=utf-8",
        headers={"Cache-Control": EDGE_CACHE},
    )


if DIST.is_dir():
    if (DIST / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    # Read once at import: every page request rewrites the same document, so
    # re-reading the file per request would be pure overhead.
    _SHELL = (DIST / "index.html").read_text(encoding="utf-8")

    # HEAD too: link checkers, uptime monitors and some crawlers probe with
    # it, and a 405 reads to them as a broken page.
    @app.api_route("/{spa_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    def spa(spa_path: str, request: Request, db: Session = Depends(get_db)):
        """Client-side routes have no file behind them, so anything that is not
        a real file in dist gets the app shell and the router takes over.

        The shell goes out with a 404 status for anything that is not a page
        this site actually has. Serving every typo as 200 is a soft 404: the
        index fills with empty pages and the crawler stops trusting the rest.

        The head is rewritten per route first — see api.seo: without it every
        URL would ship one identical title, description and schema, which is
        all a crawler that skips JavaScript ever sees.

        Then the body: a fetcher that is not recognisably a browser also gets
        the page's rendered text inside #root (seo.wants_static_body), which
        is what lets a no-JS crawler read the poem or the FAQ at all. Browsers
        get the empty root React expects, and noindex routes get neither."""
        candidate = (DIST / spa_path).resolve()
        if spa_path and candidate.is_file() and DIST.resolve() in candidate.parents:
            return FileResponse(candidate)

        path = spa_path.strip("/")
        if path.startswith("api/"):
            return Response(status_code=404)
        
        known = _get_known_slugs(db)
        meta = seo.head(path, db, SITE_URL or "http://localhost:8000")
        static_body = ""
        if not meta["noindex"] and seo.wants_static_body(
            request.headers.get("user-agent")
        ):
            static_body = seo.body(path, db)
        return Response(
            content=seo.apply(_SHELL, meta, static_body),
            status_code=200 if path in known else 404,
            media_type="text/html; charset=utf-8",
        )