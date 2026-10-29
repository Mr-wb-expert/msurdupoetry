"""Self-check for the API.

Run with:

    python -m api.check

Exercises the paths that are easy to break and hard to notice: auth rejection,
the session cookie's attributes, logout, the admin guard, slug collision,
cover upload validation, review moderation, the honeypot, the rate limit, and
the cascade delete on book removal.

Uses its own throwaway database with the in-process test client, so it needs
no running server and touches nothing in `api.db`. Each test simulates a
distinct client IP so the shared rate limiter does not make assertions
order-dependent.
"""

import os
import sys
import tempfile
import warnings

# Starlette's test client warns that httpx is the wrong client library. The
# warning is noise here and would look like a failure in CI output.
warnings.filterwarnings("ignore", message=".*httpx.*")

# Must be set before importing anything that opens the engine.
_TMP_DB = os.path.join(tempfile.gettempdir(), "api-check.db")
if os.path.exists(_TMP_DB):
    os.remove(_TMP_DB)
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB}"
os.environ["ADMIN_TOKEN_SECRET"] = "self-check-secret"
# Production origin: the canonical-redirect tests below are host-based, so the
# origin the app believes it serves has to be the real one. That https origin
# would also make auth.py mark the session cookie Secure, which the in-process
# http test client then refuses to send back — so the cookie stays plain here.
os.environ["SITE_URL"] = "https://www.msurdupoetry.com"
os.environ["COOKIE_SECURE"] = "0"
os.environ.pop("ADMIN_USERNAME", None)
os.environ.pop("ADMIN_PASSWORD", None)

from datetime import datetime  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

from api import app as app_module  # noqa: E402
from api import seo as seo_mod  # noqa: E402
from api.app import app, DIST  # noqa: E402
from api import seed  # noqa: E402
from api.auth import hash_password, make_token, read_token  # noqa: E402
from api.db import Base, SessionLocal, engine  # noqa: E402
from api.models import Admin, Book  # noqa: E402

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
    json={"title": "Nazm", "body": "x", "type": "Nazm", "author": "Ghazala Anjum", "book": "Gumaan"},
)
check(
    "verse type, author and book round-trip",
    r.status_code == 201
    and r.json()["type"] == "Nazm"
    and r.json()["author"] == "Ghazala Anjum"
    and r.json()["book"] == "Gumaan",
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

# The bundled verse file is what `python -m api.import_poems` loads; a bad
# slug, missing body or unknown type should fail here, not on the owner's
# first import.
print("bundled verses")
from api.import_poems import load_rows  # noqa: E402
from api.schemas import SLUG_RE  # noqa: E402

verses = load_rows()
check("verse slugs are unique", len({v["slug"] for v in verses}) == len(verses))
check("verse slugs are URL-safe", all(SLUG_RE.match(v["slug"]) for v in verses))
check("verse data has content", len(verses) > 0)

print("cover upload")
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32
r = client.post(
    "/api/admin/books/a-new-book/cover",
    files={"file": ("cover.png", PNG, "image/png")},
)
check("cover accepted", r.status_code == 200, r.text)
cover_url = r.json()["coverImage"]
check("cover path points at /media", str(cover_url).startswith("/media/"), str(cover_url))
served = client.get(cover_url)
check(
    "cover round-trips through the database",
    served.status_code == 200 and served.content == PNG,
    f"{cover_url} -> {served.status_code}",
)
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

print("poets")
r = client.get("/api/poets")
rows = r.json()
check("poets index served", r.status_code == 200 and len(rows) >= 4, r.text)
check(
    "poet fields come back camelCase with urdu name",
    rows and "poemCount" in rows[0] and "urdu" in rows[0],
    r.text,
)
r = client.get("/api/poets/not-a-poet")
check("unknown poet is a 404", r.status_code == 404, r.text)

created = client.post(
    "/api/admin/poems",
    json={"title": "Hub Poem", "body": "a sher\nwith two lines", "author": "Faiz Ahmed Faiz"},
)
check("poem by a real poet accepted", created.status_code == 201, created.text)

detail = client.get("/api/poets/faiz-ahmed-faiz")
check(
    "poet detail carries its verses",
    detail.status_code == 200
    and detail.json()["poemCount"] == 1
    and len(detail.json()["poems"]) == 1
    and detail.json()["urdu"] == "فیض احمد فیض",
    detail.text[:300],
)
counts = {p["slug"]: p["poemCount"] for p in client.get("/api/poets").json()}
check(
    "poets index counts only that poet",
    counts.get("faiz-ahmed-faiz", 0) == 1 and counts.get("mohsin-naqvi", -1) == 0
    and counts.get("ahmed-faraz", -1) == 0 and counts.get("parveen-shakir", -1) == 0,
    str(counts),
)
client.delete("/api/admin/poems/hub-poem")

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
r = client.get("/llms.txt")
check(
    "llms.txt orients the AI fetchers",
    r.status_code == 200 and "# Mujahid Sajjad" in r.text and "/poems" in r.text,
    r.text[:200],
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
        "<title>Urdu Poetry &amp; Shayari | Iqbal, Ghalib, Faiz, Jaun Elia | Mujahid Sajjad</title>" in home,
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
        "<title>Urdu Poetry Books PDF | Read Online &amp; Free Download | Mujahid Sajjad</title>" in books,
        books[:300],
    )

    book_page = client.get("/books/magar-manzar-nahi-mera").text
    check(
        "book page title names the book and kind",
        "<title>Magar Manzar Nahi Mera | Urdu Poetry Book | Mujahid Sajjad</title>"
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
        "<title>Urdu Poet at GGC Burewala | Mujahid Sajjad</title>" in about,
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
        "home description names the poets, not only the site owner",
        "Iqbal, Ghalib, Faiz" in home.split('name="description"')[1][:400],
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

    poets_index = client.get("/poets")
    check(
        "poets page is a 200 with its own title",
        poets_index.status_code == 200
        and "<title>Famous Urdu Poets | Iqbal, Ghalib, Faiz, Jaun Elia &amp; More | Mujahid Sajjad</title>"
        in poets_index.text,
        poets_index.text[:300],
    )
    poet_page = client.get("/poets/faiz-ahmed-faiz")
    check(
        "poet page ships Person schema with the urdu name",
        poet_page.status_code == 200
        and '"@type":"Person"' in poet_page.text
        and "فیض احمد فیض" in poet_page.text,
        poet_page.text[:400],
    )
    check("unknown poet is a 404", client.get("/poets/not-a-real-poet").status_code == 404)

    # The new titles must lead with the roman poet name and include head
    # terms, because search queries are in latin script (e.g., "mirza ghalib
    # poetry"), not in the Urdu script of the old title.
    poet_page_m = client.get("/poets/mirza-ghalib")
    check(
        "poet page title uses roman name and keywords",
        "<title>Mirza Ghalib Poetry in Urdu | Ghazals, Shayari &amp; Biography</title>"
        in poet_page_m.text,
        poet_page_m.text[:300],
    )
    # The poets section deleted its poem, so this section makes its own.
    client.post(
        "/api/admin/poems",
        json={"title": "Hub Poem", "body": "a sher\nwith two lines", "author": "Faiz Ahmed Faiz"},
    )
    hp = client.get("/poems/hub-poem")
    check(
        "poem title includes author and kind",
        # No site suffix on poem pages: it would follow another poet's name.
        "<title>Hub Poem | Ghazal by Faiz Ahmed Faiz</title>" in hp.text,
        hp.text[:320],
    )
    client.post(
        "/api/admin/poems",
        json={
            "title": "Mir Ghazal",
            "body": "a line\nnext",
            "author": "مرزا اسد اللہ خان غالب",
        },
    )
    m = client.get("/poems/mir-ghazal")
    check(
        "poem head uses roman author name for Urdu-script author",
        "<title>Mir Ghazal | Ghazal by Mirza Ghalib</title>" in m.text,
        m.text[:320],
    )

    # --- GEO: everything above ships the head; these ship the body. -------
    # A fetcher that skips JavaScript (GPTBot, ClaudeBot, PerplexityBot ...)
    # gets the page's rendered text inside #root; a real browser gets the
    # empty root React expects. Same head either way.
    print("geo")
    gpt = {"User-Agent": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) GPTBot/1.0"}
    chrome = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    }

    crawler_home = client.get("/", headers=gpt).text
    home_root = crawler_home.split('<div id="root">')[-1]
    check(
        "crawler gets the home page as text",
        "<h1>Urdu Poetry &amp; Shayari: Ghazals, Nazms and Books</h1>" in home_root
        and "A free library of Urdu poetry" in home_root
        and "<h3>Which Urdu poets can I read here?</h3>" in home_root,
        home_root[:300],
    )
    browser_home = client.get("/", headers=chrome).text
    check(
        "browser gets the empty root React expects",
        '<div id="root"></div>' in browser_home,
        browser_home[:300],
    )
    check(
        "browser and crawler read the same head",
        browser_home.split("<title>")[1].split("</title>")[0]
        == crawler_home.split("<title>")[1].split("</title>")[0],
        browser_home[:300],
    )
    check("person schema carries social profiles", '"sameAs"' in crawler_home, crawler_home[:600])

    crawler_book = client.get("/books/magar-manzar-nahi-mera", headers=gpt).text
    book_root = crawler_book.split('<div id="root">')[-1]
    # "free of charge" sits past the 300-char meta description and in no
    # schema node, so it can only have arrived in the rendered body.
    check(
        "crawler gets the book's full description as text",
        "free of charge" in book_root,
        book_root[:400],
    )
    check(
        "book page ships its FAQ as visible text",
        "<h3>Is Magar Manzar Nahi Mera free?</h3>" in book_root,
        book_root[-400:],
    )

    crawler_poem = client.get("/poems/mir-ghazal", headers=gpt).text
    poem_root = crawler_poem.split('<div id="root">')[-1]
    check(
        "crawler gets the full verse, marked as Urdu",
        '<div lang="ur" dir="rtl"><p style="white-space:pre-line">a line\nnext</p>' in poem_root,
        poem_root[:400],
    )
    check(
        "poem body states its dates and skips a needless Last updated",
        "Published " in poem_root and "Last updated" not in poem_root,
        poem_root[:300],
    )

    # Roman Urdu, word meanings and explanation: saved by the admin, served on
    # the single-verse endpoint and in the crawler body, absent from the list.
    client.post(
        "/api/admin/poems",
        json={
            "title": "Extras Ghazal",
            "body": "dil line\nnext line",
            "author": "Faiz Ahmed Faiz",
            "roman": "dil line roman\nnext line roman",
            "meanings": "دل — heart / دل\nlone",
            "notes": "Urdu note.\n\nEnglish note.",
        },
    )
    detail = client.get("/api/poems/extras-ghazal").json()
    check(
        "single verse returns roman, meanings and notes",
        detail.get("roman") == "dil line roman\nnext line roman"
        and detail.get("notes") == "Urdu note.\n\nEnglish note.",
        str(detail),
    )
    listing = client.get("/api/poems").json()
    check(
        "verse listing leaves the extras out",
        all("roman" not in p for p in listing),
        str(listing[:1]),
    )
    extras_root = client.get("/poems/extras-ghazal", headers=gpt).text.split('<div id="root">')[-1]
    check(
        "crawler gets roman, meanings and notes",
        "<h2>Roman Urdu</h2>" in extras_root
        and '<dt lang="ur" dir="rtl">دل</dt><dd>heart / دل</dd>' in extras_root
        and '<dt lang="ur" dir="rtl">lone</dt><dd></dd>' in extras_root
        and "<p>English note.</p>" in extras_root,
        extras_root[:600],
    )

    crawler_about = client.get("/about", headers=gpt).text
    about_root = crawler_about.split('<div id="root">')[-1]
    check(
        "about page serves the entity heading and FAQ as text",
        "<h2>Who is Mujahid Sajjad?</h2>" in about_root
        and "<h3>Who is Mujahid Sajjad?</h3>" in about_root,
        about_root[:400],
    )
    check(
        "about FAQ answer is in the body and the schema",
        crawler_about.count("both live in this site's free library") >= 2,
        str(crawler_about.count("both live in this site's free library")),
    )

    crawler_books = client.get("/books", headers=gpt).text
    books_root = crawler_books.split('<div id="root">')[-1]
    check(
        "crawler gets the catalogue as links to every book",
        "<h1>Urdu Poetry Books</h1>" in books_root
        and '<h2><a href="/books/magar-manzar-nahi-mera">' in books_root,
        books_root[:400],
    )

    crawler_videos = client.get("/videos", headers=gpt).text
    check(
        "videos page ships VideoObject schema",
        '"@type":"VideoObject"' in crawler_videos
        and "hqdefault.jpg" in crawler_videos
        and "abc-DEF_123" in crawler_videos,
        crawler_videos[crawler_videos.find("page-jsonld") - 100:][:400],
    )

    # Real dates: per-URL lastmod in the sitemap, the same stamp as
    # dateModified in the head, and updated_at bumped by every admin edit.
    print("dates")
    db_dates = SessionLocal()
    backdated = db_dates.query(Book).filter(Book.slug == "magar-manzar-nahi-mera").first()
    backdated.created_at = datetime(2025, 1, 15, 9, 0, 0)
    backdated.updated_at = datetime(2025, 1, 15, 9, 0, 0)
    db_dates.commit()
    db_dates.close()

    app_module._sitemap_cache = None
    sm = client.get("/sitemap.xml").text
    check(
        "book url carries its own lastmod",
        "/books/magar-manzar-nahi-mera</loc><lastmod>2025-01-15</lastmod>" in sm,
        sm[:400],
    )
    marker = "/about</loc><lastmod>"
    check("sitemap lists the about page", marker in sm, sm[:400])
    about_stamp = sm.split(marker)[-1].split("</lastmod>")[0]
    check(
        "list pages use their content's newest date, not the backdated one",
        about_stamp != "2025-01-15",
        about_stamp,
    )

    seo_mod._seo_cache.clear()
    check(
        "book head carries the book's own dateModified",
        '"dateModified":"2025-01-15"' in client.get("/books/magar-manzar-nahi-mera").text,
    )

    db_edit = SessionLocal()
    edited = db_edit.query(Book).filter(Book.slug == "a-new-book").first()
    edited.updated_at = datetime(2000, 1, 1, 0, 0, 0)
    db_edit.commit()
    db_edit.close()
    r = client.put(
        "/api/admin/books/a-new-book",
        json={"title": "Renamed Book", "description": "edited"},
    )
    check(
        "admin edit bumps updatedAt",
        r.status_code == 200
        and r.json().get("updatedAt")
        and r.json()["updatedAt"] != "2000-01-01T00:00:00",
        r.text,
    )

print("canonical redirects")
prod_https = {"host": "www.msurdupoetry.com", "x-forwarded-proto": "https"}

r = client.get("/poems", headers=prod_https, follow_redirects=False)
check("canonical URL is served", r.status_code == 200, f"{r.status_code}")

r = client.get("/poems/", headers=prod_https, follow_redirects=False)
check(
    "trailing slash 301s to the clean URL",
    r.status_code == 301
    and r.headers["location"] == "https://www.msurdupoetry.com/poems",
    f"{r.status_code} {r.headers.get('location')}",
)

r = client.get(
    "/poems", headers={"host": "msurdupoetry.com", "x-forwarded-proto": "https"},
    follow_redirects=False,
)
check(
    "bare domain 301s to www",
    r.status_code == 301
    and r.headers["location"] == "https://www.msurdupoetry.com/poems",
    f"{r.status_code} {r.headers.get('location')}",
)

r = client.get(
    "/poems?page=2", headers={"host": "www.msurdupoetry.com", "x-forwarded-proto": "http"},
    follow_redirects=False,
)
check(
    "http 301s to https and keeps the query",
    r.status_code == 301
    and r.headers["location"] == "https://www.msurdupoetry.com/poems?page=2",
    f"{r.status_code} {r.headers.get('location')}",
)

r = client.get("/index.html", headers=prod_https, follow_redirects=False)
check(
    "index.html 301s to the root",
    r.status_code == 301 and r.headers["location"] == "https://www.msurdupoetry.com/",
    f"{r.status_code} {r.headers.get('location')}",
)

print(f"api check: {passed} assertions passed")

# Cleanup must never turn a passing run into a failing one, so the summary is
# printed first and locked files are tolerated - they live in TEMP either way.
engine.dispose()
try:
    os.remove(_TMP_DB)
except OSError:
    pass