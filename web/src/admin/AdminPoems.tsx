import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import { EmptyNote, ErrorNote, Loading } from "@/components/Feedback.tsx";
import ConfirmButton from "./ConfirmButton.tsx";
import { deletePoem, getPoems } from "@/lib/api.ts";
import { useApi } from "@/lib/useApi.ts";
import type { Poem } from "@/lib/types";

/** A poem in the admin list shows its first line, which is how Urdu work is
    identified — titles alone are often not distinctive. */
function preview(body: string): string {
  const first = body.split("\n").find((line) => line.trim()) ?? "—";
  return first.length > 70 ? `${first.slice(0, 70)}…` : first;
}

export default function AdminPoems() {
  const poems = useApi(getPoems);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl">Verse</h1>
          <p className="mt-2 text-sm text-muted">
            One verse per entry. Two consecutive lines make a couplet; a blank line starts a new
            stanza.
          </p>
        </div>
        <Link to="/admin/poems/new" className="btn btn-primary">
          <Plus aria-hidden="true" className="size-4" />
          New verse
        </Link>
      </div>

      {poems.loading && <Loading label="Loading verses" />}
      {poems.error && <ErrorNote message={poems.error} onRetry={poems.reload} />}
      {poems.data && poems.data.length === 0 && (
        <div className="mt-8">
          <EmptyNote title="No verses yet">Add one to fill the Verses page.</EmptyNote>
        </div>
      )}

      {poems.data && poems.data.length > 0 && (
        <div className="mt-8 space-y-3">
          {poems.data.map((poem: Poem) => (
            <div key={poem.slug} className="lift rounded-sm border border-line bg-paper p-4 shadow-cover">
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="urdu-display text-lg">{poem.title}</h2>
                  <p className="urdu mt-1.5 text-sm text-muted">{preview(poem.body)}</p>
                  <p className="mt-2 break-all font-mono text-xs text-muted">/poems/{poem.slug}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    to={`/admin/poems/${poem.slug}`}
                    className="inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-medium text-ink-800 hover:bg-cream-100"
                  >
                    Edit
                  </Link>
                  <ConfirmButton
                    label="Delete"
                    confirmLabel="Delete permanently"
                    question={`Delete “${poem.title}”? The public page stops working.`}
                    onConfirm={async () => {
                      await deletePoem(poem.slug);
                      poems.reload();
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}