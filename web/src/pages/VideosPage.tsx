import Seo from "@/components/Seo.tsx";
import { ErrorNote, Loading } from "@/components/Feedback.tsx";
import { getVideos } from "@/lib/api.ts";
import { youtubeId } from "@/lib/videos";
import { useApi } from "@/lib/useApi";

export default function VideosPage() {
  const videos = useApi(getVideos);

  // A malformed link drops out instead of shipping a broken embed.
  const playable = (videos.data ?? []).flatMap((video) => {
    const id = youtubeId(video.url);
    return id ? [{ ...video, id }] : [];
  });

  return (
    <>
      {/* Copy mirrored in api/seo.py. */}
      <Seo
        title="Urdu Poetry Videos"
        description="Watch Urdu poetry videos by Mujahid Sajjad — ghazal and shayari readings on YouTube."
      />

      <section className="border-b border-line bg-cream-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="eyebrow">Watch</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">Videos</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            Readings, mushaira recordings and interviews with the poetry of Syed
            Mujahid Sajjad — ghazals and nazms recited in his own voice and by
            fellow poets. New recordings are added here as they appear on the
            channel.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        {videos.loading && <Loading label="Loading videos" />}
        {videos.error && <ErrorNote message={videos.error} onRetry={videos.reload} />}
        {videos.data && playable.length === 0 && (
          <p className="text-sm text-muted">Videos coming soon.</p>
        )}

        {playable.length > 0 && (
          <div className="grid gap-8 sm:grid-cols-2">
            {playable.map((video) => (
              <figure
                key={video.id}
                className="lift rounded-sm border border-line bg-paper p-3 shadow-cover"
              >
                <div className="aspect-video overflow-hidden rounded-sm bg-ink-950">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${video.id}`}
                    title={video.description || "YouTube video"}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
                <figcaption className="mt-3 text-sm font-semibold text-ink-800">
                  {video.description}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
