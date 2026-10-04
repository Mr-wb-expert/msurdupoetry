import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Save } from "lucide-react";

import { ErrorNote, Loading } from "@/components/Feedback.tsx";
import { errorMessage } from "./useAuth.ts";
import { createVideo, getVideos, updateVideo } from "@/lib/api.ts";
import { useApi } from "@/lib/useApi.ts";

type Draft = { url: string; description: string };

export default function AdminVideoForm() {
  const { id = "" } = useParams();
  const isNew = !id;
  const numericId = Number(id);
  const navigate = useNavigate();

  // No single-video endpoint: the edit form finds its record in the list the
  // public page reads anyway, so one fetch covers both.
  const existing = useApi(getVideos, [], !isNew && Number.isFinite(numericId));
  const found = existing.data?.find((video) => video.id === numericId) ?? null;
  const [draft, setDraft] = useState<Draft>({ url: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (found) setDraft({ url: found.url, description: found.description });
  }, [found]);

  const set = (key: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = { url: draft.url.trim(), description: draft.description.trim() };
      if (isNew) await createVideo(payload);
      else await updateVideo(numericId, payload);
      navigate("/admin/videos", { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!isNew && existing.loading) return <Loading label="Loading the video" />;
  if (!isNew && existing.error)
    return <ErrorNote message={existing.error} onRetry={existing.reload} />;
  if (!isNew && !found)
    return <ErrorNote message="That video could not be loaded." onRetry={existing.reload} />;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl">{isNew ? "New video" : "Edit video"}</h1>
      <p className="mt-2 text-sm text-muted">
        <Link to="/admin/videos" className="hover:text-maroon-700">
          ← All videos
        </Link>
      </p>

      <form onSubmit={save} className="mt-8 space-y-5">
        <div>
          <label htmlFor="video-url" className="field-label">
            YouTube URL
          </label>
          <input
            id="video-url"
            required
            value={draft.url}
            onChange={(event) => set("url", event.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            className="field font-mono text-sm"
          />
          <p className="field-hint">
            A watch, youtu.be or shorts link. The server checks it is a real YouTube URL.
          </p>
        </div>

        <div>
          <label htmlFor="video-description" className="field-label">
            Description
          </label>
          <textarea
            id="video-description"
            rows={4}
            required
            value={draft.description}
            onChange={(event) => set("description", event.target.value)}
            aria-describedby="video-description-hint"
            className="field"
          />
          <p id="video-description-hint" className="field-hint">
            Shown under the video on the public page, and used as the player&apos;s accessible
            title.
          </p>
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
          <Link to="/admin/videos" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
