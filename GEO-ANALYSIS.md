# GEO Analysis — msurdupoetry.com

**Date:** 2026-10-20
**Scope:** AEO/GEO readiness for AI search surfaces (Google AI Overviews/AI Mode, ChatGPT, Perplexity).

---

## 1. GEO Readiness Score: 52/100

| Criterion | Weight | Score | Why |
|---|---|---|---|
| Citability | 25% | 13/25 | Per-route unique meta descriptions that quote real poem lines, and a 5-question FAQ in JSON-LD — but no citable **body** passages reach non-JS crawlers, no dates, no unique statistics. |
| Structural readability | 20% | 9/20 | Clean H1→H2→H3 hierarchy, FAQ section, lists — all of it exists only after JavaScript runs. Raw HTML ships `<div id="root"></div>` empty. |
| Multi-modal content | 15% | 9/15 | Author portrait, book covers, YouTube embeds, branded og:image. Video *text* lives inside iframes (not extractable). |
| Authority & brand signals | 20% | 11/20 | Person schema with credentials and `worksFor`, institution named everywhere, Facebook presence with 75K-view video, site owns its brand SERP. No Wikipedia/Wikidata, no visible dates, no `sameAs` profile links. |
| Technical accessibility | 20% | 10/20 | robots.txt allows every crawler, per-route server-side `<head>` rewrite, DB-driven sitemap. Undermined by empty body for non-JS crawlers, no llms.txt, uniform fake `lastmod`. |

---

## 2. Platform Breakdown

| Surface | Score | Reasoning |
|---|---|---|
| Google AI Overviews / AI Mode | **64/100** | Googlebot executes JavaScript, so Google sees full content, and the site already ranks for its brand queries. Held back by no dates, thin unique data, weak external entity signals. |
| ChatGPT web search | **38/100** | OAI-SearchBot does not run JS. It sees only title, meta description and JSON-LD — zero page text. |
| Perplexity | **40/100** | PerplexityBot same constraint. Rich per-route meta saves it from zero, but passages can't be quoted. |

**Note:** AI Overviews and AI Mode are two separate citation engines — they reach the same conclusion ~86% of the time but cite the same URL only 13.7% of the time (Ahrefs). Freshness and entity authority matter more for AI Mode than classic rank.

---

## 3. AI Crawler Access Status

robots.txt serves `User-agent: * / Allow: /` (Disallow: /admin only). Effect:

| Crawler | Owner | Status |
|---|---|---|
| GPTBot, OAI-SearchBot | OpenAI | ✅ Allowed |
| ClaudeBot, anthropic-ai | Anthropic | ✅ Allowed |
| PerplexityBot | Perplexity | ✅ Allowed |
| CCBot | Common Crawl | ⚠️ Allowed — block only if you don't want training use |
| Bytespider | ByteDance | ✅ Allowed |
| Google-Extended | Google (Gemini training) | ⚠️ Allowed — opt out via this directive if undesired |
| Google-Agent, ChatGPT-User, Google-NotebookLM | user-triggered | ℹ️ Ignore robots.txt by design; can't be blocked there |

**Verdict:** No action required for AI *search* visibility. Optional: add explicit `User-agent: CCBot / Disallow: /` if training reuse is not wanted.

---

## 4. llms.txt Status

**Missing (404).** Google's AI optimization guide states llms.txt is **not needed for Google Search and does not help or hurt visibility** — never treat it as a Google lever. It may still serve non-Google systems (Claude, Perplexity direct fetches). Optional template at the end of this report.

---

## 5. Brand Mention Analysis

| Platform | Presence | Signal |
|---|---|---|
| Wikipedia / Wikidata | ❌ Absent | Biggest entity gap — ChatGPT cites Wikipedia 47.9% of the time |
| Facebook | ✅ [ProfessorMujahidSajjad](https://www.facebook.com/ProfessorMujahidSajjad) + video page (75K views on one recitation) | Strongest off-site mention found |
| YouTube | ⚠️ Videos exist (youtu.be links shared from Facebook) but no clear channel entity located | YouTube mentions are the **strongest** correlate with AI citations (~0.737) — highest-leverage gap |
| Reddit | ❌ Absent | Perplexity cites Reddit 46.7% |
| LinkedIn | ❌ Not found | Moderate correlate |
| Brand SERP | ✅ msurdupoetry.com + Facebook + site pages own the "Mujahid Sajjad" query | Healthy |

Backlinks correlate weakly with AI citation (DR ~0.266); **mentions correlate ~3x stronger** (Ahrefs, 75K brands). Off-site effort should target YouTube channel consolidation first, then Wikipedia/Wikidata if notability allows.

---

## 6. Passage-Level Citability

**Optimal target:** self-contained blocks of 134–167 words; ~44% of AI citations come from the first 30% of a page.

**Current served HTML for a non-JS crawler (e.g. `/books/magar-manzar-nahi-mera`, 5 KB total):**

- ✅ Title, meta description (quotes the book's own copy), canonical, OG tags
- ✅ Book JSON-LD (name, author, `isAccessibleForFree`, `datePublished`)
- ❌ **Zero body text.** No H1, no description paragraph, no FAQ prose.

**Citable blocks that exist but are JS-gated:**

| Block | Location | Status |
|---|---|---|
| 5-question FAQ (Who is Mujahid Sajjad? Are books free? …) | `/about` | In JSON-LD only — answers are 15–35 words, below the 134–167 target |
| Hero "who/what" paragraph | `/` first 30% | JS-only |
| Book full description | `/books/:slug` | Truncated to 300 chars in meta; full text JS-only |
| **Poem text itself** | `/poems/:slug` | JS-only — the site's single most quotable asset |

---

## 7. Server-Side Rendering Check

| Element | Non-JS crawler sees |
|---|---|
| `<title>`, description, canonical, OG/Twitter | ✅ Rewritten per route in `api/seo.py` — genuinely well done |
| JSON-LD (Person, WebSite, FAQPage, Book, CreativeWork, BreadcrumbList) | ✅ Server-injected |
| Page body (headings, paragraphs, lists, poem text) | ❌ **Empty `<div id="root">`** |
| `<noscript>` | ⚠️ One line pointing to WhatsApp |

**This is the single largest GEO defect.** GPTBot, OAI-SearchBot, ClaudeBot and PerplexityBot do not execute JavaScript — to them the site is metadata with no content. Every other fix below is second-order until this is closed.

---

## 8. Top 5 Highest-Impact Changes

1. **Server-render the body, not just the head.** `api/app.py::spa()` already rewrites the shell per route. Extend `api/seo.py` to inject a static, text-only rendering of each page into `<div id="root">` (H1 + intro + FAQ + book/poem text). Alternative: prerender at build. *Impact: turns ChatGPT/Perplexity visibility from ~38 to ~65+.*
2. **Add real dates everywhere.** Visible publication/updated dates, `dateModified` in JSON-LD, and real per-URL `lastmod` in the sitemap (currently **every** URL gets `date.today()` daily — search engines discount uniform lastmod). Content under 3 months old is ~3x more likely to be cited.
3. **`sameAs` on the Person schema** — Facebook, YouTube channel, website. Cheap entity linking that tells AI systems these profiles are the same person. Consolidate videos under one YouTube channel: YouTube mentions are the strongest AI-citation correlate.
4. **Rewrite key passages into answer blocks.** Question-based H2s ("Who is Mujahid Sajjad?", "Is Magar Manzar Nahi Mera free?") with 134–167 word self-contained answers in the first 30% of each page. Expand the `/about` FAQ answers (currently under-firehose short) and add an FAQ to book pages.
5. **Serve poem text as extractable HTML** (part of #1) and add **VideoObject** schema on `/videos` (thumbnailUrl, uploadDate, description) — multi-modal content sees 156% higher selection rates.

**Honorable mention:** `/llms.txt` (optional, non-Google only — see below).

---

## 9. Schema Recommendations

Already present and correct: `Person`, `WebSite`, `FAQPage`, `Book`, `CreativeWork`, `BreadcrumbList`.

Add:
- `sameAs` → Person: Facebook, YouTube, website (change #3)
- `VideoObject` → `/videos`: name, description, thumbnailUrl, uploadDate, contentUrl
- `datePublished` / `dateModified` → Book (exists when `published_year` set) and CreativeWork/poem pages
- `Publisher`/`Organization` node linking site ↔ author

---

## 10. Content Reformatting Suggestions

| Page | Change |
|---|---|
| `/` (home) | Add a direct answer in the first 60 words: "Mujahid Sajjad is an Urdu poet and Associate Professor of English at Govt. Graduate College Burewala. This site offers N books and M ghazals/nazms free…" — server-rendered |
| `/about` | Expand each FAQ answer to 40–60 words with specifics (book titles, years, publisher). Add H2 "Who is Mujahid Sajjad?" |
| `/books/:slug` | Serve the full description server-side (not the 300-char meta cut) + a "What is {book} about?" paragraph |
| `/poems/:slug` | Serve the complete poem text server-side with `lang="ur"` — this is what AI gets asked about |
| All pages | Visible `Published`/`Last updated` line near the byline |

---

## Optional /llms.txt template (non-Google crawlers only)

```
# Mujahid Sajjad — Urdu Poetry & Free Books

> Official digital library of Prof. Syed Mujahid Sajjad, Urdu poet and
> Associate Professor of English at Govt. Graduate College Burewala, Punjab, Pakistan.
> All books free to read online and download as PDF; no account required.

## Key pages
- [About](https://www.msurdupoetry.com/about): Biography, FAQ, teaching and publications
- [Books](https://www.msurdupoetry.com/books): Full catalogue — poetry, criticism, essays
- [Verses](https://www.msurdupoetry.com/poems): Ghazals, nazms and shayari in Urdu
- [Poets](https://www.msurdupoetry.com/poets): Poets featured on this site
- [Videos](https://www.msurdupoetry.com/videos): Readings and mushaira recordings

## Key facts
- Author: Prof. Syed Mujahid Sajjad (also published as Mujahid Sajjad)
- Institution: Govt. Graduate College Burewala, Government of the Punjab, Pakistan
- Languages: Urdu (poetry), English (criticism and teaching)
- All content is free to read and share; books are available as PDF
```

---

## 11. Implementation Status (2026-10-20)

All five top changes and the honorable mention are implemented and covered by tests.

| # | Change | Status |
|---|---|---|
| 1 | Server-rendered body in `<div id="root">` | **Done** — `seo.body()` renders every route's text; `wants_static_body()` in `spa()` serves it to crawlers/fetchers, keeps the empty root for browsers (no flash — React's `createRoot` clears it), and serves neither on noindex routes. |
| 2 | Real dates everywhere | **Done** — `updated_at` columns on books & poems (migration backfills from `created_at`; every admin edit bumps them automatically), per-URL `lastmod` in the sitemap (book/poem = own stamp, poet hub = newest verse, list pages = newest content), `dateModified`/`datePublished` JSON-LD, visible "Published · Last updated" on poem pages and a "Last updated" fact on book pages. |
| 3 | `sameAs` on Person | **Done** — website + Facebook profile in `web/index.html`. *Deviation:* no YouTube channel URL is verifiable, so it is left out; add it to `sameAs` once the channel is confirmed. |
| 4 | Answer blocks & expanded FAQ | **Done** — H2 "Who is Mujahid Sajjad?" on `/about`; five FAQ answers rewritten to 40–60 words (byte-identical in `AboutPage.tsx` and `seo.py`); book pages gained a 3-question FAQ built from the book's own row, plus `FAQPage` schema on both ends. |
| 5 | Extractable poem text + VideoObject | **Done** — full verse in `lang="ur"` paragraphs server-side; `VideoObject` graph on `/videos` (thumbnail, contentUrl, embedUrl). *Deviation:* `datePublished` (date added to this site) replaces `uploadDate` — the database does not know the YouTube upload date and claiming it would be an unverifiable fact. |
| + | `/llms.txt` | **Done** — served from `app.py`, 1-day cache, links only real URLs. |
| — | `Publisher`/`Organization` node | **Not done** — no verifiable logo or legal-entity data to include; skip until there is. |
| — | Reviews in the static home body | **Not done** — the client shows three random reviews per visit, so no honest fixed subset exists. |

**Also fixed en route:** `/about`'s meta description duplicated ", Government of the Punjab" after hydration (client template appended it to an `affiliation` that already ends with it) — now byte-identical with `PAGE_COPY`.

**Verified:** `npm run typecheck`, `npm run lint`, `npm run check` (26 assertions, incl. 3 date-format), `npm run build`, `python -m api.check` (148 assertions — new `geo` section: 12, `dates`: 5, `llms.txt`: 1).

---

*Sources: Google AI optimization guide (developers.google.com/search/docs/fundamentals/ai-optimization-guide), Ahrefs AI-citation study (75K brands, Dec 2025), SE Ranking 1.3M-citation study, Google I/O 2026 coverage, live fetch of msurdupoetry.com on 2026-10-20.*
