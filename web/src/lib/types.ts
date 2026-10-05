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
  createdAt: string;
};

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
export type BookInput = Omit<Book, "slug" | "createdAt"> & { slug?: string };
export type PoemInput = Omit<Poem, "slug" | "createdAt"> & { slug?: string };