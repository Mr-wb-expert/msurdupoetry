import Seo from "@/components/Seo.tsx";
import { ErrorNote, Loading } from "@/components/Feedback.tsx";
import { getVideos } from "@/lib/api.ts";
import { isoDate } from "@/lib/dates";
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
      {/* Copy mirrored in api/seo.py, which also renders the VideoObject
          graph below for crawlers that skip JavaScript. datePublished is the
          day the video was published on this site — the only date either
          end can verify; uploadDate would claim a YouTube date we cannot. */}
      <Seo
        title="Urdu Poetry Videos"
        description="Watch Urdu poetry videos by Mujahid Sajjad — ghazal and shayari readings on YouTube."
        jsonLd={
          playable.length > 0
            ? playable.map((video) => ({
                "@context": "https://schema.org",
                "@type": "VideoObject",
                name: video.description || "Urdu poetry video",
                description: video.description || "Urdu poetry video by Mujahid Sajjad.",
                thumbnailUrl: `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`,
                contentUrl: `https://www.youtube.com/watch?v=${video.id}`,
                embedUrl: `https://www.youtube-nocookie.com/embed/${video.id}`,
                inLanguage: "ur",
                datePublished: isoDate(video.createdAt),
              }))
            : undefined
        }
      />

      <section className="border-b border-line bg-cream-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="text-center sm:text-start">
            <p className="eyebrow">Watch</p>
            <h1 className="mt-3 text-4xl sm:text-5xl">Videos</h1>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted">
              Readings, mushaira recordings and interviews with the poetry of Syed
              Mujahid Sajjad — ghazals and nazms recited in his own voice and by
              fellow poets. New recordings are added here as they appear on the
              channel.
            </p>
          </div>
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
