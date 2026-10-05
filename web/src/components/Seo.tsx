import { useEffect } from "react";

export type SeoProps = {
  title: string;
  description?: string;
  /** Absolute URL of the preview image, if the page has one. */
  image?: string | null;
  /** JSON-LD graph nodes for this page. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Admin pages are not indexed and should not be in the sitemap either. */
  noIndex?: boolean;
};

const SITE_NAME = "Mujahid Sajjad";

/**
 * Per-page document metadata.
 *
 * A single-page app ships one HTML file, so titles, descriptions and
 * structured data have to be written from the client. Search engines that run
 * JavaScript read these; the ones that do not see only the defaults in
 * index.html, which is why that file is not empty of metadata.
 */
type MetaSelector =
  | 'meta[name="description"]'
  | 'meta[name="robots"]'
  | 'meta[property="og:title"]'
  | 'meta[property="og:description"]'
  | 'meta[property="og:image"]'
  | 'meta[property="og:url"]'
  | 'meta[property="og:type"]'
  | 'meta[property="og:site_name"]'
  | 'meta[name="twitter:card"]'
  | 'meta[name="twitter:title"]'
  | 'meta[name="twitter:description"]';

/** Writes a meta tag, creating it the first time that page needs one. */
function setMeta(selector: MetaSelector, value: string) {
  const attribute = selector.startsWith('meta[property')
    ? "property"
    : "name";
  // `meta[property="og:url"]` -> `og:url`, whatever the key inside.
  const key = selector.slice(selector.indexOf('="') + 2, -2);
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", value);
}

/** Drops a tag the current page no longer wants, so nothing goes stale. */
function removeMeta(selector: MetaSelector) {
  document.head.querySelector(selector)?.remove();
}

/** Points <link rel="canonical"> at this page, creating it if needed. */
function setCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

export default function Seo({
  title,
  description,
  image,
  jsonLd,
  noIndex = false,
}: SeoProps) {
  useEffect(() => {
    document.title = title === SITE_NAME ? title : `${title} — ${SITE_NAME}`;

    // The canonical URL is this exact page: without it the query strings a
    // share link carries would split one page's ranking across several URLs.
    const url = window.location.origin + window.location.pathname;
    setCanonical(url);
    setMeta('meta[property="og:url"]', url);
    setMeta('meta[property="og:type"]', "website");
    setMeta('meta[property="og:site_name"]', SITE_NAME);
    setMeta('meta[property="og:title"]', document.title);

    if (description) {
      setMeta('meta[name="description"]', description);
      setMeta('meta[property="og:description"]', description);
    }
    setMeta('meta[name="robots"]', noIndex ? "noindex, nofollow" : "index, follow");
    // Public pages default to the branded share card — matching api/seo.py —
    // so navigating away from a page that had an image cannot leave it behind.
    const shareImage = noIndex ? null : (image ?? "/images/og-cover.png");
    if (shareImage) {
      // Social crawlers never resolve a site-relative image, so it is made
      // absolute here, where the origin is known.
      setMeta('meta[property="og:image"]', new URL(shareImage, window.location.origin).href);
      setMeta('meta[name="twitter:card"]', "summary_large_image");
    } else {
      removeMeta('meta[property="og:image"]');
      removeMeta('meta[name="twitter:card"]');
    }
    setMeta('meta[name="twitter:title"]', document.title);
    if (description) {
      setMeta('meta[name="twitter:description"]', description);
    }

    // One script tag, rewritten in place. Leaking the previous page's schema
    // would make the page describe two different things at once.
    const scriptId = "page-jsonld";
    document.getElementById(scriptId)?.remove();
    if (jsonLd) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => document.getElementById(scriptId)?.remove();
  }, [title, description, image, jsonLd, noIndex]);

  return null;
}