/**
 * The only place that talks to the API.
 *
 * `credentials: "include"` on every call is what carries the admin session
 * cookie. It is not optional: without it the browser silently drops the cookie
 * and every admin write fails with a 401 that looks like a permissions problem
 * rather than a missing option.
 */

import type { Book, Poem, Review, Video } from "./types.ts";

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
  return (await response.json()) as T;
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
export const getPoems = () => request<Poem[]>("/poems");
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

export const createBook = (payload: unknown) =>
  request<Book>("/admin/books", { method: "POST", body: JSON.stringify(payload) });

export const updateBook = (slug: string, payload: unknown) =>
  request<Book>(`/admin/books/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteBook = (slug: string) =>
  request<{ ok: boolean }>(`/admin/books/${encodeURIComponent(slug)}`, { method: "DELETE" });

export const createPoem = (payload: unknown) =>
  request<Poem>("/admin/poems", { method: "POST", body: JSON.stringify(payload) });

export const updatePoem = (slug: string, payload: unknown) =>
  request<Poem>(`/admin/poems/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deletePoem = (slug: string) =>
  request<{ ok: boolean }>(`/admin/poems/${encodeURIComponent(slug)}`, { method: "DELETE" });

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