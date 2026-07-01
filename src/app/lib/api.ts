import {
  API_BASE_URL,
  API_BASE_URL_CANDIDATES,
  AUTH_TOKEN_STORAGE_KEY,
} from "./env";
import { toast } from "sonner";

type FetchOptions = RequestInit & {
  query?: Record<string, string | number | boolean>;
};

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean>,
) {
  const base = path.startsWith("http")
    ? path
    : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  if (!query || Object.keys(query).length === 0) return base;
  const u = new URL(base);
  Object.entries(query).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  return u.toString();
}

const parseResponseBody = async (res: Response) => {
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  return { text, json };
};

export async function apiFetch(path: string, options: FetchOptions = {}) {
  const method = (options.method ?? "GET").toUpperCase();
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

  // FIXED: No establecer Content-Type automáticamente si es FormData
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
    ...(options.headers as Record<string, string>),
  };

  // Solo agregar Content-Type si NO es FormData (el navegador lo setea automáticamente para FormData)
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const candidateBases = path.startsWith("http")
    ? [API_BASE_URL]
    : API_BASE_URL_CANDIDATES.length > 0
      ? API_BASE_URL_CANDIDATES
      : [API_BASE_URL];

  let lastError: any = null;

  for (let index = 0; index < candidateBases.length; index += 1) {
    const base = candidateBases[index];
    const isLastCandidate = index === candidateBases.length - 1;
    const url = buildUrl(base, path, options.query);

    try {
      const res = await fetch(url, {
        ...options,
        method,
        mode: "cors",
        credentials: "include",
        headers,
      });
      const { json } = await parseResponseBody(res);

      if (!res.ok) {
        const message = json?.message ?? res.statusText ?? "Error";
        const errors = json?.errors ?? undefined;
        const err: any = new Error(message);
        err.status = res.status;
        err.baseUrl = base;
        if (errors) err.errors = errors;

        // Retry only on server-side issues when another base URL exists.
        if (!isLastCandidate && res.status >= 500) {
          lastError = err;
          continue;
        }

        throw err;
      }

      return json;
    } catch (error: any) {
      const isOfflineNetwork =
        typeof window !== "undefined" && !window.navigator.onLine;
      error.isOffline = error.isOffline || isOfflineNetwork;

      const isNetworkError = !error?.status;
      
      if (!isLastCandidate && isNetworkError) {
        lastError = error;
        continue;
      }
      console.error("API Fetch Error:", error);
      throw error;
    }
  }

  throw (
    lastError ?? new Error("No fue posible conectar con la API configurada")
  );
}

export default apiFetch;