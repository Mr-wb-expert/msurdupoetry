"""Draft Roman Urdu, word meanings and an explanation for every verse.

The verses on this site are texts that larger archives also carry. What makes
a page here worth ranking is what those copies lack, so this fills the three
optional fields on Poem (roman, meanings, notes) with Claude, through the
Message Batches API (half the price of normal calls; most batches finish
within an hour).

    pip install anthropic                     # not in requirements.txt: the
                                              # deployed site never needs it
    python -m api.enrich_poems sample 3       # try 3 verses, print, write nothing
    python -m api.enrich_poems submit         # one batch for every verse still empty
    python -m api.enrich_poems status         # progress of the last batch
    python -m api.enrich_poems collect        # write finished results to the DB

DATABASE_URL and ANTHROPIC_API_KEY are read from the environment or the
project `.env`, the same file the app reads. Without DATABASE_URL this works
on the local SQLite file, not the live site.

Safe to re-run: submit only picks verses whose roman field is empty, and
collect never overwrites a field someone has already filled (an admin edit
always wins over a draft).
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / ".enrich-state.json"


def _load_env_file() -> None:
    """Same rules as api/app.py: the real environment wins, empty values skip."""
    path = ROOT / ".env"
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip('"').strip("'")
        if value:
            os.environ.setdefault(key.strip(), value)


_load_env_file()

import anthropic  # noqa: E402
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming  # noqa: E402
from anthropic.types.messages.batch_create_params import Request  # noqa: E402

from api.db import SessionLocal  # noqa: E402
from api.models import Poem  # noqa: E402
from api.poets import roman_name  # noqa: E402

MODEL = "claude-opus-5-5"

SYSTEM = """You prepare study notes for Urdu poems on a free poetry library website. \
Readers are Urdu speakers who read Nastaliq slowly or not at all, students, and \
people who search in Roman Urdu or English.

For the poem you are given, produce:

roman: the complete poem in Roman Urdu, in the common spelling Pakistani readers \
type (e.g. "dil", "mohabbat", "zindagi", "khuda"), not an academic transliteration. \
Keep exactly the same lines in the same order as the Urdu text, one Roman line per \
Urdu line, and the same blank lines between stanzas. Do not translate, add or drop \
any line.

meanings: the 5 to 12 words or phrases in this poem that an ordinary reader is \
least likely to know. "word" is the word exactly as it is written in the poem, in \
Urdu script. "meaning" is its meaning as used in this poem: a short Urdu gloss, \
then " / ", then a short English gloss. Fewer entries is fine for a simple poem.

notes_ur: a short explanation (tashreeh) in plain modern Urdu, 60 to 120 words: \
what the poem or ghazal is saying, its central image or mood, and the sense of \
any line that is hard to follow.

notes_en: the same explanation in plain English, 50 to 100 words.

Base everything only on the text of the poem. Do not state dates, the occasion \
it was written for, publication history or biographical facts unless the poem \
itself says them; if a line is ambiguous, say what it most plausibly means \
rather than inventing context. Write as a teacher would, not as an advertisement."""

SCHEMA = {
    "type": "object",
    "properties": {
        "roman": {"type": "string"},
        "meanings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"word": {"type": "string"}, "meaning": {"type": "string"}},
                "required": ["word", "meaning"],
                "additionalProperties": False,
            },
        },
        "notes_ur": {"type": "string"},
        "notes_en": {"type": "string"},
    },
    "required": ["roman", "meanings", "notes_ur", "notes_en"],
    "additionalProperties": False,
}


def _params(poem: Poem, model: str, effort: str) -> MessageCreateParamsNonStreaming:
    poet = roman_name(poem.author) or poem.author or "Mujahid Sajjad"
    return MessageCreateParamsNonStreaming(
        model=model,
        max_tokens=16000,
        system=SYSTEM,
        output_config={
            "effort": effort,
            "format": {"type": "json_schema", "schema": SCHEMA},
        },
        messages=[
            {
                "role": "user",
                "content": (
                    f"Poet: {poet}\nForm: {poem.type or 'Poem'}\nTitle: {poem.title}\n\n"
                    f"<poem>\n{poem.body}\n</poem>"
                ),
            }
        ],
    )


def _fields(message) -> dict | None:
    """The three DB fields from one response, or None if it cannot be used."""
    if message.stop_reason != "end_turn":
        return None  # refusal or max_tokens: leave the verse for a later run
    text = next((b.text for b in message.content if b.type == "text"), "")
    data = json.loads(text)
    meanings = "\n".join(
        f"{m['word'].strip()} — {m['meaning'].strip()}"
        for m in data["meanings"]
        if m["word"].strip() and m["meaning"].strip()
    )
    notes = "\n\n".join(p.strip() for p in (data["notes_ur"], data["notes_en"]) if p.strip())
    return {"roman": data["roman"].strip(), "meanings": meanings, "notes": notes}


def _usable(poem: Poem, fields: dict) -> bool:
    """A Roman version that lost or gained lines would sit badly beside the
    verse; reject it and let the next submit try again."""
    urdu = [l for l in poem.body.splitlines() if l.strip()]
    roman = [l for l in fields["roman"].splitlines() if l.strip()]
    return len(urdu) == len(roman)


def _pending(db, limit: int | None, author: str | None):
    query = db.query(Poem).filter((Poem.roman.is_(None)) | (Poem.roman == ""))
    if author:
        query = query.filter(Poem.author == author)
    query = query.order_by(Poem.id)
    return query.limit(limit).all() if limit else query.all()


def cmd_sample(args, client) -> None:
    db = SessionLocal()
    for poem in _pending(db, args.n, args.author):
        message = client.messages.create(**_params(poem, args.model, args.effort))
        fields = _fields(message)
        print(f"\n===== {poem.slug} ({message.usage.input_tokens} in / {message.usage.output_tokens} out)")
        if fields is None:
            print(f"skipped: stop_reason={message.stop_reason}")
            continue
        print(fields["roman"], "\n---\n" + fields["meanings"], "\n---\n" + fields["notes"])
        print("line count matches:", _usable(poem, fields))
    db.close()


def cmd_submit(args, client) -> None:
    db = SessionLocal()
    poems = _pending(db, args.limit, args.author)
    if not poems:
        print("Every verse already has a Roman version. Nothing to submit.")
        return
    batch = client.messages.batches.create(
        requests=[
            Request(custom_id=f"poem-{p.id}", params=_params(p, args.model, args.effort))
            for p in poems
        ]
    )
    db.close()
    STATE.write_text(json.dumps({"batch_id": batch.id, "count": len(poems)}), encoding="utf-8")
    print(f"Submitted {len(poems)} verses as batch {batch.id} ({args.model}, effort {args.effort}).")
    print("Run `python -m api.enrich_poems status` to check, `collect` when it has ended.")


def _batch_id(args) -> str:
    if args.batch:
        return args.batch
    if not STATE.is_file():
        sys.exit("No batch submitted yet (no .enrich-state.json). Pass --batch <id>.")
    return json.loads(STATE.read_text(encoding="utf-8"))["batch_id"]


def cmd_status(args, client) -> None:
    batch = client.messages.batches.retrieve(_batch_id(args))
    c = batch.request_counts
    print(
        f"{batch.id}: {batch.processing_status} — processing {c.processing}, "
        f"succeeded {c.succeeded}, errored {c.errored}, expired {c.expired}"
    )


def cmd_collect(args, client) -> None:
    batch_id = _batch_id(args)
    batch = client.messages.batches.retrieve(batch_id)
    if batch.processing_status != "ended" and not args.wait:
        sys.exit(f"Batch is still {batch.processing_status}. Re-run later, or pass --wait.")
    while batch.processing_status != "ended":
        time.sleep(60)
        batch = client.messages.batches.retrieve(batch_id)

    db = SessionLocal()
    written = skipped = rejected = 0
    tokens_in = tokens_out = 0
    for result in client.messages.batches.results(batch_id):
        if result.result.type != "succeeded":
            skipped += 1
            continue
        message = result.result.message
        tokens_in += message.usage.input_tokens
        tokens_out += message.usage.output_tokens
        poem = db.get(Poem, int(result.custom_id.removeprefix("poem-")))
        try:
            fields = _fields(message)
        except (json.JSONDecodeError, KeyError):
            fields = None
        if poem is None or fields is None:
            skipped += 1
            continue
        if not _usable(poem, fields):
            rejected += 1
            continue
        # Never overwrite: a field already filled was written by a person.
        for name, value in fields.items():
            if value and not getattr(poem, name):
                setattr(poem, name, value)
        written += 1
        if written % 100 == 0:
            db.commit()
    db.commit()
    db.close()
    # Batch price: half of the model's standard $4 / $20 per million (Opus 5.5).
    cost = tokens_in / 1e6 * 2 + tokens_out / 1e6 * 10 if args.model == MODEL else None
    print(f"Wrote {written} verses; {rejected} rejected (line count mismatch), {skipped} skipped.")
    print(f"Tokens: {tokens_in:,} in / {tokens_out:,} out" + (f" ≈ ${cost:.2f}" if cost else ""))
    if rejected or skipped:
        print("Run `submit` again to retry the verses that are still empty.")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--model", default=MODEL)
    parser.add_argument("--effort", default="medium", choices=["low", "medium", "high", "xhigh", "max"])
    parser.add_argument("--author", help="only verses saved with exactly this author")
    sub = parser.add_subparsers(dest="command", required=True)
    sample = sub.add_parser("sample", help="run a few verses now and print them; writes nothing")
    sample.add_argument("n", type=int, nargs="?", default=3)
    submit = sub.add_parser("submit", help="send every empty verse as one batch")
    submit.add_argument("--limit", type=int)
    for name in ("status", "collect"):
        p = sub.add_parser(name)
        p.add_argument("--batch", help="batch id (default: the last one submitted)")
        if name == "collect":
            p.add_argument("--wait", action="store_true", help="poll until the batch ends")
    args = parser.parse_args()

    client = anthropic.Anthropic()
    {"sample": cmd_sample, "submit": cmd_submit, "status": cmd_status, "collect": cmd_collect}[
        args.command
    ](args, client)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
