import { useState } from "react";
import { Play } from "lucide-react";

import Seo from "@/components/Seo.tsx";
import PageHero from "@/components/PageHero.tsx";
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
        title="Urdu Poetry Videos | Mushaira & Recitations"
        description="Urdu poetry videos, mushaira recordings and ghazal and nazm recitations from Prof. Mujahid Sajjad's library, on YouTube."
        jsonLd={
          playable.length > 0
            ? playable.map((video) => ({
                "@context": "https://schema.org",
                "@type": "VideoObject",
                name: video.description || "Urdu poetry video",
                description: video.description || "Urdu poetry video from Prof. Mujahid Sajjad's library.",
                thumbnailUrl: `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`,
                contentUrl: `https://www.youtube.com/watch?v=${video.id}`,
                embedUrl: `https://www.youtube-nocookie.com/embed/${video.id}`,
                inLanguage: "ur",
                datePublished: isoDate(video.createdAt),
              }))
            : undefined
        }
      />

      <PageHero
        eyebrow="Watch"
        title="Urdu Poetry Videos"
        urdu="ویڈیوز"
        watermark="مشاعرہ"
        lead="Urdu poetry you can listen to, mushaira recordings, ghazal and nazm recitations, and readings by Prof. Syed Mujahid Sajjad and fellow poets. New recordings are added as they appear on the channel."
      />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        {videos.loading && <Loading label="Loading videos" />}
        {videos.error && <ErrorNote message={videos.error} onRetry={videos.reload} />}
        {videos.data && playable.length === 0 && (
          <p className="text-sm text-muted">Videos coming soon.</p>
        )}

        {playable.length > 0 && (
          <div className="grid gap-8 sm:grid-cols-2">
            {playable.map((video, index) => (
              <figure key={video.id} className="lift rounded-sm border border-line bg-paper p-3 shadow-cover">
                <VideoPlayer id={video.id} title={video.description || "YouTube video"} eager={index === 0} />
                <figcaption className="mt-3 px-1 text-sm font-semibold text-ink-800">
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

/**
 * A thumbnail that becomes the YouTube player on click. One iframe per video
 * loaded the whole YouTube player for every card up front — the heaviest
 * thing on the page — so it waits until the reader asks for it.
 */
function VideoPlayer({ id, title, eager }: { id: string; title: string; eager: boolean }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-sm bg-ink-950">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play: ${title}`}
          className="group absolute inset-0 h-full w-full"
        >
          <img
            src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
            alt=""
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
          />
          <span className="absolute inset-0 grid place-items-center bg-ink-950/20 transition-colors group-hover:bg-ink-950/10">
            <span className="grid size-16 place-items-center rounded-full bg-maroon-700 text-paper shadow-cover transition-transform group-hover:scale-110">
              <Play aria-hidden="true" className="size-7 translate-x-0.5 fill-current" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
