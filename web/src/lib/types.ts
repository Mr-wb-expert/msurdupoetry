/**
 * Types mirroring the FastAPI schemas. The wire format is camelCase because
 * Pydantic serialises by alias, so nothing has to be renamed on arrival.
 */

export type BookCategory = "poetry" | "ghazal" | "criticism" | "essays" | "research" | "other";

export const CATEGORIES: BookCategory[] = [
  "poetry",
  "ghazal",
  "criticism",
  "essays",
  "research",
  "other",
];

export const categoryLabels: Record<BookCategory, string> = {
  poetry: "Poetry",
  ghazal: "Ghazal",
  criticism: "Criticism",
  essays: "Essays",
  research: "Research",
  other: "Literature",
};

/** SEO title fragment per category — mirrored in api/seo.py. */
export const BOOK_KIND: Record<BookCategory, string> = {
  poetry: "Urdu Poetry Book",
  ghazal: "Ghazal Poetry Book",
  criticism: "Criticism Book",
  essays: "Essays",
  research: "Research Book",
  other: "Book",
};

export type Book = {
  slug: string;
  title: string;
  description: string;
  coverImage: string | null;
  pdfUrl: string;
  category: BookCategory;
  author: string;
  publishedYear: number | null;
  pages: number | null;
  publication: string | null;
  sortOrder: number;
  /** Null for a row written before the column existed. */
  createdAt: string | null;
  /** Last admin edit — feeds the page's visible date and dateModified. */
  updatedAt: string | null;
};

/** What a verse is: the same three choices the admin form offers. */
export const VERSE_TYPES = ["Ghazal", "Nazm", "Poem"] as const;

export type VerseType = (typeof VERSE_TYPES)[number];

export type Poem = {
  slug: string;
  title: string;
  /** Null only for a verse saved before the field existed. */
  author: string | null;
  body: string;
  /** Null only for a verse saved before the field existed. */
  type: VerseType | null;
  /** The collection the verse came from (Shayad, Gumaan ...), blank if unknown. */
  book: string | null;
  createdAt: string;
  /** Last admin edit — feeds the poem page's visible date and dateModified. */
  updatedAt: string | null;
  /** The verse in Roman Urdu, same line breaks as body. Single-verse reads only. */
  roman?: string | null;
  /** "word — meaning", one per line. Single-verse reads only. */
  meanings?: string | null;
  /** Short explanation of the verse. Single-verse reads only. */
  notes?: string | null;
};

/** One hub page in /poets. `urdu` is the display name and H1. */
export type Poet = {
  slug: string;
  name: string;
  urdu: string;
  bio: string;
  poemCount: number;
  /** The language the poet writes in ("Urdu" unless api/poets.py says otherwise). */
  language: string;
};

export type PoetDetail = Poet & { poems: Poem[] };

export type Video = {
  id: number;
  url: string;
  description: string;
  createdAt: string;
};

export type Review = {
  id: number;
  bookSlug: string;
  bookTitle: string;
  name: string;
  body: string;
  isApproved: boolean;
};

/** Everything the book form can change. The slug is separate: it is the URL. */
export type BookInput = Omit<Book, "slug" | "createdAt" | "updatedAt"> & { slug?: string };
export type PoemInput = Omit<Poem, "slug" | "createdAt" | "updatedAt"> & { slug?: string };