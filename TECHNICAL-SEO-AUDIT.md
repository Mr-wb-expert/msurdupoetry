# Technical SEO Audit Report: www.msurdupoetry.com
**Audit Date**: 29 October 2026
**Audited By**: AI Technical SEO Audit (powered by a custom live crawl of the sitemap + internal links, plus a source code review)
**Total URLs Analysed**: 2,196 (2,190 returned 200, 6 timed out, 0 errors)
**Platform Detected**: Custom: React (Vite) SPA + FastAPI on Vercel, with dynamic rendering for bots
**Site Type**: Literary library / publisher (2,082 poems · 78 books · 27 poet hubs · About · Videos)
**Main goal (from you)**: traffic to poem and poet pages

## Executive Summary

**Overall health score: 92/100 (Excellent).** The technical basics are clean. All 2,190 crawled pages return 200 and every canonical points to its own URL. Every title and meta description is unique, and every page has exactly one H1. All pages are in the sitemap and none is accidentally noindexed. JSON-LD, llms.txt, HSTS and proper 404s are all in place. That is better than most sites at this scale.

What holds the site back is not broken tags. It is **what the pages offer and how fast they are served**:

1. **Your own poetry is missing (ARC-01).** `/poets/mujahid-sajjad` has no poems at all, and all 2,082 poems are by other poets. The brand has nothing of its own for Google to rank.
2. **2,082 poems are texts that bigger sites already publish (IDX-01).** For your traffic goal this is the main ceiling. Without unique additions (Roman Urdu, word meanings, tashreeh, recitations), most of them will get little traffic.
3. **No edge caching (PERF-01).** Every page is rendered fresh: median 1.14s, 406 pages over 2s, 40 over 5s, 6 timeouts.

**Top quick wins** (high impact, under a day each): turn on edge caching (PERF-01), add a nav/footer to the static crawler HTML (ARC-02), link book pages to each other and to poet hubs (ARC-03), set `lang="ur" dir="rtl"` (INTL-01), shorten poem titles (ONP-01), and wire `/contact`, `/privacy` and `/terms` into the server before deploying them (IDX-02).

**The single most impactful step:** publish Mujahid Sajjad's own ghazals and nazms on the site and link them from the homepage. It is the only content no other site has.

## Health Score Breakdown
| Category | Weight | Score | Issues Found | Critical |
|---|---|---|---|---|
| Crawlability & Accessibility | 20% | 97 | 3 | 0 |
| Indexability & Index Management | 20% | 87 | 3 | 0 |
| On-Page SEO Elements | 15% | 92 | 5 | 0 |
| Site Architecture & Internal Linking | 12% | 76 | 4 | 0 |
| Performance & Core Web Vitals | 12% | 92 | 1 | 0 |
| Mobile & Rendering | 10% | 99 | 1 | 0 |
| Structured Data & Schema | 5% | 99 | 1 | 0 |
| Security & Protocol | 5% | 99 | 1 | 0 |
| International SEO | 3% | 96 | 1 | 0 |
| AI & Future Readiness | 3% | 100 | 0 | 0 |

*Score bands: 90+ Excellent · 75–89 Good · 60–74 Needs Work · 40–59 Poor. Mobile & Rendering is weighted 10% because the site is an SPA.*

## Critical Issues (Priority Score 8+)

None.

## High Priority Issues (Priority Score 6-7.9)

### ARC-01 — Your own poet page has 0 poems, is 4 clicks deep and has 1 inlink
**Category:** Site Architecture & Internal Linking · **Priority:** 7.8 (SEO 7 / Business 9 / Effort 3) · **Affected URLs:** 1

**Example:** https://www.msurdupoetry.com/poets/mujahid-sajjad (53 words, depth 4, 1 inlink)

**Why it matters:** The site is the digital library of Mujahid Sajjad, but every one of its 2,082 poems is by someone else. Searches for 'Mujahid Sajjad poetry' or 'Mujahid Sajjad ghazal' land on an empty hub, and the brand has no verses of its own that Google can rank.

**Fix:** Upload Mujahid Sajjad's own ghazals and nazms as poems (author = Mujahid Sajjad) through the admin, then link /poets/mujahid-sajjad from the homepage, the /about page and every book page.

*Where:* Content work in /admin; the link changes go into the api/seo.py static bodies and the React pages.

### IDX-01 — 2,082 poems are classical texts that many larger sites also publish; 1,037 are marked as imports (-rk-)
**Category:** Indexability & Index Management · **Priority:** 6.4 (SEO 7 / Business 7 / Effort 6) · **Affected URLs:** 2,082

**Example:** https://www.msurdupoetry.com/poems/allama-iqbal-rk-taqdiir-allama-iqbal-nazms-355 | https://www.msurdupoetry.com/poems/mustafa-zaidi-rk-aakhirii-baar-milo

**Why it matters:** When the same text exists on Rekhta and similar high-authority sites, Google usually ranks only one copy, and it is rarely the newest and smallest site. Without unique value, most of these 2,082 pages will be crawled but will get little or no traffic, which is exactly the traffic goal you named.

**Fix:** Give each poem something that bigger sites lack: Roman Urdu transliteration, difficult-word meanings (farhang), a short tashreeh or English gist, and a link to the matching recitation video. Start with the poets who have the most poems (Iqbal 329, Faraz/Jaun 190+, Faiz 137) and the poems people search for most.

*Where:* Add optional fields (roman, meanings, notes) to the Poem model and render them in _poem_body and PoemPage.

### PERF-01 — No edge caching on any HTML page: every request is a fresh serverless render
**Category:** Performance & Core Web Vitals · **Priority:** 6.2 (SEO 6 / Business 6 / Effort 3) · **Affected URLs:** 2,190

**Example:** https://www.msurdupoetry.com/poems (32.6s), https://www.msurdupoetry.com/poems/mustafa-zaidi-rk-ek-alaamat-ghaas-se-bach-ke-chalo-ret-ko-gulzaar-kaho (22.2s), https://www.msurdupoetry.com/sitemap.xml (9.6s)

**Why it matters:** All 2,190 pages returned 'max-age=0' and 'X-Vercel-Cache: MISS'. Median response time was 1.14s and p90 was 2.52s; 406 pages took over 2s, 40 took over 5s, and 6 timed out completely. Slow, flaky responses lower the crawl rate Google gives you and hurt LCP for real readers.

**Fix:** Send 'Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400' on HTML pages, sitemap.xml, robots.txt and llms.txt from api/app.py, so Vercel's edge serves repeat hits. Keep max-age=0 for browsers if you want edits to show at once.

*Where:* Vercel + FastAPI: set the header on the Response in app.py; vercel.json 'headers' does not apply to function routes reliably.

### ARC-02 — Static HTML for crawlers has no header/footer navigation, so /about, /videos and the homepage have 0 internal inlinks
**Category:** Site Architecture & Internal Linking · **Priority:** 6.2 (SEO 6 / Business 6 / Effort 3) · **Affected URLs:** 4

**Example:** https://www.msurdupoetry.com/about | https://www.msurdupoetry.com/videos | https://www.msurdupoetry.com/ | https://www.msurdupoetry.com/poets

**Why it matters:** Crawlers that don't run JavaScript (Bing in many cases, GPTBot, ClaudeBot, PerplexityBot, social unfurlers) only see the static body. For them /about and /videos can't be reached by links, and the homepage gets no internal links at all.

**Fix:** Add a simple <header><nav> (Home, Books, Verses, Poets, Videos, About, Contact) and a footer to every page's static body in api/seo.py body().

*Where:* One shared helper in seo.py wrapped around each _*_body() function.

## Medium Priority Issues (Priority Score 4-5.9)

### ARC-03 — Book pages are dead ends: 71 of 78 books have 1 or fewer inlinks and link only back to /books
**Category:** Site Architecture & Internal Linking · **Priority:** 5.8 (SEO 5 / Business 6 / Effort 3) · **Affected URLs:** 78

**Example:** https://www.msurdupoetry.com/books/irtisam | https://www.msurdupoetry.com/books/gulab-chup-hain | https://www.msurdupoetry.com/books/janun-sy-pahly

**Why it matters:** Books are Mujahid Sajjad's own work and the strongest unique content on the site, yet they get the weakest internal linking.

**Fix:** On every book page, link to: the author's poet hub, 3-4 related books, and any poems taken from that book. On the homepage, link to every book, or at least to more than the current 3.

*Where:* _book_body in api/seo.py and BookPage.tsx.

### INTL-01 — Every page declares `<html lang="en" dir="ltr">` although the main content is Urdu
**Category:** International SEO · **Priority:** 5.6 (SEO 5 / Business 5 / Effort 2) · **Affected URLs:** 2,190

**Example:** https://www.msurdupoetry.com/poems/... (all 2,190 URLs)

**Why it matters:** Language detection mostly reads the text itself, but a wrong lang attribute weakens the signal for Urdu-language searches. It also makes screen readers read Urdu with English pronunciation.

**Fix:** Serve lang="ur" dir="rtl" on the <html> of poem, poet and Urdu book pages (set it in seo.apply, and in the client on route change), and keep lang="en" only on English-only pages.

*Where:* seo.apply() can rewrite the <html> tag the same way it rewrites <title>.

### ONP-01 — 1,858 titles are over 60 characters (1,350 are over 70); the suffix '— Mujahid Sajjad' is added to other poets' poems
**Category:** On-Page SEO Elements · **Priority:** 5.2 (SEO 4 / Business 5 / Effort 2) · **Affected URLs:** 1,858

**Example:** زباں پہ مہر گدائی ہے کس سے بات کروں — Nazm by Mustafa Zaidi — Mujahid Sajjad

**Why it matters:** Google cuts off long titles, so the poet's name gets truncated, and the poet's name is what searchers match on. Putting 'Mujahid Sajjad' after a poem by Iqbal also confuses who the author is, for both readers and AI answers.

**Fix:** For poems, use '<first line> — <Poet> <Ghazal/Nazm>' and drop the site suffix, or shorten it to '| MS Urdu Poetry'. Keep the suffix on books and on the owner's own pages.

*Where:* _full_title() in api/seo.py.

### IDX-02 — The new /contact, /privacy and /terms pages exist only in React; the server will return them as 404 + noindex
**Category:** Indexability & Index Management · **Priority:** 5.2 (SEO 4 / Business 5 / Effort 2) · **Affected URLs:** 3

**Example:** https://www.msurdupoetry.com/contact | https://www.msurdupoetry.com/privacy | https://www.msurdupoetry.com/terms (currently 404)

**Why it matters:** Trust pages back up E-E-A-T and give the new Gmail contact a crawlable home. If they ship as is, Google will see 404s for pages the visible footer links to.

**Fix:** Before deploying, add 'contact', 'privacy' and 'terms' to STATIC_PAGES and the known-routes set in api/app.py, give them titles and descriptions in seo.head(), and link them in the static footer.

*Where:* Uncommitted pages in web/src/pages; the server routes live in api/app.py.

### ARC-04 — /poems is a single 445 KB page with 2,086 links
**Category:** Site Architecture & Internal Linking · **Priority:** 4.4 (SEO 4 / Business 4 / Effort 4) · **Affected URLs:** 1

**Example:** https://www.msurdupoetry.com/poems (445,214 bytes, 32.6s in the crawl)

**Why it matters:** A huge list spreads link value thinly, loads slowly on mobile, and was the slowest URL in the crawl.

**Fix:** Paginate (/poems?page=2 with self-canonicals), or turn /poems into an index grouped by poet and type (ghazal/nazm) that links to the poet hubs, which then list the poems.

*Where:* PoemsPage.tsx and _poems_body.

## Low Priority Issues (Priority Score <4)

### CRAWL-01 — The sitemap is one 297 KB file that takes 9.6s, with lastmod values that are mostly import dates
**Category:** Crawlability & Accessibility · **Priority:** 3.8 (SEO 3 / Business 3 / Effort 3) · **Affected URLs:** 1

**Example:** https://www.msurdupoetry.com/sitemap.xml

**Why it matters:** A slow sitemap can time out in Search Console, and lastmod values that aren't meaningful get ignored.

**Fix:** Cache it (see PERF-01), split it into a sitemap index (pages, books, poets, poems), and set lastmod only when the content really changes.

*Where:* sitemap route in api/app.py.

### SD-01 — Every poem has datePublished = its import date (e.g. 2026-10-15 for Iqbal), and a sitewide Person block is repeated without @id
**Category:** Structured Data & Schema · **Priority:** 3.8 (SEO 3 / Business 3 / Effort 3) · **Affected URLs:** 2,082

**Example:** https://www.msurdupoetry.com/poems/mustafa-zaidi-rk-laa-yanhal-zabaan-pe-muhr-e-gadaaii-hai-kis-se-baat-karuun

**Why it matters:** Dates that are clearly wrong can make Google distrust the structured data. Linked entities help AI answers tell the site owner apart from the poets he publishes.

**Fix:** Drop datePublished on classical poems (or use the poet's original publication year if known), and keep dateModified. Give the Person node an @id (…/#mujahid-sajjad) and reference it as publisher instead of repeating it.

*Where:* seo.head() graph builders and index.html.

### ONP-02 — 1,129 meta descriptions are over 160 characters
**Category:** On-Page SEO Elements · **Priority:** 3.6 (SEO 2 / Business 3 / Effort 2) · **Affected URLs:** 1,129

**Example:** (poem pages: first couplet + poet + book)

**Why it matters:** Only the end gets cut off, so this is low risk.

**Fix:** Trim to about 155 characters: put the first couplet first, then '— <Poet>, Urdu <type>'.

*Where:* seo.head() description builder.

### CRAWL-02 — http://msurdupoetry.com takes 2 hops (308 → https apex → 301 → www)
**Category:** Crawlability & Accessibility · **Priority:** 3.6 (SEO 3 / Business 3 / Effort 4) · **Affected URLs:** 1

**Example:** http://msurdupoetry.com/ → https://msurdupoetry.com/ → https://www.msurdupoetry.com/

**Why it matters:** Each hop loses a little time and link value from old links to http://.

**Fix:** In Vercel → Domains, set msurdupoetry.com to redirect to www.msurdupoetry.com (so the platform does it in one hop), then remove the host redirect from vercel.json.

*Where:* Vercel dashboard setting.

### CRAWL-03 — HEAD requests to pages return 405 Method Not Allowed
**Category:** Crawlability & Accessibility · **Priority:** 3.6 (SEO 3 / Business 2 / Effort 2) · **Affected URLs:** 2,190

**Example:** curl -I https://www.msurdupoetry.com/ → 405 (JSON)

**Why it matters:** Some link checkers, uptime monitors and crawlers use HEAD and will report the site as broken.

**Fix:** Let the page route accept HEAD as well as GET (FastAPI: api_route(..., methods=['GET','HEAD'])).

*Where:* api/app.py catch-all route.

### ONP-03 — Thin poet hub: /poets/ghazala-anjum (46 words, 4 inlinks)
**Category:** On-Page SEO Elements · **Priority:** 3.6 (SEO 2 / Business 3 / Effort 2) · **Affected URLs:** 1

**Example:** https://www.msurdupoetry.com/poets/ghazala-anjum

**Why it matters:** A near-empty hub looks low quality.

**Fix:** Add a biography and poems, or keep the page out of the sitemap until it has them.

*Where:* Admin content.

### ONP-04 — 2,121 pages share the same og:image
**Category:** On-Page SEO Elements · **Priority:** 3.4 (SEO 2 / Business 4 / Effort 5) · **Affected URLs:** 2,121

**Example:** https://www.msurdupoetry.com/images/og-cover.png

**Why it matters:** Poems spread on WhatsApp and Facebook. A card that shows the actual couplet gets more clicks than a generic cover.

**Fix:** Generate per-poem share cards (the couplet on a background) at build time or on request, cached at the edge.

*Where:* New image route or build script.

### MOB-01 — Content depends on the user agent (dynamic rendering): browsers get an empty #root, bots get HTML
**Category:** Mobile & Rendering · **Priority:** 3.0 (SEO 3 / Business 3 / Effort 7) · **Affected URLs:** 2,190

**Example:** Chrome UA: 5,556 B with no <h1>; Googlebot UA: 9,115 B with full text

**Why it matters:** Google calls dynamic rendering a workaround rather than a long-term solution. It works today, but every new bot has to match the UA regex.

**Fix:** Fine for now, because the content matches. Long term, serve the same static body to everyone and let React hydrate it (SSR or prerender).

*Where:* Vite + FastAPI; would mean React hydration of the server body.

### IDX-03 — Every page has two robots meta tags (a static 'index, follow' plus the injected one)
**Category:** Indexability & Index Management · **Priority:** 3.0 (SEO 2 / Business 1 / Effort 1) · **Affected URLs:** 2,190

**Example:** https://www.msurdupoetry.com/admin (index,follow + noindex,nofollow)

**Why it matters:** Google takes the most restrictive tag, so nothing is broken. It is just noise that could become a bug.

**Fix:** Remove the static robots/googlebot meta from web/index.html; output a robots meta from seo.apply() only when noindex is needed.

*Where:* web/index.html.

### SEC-01 — Missing security headers: CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
**Category:** Security & Protocol · **Priority:** 2.8 (SEO 1 / Business 2 / Effort 2) · **Affected URLs:** 2,190

**Example:** https://www.msurdupoetry.com/

**Why it matters:** Not a ranking factor, but it protects visitors and the admin area.

**Fix:** Add them in vercel.json headers for source '/(.*)' (HSTS is already set).

*Where:* vercel.json.

### ONP-05 — 119 URLs are longer than 115 characters, and 1,037 contain the internal '-rk-' token
**Category:** On-Page SEO Elements · **Priority:** 2.2 (SEO 2 / Business 2 / Effort 7) · **Affected URLs:** 119

**Example:** https://www.msurdupoetry.com/poems/nazeer-akbarabadi-rk-barsaat-kii-bahaaren-hain-is-havaa-men-kyaa-kyaa-barsaat-kii-bahaaren

**Why it matters:** Cosmetic. Changing the URLs would need 1,000+ redirects.

**Fix:** Don't change existing URLs (changing them costs more than it gains). For new poems, use shorter slugs without '-rk-'.

*Where:* Slug generation in admin/import.

## Quick Wins
| ID | Issue | Priority | Effort |
|---|---|---|---|
| ARC-01 | Your own poet page has 0 poems, is 4 clicks deep and has 1 inlink | 7.8 | 3 |
| PERF-01 | No edge caching on any HTML page: every request is a fresh serverless render | 6.2 | 3 |
| ARC-02 | Static HTML for crawlers has no header/footer navigation, so /about, /videos and the homepage have 0 internal inlinks | 6.2 | 3 |
| ARC-03 | Book pages are dead ends: 71 of 78 books have 1 or fewer inlinks and link only back to /books | 5.8 | 3 |
| INTL-01 | Every page declares `<html lang="en" dir="ltr">` although the main content is Urdu | 5.6 | 2 |
| ONP-01 | 1,858 titles are over 60 characters (1,350 are over 70); the suffix '— Mujahid Sajjad' is added to other poets' poems | 5.2 | 2 |
| IDX-02 | The new /contact, /privacy and /terms pages exist only in React; the server will return them as 404 + noindex | 5.2 | 2 |

## What's already working (keep it)
- 0 broken internal links, 0 soft 404s; unknown URLs return a real 404.
- 100% self-referencing canonicals; trailing-slash and apex→www redirects are 301s.
- Unique titles and meta descriptions on 2,190 pages; one H1 per page.
- CreativeWork + BreadcrumbList on poems, Book + FAQPage on books, VideoObject on /videos, FAQPage on /about.
- llms.txt, a clean robots.txt (only /admin disallowed, and /admin is also noindexed), HSTS.

## Strategic Recommendations
1. **Become the source for Mujahid Sajjad.** Upload his poems, give each book a page that lists its poems, and link the poet hub, /about and the books together. Searches for his name are ones only this site can win.
2. **Make classical poems better than the copies elsewhere, not more numerous.** One Iqbal nazm with Roman Urdu, a word list, a short explanation and a recitation video is worth more than 50 bare texts. Add these fields to the Poem model and work through the most-searched poems first. Don't import more bare poems until this is done.
3. **Cache at the edge.** The data changes only when you edit in /admin, so a 1-hour `s-maxage` with `stale-while-revalidate` costs nothing and makes every crawler and reader faster.
4. **Make the crawler HTML a full page.** Add nav, footer and related links so non-JS bots (Bing, ChatGPT, Claude, Perplexity) can reach every section. This matters for the GEO work you already started.
5. **Later:** move from dynamic rendering to serving the same HTML to everyone (prerender + hydrate), and add per-poem share images for WhatsApp/Facebook.

## Appendix: Full URL Issue Matrix
See **technical-seo-audit.xlsx**: Executive Dashboard, All Issues, URL-Level Detail (all 2,196 URLs), Quick Wins, Redirect Map, Duplicate Content, Action Plan.

*Method note: this crawl fetched every sitemap URL and followed the static HTML links that bots receive. Response times come from a single client location (served via Vercel's Mumbai edge, bom1) and are indicative. There was no Search Console or Analytics data, so the business-impact scores are based on page type, not on measured traffic.*
