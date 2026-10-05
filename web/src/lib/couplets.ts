/**
 * Couplet cards for the Verses page.
 *
 * Everything here is admin-managed: a poem saved in the panel joins the list
 * as a card linking to its own page (/poems/:slug). Nothing is hardcoded —
 * what the site shows is what the panel holds.
 */

import type { Poem, VerseType } from "@/lib/types";

export interface Couplet {
  id: string;
  /** Heading — the poem's title, always set by the admin form. */
  title: string;
  /** Two lines of a sher, separated by a newline. Urdu text, never translated. */
  couplet: string;
  type?: VerseType;
  /** The page holding the whole poem. */
  href: string;
}

/** An admin-added verse joins the list as a card. */
export const fromPoem = (poem: Poem): Couplet => ({
  id: poem.slug,
  title: poem.title,
  couplet: poem.body,
  href: `/poems/${poem.slug}`,
  type: poem.type ?? undefined,
});
