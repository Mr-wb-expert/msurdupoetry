"""Per-route head metadata for the app shell.

The SPA ships one index.html, so without this every URL would leave the
server with the same title, description and structured data — which is all a
crawler that does not run JavaScript ever sees. Share unfurlers (WhatsApp,
Facebook, X) never run JavaScript either, so this is also what a shared book
link looks like.

The copy mirrors the <Seo> props in web/src/pages: the client rewrites the
same tags after hydration, so a mismatch would flash one title and settle on
another. Titles follow Seo.tsx's rule — every title except the bare site name
gains a " — Mujahid Sajjad" suffix.
"""

import html
import json
import re

from api.models import Book, Poem

SITE_NAME = "Mujahid Sajjad"
FULL_NAME = "Prof. Syed Mujahid Sajjad"

# path -> (title, description). Keep in step with web/src/pages/*.tsx.
PAGE_COPY = {
    "": (
        "Urdu Poetry & Urdu Shayari",
        "Read the Urdu poetry of Mujahid Sajjad, Urdu poet and Associate Professor "
        "at Govt. Graduate College Burewala. Free ghazals, nazms and books online.",
    ),
    "books": (
        "Urdu Poetry Books & Criticism",
        "Every book by Mujahid Sajjad — poetry, criticism and essays. Read online "
        "or download the PDF free.",
    ),
    "poems": (
        "Urdu Poems & Shayari — Ghazals, Nazms",
        "Read Urdu shayari by Mujahid Sajjad — ghazal and nazm couplets in Urdu, "
        "free to read and share.",
    ),
    "videos": (
        "Urdu Poetry Videos",
        "Watch Urdu poetry videos by Mujahid Sajjad — ghazal and shayari readings "
        "on YouTube.",
    ),
    "about": (
        "Urdu Poet at GGC Burewala",
        "Prof. Syed Mujahid Sajjad is an Urdu poet and writer, and Associate "
        "Professor of English at Govt. Graduate College Burewala, Government of "
        "the Punjab.",
    ),
}

# Book pages name their category; mirrors BOOK_KIND in web/src/lib/types.ts.
BOOK_KIND = {
    "poetry": "Urdu Poetry Book",
    "criticism": "Criticism Book",
    "essays": "Essays",
    "research": "Research Book",
    "other": "Book",
}


def _full_title(title: str) -> str:
    return title if title == SITE_NAME else f"{title} — {SITE_NAME}"


def _breadcrumb(
    parent: str, parent_path: str, page_name: str, page_path: str, origin: str
) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": parent,
                "item": f"{origin}/{parent_path}",
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": page_name,
                "item": f"{origin}/{page_path}",
            },
        ],
    }


def head(path: str, db, origin: str) -> dict:
    """Title, description, canonical URL, share image and JSON-LD for one route."""
    origin = origin.rstrip("/")
    url = f"{origin}/{path}" if path else f"{origin}/"
    title = description = None
    image = None
    graph: list[dict] = []
    noindex = False

    if path in PAGE_COPY:
        title, description = PAGE_COPY[path]
        if path in ("", "about"):
            image = "/images/author.jpeg"
        if path == "":
            graph = [
                {
                    "@context": "https://schema.org",
                    "@type": "WebSite",
                    "name": SITE_NAME,
                    "url": f"{origin}/",
                    "description": description,
                }
            ]
    elif path.startswith("books/"):
        book = db.query(Book).filter(Book.slug == path.removeprefix("books/")).first()
        if book is None:
            noindex = True
        else:
            title = f"{book.title} — {BOOK_KIND.get(book.category, 'Book')}"
            description = (book.description or "").strip()[:300] or (
                f"Read {book.title} by {FULL_NAME} — free online and as a PDF."
            )
            image = book.cover_image
            graph = [
                {
                    "@context": "https://schema.org",
                    "@type": "Book",
                    "name": book.title,
                    "author": {"@type": "Person", "name": book.author or FULL_NAME},
                    "inLanguage": ["ur", "en"],
                    "bookFormat": "https://schema.org/Pdf",
                    "isAccessibleForFree": True,
                    **({"image": book.cover_image} if book.cover_image else {}),
                    **(
                        {"datePublished": str(book.published_year)}
                        if book.published_year
                        else {}
                    ),
                    **({"numberOfPages": book.pages} if book.pages else {}),
                    "offers": {"@type": "Offer", "price": "0", "priceCurrency": "INR"},
                },
                _breadcrumb("Books", "books", book.title, path, origin),
            ]
    elif path.startswith("poems/"):
        poem = db.query(Poem).filter(Poem.slug == path.removeprefix("poems/")).first()
        if poem is None:
            noindex = True
        else:
            kind = poem.type or "Poem"
            title = f"{poem.title} — Urdu {kind}"
            description = (
                f"Read {poem.title} by Mujahid Sajjad — an Urdu {kind.lower()} "
                "free online."
            )
            graph = [
                {
                    "@context": "https://schema.org",
                    "@type": "CreativeWork",
                    "name": poem.title,
                    "author": {"@type": "Person", "name": FULL_NAME},
                    "inLanguage": "ur",
                },
                _breadcrumb("Verses", "poems", poem.title, path, origin),
            ]

    if title is None:
        # Unknown route, or /admin — which robots.txt already disallows and
        # which deserves the meta signal on top of the txt rule.
        noindex = True
        if path == "admin":
            title, description = "Admin", "Site administration."
        else:
            title, description = "Page not found", "This page does not exist."

    if image and not image.startswith(("http://", "https://")):
        image = f"{origin}{image}" if image.startswith("/") else f"{origin}/{image}"

    return {
        "title": _full_title(title),
        "description": " ".join(description.split()),
        "url": url,
        "image": image,
        "noindex": noindex,
        "graph": graph,
    }


def apply(document: str, meta: dict) -> str:
    """Rewrite the shell's <head> for one page, in place."""
    title_text = html.escape(meta["title"], quote=False)
    title_attr = html.escape(meta["title"], quote=True)
    description = html.escape(meta["description"], quote=True)

    document = re.sub(
        r"<title>[^<]*</title>",
        lambda _: f"<title>{title_text}</title>",
        document,
        count=1,
    )
    for pattern, value in (
        (r'(<meta\s+name="description"\s+content=")[^"]*(")', description),
        (r'(<meta\s+property="og:title"\s+content=")[^"]*(")', title_attr),
        (r'(<meta\s+property="og:description"\s+content=")[^"]*(")', description),
    ):
        document = re.sub(
            pattern, lambda m, v=value: m.group(1) + v + m.group(2), document, count=1
        )

    url = html.escape(meta["url"], quote=True)
    tags = [
        f'<link rel="canonical" href="{url}">',
        f'<meta property="og:url" content="{url}">',
    ]
    if meta["image"]:
        image = html.escape(meta["image"], quote=True)
        tags.append(f'<meta property="og:image" content="{image}">')
    if meta["noindex"]:
        tags.append('<meta name="robots" content="noindex, nofollow">')
    if meta["graph"]:
        # The id is the contract with Seo.tsx: it removes #page-jsonld before
        # writing the next page's graph, so the server's copy cannot outlive
        # a client-side navigation to a different page.
        payload = json.dumps(
            {"@context": "https://schema.org", "@graph": meta["graph"]},
            ensure_ascii=False,
            separators=(",", ":"),
        )
        tags.append(
            f'<script id="page-jsonld" type="application/ld+json">{payload}</script>'
        )

    return document.replace(
        "</head>", "\n    " + "\n    ".join(tags) + "\n  </head>", 1
    )
