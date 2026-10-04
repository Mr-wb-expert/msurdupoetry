import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Save } from "lucide-react";

import { ErrorNote, Loading } from "@/components/Feedback.tsx";
import { errorMessage } from "./useAuth.ts";
import { createBook, getBook, updateBook, uploadCover } from "@/lib/api.ts";
import { useApi } from "@/lib/useApi.ts";
import { CATEGORIES, categoryLabels, type Book, type BookCategory } from "@/lib/types";

type Draft = {
  slug: string;
  title: string;
  author: string;
  description: string;
  category: BookCategory;
  pdfUrl: string;
  coverImage: string;
  publishedYear: string;
  pages: string;
  publication: string;
  sortOrder: string;
};

const blank: Draft = {
  slug: "",
  title: "",
  author: "Mujahid Sajjad",
  description: "",
  category: "poetry",
  pdfUrl: "",
  coverImage: "",
  publishedYear: "",
  pages: "",
  publication: "",
  sortOrder: "0",
};

function toDraft(book: Book): Draft {
  return {
    slug: book.slug,
    title: book.title,
    author: book.author,
    description: book.description,
    category: book.category,
    pdfUrl: book.pdfUrl,
    coverImage: book.coverImage ?? "",
    publishedYear: book.publishedYear ? String(book.publishedYear) : "",
    pages: book.pages ? String(book.pages) : "",
    publication: book.publication ?? "",
    sortOrder: String(book.sortOrder),
  };
}

/** Empty means null on the wire, which is what the schema expects. */
const orNull = (value: string) => (value.trim() === "" ? null : value.trim());
const asNumber = (value: string) => (value.trim() === "" ? null : Number(value));

export default function AdminBookForm() {
  const { slug = "" } = useParams();
  const isNew = !slug;
  const navigate = useNavigate();

  const existing = useApi(() => getBook(slug), [slug]);

  const [draft, setDraft] = useState<Draft>(blank);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load the existing book into the form exactly once, so an edit made
  // elsewhere is not overwritten by a re-render.
  useEffect(() => {
    if (existing.data) setDraft(toDraft(existing.data));
  }, [existing.data]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: draft.title,
        author: draft.author,
        description: draft.description,
        category: draft.category,
        pdf_url: draft.pdfUrl,
        cover_image: orNull(draft.coverImage),
        published_year: asNumber(draft.publishedYear),
        pages: asNumber(draft.pages),
        publication: orNull(draft.publication),
        sort_order: Number(draft.sortOrder) || 0,
      };

      const savedBook = isNew
        ? await createBook({ ...payload, slug: orNull(draft.slug) })
        : await updateBook(slug, { ...payload, slug: orNull(draft.slug) });

      setSaved(true);
      // On a create, the slug only exists now, so move to the canonical URL
      // rather than staying on a form for a record that does not have one yet.
      navigate(`/admin/books/${savedBook.slug}`, { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onCover(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      // The book must exist before it can have a cover, so a cover dropped on
      // a brand-new record is saved after the first save.
      const target = isNew ? (draft.slug.trim() || null) : slug;
      if (!target) {
        setError("Save the book once before uploading a cover, so it has a URL.");
        return;
      }
      const updated = await uploadCover(target, file);
      set("coverImage", updated.coverImage ?? "");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setUploading(false);
    }
  }

  if (!isNew && existing.loading) return <Loading label="Loading the book" />;
  if (!isNew && existing.error) return <ErrorNote message={existing.error} onRetry={existing.reload} />;
  if (!isNew && !existing.data) return null;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl">{isNew ? "New book" : "Edit book"}</h1>
          <p className="mt-2 text-sm text-muted">
            {isNew ? (
              <Link to="/admin/books" className="hover:text-maroon-700">
                ← All books
              </Link>
            ) : (
              <>
                <span className="font-mono">/books/{slug}</span> ·{" "}
                <Link to="/admin/books" className="hover:text-maroon-700">
                  all books
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      <form onSubmit={save} className="mt-8 space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="title" className="field-label">
              Title
            </label>
            <input
              id="title"
              required
              value={draft.title}
              onChange={(event) => set("title", event.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="author" className="field-label">
              Author
            </label>
            <input
              id="author"
              value={draft.author}
              onChange={(event) => set("author", event.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="category" className="field-label">
              Category
            </label>
            <select
              id="category"
              value={draft.category}
              onChange={(event) => set("category", event.target.value as BookCategory)}
              className="field"
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {categoryLabels[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className="field-label">
              Description
            </label>
            <textarea
              id="description"
              rows={5}
              value={draft.description}
              onChange={(event) => set("description", event.target.value)}
              className="field"
            />
            <p className="field-hint">
              Describe only what is verifiable about the book. An invented year or reception is
              worse than a missing one.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="pdfUrl" className="field-label">
              PDF link
            </label>
            <input
              id="pdfUrl"
              type="url"
              value={draft.pdfUrl}
              onChange={(event) => set("pdfUrl", event.target.value)}
              placeholder="https://drive.google.com/file/d/…/view"
              className="field"
            />
            <p className="field-hint">
              A Google Drive share link works — the reader and download links are built from it.
            </p>
          </div>

          <div>
            <label htmlFor="publishedYear" className="field-label">
              Year
            </label>
            <input
              id="publishedYear"
              type="number"
              min={1000}
              max={2100}
              value={draft.publishedYear}
              onChange={(event) => set("publishedYear", event.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="pages" className="field-label">
              Pages
            </label>
            <input
              id="pages"
              type="number"
              min={1}
              value={draft.pages}
              onChange={(event) => set("pages", event.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="publication" className="field-label">
              Publication
            </label>
            <input
              id="publication"
              value={draft.publication}
              onChange={(event) => set("publication", event.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="sortOrder" className="field-label">
              Display order
            </label>
            <input
              id="sortOrder"
              type="number"
              value={draft.sortOrder}
              onChange={(event) => set("sortOrder", event.target.value)}
              className="field"
            />
            <p className="field-hint">Lower comes first. 0 is the featured book.</p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="slug" className="field-label">
              Slug
            </label>
            <input
              id="slug"
              value={draft.slug}
              onChange={(event) => set("slug", event.target.value)}
              placeholder="left blank, it is made from the title"
              className="field font-mono text-sm"
            />
            <p className="field-hint">
              Changing this breaks any link already shared. Lowercase words separated by hyphens.
            </p>
          </div>
        </div>

        {/* Cover: uploaded to the server, or a path to an existing file. */}
        <fieldset className="rounded-sm border border-line bg-paper p-5">
          <legend className="px-1 text-sm font-semibold">Cover</legend>

          <div className="flex flex-wrap items-start gap-5">
            <div className="w-24 shrink-0 overflow-hidden rounded-sm">
              {draft.coverImage ? (
                <img
                  src={draft.coverImage}
                  alt="Current cover"
                  width={96}
                  height={128}
                  className="aspect-[3/4] w-full object-cover"
                />
              ) : (
                <div className="grid aspect-[3/4] w-full place-items-center bg-ink-800 text-[0.55rem] font-semibold text-paper/70">
                  No cover
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <label htmlFor="coverImage" className="field-label">
                  Cover path
                </label>
                <input
                  id="coverImage"
                  value={draft.coverImage}
                  onChange={(event) => set("coverImage", event.target.value)}
                  placeholder="/images/cover.png or /media/…"
                  className="field font-mono text-sm"
                />
              </div>

              <div>
                <label htmlFor="cover" className="field-label">
                  Upload an image
                </label>
                <input
                  id="cover"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  disabled={uploading}
                  onChange={(event) => {
                    void onCover(event.target.files?.[0]);
                    // Reset so re-picking the same file fires onChange again.
                    event.target.value = "";
                  }}
                  className="field py-2 file:me-3 file:rounded-sm file:border-0 file:bg-cream-100 file:px-3 file:py-1 file:text-sm file:font-medium"
                />
                <p className="field-hint">
                  PNG, JPEG, WebP or AVIF, up to 8 MB. Uploading replaces the cover and saves it
                  straight away.
                </p>
              </div>
            </div>
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-sm bg-maroon-700/5 p-3 text-sm font-medium text-maroon-700">
            {error}
          </p>
        )}
        {saved && !error && (
          <p role="status" className="text-sm font-medium text-teal-700">
            Saved.
          </p>
        )}

        <div className="flex flex-wrap gap-3 border-t border-line pt-6">
          <button type="submit" disabled={busy} className="btn btn-primary">
            <Save aria-hidden="true" className="size-4" />
            {busy ? "Saving…" : "Save"}
          </button>
          <Link to="/admin/books" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}