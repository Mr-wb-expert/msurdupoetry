# Keyword Plan — msurdupoetry.com vs Rekhta

What Rekhta actually ranks for, which of those keywords this site can realistically
take, and what was changed in the code to start taking them.

Date: 2026-10-16. Demand data: `KEYWORD-DATA.json` (947 real suggestions harvested
from Bing autosuggest, 171 seeds). No paid keyword tool was available, so autosuggest
is the demand signal — it is ordered by real query volume, not estimated.

## Bottom line first

Rekhta is the biggest Urdu poetry site on the web. This site will **not** rank for
the head terms ("urdu poetry", "urdu shayari", "urdu ghazal") and should stop trying.
What it can win is the layer under it:

| Winnable | Why |
| --- | --- |
| `<poet> poetry`, `<poet> shayari`, `<poet> ghazal`, `<poet> ki shayari` | the last few SERP slots are open below the big sites; we already have the poems |
| `<poet> poetry in urdu text`, `2 lines`, `copy paste` | searchers want plain text to copy — these poem pages already are plain text, and the couplet cards have a copy button |
| Lower-competition poets (Majeed Amjad, Shakeb Jalali, Makhdoom Mohiuddin, Hali, Zauq, Momin, Dagh, Nazeer Akbarabadi, Zafar Ali Khan, Jigar, Akbar Allahabadi) | far less competition than Ghalib/Faiz/Iqbal, and we have 4–100 poems each |
| Specific ghazal first lines | the page URL and title already *are* the first line |
| `Mujahid Sajjad` brand + his book titles | nobody else can rank for these |
| `Mujahid Sajjad` + his own poems/books | same |

## What Rekhta does (checked live, 2026-10-16)

- Home: `Urdu Poetry, Urdu Shayari of Famous Poets - Rekhta` — head terms, DA near 90.
- Poet pages: `Mirza Ghalib - Profile & Biography | Rekhta` — targets
  "`<poet>` biography/profile", and links out to `Ghazal 233 / Sher 397 / E-book 864`.
- They win by **volume of pages + domain authority**, not by clever titles.
  Their one non-obvious trick is a dedicated biography page per poet.

Bing autosuggest for `faiz ahmed faiz` confirms what the queries look like:
`faiz ahmed faiz poetry`, `... shayari`, `... books pdf`, `... poetry in urdu`,
`... rekhta` (people literally search for the site). Same shape for every poet.

## What was changed in the code (done)

The site's head metadata is written once in Python for crawlers (`api/seo.py`) and
again in the browser after hydration (the `<Seo>` props). Both had to change together.

1. **Poet hub pages (27 pages).** Title was Urdu script only —
   `مرزا اسد اللہ خان غالب — Urdu Poet`. Search is typed in Latin, so 27 pages were
   invisible for the exact queries the harvest shows. Now:
   `Mirza Ghalib — Ghazal, Shayari & Poetry` + a description naming ghazal, nazm,
   shayari and biography.
   Files: `api/seo.py` (PAGE_COPY branch), `web/src/pages/PoetPage.tsx`.

2. **Poem pages (2087 pages).** Title was `{first line} — Urdu Ghazal` with **no
   author at all**. 1284 of those 2087 poems store the author in Urdu script, so the
   author name never appeared in a head in any form a search could match. Now:
   `{first line} — Ghazal by Mirza Ghalib`, and the description carries the roman
   name too. This is the single biggest change in the diff.
   Files: `api/seo.py`, `web/src/pages/PoemPage.tsx`.

3. **Roman-name resolution.** `api/poets.py` gained `by_author()` / `roman_name()`;
   `web/src/lib/poets.ts` gained `romanAuthor()` with the same Urdu → Latin map, so
   the crawler title and the hydrated title are identical strings.

4. **Fixed a pre-existing link gap.** `web/src/lib/poets.ts` had 19 of the 30 aliases
   that `api/poets.py` knows. 11 Urdu aliases were missing, so **626 poems**
   (Ghalib 50, Bahadur Shah Zafar 50, Mir 50, Dagh 51, Majeed Amjad 100,
   Shakeb Jalali 64, Jigar 57, Akbar Allahabadi 57, Hali 47, Zauq 50, Momin 50)
   rendered the author as plain text instead of linking to the poet hub. Now in sync.
   Guard: `check_poet_maps.py` fails if the two maps ever drift again.

5. Tests: `api/check.py` now asserts the poet title, the poem title, and that an
   Urdu-script author really comes out as the roman name.
   `python -m api.check` → 130 assertions passed. `npm run typecheck|lint|check` → clean.

## Tier 2 — next code work (not done, in priority order)

These need content the site does not have yet. Each one is a new page type.

1. **Alternate spellings.** `ahmad faraz`, `mirza galib`, `meer taqi meer` all appear
   in the harvest as separate real queries. Cheapest honest fix: add the common
   variant once, naturally, in the poet hub's description (not a hidden keyword list).
2. **`<poet> poetry in english` / `with english translation`.** A real, unserved
   demand. We have no translations. A "translation" field per poem is a big job and
   an editorial one — only the owner can supply the text.
3. **Poet biography pages.** Rekhta's `<poet> biography` target. The Urdu bios in
   `api/poets.py` are original editorial text and are the site's one real
   differentiator — they currently sit on a page whose title never mentions biography.
   Expanding each into a full bio page is the highest-value *new* page type.
4. **`urdu shayari by theme`** pages ("sad", "love", "islamic", "2 line") — needs
   tagging poems by theme; that data does not exist yet.

## Do not chase

- `urdu poetry`, `urdu shayari`, `urdu ghazal`, `best urdu poetry` — head terms,
  unwinnable at this site's size, and the effort is better spent on the hubs.
- `<poet> books pdf`, `<poet> death/age/wife`, `<poet> movie`, `<poet> college` —
  we have no such page and should not build one.
- `mirza ghalib ghazals by jagjit singh`, `urdu ghazal song` — music intent, not text.

## Honest limits (read before expecting movement)

- **The verse is mostly the same public-domain ghazal Rekhta hosts.** 2087 poem pages
  of near-identical text is a duplicate-content problem no title fix removes. The
  unique assets are the Urdu bios, the couplet cards, and Mujahid Sajjad's own work.
- **There is no rank tracking.** No DataForSEO or rank tool is configured, so nothing
  here can be measured except by searching Google by hand. Effects take weeks.
- **Metadata alone does not rank.** It removes a blocker; links and unique content do
  the ranking. `BACKLINK-PLAN.md` is the other half of this.
- Two generated files are committed as evidence, not code: `KEYWORD-DATA.json`
  (raw suggestions) and `keyword_harvest.py` (re-run it to refresh demand data).

## Re-running

```powershell
python keyword_harvest.py     # refresh KEYWORD-DATA.json from Bing autosuggest
python check_poet_maps.py     # fail if api/poets.py and web/src/lib/poets.ts drift
python -m api.check           # 130 assertions
cd web; npm run typecheck; npm run lint; npm run check
```
