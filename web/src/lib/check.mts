/**
 * Self-check for the pure frontend logic.
 *
 * Run with: npm run check
 *
 * No framework and no runner: the logic worth protecting here is URL parsing
 * and search/sort ordering, both of which fail silently when wrong. Importing
 * from a .ts file is why this is a .mts script rather than a test file.
 */

import assert from "node:assert/strict";

import { driveFileId, downloadUrl, embedUrl, filterBooks, sortBooks } from "./books.ts";
import { youtubeId } from "./videos.ts";
import type { Book } from "./types.ts";

let passed = 0;
function check(label: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${label}`);
  } catch (error) {
    console.error(`FAIL  ${label}`);
    console.error(error);
    process.exit(1);
  }
}

const book = (over: Partial<Book>): Book => ({
  slug: "a-book",
  title: "A Book",
  description: "",
  coverImage: null,
  pdfUrl: "",
  category: "poetry",
  author: "",
  publishedYear: null,
  pages: null,
  publication: null,
  sortOrder: 0,
  createdAt: "2026-01-01T00:00:00",
  ...over,
});

console.log("drive urls");

check("view url yields the file id", () => {
  const id = driveFileId("https://drive.google.com/file/d/1L00osyWDKYZ/view");
  assert.equal(id, "1L00osyWDKYZ");
});

check("uc export url yields the file id", () => {
  assert.equal(driveFileId("https://drive.google.com/uc?export=download&id=ABC-123_x"), "ABC-123_x");
});

check("a non-drive url has no file id", () => {
  assert.equal(driveFileId("https://example.com/book.pdf"), null);
});

check("embed switches to the preview viewer", () => {
  const target = embedUrl(book({ pdfUrl: "https://drive.google.com/file/d/ID1/view" }));
  assert.equal(target, "https://drive.google.com/file/d/ID1/preview");
});

check("download switches to the export endpoint", () => {
  const target = downloadUrl(book({ pdfUrl: "https://drive.google.com/file/d/ID1/view" }));
  assert.equal(target, "https://drive.google.com/uc?export=download&id=ID1");
});

check("a direct pdf url is used as-is", () => {
  const direct = "https://example.com/book.pdf";
  assert.equal(embedUrl(book({ pdfUrl: direct })), direct);
  assert.equal(downloadUrl(book({ pdfUrl: direct })), direct);
});

console.log("youtube urls");

check("watch url yields the video id", () => {
  assert.equal(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
});

check("watch url with extra params still yields the id", () => {
  assert.equal(
    youtubeId("https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=42"),
    "dQw4w9WgXcQ",
  );
});

check("short url yields the video id", () => {
  assert.equal(youtubeId("https://youtu.be/dQw4w9WgXcQ?t=42"), "dQw4w9WgXcQ");
});

check("shorts url yields the video id", () => {
  assert.equal(youtubeId("https://www.youtube.com/shorts/abc-DEF_123"), "abc-DEF_123");
});

check("a non-youtube url has no video id", () => {
  assert.equal(youtubeId("https://example.com/video"), null);
});

console.log("search and filter");

const library = [
  book({ slug: "magar", title: "Magar Manzar Nahi Mera", author: "Mujahid Sajjad" }),
  book({
    slug: "article",
    title: "An Article on the Poetry of Mujahid Sajjad",
    author: "Ghazala Anjum",
    category: "criticism",
  }),
  book({ slug: "listening", title: "The Listening Eye", author: "Rizvi", category: "other" }),
];

check("an empty query returns everything", () => {
  assert.equal(filterBooks(library, { query: "", category: "all" }).length, 3);
});

check("search is case insensitive", () => {
  assert.equal(filterBooks(library, { query: "magar", category: "all" }).length, 1);
  assert.equal(filterBooks(library, { query: "MAGAR", category: "all" }).length, 1);
});

check("search matches the author, not just the title", () => {
  const found = filterBooks(library, { query: "anjum", category: "all" });
  assert.equal(found.length, 1);
  assert.equal(found[0]?.slug, "article");
});

check("search also reaches the description", () => {
  const withBio = [book({ slug: "x", description: "contains the needle inside" })];
  assert.equal(filterBooks(withBio, { query: "needle", category: "all" }).length, 1);
});

check("category narrows the result", () => {
  assert.equal(filterBooks(library, { query: "", category: "criticism" }).length, 1);
});

check("query and category combine", () => {
  assert.equal(filterBooks(library, { query: "sajjad", category: "criticism" }).length, 1);
  assert.equal(filterBooks(library, { query: "sajjad", category: "poetry" }).length, 1);
});

check("a query matching nothing returns nothing", () => {
  assert.deepEqual(filterBooks(library, { query: "zzzzz", category: "all" }), []);
});

console.log("sorting");

check("az sorts by title", () => {
  const titles = sortBooks(library, "az").map((b) => b.title);
  assert.deepEqual(titles, [...titles].sort((a, b) => a.localeCompare(b)));
});

check("za reverses az", () => {
  assert.deepEqual(
    sortBooks(library, "za").map((b) => b.slug),
    sortBooks(library, "az").map((b) => b.slug).reverse(),
  );
});

check("featured leaves the order alone", () => {
  assert.deepEqual(
    sortBooks(library, "featured").map((b) => b.slug),
    library.map((b) => b.slug),
  );
});

check("undated books sort last under newest, not as year zero", () => {
  const dated = [
    book({ slug: "old", title: "Old", publishedYear: 1998 }),
    book({ slug: "undated", title: "Undated", publishedYear: null }),
    book({ slug: "new", title: "New", publishedYear: 2024 }),
  ];
  assert.deepEqual(
    sortBooks(dated, "newest").map((b) => b.slug),
    ["new", "old", "undated"],
  );
});

check("sorting does not mutate its input", () => {
  const original = library.map((b) => b.slug);
  sortBooks(library, "za");
  assert.deepEqual(library.map((b) => b.slug), original);
});

console.log(`web check: ${passed} assertions passed`);