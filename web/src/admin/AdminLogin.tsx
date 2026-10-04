import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, LogIn, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

import { errorMessage } from "./useAuth.ts";

/**
 * `signIn` comes from AdminRoutes, not from a second useAuth() call: the hook
 * holds its own useState, so two callers would each get a different session
 * and a successful login would leave the panel signed out.
 */
export default function AdminLogin({
  signIn,
}: {
  signIn: (username: string, password: string) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(username, password);
      // No navigation needed: the panel renders as soon as the session lands.
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-cream-50 px-4 py-14 sm:px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-sm bg-maroon-700 text-sm font-bold text-paper">
            MS
          </span>
          <span className="text-lg font-bold">Admin panel</span>
        </div>

        <form onSubmit={submit} className="mt-6 rounded-sm border border-line bg-paper p-7">
          <Link
            to="/"
            className="btn btn-secondary w-full"
            aria-label="Back to the public site"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to site
          </Link>

          {/* Not a login for readers: the panel manages the site's content. */}
          <p
            role="note"
            className="mt-5 flex items-start gap-2 rounded-sm border border-marigold-600/35 bg-marigold-500/10 p-3 text-xs leading-relaxed text-ink-800"
          >
            <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-marigold-700" />
            <span>
              Administrators only. This sign-in is not for public visitors — nothing here is
              readable without an account.{" "}
              <Link to="/" className="font-semibold text-maroon-700 hover:text-maroon-800">
                Return to the site →
              </Link>
            </span>
          </p>

          <div className="mt-7 text-center">
            <h1 className="text-2xl">Sign in</h1>
            <p className="mt-2 text-sm text-muted">Manage books and verses.</p>
          </div>

          <div className="mt-7 space-y-4">
            <div>
              <label htmlFor="username" className="field-label">
                Username
              </label>
              <input
                id="username"
                name="username"
                required
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="field"
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={visible ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field pe-11"
                />
                <button
                  type="button"
                  onClick={() => setVisible((shown) => !shown)}
                  aria-label={visible ? "Hide password" : "Show password"}
                  aria-pressed={visible}
                  className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-muted hover:text-ink-800"
                >
                  {visible ? (
                    <EyeOff aria-hidden="true" className="size-4" />
                  ) : (
                    <Eye aria-hidden="true" className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" disabled={busy} className="btn btn-primary mt-7 w-full">
            <LogIn aria-hidden="true" className="size-4" />
            {busy ? "Signing in…" : "Sign in"}
          </button>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-sm border border-maroon-600/25 bg-maroon-700/5 p-3 text-sm font-medium text-maroon-700"
            >
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
