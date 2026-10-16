"""Drift check: api/poets.py aliases/names vs the TS mirrors in web/src/lib/poets.ts.

The page head is written twice, once in Python for crawlers and once in the
browser after hydration. If the two maps disagree, a page's title flashes one
value and settles on another, so this compares them key by key.
"""

import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from api.poets import POETS  # noqa: E402

py = {alias: poet["name"] for poet in POETS for alias in poet["aliases"]}

ts = open("web/src/lib/poets.ts", encoding="utf-8").read()
roman = dict(re.findall(r'"(.*?)": "(.*?)",', ts.split("const ROMAN")[1]))
aliases = dict(re.findall(r'"(.*?)": "(.*?)",', ts.split("const ALIASES")[1].split("const ROMAN")[0]))

problems = []

# Every Urdu-script alias must have a roman name, and it must be the one the
# API would produce.
for alias, name in py.items():
    if alias.isascii():
        continue
    got = roman.get(alias)
    if got != name:
        problems.append(f"ROMAN[{alias!r}] = {got!r}, api says {name!r}")

# A latin alias with no ROMAN row falls back to the string itself, so it only
# works when the api name is exactly that string.
for alias, name in py.items():
    if alias.isascii() and alias != name:
        problems.append(f"latin alias {alias!r} but api name {name!r} — needs a ROMAN row")

# A ROMAN row for a name the api does not know means the page and the head
# disagree on who wrote the poem.
for alias in roman:
    if alias not in py:
        problems.append(f"TS ROMAN has {alias!r} which api/poets.py does not")

# The slug maps must agree too, or a poem links one hub and the head names
# another poet.
py_slugs = {alias: poet["slug"] for poet in POETS for alias in poet["aliases"]}
for alias, slug in py_slugs.items():
    if aliases.get(alias) != slug:
        problems.append(f"ALIASES[{alias!r}] = {aliases.get(alias)!r}, api says {slug!r}")

print(f"api aliases: {len(py)}  ts aliases: {len(aliases)}  ts roman rows: {len(roman)}")
print("DRIFT:" if problems else "in sync")
for line in problems:
    print("  -", line)
sys.exit(1 if problems else 0)
