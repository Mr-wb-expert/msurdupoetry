"""Per-route head metadata and static body for the app shell.

The SPA ships one index.html, so without this every URL would leave the
server with the same title, description and structured data — which is all a
crawler that does not run JavaScript ever sees. Share unfurlers (WhatsApp,
Facebook, X) never run JavaScript either, so this is also what a shared book
link looks like.

Crawlers that skip JavaScript get one step more than the head: body() renders
the page's text — the poem, the book description, the FAQ — into #root, for
any user agent that is not recognisably a browser (see wants_static_body).
Browsers get the empty shell, because React's createRoot clears whatever it
finds in #root and a server copy would flash once for every visitor.

The copy mirrors the <Seo> props in web/src/pages: the client rewrites the
same tags after hydration, so a mismatch would flash one title and settle on
another. Titles follow Seo.tsx's rule — every title except the bare site name
gains a " — Mujahid Sajjad" suffix.
"""

import html
import json
import re
from urllib.parse import quote

from sqlalchemy import func

from api.models import Book, Poem, Video
from api.poets import POETS, by_slug, roman_name

SITE_NAME = "Mujahid Sajjad"
FULL_NAME = "Prof. Syed Mujahid Sajjad"
# Mirrors web/src/lib/site.ts — the same facts the client renders from its own
# copy, so the static body and the hydrated page say identical words.
SITE_TITLE = "Urdu Poet, Writer & Associate Professor of English"
SITE_AFFILIATION = "Govt. Graduate College Burewala, Government of the Punjab"
SITE_DESCRIPTION = (
    "Welcome to the official digital library and archive of Prof. Mujahid Sajjad "
    "Associate Professor of English (GGC Burewala), Urdu Poet, and Author. Access "
    "all published works online or download free PDF editions"
)

# path -> (title, description). Keep in step with web/src/pages/*.tsx.
PAGE_COPY = {
    "": (
        "Urdu Poetry & Shayari, Free Books Online",
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
    "poets": (
        "Urdu Poets & Authors — Faiz, Jaun Elia, Mohsin Naqvi",
        "The poets whose verses live on this site — Faiz Ahmed Faiz, Jaun Elia, "
        "Mohsin Naqvi and Mujahid Sajjad. Read their ghazals and nazms in Urdu, free.",
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

# Visible FAQ at the foot of /about — the FAQPage schema must repeat it
# exactly. Keep in step with AboutPage.tsx. Answers run 40–60 words: long
# enough for an engine to lift one whole, short enough to stay one answer,
# and every claim in them is a fact the library already states somewhere.
FAQ = [
    (
        "Who is Mujahid Sajjad?",
        "Syed Mujahid Sajjad is an Urdu poet and writer, and Associate Professor "
        "of English at Govt. Graduate College Burewala, Government of the Punjab. "
        "He writes ghazals and nazms in Urdu and teaches English; his collection "
        "Magar Manzar Nahi Mera and Ghazala Anjum's critical study of his poetry "
        "both live in this site's free library.",
    ),
    (
        "Where can I read Magar Manzar Nahi Mera online?",
        "The whole book is free on this site — open it in the browser from its "
        "Books page, or download the PDF from the same page. It is a collection "
        "of ghazals and nazms published in 2026, and reading it needs no account, "
        "no sign-up and no payment.",
    ),
    (
        "Are the books free to download?",
        "Yes. Every book in the library — poetry, criticism and essays — is free "
        "to read online and free to download as a PDF. There is no account, no "
        "subscription and no payment at any point; each book page carries its own "
        "download link.",
    ),
    (
        "Who wrote the criticism of his poetry?",
        "Ghazala Anjum wrote it. Her critical study, An Article on the Poetry of "
        "Mujahid Sajjad, is kept in the library alongside the collection — a "
        "reading of the poems' images, plainspoken idiom and the balance they hold "
        "between observation and feeling.",
    ),
    (
        "What languages does he write in?",
        "He writes poetry in Urdu — ghazals, nazms and essays — and teaches English "
        "as Associate Professor at Govt. Graduate College Burewala, Government of "
        "the Punjab. English is the language of his classroom; Urdu is the language "
        "of his verse, free to read here.",
    ),
]

# Book pages name their category; mirrors BOOK_KIND in web/src/lib/types.ts.
BOOK_KIND = {
    "poetry": "Urdu Poetry Book",
    "ghazal": "Ghazal Poetry Book",
    "criticism": "Criticism Book",
    "essays": "Essays",
    "research": "Research Book",
    "other": "Book",
}

# Visible category names — mirrors categoryLabels in web/src/lib/types.ts.
CATEGORY_LABELS = {
    "poetry": "Poetry",
    "ghazal": "Ghazal",
    "criticism": "Criticism",
    "essays": "Essays",
    "research": "Research",
    "other": "Literature",
}

# The id in the URL shapes YouTube actually hands out — mirrors youtubeId()
# in web/src/lib/videos.ts, so both ends keep and drop the same links.
_YOUTUBE_RE = re.compile(
    r"(?:youtu\.be/|youtube\.com/(?:watch\?(?:[^#]*&)?v=|shorts/|embed/))([\w-]{11})"
)


def _youtube_id(url: str) -> str | None:
    match = _YOUTUBE_RE.search(url or "")
    return match.group(1) if match else None


def _date_str(value) -> str:
    """'5 March 2026' — mirrors formatDate() in web/src/lib/dates.ts."""
    return f"{value.day} {value.strftime('%B %Y')}"


def _iso_date(value) -> str:
    """YYYY-MM-DD — the client slices createdAt the same way, so the two
    JSON-LD graphs cannot disagree about a day."""
    return value.date().isoformat()


def _faq_node(pairs) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": question,
                "acceptedAnswer": {"@type": "Answer", "text": answer},
            }
            for question, answer in pairs
        ],
    }


def book_faq(book: Book) -> list[tuple[str, str]]:
    """The three questions a book page answers, from the row's own facts.

    BookPage.tsx renders the same three in the same words — the visible FAQ
    and this schema must not disagree, so both are built from the same
    template (kept in step by hand, like the rest of the copy here).
    """
    title = book.title
    author = book.author or FULL_NAME
    published = f", published in {book.published_year}" if book.published_year else ""
    description = (book.description or "").strip()
    return [
        (
            f"Is {title} free?",
            f"Yes. {title} is free to read in the browser on this page and free to "
            "download as a PDF — there is no account, no subscription and no "
            "payment at any point. The Read online and Download buttons at the "
            "top of the page open it.",
        ),
        (
            f"Who wrote {title}?",
            f"{author} wrote {title}{published}. It sits in this site's free digital "
            "library of Urdu poetry, criticism and essays — read it online or "
            "download the PDF, no account needed.",
        ),
        (
            f"What is {title} about?",
            description
            or f"{title} by {author} — free to read online on this page and to "
            "download as a PDF.",
        ),
    ]


def _full_title(title: str) -> str:
    return title if title == SITE_NAME else f"{title} — {SITE_NAME}"


def _abs_image(src: str | None, origin: str) -> str | None:
    """Absolute, percent-encoded image URL — share crawlers resolve neither
    site-relative paths nor raw spaces in a filename."""
    if not src:
        return None
    if not src.startswith(("http://", "https://")):
        src = f"{origin}/{src.lstrip('/')}"
    return quote(src, safe="/:")


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


import time

_seo_cache: dict[str, tuple[float, dict]] = {}
_SEO_CACHE_TTL = 600.0  # 10 minutes


def head(path: str, db, origin: str) -> dict:
    """Title, description, canonical URL, share image and JSON-LD for one route."""
    now = time.time()
    cache_key = f"{origin}:{path}"
    cached = _seo_cache.get(cache_key)
    if cached is not None and (now - cached[0]) < _SEO_CACHE_TTL:
        return cached[1]

    origin = origin.rstrip("/")
    url = f"{origin}/{path}" if path else f"{origin}/"
    title = description = None
    image = None
    graph: list[dict] = []
    noindex = False

    if path in PAGE_COPY:
        title, description = PAGE_COPY[path]
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
        elif path == "about":
            graph = [_faq_node(FAQ)]
        elif path == "videos":
            # One VideoObject per video. datePublished (the day it was added
            # to this site) rather than uploadDate: that is the only date the
            # database holds, and uploadDate would claim the YouTube upload
            # date, which nothing here can verify.
            graph = [
                {
                    "@context": "https://schema.org",
                    "@type": "VideoObject",
                    "name": video.description or "Urdu poetry video",
                    "description": video.description
                    or "Urdu poetry video by Mujahid Sajjad.",
                    "thumbnailUrl": f"https://img.youtube.com/vi/{_youtube_id(video.url)}/hqdefault.jpg",
                    "contentUrl": f"https://www.youtube.com/watch?v={_youtube_id(video.url)}",
                    "embedUrl": f"https://www.youtube-nocookie.com/embed/{_youtube_id(video.url)}",
                    "inLanguage": "ur",
                    "datePublished": _iso_date(video.created_at),
                }
                for video in db.query(Video).order_by(Video.created_at.desc()).all()
                if _youtube_id(video.url)
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
                    **({"image": _abs_image(book.cover_image, origin)} if book.cover_image else {}),
                    **(
                        {"datePublished": str(book.published_year)}
                        if book.published_year
                        else {}
                    ),
                    **(
                        {"dateModified": _iso_date(book.updated_at or book.created_at)}
                        if (book.updated_at or book.created_at)
                        else {}
                    ),
                    **({"numberOfPages": book.pages} if book.pages else {}),
                    "offers": {"@type": "Offer", "price": "0", "priceCurrency": "PKR"},
                },
                _breadcrumb("Books", "books", book.title, path, origin),
                # The same three questions the page answers in visible text —
                # see book_faq().
                _faq_node(book_faq(book)),
            ]
    elif path.startswith("poems/"):
        poem = db.query(Poem).filter(Poem.slug == path.removeprefix("poems/")).first()
        if poem is None:
            noindex = True
        else:
            kind = poem.type or "Poem"
            # The roman name: half the stored authors are in Urdu script, and
            # nobody types a search in Urdu script. This is what the head says.
            author = roman_name(poem.author) or SITE_NAME
            title = f"{poem.title} — {kind} by {author}"
            # Per-poem description: quote the opening lines instead of a
            # template, so every page's crawler signal actually differs.
            lines = [l.strip() for l in (poem.body or "").split("\n") if l.strip()]
            suffix = f"by {author}. Urdu {kind.lower()} online."
            budget = max(20, 155 - len(f"{poem.title} {suffix}"))
            opening = " ".join(lines[:2])[:budget]
            description = f"“{opening}” {poem.title} {suffix}"
            if poem.book:
                description += f" From the book {poem.book}."
            graph = [
                {
                    "@context": "https://schema.org",
                    "@type": "CreativeWork",
                    "name": poem.title,
                    "author": {"@type": "Person", "name": poem.author or FULL_NAME},
                    "inLanguage": "ur",
                    "datePublished": _iso_date(poem.created_at),
                    "dateModified": _iso_date(poem.updated_at or poem.created_at),
                },
                _breadcrumb("Verses", "poems", poem.title, path, origin),
            ]

    elif path.startswith("poets/"):
        poet = by_slug(path.removeprefix("poets/"))
        if poet is None:
            noindex = True
        else:
            # The roman name leads the title: the queries are "jaun elia
            # poetry" and "parveen shakir shayari", never the Urdu script.
            title = f"{poet['name']} — Ghazal, Shayari & Poetry"
            description = (
                f"Read Urdu ghazals, nazms and shayari by {poet['name']} — "
                "biography and verses, free online, no sign-up."
            )
            graph = [
                {
                    "@context": "https://schema.org",
                    "@type": "Person",
                    "name": f"{poet['urdu']} ({poet['name']})",
                    "url": f"{origin}/poets/{poet['slug']}",
                    "description": poet["bio"],
                },
                _breadcrumb("Poets", "poets", poet["urdu"], path, origin),
            ]

    if title is None:
        # Unknown route, or /admin — which robots.txt already disallows and
        # which deserves the meta signal on top of the txt rule.
        noindex = True
        if path == "admin":
            title, description = "Admin", "Site administration."
        else:
            title, description = "Page not found", "This page does not exist."

    # Every public page has a share image; admin and 404 do not. Book pages
    # carry their own cover; everything else gets the branded card.
    if not noindex and not image:
        image = "/images/og-cover.png"
    image = _abs_image(image, origin)

    result = {
        "title": _full_title(title),
        "description": " ".join(description.split()),
        "url": url,
        "image": image,
        "noindex": noindex,
        "graph": graph,
    }
    _seo_cache[cache_key] = (now, result)
    return result


def apply(document: str, meta: dict, body: str = "") -> str:
    """Rewrite the shell's <head> for one page, in place — and, for fetchers
    that skip JavaScript, fill its #root with the static rendering."""
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
    card = "summary_large_image" if meta["image"] else "summary"
    tags.append(f'<meta name="twitter:card" content="{card}">')
    tags.append(f'<meta name="twitter:title" content="{title_attr}">')
    tags.append(f'<meta name="twitter:description" content="{description}">')
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

    if body:
        # The shell ships an empty root; only a non-browser ever finds one
        # filled, so React never meets content it would have to clear first.
        document = document.replace(
            '<div id="root"></div>', f'<div id="root">{body}</div>', 1
        )

    return document.replace(
        "</head>", "\n    " + "\n    ".join(tags) + "\n  </head>", 1
    )


# ---------------------------------------------------------------------------
# Static body: the page's text, for fetchers that skip JavaScript
# ---------------------------------------------------------------------------

# UA tokens that mean "a crawler or a fetcher". Checked before the browser
# pattern, because Googlebot's smartphone UA carries a full AppleWebKit
# string and must not be mistaken for a browser.
_CRAWLER_UA = re.compile(
    r"bot|crawl|spider|slurp|preview|archiver|libwww|curl|wget|python-|httpx|aiohttp|"
    r"scrapy|requests|anthropic|cohere|chatgpt|gptbot|perplexity|ccbot|bytespider|"
    r"google-extended|google-agent|externalhit|externalagent|slackbot|discordbot|"
    r"twitterbot|linkedinbot|telegrambot|whatsapp|embedly|redditbot|pinterest|"
    r"yandex|baiduspider|duckduckbot|applebot|lighthouse|pingdom|ahrefs|semrush",
    re.I,
)
# What every real browser's UA carries. Anything matched by neither pattern
# is unknown, and unknown gets the body.
_BROWSER_UA = re.compile(
    r"applewebkit|gecko/|trident/|chrome|chromium|firefox|fxios|safari|opera|opr/|"
    r"vivaldi|brave|samsungbrowser",
    re.I,
)


def wants_static_body(user_agent: str | None) -> bool:
    """True when the request should receive the server-rendered page text.

    False only for a user agent recognisably holding a real browser. Known
    crawlers, unfurlers, plain HTTP libraries and everything unrecognised
    get the body — the point of dynamic rendering is to be there for the
    fetcher nobody has listed yet. Spoofing a browser UA to miss the body
    also claims JavaScript, in which case the client app shows the same
    content anyway.
    """
    if not user_agent:
        return True
    if _CRAWLER_UA.search(user_agent):
        return True
    return not _BROWSER_UA.search(user_agent)


def _e(text) -> str:
    return html.escape(str(text), quote=False)


def _link(href: str, text: str) -> str:
    return f'<a href="{html.escape(href, quote=True)}">{_e(text)}</a>'


def _first_stanza(body: str) -> str:
    """The first block of a poem — CoupletCard's firstSher, same split."""
    return re.split(r"\n{2,}", (body or "").replace("\r\n", "\n"), maxsplit=1)[0]


def _book_facts(book: Book) -> list[tuple[str, str]]:
    """The rows BookPage's facts list shows, including its Last updated."""
    facts = [
        ("Author", book.author or ""),
        ("Category", CATEGORY_LABELS.get(book.category, "Book")),
    ]
    if book.published_year:
        facts.append(("Published", str(book.published_year)))
    if book.pages:
        facts.append(("Pages", str(book.pages)))
    if book.publication:
        facts.append(("Publication", book.publication))
    facts.append(("Price", "Free"))
    modified = book.updated_at or book.created_at
    if modified:
        facts.append(("Last updated", _date_str(modified)))
    return facts


def _book_label(book: Book) -> str:
    label = CATEGORY_LABELS.get(book.category, "Book")
    return f"{label} · {book.published_year}" if book.published_year else label


def _facts_html(facts) -> str:
    return (
        "<dl>"
        + "".join(
            f"<div><dt>{_e(label)}</dt><dd>{_e(value)}</dd></div>"
            for label, value in facts
        )
        + "</dl>"
    )


def _faq_html(pairs) -> str:
    return "".join(f"<h3>{_e(q)}</h3><p>{_e(a)}</p>" for q, a in pairs)


def _poet_for(author: str | None) -> dict | None:
    """The poet page an author string links to — mirrors poetHref() in
    web/src/lib/poets.ts (an exact alias match, nothing else)."""
    return next((p for p in POETS if author in p["aliases"]), None)


def body(path: str, db) -> str:
    """The page's text, injected into #root for fetchers that skip JavaScript.

    GPTBot, ClaudeBot and PerplexityBot execute no scripts, so without this
    they read an empty div where the poem, the book description or the FAQ
    should be — the single biggest gap dynamic rendering closes here.
    Browsers get the empty shell instead (wants_static_body); the copy
    mirrors web/src/pages/*.tsx and the content comes from the same rows the
    JSON endpoints serve.

    No cache: only crawlers reach this, a full crawl is a few dozen requests,
    and each one costs the two or three queries its JSON page would have made
    anyway.
    """
    if path == "":
        return _home_body(db)
    if path == "books":
        return _books_body(db)
    if path == "poems":
        return _poems_body(db)
    if path == "poets":
        return _poets_body(db)
    if path == "videos":
        return _videos_body(db)
    if path == "about":
        return _about_body(db)
    if path.startswith("books/"):
        book = db.query(Book).filter(Book.slug == path.removeprefix("books/")).first()
        return _book_body(book) if book else ""
    if path.startswith("poems/"):
        poem = db.query(Poem).filter(Poem.slug == path.removeprefix("poems/")).first()
        return _poem_body(poem) if poem else ""
    if path.startswith("poets/"):
        poet = by_slug(path.removeprefix("poets/"))
        return _poet_body(db, poet) if poet else ""
    return ""


def _home_body(db) -> str:
    books = db.query(Book).order_by(Book.created_at.desc()).all()
    verse_total = db.query(func.count(Poem.id)).scalar() or 0
    recent_verses = db.query(Poem).order_by(Poem.created_at.desc()).limit(3).all()
    latest_video = next(
        (v for v in db.query(Video).order_by(Video.created_at.desc()).all()
         if _youtube_id(v.url)),
        None,
    )
    featured = books[0] if books else None

    parts = [
        '<p class="eyebrow">Books, free to read</p>',
        "<h1>Urdu Poetry &amp; Shayari by Syed Mujahid Sajjad</h1>",
        f"<p>{_e(SITE_DESCRIPTION)}</p>",
        (
            "<p>"
            + _link("/books", "Browse the library")
            + (
                f" · {_link(f'/books/{featured.slug}', 'Read the latest')}"
                if featured
                else ""
            )
            + "</p>"
        ),
        _facts_html(
            [
                ("Books", f"{len(books)} · Free Access" if books else "Free Access"),
                ("Verses", f"{verse_total} · Free to read" if verse_total else "Free to read"),
                ("Reading", "Online + Download"),
            ]
        ),
        "<ul>"
        "<li><p>Read online</p><p>Open the full book in the browser no download needed.</p></li>"
        "<li><p>Download free</p><p>Every book as a PDF. No account, no payment.</p></li>"
        "<li><p>The Art of Nastaliq</p><p>Experience original Urdu verse crafted in "
        "traditional Nastaliq script, untamed and untranslated.</p></li>"
        "</ul>",
    ]

    if featured:
        parts += [
            f"<p>{_e(CATEGORY_LABELS.get(featured.category, 'Book'))}</p>",
            f"<h2>{_link(f'/books/{featured.slug}', featured.title)}</h2>",
            f"<p>{_e(featured.description)}</p>",
            _facts_html(_book_facts(featured)),
        ]

    if len(books) > 1:
        parts += [
            "<h2>Books</h2>",
            "<p>Explore the literary works of Mujahid Sajjad.</p>",
            "<ul>"
            + "".join(
                f"<li><p>{_e(_book_label(b))}</p>"
                f"<h3>{_link(f'/books/{b.slug}', b.title)}</h3>"
                f"<p>{_e(b.author)}</p></li>"
                for b in books[:3]
            )
            + "</ul>",
            f"<p>{_link('/books', 'See all')}</p>",
        ]

    if verse_total:
        parts += [
            "<h2>Verses</h2>",
            "<p>Couplets from the collection, free to read and share.</p>",
            "<ul>"
            + "".join(
                f"<li><h3>{_link(f'/poems/{p.slug}', p.title)}</h3>"
                f'<p style="white-space:pre-line">{_e(_first_stanza(p.body))}</p></li>'
                for p in recent_verses
            )
            + "</ul>",
            f"<p>{_link('/poems', 'Read more')}</p>",
        ]

    if latest_video:
        parts += [
            "<h2>Latest video</h2>",
            f"<p>{_link(f'https://www.youtube.com/watch?v={_youtube_id(latest_video.url)}', latest_video.description or 'Watch on YouTube')}</p>",
        ]

    return "".join(parts)


def _books_body(db) -> str:
    books = db.query(Book).order_by(Book.sort_order.asc(), Book.title.asc()).all()
    labels = list(dict.fromkeys(_book_label(b).split(" · ")[0] for b in books))
    category_list = (
        ", ".join(labels[:-1]) + ", and " + labels[-1]
        if len(labels) > 1
        else (labels[0] if labels else "")
    )
    lead = (
        f"{len(books)} {'book' if len(books) == 1 else 'books'} — {category_list} — "
        "free to read in the browser and to download as a PDF. No account, no payment."
    )
    items = "".join(
        f"<li><p>{_e(_book_label(b))}</p>"
        f"<h2>{_link(f'/books/{b.slug}', b.title)}</h2>"
        f"<p>{_e(b.author)}</p>"
        + (f"<p>{_link(b.pdf_url, 'Free PDF')}</p>" if b.pdf_url else "")
        + "</li>"
        for b in books
    )
    return (
        '<p class="eyebrow">The library</p><h1>Books</h1>'
        f"<p>{_e(lead)}</p><ul>{items}</ul>"
    )


def _poems_body(db) -> str:
    poems = db.query(
        Poem.slug, Poem.title, Poem.author, Poem.type
    ).order_by(Poem.created_at.desc()).all()
    kinds = [p.type or "Poem" for p in poems]
    counts = (
        f"{len(poems)} verses · {kinds.count('Ghazal')} ghazals · "
        f"{kinds.count('Nazm')} nazms"
        + (f" · {kinds.count('Poem')} poems" if kinds.count("Poem") else "")
    )
    items = "".join(
        f"<li><p>{_e(p.type or 'Poem')}</p>"
        f"<h2>{_link(f'/poems/{p.slug}', p.title)}</h2>"
        + (
            f"<p>{_link(f'/poets/{_poet_for(p.author)['slug']}', roman_name(p.author))}</p>"
            if _poet_for(p.author)
            else f"<p>{_e(roman_name(p.author) or '')}</p>"
        )
        + "</li>"
        for p in poems
    )
    return (
        '<p class="eyebrow">In his own words</p><h1>Verses</h1>'
        "<p>Ghazal and nazm couplets, set in the Nastaliq they were written in.</p>"
        f"<p>{_e(counts)}</p><ul>{items}</ul>"
    )


def _poets_body(db) -> str:
    counts = dict(db.query(Poem.author, func.count(Poem.id)).group_by(Poem.author).all())
    items = "".join(
        f'<li><p lang="ur" dir="rtl">{_e(poet["urdu"])}</p>'
        f"<p>{_link(f'/poets/{poet['slug']}', poet['name'])}</p>"
        f'<p lang="ur" dir="rtl">{_e(poet["bio"])}</p>'
        f"<p>{sum(counts.get(alias, 0) for alias in poet['aliases'])} "
        f"{'verse' if sum(counts.get(alias, 0) for alias in poet['aliases']) == 1 else 'verses'}</p></li>"
        for poet in POETS
    )
    return (
        '<p class="eyebrow">The poets on the site</p><h1>Poets</h1>'
        "<p>Every poet whose ghazals and nazms are collected here, each with "
        "their own page and the verses written in their name.</p>"
        f"<ul>{items}</ul>"
    )


def _poet_body(db, poet) -> str:
    poems = db.query(Poem.slug, Poem.title, Poem.type).filter(
        Poem.author.in_(poet["aliases"])
    ).order_by(Poem.created_at.desc()).all()
    count = len(poems)
    return (
        f'<nav>{_link("/poets", "Poets")} / {_e(poet["urdu"])}</nav>'
        f'<h1 lang="ur" dir="rtl">{_e(poet["urdu"])}</h1>'
        f"<p>{_e(poet['name'])}</p>"
        f'<p lang="ur" dir="rtl">{_e(poet["bio"])}</p>'
        f"<p>{count} {'verse' if count == 1 else 'verses'} on this site</p>"
        + (
            "<ul>"
            + "".join(
                f"<li><p>{_e(p.type or 'Poem')}</p>"
                f"<h2>{_link(f'/poems/{p.slug}', p.title)}</h2></li>"
                for p in poems
            )
            + "</ul>"
            if count
            else f'<p>{_link("/poems", "Browse all verses")}</p>'
        )
    )


def _videos_body(db) -> str:
    items = "".join(
        f"<li><p>{_e(video.description)}</p>"
        f"<p>{_link(f'https://www.youtube.com/watch?v={vid}', 'Watch on YouTube')}</p></li>"
        for video in db.query(Video).order_by(Video.created_at.desc()).all()
        if (vid := _youtube_id(video.url))
    )
    return (
        '<p class="eyebrow">Watch</p><h1>Videos</h1>'
        "<p>Readings, mushaira recordings and interviews with the poetry of Syed "
        "Mujahid Sajjad — ghazals and nazms recited in his own voice and by fellow "
        "poets. New recordings are added here as they appear on the channel.</p>"
        + (f"<ul>{items}</ul>" if items else "<p>Videos coming soon.</p>")
    )


def _about_body(db) -> str:
    book_count = db.query(func.count(Book.id)).scalar() or 0
    publications = db.query(Book).order_by(Book.sort_order.asc(), Book.title.asc()).limit(3).all()
    para_one = (
        "Mujahid Sajjad writes in Urdu. His poetry is built from observation rather "
        "than abstraction the street, the classroom, the people passing through and "
        "his criticism reads that work closely and without decoration. He teaches "
        f"English at {SITE_AFFILIATION}."
    )
    para_two = (
        "The collection Magar Manzar Nahi Mera gathers those ghazals and nazms "
        "between two covers, and Ghazala Anjum's critical study of the work "
        "accompanies it in the library. Both are free here in full — read online, "
        "or download the PDF — alongside essays and contributed writing from "
        "across his years of teaching."
    )
    works = [
        (
            "Poetry",
            "Ghazals and nazms in Urdu — free to read on this site and in the PDF "
            "of Magar Manzar Nahi Mera.",
        ),
        ("Criticism", "A critical study by Ghazala Anjum accompanies the collection in the library."),
        ("Teaching", f"Associate Professor of English at {SITE_AFFILIATION}."),
    ]
    return (
        '<p class="eyebrow">About</p>'
        f"<h1>{_e(FULL_NAME)}</h1>"
        f"<p>{_e(SITE_TITLE)}</p>"
        "<h2>Who is Mujahid Sajjad?</h2>"
        f"<p>{_e(para_one)}</p>"
        f"<p>{_e(para_two)}</p>"
        + _facts_html(
            [
                ("Writes in", "Urdu"),
                ("Teaches", "English"),
                ("Books", f"{book_count} · Free to read" if book_count else "Free to read"),
                ("Institution", SITE_AFFILIATION),
            ]
        )
        + '<p class="eyebrow">In his work</p><h2>Poetry, criticism and teaching</h2>'
        + "".join(f"<h3>{_e(title)}</h3><p>{_e(text)}</p>" for title, text in works)
        + f'<p class="eyebrow">Bibliography</p><h2>Publications</h2><p>{_link("/books", "Read them free")}</p>'
        + (
            "<ul>"
            + "".join(
                f"<li><p>{_e(_book_label(b))}</p>"
                f"<h3>{_link(f'/books/{b.slug}', b.title)}</h3>"
                f"<p>{_e(b.author)}</p></li>"
                for b in publications
            )
            + "</ul>"
        )
        + '<p class="eyebrow">FAQ</p><h2>Common questions</h2>'
        + _faq_html(FAQ)
    )


def _book_body(book: Book) -> str:
    return (
        f'<nav>{_link("/books", "Books")} / {_e(book.title)}</nav>'
        f"<p>{_e(CATEGORY_LABELS.get(book.category, 'Book'))}</p>"
        f"<h1>{_e(book.title)}</h1>"
        + (f"<p>{_e(book.author)}</p>" if book.author else "")
        + (f"<p>{_e((book.description or '').strip())}</p>" if (book.description or "").strip() else "")
        + _facts_html(_book_facts(book))
        + (
            f"<p>{_link(book.pdf_url, 'Download the PDF')} — free.</p>"
            if book.pdf_url
            else ""
        )
        + '<p class="eyebrow">FAQ</p><h2>Common questions</h2>'
        + _faq_html(book_faq(book))
    )


def _poem_body(poem: Poem) -> str:
    author = poem.author or "Mujahid Sajjad"
    poet = _poet_for(poem.author)
    stamps = f"Published {_date_str(poem.created_at)}"
    # Compared by day, not by the second: a fresh insert stamps created_at
    # and updated_at microseconds apart, and "Published x · Last updated x"
    # would appear on every never-edited verse. The client slices the same
    # way (dates.ts), so both ends decide alike.
    if poem.updated_at and poem.updated_at.date() != poem.created_at.date():
        stamps += f" · Last updated {_date_str(poem.updated_at)}"
    stanzas = re.split(r"\n{2,}", (poem.body or "").replace("\r\n", "\n"))
    return (
        f'<nav>{_link("/poems", "Verses")} / {_e(poem.title)}</nav>'
        f"<h1>{_e(poem.title)}</h1>"
        + (
            f"<p>{_link(f'/poets/{poet['slug']}', author)}</p>"
            if poet
            else f"<p>{_e(author)}</p>"
        )
        + (f"<p>{_e(poem.book)}</p>" if poem.book else "")
        + f"<p>{_e(stamps)}</p>"
        + '<div lang="ur">'
        + "".join(f'<p style="white-space:pre-line">{_e(s)}</p>' for s in stanzas)
        + "</div>"
    )
