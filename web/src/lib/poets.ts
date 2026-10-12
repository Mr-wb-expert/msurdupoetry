/**
 * Author string (as saved in `Poem.author`) -> poet page slug. Mirrors
 * `api/poets.py`: a known author links to their hub page, anything else
 * renders as plain text.
 */
const ALIASES: Record<string, string> = {
  "Mujahid Sajjad": "mujahid-sajjad",
  "Mohsin Naqvi": "mohsin-naqvi",
  "شہید محسن نقوی": "mohsin-naqvi",
  "Jaun Elia": "jaun-elia",
  "Faiz Ahmed Faiz": "faiz-ahmed-faiz",
  "غزالہ انجم": "ghazala-anjum",
};

/** The hub URL for an author, or null when they have no poet page. */
export function poetHref(author: string | null | undefined): string | null {
  if (!author) return null;
  const slug = ALIASES[author];
  return slug ? `/poets/${slug}` : null;
}