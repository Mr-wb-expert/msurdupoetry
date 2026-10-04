/**
 * The section label the whole site shares: an eyebrow, a heading, and
 * optionally a lead paragraph. At most one eyebrow per band, and it never
 * restates the heading beneath it. `size="lg"` steps the heading up one scale.
 */
export default function SectionHeading({
  eyebrow,
  title,
  lead,
  action,
  size,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  action?: React.ReactNode;
  size?: "lg";
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && (
          <>
            <p className="eyebrow">{eyebrow}</p>
            <div aria-hidden="true" className="rule-accent mt-3" />
          </>
        )}
        <h2 className={`mt-3 ${size === "lg" ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}>
          {title}
        </h2>
        {lead && <p className="mt-3 text-muted">{lead}</p>}
      </div>
      {action}
    </div>
  );
}