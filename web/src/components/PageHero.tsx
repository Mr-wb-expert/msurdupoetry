import { Link } from "react-router-dom";

/**
 * The top band every public page opens with — the same cream band, accent
 * rule and Nastaliq subtitle as the home, contact and legal pages, so the
 * site reads as one book. `watermark` is a single Urdu word set huge and
 * faint behind the band on wide screens; decoration only.
 */
export default function PageHero({
  eyebrow,
  title,
  urdu,
  lead,
  watermark,
  crumbs,
  children,
}: {
  eyebrow: string;
  title: string;
  /** Urdu rendering of the title, shown under it in Nastaliq. */
  urdu?: string;
  lead?: React.ReactNode;
  watermark?: string;
  /** Breadcrumb trail above the eyebrow: [label, href] pairs, last one current. */
  crumbs?: [string, string | null][];
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-cream-50">
      {watermark && (
        <span
          aria-hidden="true"
          lang="ur"
          className="urdu-display pointer-events-none absolute -end-8 -top-8 select-none text-[10rem] leading-none text-maroon-700/[0.04] max-lg:hidden"
        >
          {watermark}
        </span>
      )}
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted max-sm:text-center">
            {crumbs.map(([label, href], index) => (
              <span key={label}>
                {index > 0 && <span aria-hidden="true"> / </span>}
                {href ? (
                  <Link to={href} className="hover:text-maroon-700">
                    {label}
                  </Link>
                ) : (
                  <span className="text-ink-800">{label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="text-center sm:text-start">
          <p className="eyebrow">{eyebrow}</p>
          <div aria-hidden="true" className="rule-accent mx-auto mt-3 sm:mx-0" />
          <h1 className="mt-4 text-3xl sm:text-5xl">{title}</h1>
          {urdu && (
            <p className="mt-3">
              <span lang="ur" dir="rtl" className="urdu-display text-2xl text-maroon-700">
                {urdu}
              </span>
            </p>
          )}
          {lead && (
            <div className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted sm:mx-0">
              {lead}
            </div>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
