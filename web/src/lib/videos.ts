/** The video id from the URL shapes YouTube actually hands out:
 *    watch?v=…  ·  youtu.be/…  ·  /shorts/…  ·  /embed/…
 * Anything else returns null, so a bad link is skipped rather than embedded broken. */
export const youtubeId = (url: string): string | null =>
  url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/))([\w-]{11})/,
  )?.[1] ?? null;
