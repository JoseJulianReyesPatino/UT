import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY } from "./env";

type FetchOptions = RequestInit & {
  query?: Record<string, string | number | boolean>;
};

function buildUrl(
  path: string,
  query?: Record<string, string | number | boolean>,
) {
  const base = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  if (!query || Object.keys(query).length === 0) return base;
  const u = new URL(base);
  Object.entries(query).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  return u.toString();
}

export async function apiFetch(path: string, options: FetchOptions = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (API_BASE_URL.includes("ngrok-free.dev")) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = buildUrl(path, options.query);

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore parse errors
  }

  if (!res.ok) {
    const message =
      json && json.message ? json.message : res.statusText || "Error";
    const errors = json && json.errors ? json.errors : undefined;
    const err: any = new Error(message);
    err.status = res.status;
    if (errors) err.errors = errors;
    throw err;
  }

  return json;
}

export default apiFetch;
