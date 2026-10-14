/**
 * The only place that talks to the API.
 *
 * `credentials: "include"` on every call is what carries the admin session
 * cookie. It is not optional: without it the browser silently drops the cookie
 * and every admin write fails with a 401 that looks like a permissions problem
 * rather than a missing option.
 */

import type { Book, Poem, Poet, PoetDetail, Review, Video } from "./types.ts";

const BASE = "/api";

/** A message the UI can show verbatim, rather than a status code. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export function clearApiCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isGet = !init?.method || init.method.toUpperCase() === "GET";
  const now = Date.now();

  // Return cached result if fresh
  if (isGet && cache.has(path)) {
    const entry = cache.get(path)!;
    if (now - entry.timestamp < CACHE_TTL_MS) {
      return entry.data as T;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      credentials: "include",
      ...init,
      headers:
        init?.body instanceof FormData
          ? init.headers
          : { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    // A network-level failure. Distinguish it from a 4xx so the UI can say
    // "the server is unreachable" instead of "that request was rejected".
    throw new ApiError(0, "Could not reach the server. Check your connection.");
  }

  if (response.status === 204) return undefined as T;

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      typeof detail?.detail === "string" ? detail.detail : `Request failed (${response.status}).`,
    );
  }

  const result = (await response.json()) as T;

  // Cache successful GET responses
  if (isGet) {
    cache.set(path, { data: result, timestamp: now });
  }

  return result;
}

/** A missing row is an answer, not a failure, so it returns null. */
async function readOrNull<T>(path: string): Promise<T | null> {
  try {
    return await request<T>(path);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/* ---------------------------------------------------------------- */
/* Public                                                            */
/* ---------------------------------------------------------------- */

export const getBooks = () => request<Book[]>("/books");
export const getBook = (slug: string) =>
  readOrNull<Book>(`/books/${encodeURIComponent(slug)}`);
export const getPoems = (fresh = false) =>
  request<Poem[]>(`/poems${fresh ? `?t=${Date.now()}` : ""}`);
export const getPoet = (slug: string) => request<PoetDetail>(`/poets/${encodeURIComponent(slug)}`);
export const getPoets = () => request<Poet[]>("/poets");
export const getPoem = (slug: string) =>
  readOrNull<Poem>(`/poems/${encodeURIComponent(slug)}`);
export const getVideos = () => request<Video[]>("/videos");
export const getReviews = (limit = 12) => request<Review[]>(`/reviews?limit=${limit}`);
export const getReviewsForBook = (slug: string) =>
  request<Review[]>(`/books/${encodeURIComponent(slug)}/reviews`);

export async function postReview(payload: {
  bookSlug: string;
  name: string;
  body: string;
  website: string;
}): Promise<string> {
  const result = await request<{ detail: string }>("/reviews", {
    method: "POST",
    body: JSON.stringify({
      book_slug: payload.bookSlug,
      name: payload.name,
      body: payload.body,
      website: payload.website,
    }),
  });
  return result.detail;
}

/* ---------------------------------------------------------------- */
/* Session                                                           */
/* ---------------------------------------------------------------- */

export const login = (username: string, password: string) =>
  request<{ username: string }>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const logout = () => request<{ detail: string }>("/admin/logout", { method: "POST" });

/** Resolves to null when signed out. Never throws for "not signed in". */
export const me = () => readOrNull<{ username: string }>("/admin/me");

/* ---------------------------------------------------------------- */
/* Admin CRUD                                                        */
/* ---------------------------------------------------------------- */

export const createBook = async (payload: unknown) => {
  const res = await request<Book>("/admin/books", { method: "POST", body: JSON.stringify(payload) });
  clearApiCache("/books");
  return res;
};

export const updateBook = async (slug: string, payload: unknown) => {
  const res = await request<Book>(`/admin/books/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  clearApiCache("/books");
  return res;
};

export const deleteBook = async (slug: string) => {
  const res = await request<{ ok: boolean }>(`/admin/books/${encodeURIComponent(slug)}`, { method: "DELETE" });
  clearApiCache("/books");
  return res;
};

export const createPoem = async (payload: unknown) => {
  const res = await request<Poem>("/admin/poems", { method: "POST", body: JSON.stringify(payload) });
  clearApiCache("/poems");
  clearApiCache("/poets");
  return res;
};

export const updatePoem = async (slug: string, payload: unknown) => {
  const res = await request<Poem>(`/admin/poems/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  clearApiCache("/poems");
  clearApiCache("/poets");
  return res;
};

export const deletePoem = async (slug: string) => {
  const res = await request<{ ok: boolean }>(`/admin/poems/${encodeURIComponent(slug)}`, { method: "DELETE" });
  clearApiCache("/poems");
  clearApiCache("/poets");
  return res;
};

export const createVideo = (payload: unknown) =>
  request<Video>("/admin/videos", { method: "POST", body: JSON.stringify(payload) });

export const updateVideo = (id: number, payload: unknown) =>
  request<Video>(`/admin/videos/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export const deleteVideo = (id: number) =>
  request<{ ok: boolean }>(`/admin/videos/${id}`, { method: "DELETE" });

/**
 * Upload a cover. The filename is sent through untouched because the server
 * replaces it with a generated one — it only needs the extension.
 */
export function uploadCover(slug: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<Book>(`/admin/books/${encodeURIComponent(slug)}/cover`, {
    method: "POST",
    body: form,
  });
}