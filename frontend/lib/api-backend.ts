import type { NextRequest } from "next/server";

/** Matches `frontend/app/actions/auth.ts` — Django REST base including `/api`. */
export function getBackendApiBase(): string {
  const u =
    process.env.API_URL ??
    process.env.BACKEND_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000/api";
  return u.replace(/\/$/, "");
}

/** When true, route handlers forward to Django (or any server) at `getBackendApiBase()` first. */
export function shouldProxyToBackend(): boolean {
  const v = process.env.API_BACKEND_PROXY?.toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Proxies the incoming request to `${API_URL}/<suffix>`.
 * `suffix` must not start with `/api` if your base already ends with `/api`.
 */
export async function proxyToBackend(
  req: NextRequest,
  suffix: string,
): Promise<Response | null> {
  if (!shouldProxyToBackend()) return null;
  const base = getBackendApiBase();
  const path = suffix.replace(/^\/+/, "");
  const url = `${base}/${path}`;
  try {
    const headers = new Headers();
    req.headers.forEach((value: string, key: string) => {
      const k = key.toLowerCase();
      if (k === "host" || k === "connection") return;
      headers.set(key, value);
    });
    const init: RequestInit & { duplex?: "half" } = {
      method: req.method,
      headers,
      signal: AbortSignal.timeout(120_000),
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = req.body;
      init.duplex = "half";
    }
    return await fetch(url, init);
  } catch {
    return null;
  }
}
