/**
 * Loading state for API reads.
 *
 * The request is abandoned if the component unmounts or the deps change again
 * before it resolves, so a slow response can never overwrite a newer one.
 */

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "./api.ts";

type State<T> = { data: T | null; error: string | null; loading: boolean };

export function useApi<T>(
  load: () => Promise<T>,
  deps: unknown[] = [],
  /** When false the loader is never called and the state stays idle. Lets a
      create form share this hook without fetching a record that cannot exist. */
  enabled = true,
): State<T> & { reload: () => void } {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: enabled });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    load().then(
      (data) => live && setState({ data, error: null, loading: false }),
      (error: unknown) =>
        live &&
        setState({
          data: null,
          error: error instanceof ApiError ? error.message : "Something went wrong.",
          loading: false,
        }),
    );
    return () => {
      live = false;
    };
    // `load` is intentionally not a dependency: callers pass an inline closure,
    // which changes identity every render and would refetch forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled]);

  return { ...state, reload };
}