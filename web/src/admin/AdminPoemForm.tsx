import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Save } from "lucide-react";

import { ErrorNote, Loading } from "@/components/Feedback.tsx";
import { errorMessage } from "./useAuth.ts";
import { createPoem, getPoem, updatePoem } from "@/lib/api.ts";
import { useApi } from "@/lib/useApi.ts";
import { VERSE_TYPES, type VerseType } from "@/lib/types";

type Draft = { slug: string; title: string; body: string; type: VerseType };

export default function AdminPoemForm() {
  const { slug = "" } = useParams();
  const isNew = !slug;
  const navigate = useNavigate();

  const existing = useApi(() => getPoem(slug), [slug], !isNew);
  const [draft, setDraft] = useState<Draft>({ slug: "", title: "", body: "", type: "Ghazal" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existing.data) {
      setDraft({
        slug: existing.data.slug,
        title: existing.data.title,
        body: existing.data.body,
        type: existing.data.type ?? "Ghazal",
      });
    }
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
        body: draft.body,
        type: draft.type,
        ...(draft.slug.trim() ? { slug: draft.slug.trim() } : {}),
      };
      const result = isNew ? await createPoem(payload) : await updatePoem(slug, payload);
      setSaved(true);
      navigate(`/admin/poems/${result.slug}`, { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!isNew && existing.loading) return <Loading label="Loading the verse" />;
  if (!isNew && existing.error) return <ErrorNote message={existing.error} onRetry={existing.reload} />;
  if (!isNew && !existing.data) return null;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl">{isNew ? "New verse" : "Edit verse"}</h1>
      <p className="mt-2 text-sm text-muted">
        {isNew ? (
          <Link to="/admin/poems" className="hover:text-maroon-700">
            ← All verses
          </Link>
        ) : (
          <>
            <span className="font-mono">/poems/{slug}</span> ·{" "}
            <Link to="/admin/poems" className="hover:text-maroon-700">
              all verses
            </Link>
          </>
        )}
      </p>

      <form onSubmit={save} className="mt-8 space-y-5">
        <div>
          <label htmlFor="poem-title" className="field-label">
            Title
          </label>
          <input
            id="poem-title"
            required
            value={draft.title}
            onChange={(event) => set("title", event.target.value)}
            className="field urdu-display"
          />
        </div>

        <div>
          <label htmlFor="poem-type" className="field-label">
            Type
          </label>
          <select
            id="poem-type"
            required
            value={draft.type}
            onChange={(event) => set("type", event.target.value as VerseType)}
            className="field"
          >
            {VERSE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <p className="field-hint">
            Ghazal, Nazm or Poem — it picks the badge on the card and the filter it lands under.
          </p>
        </div>

        <div>
          <label htmlFor="poem-body" className="field-label">
            Verse
          </label>
          <textarea
            id="poem-body"
            rows={16}
            required
            value={draft.body}
            onChange={(event) => set("body", event.target.value)}
            aria-describedby="poem-body-hint"
            className="field urdu"
          />
          <p id="poem-body-hint" className="field-hint">
            Two consecutive lines make one couplet. Leave a blank line between couplets for a
            stanza break. The site does not wrap or re-flow this text.
          </p>
        </div>

        <div>
          <label htmlFor="poem-slug" className="field-label">
            Slug
          </label>
          <input
            id="poem-slug"
            value={draft.slug}
            onChange={(event) => set("slug", event.target.value)}
            placeholder="left blank, it is made from the title"
            className="field font-mono text-sm"
          />
        </div>

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
          <Link to="/admin/poems" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}