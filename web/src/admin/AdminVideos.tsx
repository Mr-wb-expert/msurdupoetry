import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import { EmptyNote, ErrorNote, Loading } from "@/components/Feedback.tsx";
import ConfirmButton from "./ConfirmButton.tsx";
import { deleteVideo, getVideos } from "@/lib/api.ts";
import { useApi } from "@/lib/useApi.ts";
import type { Video } from "@/lib/types";

export default function AdminVideos() {
  const videos = useApi(getVideos);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl">Videos</h1>
          <p className="mt-2 text-sm text-muted">
            Newest first on the public page. Only YouTube links are accepted — the player is built
            from the link, so a broken one never reaches the page.
          </p>
        </div>
        <Link to="/admin/videos/new" className="btn btn-primary">
          <Plus aria-hidden="true" className="size-4" />
          New video
        </Link>
      </div>

      {videos.loading && <Loading label="Loading videos" />}
      {videos.error && <ErrorNote message={videos.error} onRetry={videos.reload} />}
      {videos.data && videos.data.length === 0 && (
        <div className="mt-8">
          <EmptyNote title="No videos yet">
            Paste a YouTube link and a short description to fill the page.
          </EmptyNote>
        </div>
      )}

      {videos.data && videos.data.length > 0 && (
        <div className="mt-8 space-y-3">
          {videos.data.map((video: Video) => (
            <div
              key={video.id}
              className="lift rounded-sm border border-line bg-paper p-4 shadow-cover"
            >
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="break-all font-mono text-xs text-muted">{video.url}</p>
                  <p className="mt-1 text-sm">{video.description}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    to={`/admin/videos/${video.id}`}
                    className="inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-medium text-ink-800 hover:bg-cream-100"
                  >
                    Edit
                  </Link>
                  <ConfirmButton
                    label="Delete"
                    confirmLabel="Delete permanently"
                    question={`Remove “${video.description}”? The public page loses the video.`}
                    onConfirm={async () => {
                      await deleteVideo(video.id);
                      videos.reload();
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
