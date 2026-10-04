import { useState } from "react";
import { Check } from "lucide-react";

import { postReview } from "@/lib/api.ts";

/**
 * Review submission. The server publishes immediately and returns the
 * confirmation shown here; the admin can unpublish it later.
 */
export default function ReviewForm({
  bookSlug,
  bookTitle,
  onSubmitted,
}: {
  bookSlug: string;
  bookTitle: string;
  onSubmitted: () => void;
}) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  // Honeypot: a real reader never sees this, and it is never focusable.
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "busy" | "sent" | "error"; message?: string }>(
    { kind: "idle" },
  );

  const tooShort = body.trim().length > 0 && body.trim().length < 20;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus({ kind: "busy" });
    try {
      const message = await postReview({ bookSlug, name, body, website });
      setName("");
      setBody("");
      onSubmitted();
      setStatus({ kind: "sent", message });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    }
  }

  return (
    <div className="lift rounded-sm border border-line bg-paper p-6 shadow-cover">
      <h3 className="text-base font-semibold">Write a review</h3>
      <p className="mt-1.5 text-sm text-muted">About {bookTitle}</p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="review-name" className="field-label">
            Your name
          </label>
          <input
            id="review-name"
            required
            minLength={2}
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="review-body" className="field-label">
            Your review
          </label>
          <textarea
            id="review-body"
            required
            minLength={20}
            maxLength={1500}
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            aria-describedby="review-body-hint"
            aria-invalid={tooShort}
            className="field"
          />
          <p id="review-body-hint" className="field-hint">
            {tooShort ? "A little longer, please — at least 20 characters." : "At least 20 characters."}
          </p>
        </div>

        {/* Honeypot. Hidden from sight and from the keyboard; bots fill it. */}
        <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0">
          <label htmlFor="review-website">Website</label>
          <input
            id="review-website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={status.kind === "busy" || tooShort}
          className="btn btn-primary w-full"
        >
          {status.kind === "busy" ? "Sending…" : "Submit review"}
        </button>

        {status.kind === "sent" && (
          <p role="status" className="flex items-start gap-2 text-sm text-teal-700">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {status.message}
          </p>
        )}
        {status.kind === "error" && (
          <p role="alert" className="text-sm font-medium text-maroon-700">
            {status.message}
          </p>
        )}
      </form>
    </div>
  );
}