"""Poets with verse on the site.

One hand-maintained registry, and the thing that turns a mixed list of 400+
poems into crawlable hubs: the slug is the URL, the aliases cover the spellings
the admin rows actually use (one row keeps the Persian honorific), and the
Urdu bio is original editorial content — a poem page alone is mostly third-
party verse, so the bio is what makes the page worth ranking in the first
place.
"""

# slugs are ASCII; `urdu` is the page title and link text. `aliases` are the
# `Poem.author` strings that belong to this poet, exactly as saved in the DB.
# `bio` is a short Urdu introduction — factual, no praise-wording.
POETS = [
    {
        "slug": "mujahid-sajjad",
        "name": "Mujahid Sajjad",
        "urdu": "مجاہد سجاد",
        "aliases": ["Mujahid Sajjad"],
        "bio": (
            "سید مجاہد سجاد اردو زبان کے شاعر، ادیب اور ماہرِ تعلیم ہیں۔ "
            "سرکاری گریجویٹ کالج بریوالہ میں انگریزی کے ایسوسی ایٹ پروفیسر ہونے کے ساتھ "
            "وہ اردو شاعری، تنقید اور مضامین کی کئی کتابوں کے مصنف ہیں۔"
        ),
    },
    {
        "slug": "mohsin-naqvi",
        "name": "Mohsin Naqvi",
        "urdu": "محسن نقوی",
        "aliases": ["Mohsin Naqvi", "شہید محسن نقوی"],
        "bio": (
            "محسن نقوی (1947–1996) پاکستان کے معروف اردو شاعر تھے، جو سیالکوٹ میں پیدا ہوئے۔ "
            "ان کا کلام غزل، نظم اور مرثیہ تینوں اصناف پر محیط ہے اور "
            "اپنے دلکش اسلوب کی وجہ سے اردو ادب کا سرمایہ سمجھا جاتا ہے۔"
        ),
    },
    {
        "slug": "jaun-elia",
        "name": "Jaun Elia",
        "urdu": "جون ایلیا",
        "aliases": ["Jaun Elia"],
        "bio": (
            "جون ایلیا (1931–2002) اردو کے منفرد شاعر، فلسفی اور عالم تھے۔ "
            "وہ ہندوستان کے شہر امروہہ میں پیدا ہوئے اور بعد میں پاکستان آ گئے۔ "
            "شاید، یعنی، گمان اور لیکن ان کے شعری مجموعے ہیں۔ "
            "ان کا کلام اپنی نرالی شوخی اور گہرے فلسفیانہ انداز کے لیے جانا جاتا ہے۔"
        ),
    },
    {
        "slug": "faiz-ahmed-faiz",
        "name": "Faiz Ahmed Faiz",
        "urdu": "فیض احمد فیض",
        "aliases": ["Faiz Ahmed Faiz"],
        "bio": (
            "فیض احمد فیض (1911–1984) برصغیر کے عظیم اردو شاعر تھے، جو سیالکوٹ میں پیدا ہوئے۔ "
            "نقشِ فریادی، دستِ صبا، زنداں نامہ اور دستِ طہِ سنگ ان کے شعری مجموعے ہیں۔ "
            "ان کی غزل ”مجھ سے پہلی سی محبت مری محبوب نہ مانگ“ اردو ادب کی "
            "سب سے مشہور غزلوں میں شمار ہوتی ہے۔"
        ),
    },
    {
        "slug": "ghazala-anjum",
        "name": "Ghazala Anjum",
        "urdu": "غزالہ انجم",
        "aliases": ["غزالہ انجم"],
        "bio": (
            "غزالہ انجم اردو کی شاعرہ اور نقاد ہیں۔ "
            "مجاہد سجاد کی شاعری پر ان کا تحقیقی مقالہ بھی شائع ہو چکا ہے۔"
        ),
    },
]

# slug -> row, for the URL -> page and the head rewrite.
_BY_SLUG = {poet["slug"]: poet for poet in POETS}


def by_slug(slug: str) -> dict | None:
    return _BY_SLUG.get(slug)


def matches(poet: dict, author: str | None) -> bool:
    return author is not None and author in poet["aliases"]