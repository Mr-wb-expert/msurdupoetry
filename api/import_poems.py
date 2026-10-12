"""Load the bundled verses into the database.

Run once per database, the same way `seed.py` is run:

    DATABASE_URL=postgres://... python -m api.import_poems

Idempotent: a slug already present is left alone, so re-running after more
rows are appended to the data file inserts only the new ones. Nothing is
overwritten, so an edit made in the admin survives a re-run.
"""

import json
from datetime import timedelta
from pathlib import Path

from .db import Base, SessionLocal, engine, utcnow
from .models import Poem
from .seed import _add_missing_columns

DATA = Path(__file__).resolve().parent / "data"


def load_rows() -> list[dict]:
    """All bundled verse files — one JSON per poet, merged by slug."""
    rows: list[dict] = []
    for path in sorted(DATA.glob("*.json")):
        rows += json.loads(path.read_text(encoding="utf-8"))
    # A malformed row should fail loudly here, not land half-written in the
    # database. The same fields the model and schema require must be present.
    for row in rows:
        if not (row.get("slug") and row.get("title") and row.get("body")):
            raise ValueError(f"row missing slug/title/body: {row.get('slug')!r}")
        if row.get("type") not in {"Ghazal", "Nazm", "Poem"}:
            raise ValueError(f"bad type on {row['slug']!r}: {row.get('type')!r}")
    return rows


def main() -> int:
    rows = load_rows()
    Base.metadata.create_all(engine)
    _add_missing_columns()

    db = SessionLocal()
    existing = {slug for (slug,) in db.query(Poem.slug).all()}
    now = utcnow()
    added = 0
    for index, row in enumerate(rows):
        if row["slug"] in existing:
            continue
        # Stagger created_at so the listing order (newest first) stays stable
        # and follows the file's order, instead of one timestamp for all rows.
        db.add(Poem(created_at=now - timedelta(seconds=index), **row))
        added += 1
    db.commit()
    db.close()
    print(f"imported {added} new of {len(rows)} verses")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
