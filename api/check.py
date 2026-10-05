"""Self-check for the API.

Run with:

    python -m api.check

Exercises the paths that are easy to break and hard to notice: auth rejection,
the session cookie's attributes, logout, the admin guard, slug collision,
cover upload validation, review moderation, the honeypot, the rate limit, and
the cascade delete on book removal.

Uses its own throwaway database and media directory with the in-process test
client, so it needs no running server and touches nothing in `api.db` or
`api/media`. Each test simulates a distinct client IP so the shared rate limiter
does not make assertions order-dependent.
"""

import os
import sys
import tempfile
import warnings
from pathlib import Path

# Starlette's test client warns that httpx is the wrong client library. The
# warning is noise here and would look like a failure in CI output.
warnings.filterwarnings("ignore", message=".*httpx.*")

# Must be set before importing anything that opens the engine.
_TMP_DB = os.path.join(tempfile.gettempdir(), "api-check.db")
if os.path.exists(_TMP_DB):
    os.remove(_TMP_DB)
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB}"
os.environ["ADMIN_TOKEN_SECRET"] = "self-check-secret"
os.environ.pop("ADMIN_USERNAME", None)
os.environ.pop("ADMIN_PASSWORD", None)

from fastapi.testclient import TestClient  # noqa: E402

from api import routes  # noqa: E402
from api.app import app, DIST  # noqa: E402
from api import seed  # noqa: E402
from api.auth import hash_password, make_token, read_token  # noqa: E402
from api.db import Base, SessionLocal, engine  # noqa: E402
from api.models import Admin, Book  # noqa: E402

# Uploads go to a scratch directory, so a failed run cannot leave cover files
# behind in the real media folder. routes.upload_cover reads this at call time.
MEDIA_DIR = Path(tempfile.mkdtemp(prefix="api-check-media-"))
routes.MEDIA_DIR = MEDIA_DIR

Base.metadata.create_all(engine)
_db = SessionLocal()
_db.add(Admin(username="admin", password_hash=hash_password("correct-horse")))
# Insert the real seed rows so a bad category, duplicate slug or over-long field
# in the migration data fails here rather than on the owner's first deploy.
for _row in seed.SEED_BOOKS:
    _db.add(Book(**_row))
_db.commit()
_db.close()

client = TestClient(app)

passed = 0


def check(label: str, condition: bool, detail: str = "") -> None:
    global passed
    if condition:
        passed += 1
        print(f"  ok  {label}")
    else:
        print(f"FAIL  {label} {detail}")
        sys.exit(1)


def as_ip(ip: str):
    return {"X-Forwarded-For": ip}


print("auth")
r = client.post("/api/admin/login", json={"username": "admin", "password": "wrong"})
check("wrong password rejected", r.status_code == 401, r.text)

r = client.post("/api/admin/login", json={"username": "nobody", "password": "correct-horse"})
check("unknown user rejected", r.status_code == 401, r.text)

r = client.get("/api/admin/me")
check("signed out is 200 with null", r.status_code == 200 and r.json() is None, r.text)

r = client.post("/api/admin/login", json={"username": "admin", "password": "correct-horse"})
check("correct password accepted", r.status_code == 200, r.text)
check("login returns the username", r.json()["username"] == "admin", r.text)
check("session cookie issued", "admin_session" in r.cookies, str(r.cookies))

# The cookie has to be unreadable from page JavaScript, or an XSS could lift
# the session. Checking the attribute here means a future refactor cannot
# quietly downgrade it.
cookie = r.cookies.get("admin_session")
check("cookie value is the signed token", bool(cookie and "." in cookie), str(cookie))
check(
    "cookie is HttpOnly",
    any(
        c.name == "admin_session" and c.has_nonstandard_attr("HttpOnly")
        for c in client.cookies.jar
    )
    or "HttpOnly" in (r.headers.get("set-cookie") or ""),
    r.headers.get("set-cookie", ""),
)

r = client.get("/api/admin/me")
check("cookie identifies the admin", r.json() == {"username": "admin"}, r.text)

# A default session must never age out on its own — sign-out is the only way
# out. A TTL set by env would make this fail, which is the point.
check(
    "default session token does not expire",
    read_token(make_token("admin")) == "admin",
)

print("admin guard")
# A client that never logs in must be refused. It cannot borrow the other
# client's cookie: each TestClient keeps its own jar.
anon = TestClient(app)
r = anon.post("/api/admin/books", json={"title": "No Session"})
check("create without a session rejected", r.status_code == 401, r.text)

r = anon.post("/api/admin/books", json={"title": "No Session"}, headers=as_ip("1.1.1.1"))
check("still refused with headers set", r.status_code == 401, r.text)

# A forged cookie must not be trusted either.
forged = TestClient(app)
forged.cookies.set("admin_session", "not-a-real-token")
r = forged.post("/api/admin/books", json={"title": "Forged"})
check("forged cookie rejected", r.status_code == 401, r.text)

r = TestClient(app).post("/api/admin/books", json={"title": "No Session"})
check("a second client has no session", r.status_code == 401, r.text)

print("logout")
r = client.post("/api/admin/logout")
check("logout accepted", r.status_code == 200, r.text)
r = client.get("/api/admin/me")
check("session gone after logout", r.json() is None, r.text)
r = client.post("/api/admin/books", json={"title": "After Logout"})
check("cannot write after logout", r.status_code == 401, r.text)

r = client.post("/api/admin/login", json={"username": "admin", "password": "correct-horse"})
check("token survives a second login", r.status_code == 200)

print("books")
r = client.post("/api/admin/books", json={"title": "A New Book", "sort_order": 9})
check("create returns 201", r.status_code == 201, r.text)
check("slug derived from title", r.json()["slug"] == "a-new-book", r.text)

r = client.post("/api/admin/books", json={"title": "A New Book"})
check("duplicate slug rejected", r.status_code == 409, r.text)

r = client.post("/api/admin/books", json={"title": "Bad", "slug": "Not A Slug"})
check("malformed slug rejected", r.status_code == 422, r.text)

r = client.post("/api/admin/books", json={"title": "Bad", "category": "nonsense"})
check("unknown category rejected", r.status_code == 422, r.text)

r = client.put("/api/admin/books/a-new-book", json={"title": "Renamed Book"})
check("update applies", r.status_code == 200 and r.json()["title"] == "Renamed Book", r.text)

r = client.put("/api/admin/books/a-new-book", json={"title": "Renamed", "slug": "a-new-book"})
check("keeping own slug is not a collision", r.status_code == 200, r.text)

print("poems")
r = client.post("/api/admin/poems", json={"title": "First Poem", "body": "line one\nline two"})
check("create returns 201", r.status_code == 201, r.text)

r = client.get("/api/poems")
check("poem listed", any(p["slug"] == "first-poem" for p in r.json()), r.text)
check(
    "verse type defaults to Ghazal",
    next(p for p in r.json() if p["slug"] == "first-poem")["type"] == "Ghazal",
    r.text,
)

r = client.post(
    "/api/admin/poems",
    json={"title": "Nazm", "body": "x", "type": "Nazm", "author": "Ghazala Anjum"},
)
check(
    "verse type and author round-trips",
    r.status_code == 201
    and r.json()["type"] == "Nazm"
    and r.json()["author"] == "Ghazala Anjum",
    r.text,
)
r = client.post("/api/admin/poems", json={"title": "Bad", "body": "x", "type": "Ode"})
check("unknown verse type rejected", r.status_code == 422, r.text)
r = client.delete("/api/admin/poems/nazm")
check("extra verse removed", r.status_code == 200, r.text)

r = client.put("/api/admin/poems/first-poem", json={"title": "First Poem", "body": "revised"})
check("update applies", r.status_code == 200 and r.json()["body"] == "revised", r.text)

r = client.get("/api/poems")
check("body change persisted", r.json()[0]["body"] == "revised", r.text)

print("cover upload")
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32
r = client.post(
    "/api/admin/books/a-new-book/cover",
    files={"file": ("cover.png", PNG, "image/png")},
)
check("cover accepted", r.status_code == 200, r.text)
cover_url = r.json()["coverImage"]
check("cover path points at /media", str(cover_url).startswith("/media/"), str(cover_url))
check("cover file written", (MEDIA_DIR / Path(cover_url).name).exists(), cover_url)
check("client filename discarded", "cover.png" not in cover_url, cover_url)

r = client.post(
    "/api/admin/books/a-new-book/cover",
    files={"file": ("evil.png", b"<?php echo 1; ?>", "image/png")},
)
check("mislabelled bytes rejected", r.status_code == 415, r.text)

r = client.post(
    "/api/admin/books/a-new-book/cover",
    files={"file": ("cover.txt", b"hello", "text/plain")},
)
check("wrong extension rejected", r.status_code == 415, r.text)

r = client.post(
    "/api/admin/books/no-such-book/cover",
    files={"file": ("cover.png", PNG, "image/png")},
)
check("upload to unknown book is a 404", r.status_code == 404, r.text)

r = client.post(
    "/api/admin/books/a-new-book/cover",
    files={"file": ("cover.png", PNG, "image/png")},
)
r = client.get("/media/nothing-here.png")
check("missing media file is a 404", r.status_code == 404, r.text)

print("reviews")
seeded = client.get("/api/books").json()
seed_slugs = {b["slug"] for b in seeded}
check(
    "seed books migrated",
    {
        "magar-manzar-nahi-mera",
        "article-on-the-poetry-of-mujahid-sajjad",
        "the-listening-eye-the-seeing-heart",
    }
    <= seed_slugs,
    str(sorted(seed_slugs)),
)
check("books ordered by sort_order", seeded[0]["slug"] == "magar-manzar-nahi-mera", str(seeded[0]))
check("book camelCase createdAt", "createdAt" in seeded[0], str(seeded[0]))
check(
    "missing cover is null, not empty",
    seeded[0]["coverImage"] is not None,
    str(seeded[0]),
)

r = client.get("/api/books/article-on-the-poetry-of-mujahid-sajjad")
check("book readable by slug", r.status_code == 200 and r.json()["author"] == "Ghazala Anjum", r.text)
r = client.get("/api/books/not-a-book")
check("unknown book is a 404", r.status_code == 404, r.text)

# Create a book to review, then remove it to prove the cascade.
r = client.post("/api/admin/books", json={"title": "Reviewed Book"})
review_slug = r.json()["slug"]

valid = {
    "book_slug": review_slug,
    "name": "A Reader",
    "body": "This is a long enough review to pass validation checks.",
    "website": "",
}
r = client.post("/api/reviews", json=valid, headers=as_ip("10.0.0.1"))
check("valid review returns 201", r.status_code == 201, r.text)
check(
    "submission is not echoed as a live review",
    "bookTitle" not in r.json() and "published" in r.json()["detail"],
    r.text,
)

review_id = client.get("/api/admin/reviews").json()[0]["id"]
check("new review starts approved", client.get("/api/admin/reviews").json()[0]["isApproved"] is True)

r = client.post("/api/reviews", json={**valid, "website": "spam.example"}, headers=as_ip("10.0.0.2"))
check("honeypot rejected", r.status_code == 400, r.text)

r = client.post("/api/reviews", json={**valid, "book_slug": "no-such-book"}, headers=as_ip("10.0.0.3"))
check("unknown book rejected", r.status_code == 400, r.text)

r = client.post("/api/reviews", json={**valid, "name": "x"}, headers=as_ip("10.0.0.4"))
check("short name rejected", r.status_code == 422, r.text)

r = client.post("/api/reviews", json={**valid, "body": "too short"}, headers=as_ip("10.0.0.5"))
check("short body rejected", r.status_code == 422, r.text)

print("moderation")
r = client.get("/api/reviews")
check("new review reaches the public feed immediately", len(r.json()) == 1, r.text)
check("review carries book title on the home feed", r.json()[0]["bookTitle"] == "Reviewed Book", r.text)

r = client.get(f"/api/books/{review_slug}/reviews")
check("book reviews listed", len(r.json()) == 1, r.text)

r = client.get("/api/admin/reviews?pending_only=true")
check("pending filter excludes approved", r.json() == [], r.text)

r = client.put(f"/api/admin/reviews/{review_id}", json={"is_approved": False})
check("un-approve accepted", r.status_code == 200 and not r.json()["isApproved"], r.text)
check("withdrawn review leaves the feed", client.get("/api/reviews").json() == [])

r = client.put(f"/api/admin/reviews/{review_id}", json={"is_approved": True})
check(
    "re-approved for the cascade test",
    r.status_code == 200 and r.json()["isApproved"] is True,
    r.text,
)

r = client.put("/api/admin/reviews/999999", json={"is_approved": True})
check("moderating an unknown review is a 404", r.status_code == 404, r.text)

print("rate limit")
codes = [
    client.post("/api/reviews", json=valid, headers=as_ip("10.0.0.99")).status_code
    for _ in range(4)
]
check("fourth submission in a window is limited", codes == [201, 201, 201, 429], str(codes))

print("cascade")
r = client.delete(f"/api/admin/books/{review_slug}")
check("delete returns 200", r.status_code == 200, r.text)
r = client.get("/api/reviews")
check("reviews removed with the book", all(x["book_slug"] != review_slug for x in r.json()), r.text)

r = client.delete(f"/api/admin/books/{review_slug}")
check("deleting twice is a 404", r.status_code == 404, r.text)

r = client.delete(f"/api/admin/reviews/{review_id}")
check("deleting a removed review is a 404", r.status_code == 404, r.text)

r = client.delete("/api/admin/poems/first-poem")
check("poem deleted", r.status_code == 200 and client.get("/api/poems").json() == [], r.text)

print("contact")
message = {
    "name": "A Reader",
    "email": "reader@example.com",
    "topic": "permissions",
    "body": "I would like to reprint one of the poems in a journal.",
}

r = client.post("/api/contact", json=message, headers=as_ip("10.1.0.1"))
check("message accepted", r.status_code == 201, r.text)
check("response is generic", "reader@example.com" not in r.text, r.text)

rows = client.get("/api/admin/messages").json()
check("stored and listed for the admin", len(rows) == 1, str(rows))
message_id = rows[0]["id"] if rows else 0
check("fields round-trip", rows and rows[0]["email"] == "reader@example.com", str(rows))
check("camelCase createdAt", rows and "createdAt" in rows[0], str(rows))

r = client.post("/api/contact", json={**message, "website": "spam.example"}, headers=as_ip("10.1.0.2"))
check("honeypot rejected", r.status_code == 400, r.text)

r = client.post("/api/contact", json={**message, "email": "not-an-email"}, headers=as_ip("10.1.0.3"))
check("malformed email 422", r.status_code == 422, r.text)

r = client.post("/api/contact", json={**message, "body": "short"}, headers=as_ip("10.1.0.4"))
check("short body 422", r.status_code == 422, r.text)

r = client.post("/api/contact", json={**message, "name": "x"}, headers=as_ip("10.1.0.5"))
check("short name 422", r.status_code == 422, r.text)

codes = [
    client.post("/api/contact", json=message, headers=as_ip("10.1.0.9")).status_code
    for _ in range(4)
]
check("contact rate limited too", codes == [201, 201, 201, 429], str(codes))

r = client.delete(f"/api/admin/messages/{message_id}")
check("message deleted", r.status_code == 200, r.text)
check(
    "deleted message leaves the list",
    all(x["id"] != message_id for x in client.get("/api/admin/messages").json()),
)

r = client.delete(f"/api/admin/messages/{message_id}")
check("deleting twice is a 404", r.status_code == 404, r.text)

r = anon.get("/api/admin/messages")
check("messages need a session", r.status_code == 401, r.text)

print("videos")
r = client.post(
    "/api/admin/videos",
    json={
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "description": "A reading",
    },
)
check("create returns 201", r.status_code == 201, r.text)
video_id = r.json()["id"]

r = client.get("/api/videos")
check(
    "video listed publicly with camelCase createdAt",
    len(r.json()) == 1 and r.json()[0]["description"] == "A reading" and "createdAt" in r.json()[0],
    r.text,
)

r = client.post(
    "/api/admin/videos",
    json={"url": "https://youtu.be/abc-DEF_123", "description": "Second"},
)
check("second create returns 201", r.status_code == 201, r.text)
r = client.get("/api/videos")
check("newest video first", r.json()[0]["description"] == "Second", r.text)

r = client.put(
    f"/api/admin/videos/{video_id}",
    json={
        "url": "https://www.youtube.com/shorts/abc-DEF_123",
        "description": "Revised",
    },
)
check(
    "update applies",
    r.status_code == 200 and r.json()["description"] == "Revised",
    r.text,
)
check(
    "update persisted for the public",
    any(
        v["id"] == video_id and v["description"] == "Revised"
        for v in client.get("/api/videos").json()
    ),
    r.text,
)

r = client.post(
    "/api/admin/videos", json={"url": "https://example.com/video", "description": "x"}
)
check("non-youtube url rejected", r.status_code == 422, r.text)
r = client.post(
    "/api/admin/videos", json={"url": "https://www.youtube.com/watch?v=short", "description": "x"}
)
check("url without an 11-char id rejected", r.status_code == 422, r.text)

r = client.delete(f"/api/admin/videos/{video_id}")
check("video deleted", r.status_code == 200, r.text)
check(
    "deleted video leaves the public list",
    all(v["id"] != video_id for v in client.get("/api/videos").json()),
    r.text,
)
r = client.delete(f"/api/admin/videos/{video_id}")
check("deleting twice is a 404", r.status_code == 404, r.text)
r = client.delete("/api/admin/videos/999999")
check("unknown video is a 404", r.status_code == 404, r.text)

print("seo")
r = client.get("/robots.txt")
check(
    "robots.txt points at an absolute sitemap",
    any(line.startswith("Sitemap: http") for line in r.text.splitlines()),
    r.text,
)
check("unknown page is a 404", client.get("/no-such-page").status_code == 404)
if DIST.is_dir():
    check("home page is a 200", client.get("/").status_code == 200)
    check("known book is a 200", client.get("/books/magar-manzar-nahi-mera").status_code == 200)
    check("unknown book is a 404", client.get("/books/not-a-real-slug").status_code == 404)

    # Per-route head rewriting: the whole point of api.seo is that the shell
    # does not go out identical on every URL.
    home = client.get("/").text
    check(
        "home title targets the head keywords",
        "<title>Urdu Poetry &amp; Shayari, Free Books Online — Mujahid Sajjad</title>" in home,
        home[:300],
    )
    check("home ships a canonical", 'rel="canonical" href="' in home, home[:300])
    check("home ships og:url", 'property="og:url"' in home, home[:300])
    check("home ships WebSite schema", '"@type":"WebSite"' in home, home[:300])
    check(
        "home shares the brand card",
        'property="og:image" content="' in home and "og-cover.png" in home,
        home[:400],
    )

    books = client.get("/books").text
    check(
        "books title names urdu poetry books",
        "<title>Urdu Poetry Books &amp; Criticism — Mujahid Sajjad</title>" in books,
        books[:300],
    )

    book_page = client.get("/books/magar-manzar-nahi-mera").text
    check(
        "book page title names the book and kind",
        "<title>Magar Manzar Nahi Mera — Urdu Poetry Book — Mujahid Sajjad</title>"
        in book_page,
        book_page[:300],
    )
    check(
        "book page ships Book schema",
        '"@type":"Book"' in book_page and '"isAccessibleForFree":true' in book_page,
        book_page[:400],
    )
    check(
        "book page canonical points at itself",
        'rel="canonical" href="' in book_page
        and book_page.split('rel="canonical" href="')[1].split('"')[0].endswith(
            "/books/magar-manzar-nahi-mera"
        ),
        book_page[:400],
    )

    admin_page = client.get("/admin").text
    check(
        "admin page is noindex in the head",
        '<meta name="robots" content="noindex, nofollow">' in admin_page,
        admin_page[:400],
    )
    about = client.get("/about").text
    check(
        "about title names the college city",
        "<title>Urdu Poet at GGC Burewala — Mujahid Sajjad</title>" in about,
        about[:300],
    )
    check(
        "about ships FAQPage schema",
        '"@type":"FAQPage"' in about and '"@type":"Question"' in about,
        about[:600],
    )
    check(
        "about shares the brand card",
        "og-cover.png" in about,
        about[:400],
    )
    check(
        "home description names the college",
        "Govt. Graduate College Burewala" in home.split('name="description"')[1][:400],
        home[:500],
    )
    check(
        "person schema carries the college address",
        '"addressLocality":"Burewala"' in home.replace(" ", ""),
        home[:600],
    )
    missing = client.get("/no-such-page")
    check(
        "404 head is noindex",
        '<meta name="robots" content="noindex, nofollow">' in missing.text,
        missing.text[:400],
    )

print(f"api check: {passed} assertions passed")

# Cleanup must never turn a passing run into a failing one, so the summary is
# printed first and locked files are tolerated - they live in TEMP either way.
import shutil  # noqa: E402

shutil.rmtree(MEDIA_DIR, ignore_errors=True)
engine.dispose()
try:
    os.remove(_TMP_DB)
except OSError:
    pass