export const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

export const ANALYSIS_API_BASE = `${API_ORIGIN}/api/analysis`;

/** Merge optional backend API key (exposed in bundle — use only for demos or with a public key). */
export function buildFetchInit(options = {}) {
  const headers = { ...(options.headers || {}) };
  if (import.meta.env.VITE_BACKEND_API_KEY) {
    headers["X-Backend-Api-Key"] = import.meta.env.VITE_BACKEND_API_KEY;
  }
  return { ...options, headers };
}

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, buildFetchInit(options));
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }
  return data;
}
