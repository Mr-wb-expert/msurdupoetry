/**
 * Pure catalogue logic: Drive URL handling and search / filter / sort.
 *
 * Deliberately free of React and of any network import, so `check.mts` can
 * exercise it directly under plain Node.
 */

import type { Book, BookCategory } from "./types.ts";

/* ---------------------------------------------------------------- */
/* Google Drive / URL helpers                                        */
/* ---------------------------------------------------------------- */

/** Pulls the file id out of any of the URL shapes Drive hands out. */
export function driveFileId(url: string): string | null {
  const patterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/, /\/d\/([a-zA-Z0-9_-]+)/];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** Drive's own embeddable viewer, used for the in-site reading experience. */
export function embedUrl(book: Book): string {
  const id = driveFileId(book.pdfUrl);
  return id ? `https://drive.google.com/file/d/${id}/preview` : book.pdfUrl;
}

export function downloadUrl(book: Book): string {
  const id = driveFileId(book.pdfUrl);
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : book.pdfUrl;
}

/** Drive's full-page viewer, opened in a new tab. */
export function externalReadUrl(book: Book): string {
  const id = driveFileId(book.pdfUrl);
  return id ? `https://drive.google.com/file/d/${id}/view` : book.pdfUrl;
}

/* ---------------------------------------------------------------- */
/* Catalogue search, filter and sort                                 */
/* ---------------------------------------------------------------- */

export type SortKey = "featured" | "az" | "za" | "newest";

export const sortLabels: Record<SortKey, string> = {
  featured: "Featured",
  az: "Title A–Z",
  za: "Title Z–A",
  newest: "Newest first",
};

export function filterBooks(
  books: Book[],
  { query, category }: { query: string; category: BookCategory | "all" },
): Book[] {
  const needle = query.trim().toLowerCase();
  return books.filter((book) => {
    if (category !== "all" && book.category !== category) return false;
    if (!needle) return true;
    // Title, author and description together, because a reader searching
    // "anjum" wants the article written about them, not only books by them.
    return `${book.title} ${book.author} ${book.description}`.toLowerCase().includes(needle);
  });
}

export function sortBooks(books: Book[], key: SortKey): Book[] {
  const sorted = [...books];
  if (key === "az") sorted.sort((a, b) => a.title.localeCompare(b.title));
  if (key === "za") sorted.sort((a, b) => b.title.localeCompare(a.title));
  if (key === "newest") {
    // Books with no year sort last rather than as year zero.
    sorted.sort((a, b) => (b.publishedYear ?? -1) - (a.publishedYear ?? -1));
  }
  return sorted;
}

/** The rest of the library, for the "also in the library" strip. */
export function relatedBooks(book: Book, all: Book[], limit = 3): Book[] {
  const sameCategory = all.filter(
    (other) => other.slug !== book.slug && other.category === book.category,
  );
  const rest = all.filter(
    (other) => other.slug !== book.slug && other.category !== book.category,
  );
  return [...sameCategory, ...rest].slice(0, limit);
}