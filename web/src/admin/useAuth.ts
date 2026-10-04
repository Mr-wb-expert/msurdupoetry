import { useCallback, useEffect, useState } from "react";

import { login, logout, me } from "@/lib/api.ts";

export type Session = { username: string } | null;

type AuthState = {
  session: Session;
  /** True until the first answer arrives, so the router does not bounce a
      signed-in admin to the login page on every hard refresh. */
  checking: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

/**
 * Admin session, held in a cookie the browser will not show JavaScript.
 *
 * There is deliberately no token in React state or localStorage: the whole
 * reason the API issues an httpOnly cookie is so that nothing on the page can
 * read the credential.
 */
export function useAuth(): AuthState {
  const [session, setSession] = useState<Session>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let live = true;
    me().then(
      (result) => live && setSession(result),
      // A server that cannot be reached leaves the session unknown, which is
      // treated as signed out. The login screen will show the real error.
      () => live && setSession(null),
    ).finally(() => live && setChecking(false));
    return () => {
      live = false;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    setSession(await login(username, password));
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      // The cookie is cleared locally whatever the server says, so a failed
      // request cannot strand the admin in a signed-in-looking interface.
      setSession(null);
    }
  }, []);

  return { session, checking, signIn, signOut };
}

/** Throws with a message the form can display. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}