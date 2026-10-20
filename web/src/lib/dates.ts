/**
 * "5 March 2026" — the date line on poem pages, the book page's Last
 * updated, and the JSON-LD's datePublished/dateModified all read this.
 *
 * Only the date part of the ISO string is used, and the locale is fixed to
 * en-GB: the server formats the same instant with strftime("%B %Y") in
 * api/seo.py, and neither end may depend on the viewer's timezone or
 * locale — a poem published at 23:59 UTC must not say two different days
 * on the two sides of a render.
 */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year!, month! - 1, day!).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** The date part of an ISO string, for JSON-LD (datePublished/dateModified). */
export function isoDate(iso: string): string {
  return iso.slice(0, 10);
}
