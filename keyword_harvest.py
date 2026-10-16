"""Harvest real keyword demand from Bing autosuggest (free, no key).

Seeds: every poet on the site, plus the generic Urdu-poetry head terms Rekhta
ranks for. Output: KEYWORD-DATA.json (raw) — analysis happens separately.
"""

import json
import re
import time
import urllib.parse
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36"}

POETS = [
    "Mujahid Sajjad", "Mohsin Naqvi", "Jaun Elia", "Faiz Ahmed Faiz", "Ahmed Faraz",
    "Parveen Shakir", "Ghazala Anjum", "Majeed Amjad", "Shakeb Jalali", "Allama Iqbal",
    "Nazeer Akbarabadi", "Zafar Ali Khan", "Makhdoom Mohiuddin", "N. M. Rashid",
    "Meeraji", "Nasir Kazmi", "Mustafa Zaidi", "Mir Taqi Mir", "Mirza Ghalib",
    "Dagh Dehlvi", "Bahadur Shah Zafar", "Jigar Moradabadi", "Akbar Allahabadi",
    "Altaf Hussain Hali", "Momin Khan Momin", "Ibrahim Zauq",
]

MODIFIERS = ["", " poetry", " shayari", " ghazal", " poetry in urdu", " ki shayari"]

GENERIC = [
    "urdu poetry", "urdu shayari", "urdu ghazal", "urdu nazm", "ghazal in urdu",
    "shayari in urdu", "urdu poetry in english", "urdu shayari text", "sad urdu poetry",
    "2 line urdu shayari", "urdu poetry copy paste", "best urdu poetry",
    "urdu poetry books", "urdu poets", "urdu shayari with meaning",
]


def suggest(query: str) -> list[str]:
    url = "https://api.bing.com/osjson.aspx?query=" + urllib.parse.quote(query)
    req = urllib.request.Request(url, headers=UA)
    try:
        data = json.loads(urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "ignore"))
    except Exception as error:  # a single failed query must not lose the rest
        return [f"ERROR: {error}"]
    return [s for s in data[1] if isinstance(s, str)]


results: dict[str, list[str]] = {}
queries = [f"{p}{m}" for p in POETS for m in MODIFIERS] + GENERIC

for query in queries:
    results[query] = suggest(query)
    time.sleep(0.2)

with open("KEYWORD-DATA.json", "w", encoding="utf-8") as handle:
    json.dump(results, handle, ensure_ascii=False, indent=1)

total = sum(len(v) for v in results.values())
print(f"queries: {len(queries)}  suggestions: {total}")

# Self-check: every suggestion must contain the seed's main word.
bad = [
    (q, s)
    for q, suggestions in results.items()
    if not q.startswith("urdu") and not q.startswith("ghazal")
    and not q.startswith("shayari") and not q.startswith("sad")
    and not q.startswith("2 line") and not q.startswith("best")
    for s in suggestions
    if q.split()[0].lower() not in s.lower()
    and (len(q.split()) < 2 or q.split()[1].lower() not in s.lower())
]
print("off-seed suggestions:", len(bad), bad[:5])
