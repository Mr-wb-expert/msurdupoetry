/**
 * Couplet cards for the Verses page.
 *
 * Static, hand-verified data: every couplet below is transcribed from the
 * printed pages of "Magar Manzar Nahi Mera" and checked against a render of
 * the PDF page. Nothing here is invented — a couplet with any unresolved
 * reading is simply left out.
 *
 * The shape matches the admin's intended JSON, so this can move behind the
 * API later without touching the UI.
 */

import type { Poem, VerseType } from "@/lib/types";

export interface Couplet {
  id: string;
  /** Two lines of a sher, separated by a newline. Urdu text, never translated. */
  couplet: string;
  /** Set on the transcribed cards and on any verse typed in the admin. */
  type?: VerseType;
  bookName?: string;
  tags: string[];
  /** ISO date, YYYY-MM-DD. */
  dateAdded: string;
  /** Heading for a whole verse added through the admin. */
  title?: string;
}

/** An admin-added verse joins the transcribed cards as one list. */
export const fromPoem = (poem: Poem): Couplet => ({
  id: poem.slug,
  title: poem.title,
  couplet: poem.body,
  type: poem.type ?? undefined,
  tags: [],
  dateAdded: (poem.createdAt ?? "").slice(0, 10),
});

const BOOK = "Magar Manzar Nahi Mera";
const DATE = "2026-10-03";

export const couplets: Couplet[] = [
  {
    id: "nazm-1",
    couplet:
      "نہیں میرا نہیں یہ گھر، نہیں میرا نہیں وہ آنگن\nمِنہاں میں کون سا کھڑا ہوں، پتھر نہیں، چولہ نہیں میرا",
    type: "Nazm",
    bookName: BOOK,
    tags: ["نہیں میرا"],
    dateAdded: DATE,
  },
  {
    id: "nazm-2",
    couplet:
      "مری بستی نہیں میری، مری ہستی نہیں میری\nمری یہ جاں کس کی ہے، میرا پیکر نہیں میرا",
    type: "Nazm",
    bookName: BOOK,
    tags: ["نہیں میرا"],
    dateAdded: DATE,
  },
  {
    id: "nazm-3",
    couplet:
      "مجھ سونے کی خواہش ہے، سحر سونے نہیں دیتی\nیہ روز و شب نہیں میرے، مرا بستر نہیں میرا",
    type: "Nazm",
    bookName: BOOK,
    tags: ["نہیں میرا"],
    dateAdded: DATE,
  },
  {
    id: "nazm-4",
    couplet:
      "مسافر ہوں مگر منزل ابھی شام نہیں آئی\nکوئی قافلہ، کوئی رہگزر، تجھ جیسا مسافر نہیں میرا",
    type: "Nazm",
    bookName: BOOK,
    tags: ["نہیں میرا"],
    dateAdded: DATE,
  },
  {
    id: "nazm-5",
    couplet:
      "مجاہدؔ جو کس کم ظرف کے ہاتھوں سے ملتا ہو\nبلا کی پیاس میں بھی وہ بھرا ساغر نہیں میرا",
    type: "Nazm",
    bookName: BOOK,
    tags: ["نہیں میرا"],
    dateAdded: DATE,
  },
  {
    id: "ghazal-1",
    couplet:
      "کس پہ دست دو گے آکر اے مرے پیارے حبیب\nمیرے گھر میں درد ہے دیوار و در کوئی نہیں",
    type: "Ghazal",
    bookName: BOOK,
    tags: ["کوئی نہیں"],
    dateAdded: DATE,
  },
  {
    id: "ghazal-2",
    couplet:
      "وہ نہیں تو زندگی بے رنگ ہے، بے کیف ہے\nتشنگی ہے، دھوپ ہے، سر پر شجر کوئی نہیں",
    type: "Ghazal",
    bookName: BOOK,
    tags: ["کوئی نہیں"],
    dateAdded: DATE,
  },
  {
    id: "ghazal-3",
    couplet:
      "ہاتھ پر مہندی لگا لے ضد کی عادت چھوڑ دے\nدیکھ میرے پاس اب خونِ جگر کوئی نہیں",
    type: "Ghazal",
    bookName: BOOK,
    tags: ["کوئی نہیں"],
    dateAdded: DATE,
  },
  {
    id: "ghazal-4",
    couplet:
      "وہ دیا روشن کرو جس سے جلیں لاکھوں چراغ\nورنہ گردوں پر کہیں شمس و قمر کوئی نہیں",
    type: "Ghazal",
    bookName: BOOK,
    tags: ["کوئی نہیں"],
    dateAdded: DATE,
  },
  {
    id: "ghazal-5",
    couplet:
      "جاں جاں بکھرے ہوئے ہیں بے کفن لاشے مگر\nمیں غلام اس کا مجاہدؔ جس پہ سر کوئی نہیں",
    type: "Ghazal",
    bookName: BOOK,
    tags: ["کوئی نہیں"],
    dateAdded: DATE,
  },
];
