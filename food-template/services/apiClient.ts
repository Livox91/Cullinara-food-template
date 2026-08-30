export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

interface Envelope<T> { data: T; meta?: Record<string, unknown> }

export async function apiRequest<T>(path: string, init: RequestInit = {}, redirectOnUnauthorized = true): Promise<T> {
  const response = await fetch(`/api/backend/${path.replace(/^\//, "")}`, {
    ...init,
    cache: "no-store",
    headers: { accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers },
  });
  const payload = await response.json().catch(() => null) as (Envelope<T> & { error?: { code?: string; message?: string } }) | null;
  if (!response.ok) {
    if (response.status === 401 && redirectOnUnauthorized && typeof window !== "undefined") {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`${window.location.pathname.startsWith("/business") ? "/business/login" : "/login"}?next=${next}`);
    }
    throw new ApiError(payload?.error?.message ?? `Request failed (${response.status}).`, response.status, payload?.error?.code);
  }
  return payload!.data;
}

export async function publicApiRequest<T>(path: string): Promise<T> {
  const response = await fetch(`/api/public/${path.replace(/^\//, "")}`, { cache: "no-store", headers: { accept: "application/json" } });
  const payload = await response.json().catch(() => null) as (Envelope<T> & { error?: { message?: string } }) | null;
  if (!response.ok) throw new ApiError(payload?.error?.message ?? `Request failed (${response.status}).`, response.status);
  return payload!.data;
}

export function jsonBody(value: unknown): RequestInit {
  return { body: JSON.stringify(value) };
}
