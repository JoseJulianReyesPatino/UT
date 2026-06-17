type ViteEnv = {
  VITE_API_URL?: string;
  VITE_API_BASE_URL?: string;
  VITE_API_PUBLIC_URL?: string;
  VITE_API_LOCAL_URL?: string;
  VITE_API_MODE?: "auto" | "public" | "local";
  VITE_API_FALLBACK_URLS?: string;
};

const runtimeEnv = (import.meta as unknown as { env?: ViteEnv }).env ?? {};

const normalizeBaseUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
};

const unique = (values: Array<string | null | undefined>) => {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (!out.includes(value)) out.push(value);
  }
  return out;
};

const configuredPrimary = normalizeBaseUrl(
  runtimeEnv.VITE_API_URL ?? runtimeEnv.VITE_API_BASE_URL,
);
const configuredPublic = normalizeBaseUrl(runtimeEnv.VITE_API_PUBLIC_URL);
const configuredLocal = normalizeBaseUrl(runtimeEnv.VITE_API_LOCAL_URL);
const configuredFallbacks = unique(
  (runtimeEnv.VITE_API_FALLBACK_URLS ?? "")
    .split(",")
    .map((entry) => normalizeBaseUrl(entry)),
);

const mode = (runtimeEnv.VITE_API_MODE ?? "auto").toLowerCase() as
  | "auto"
  | "public"
  | "local";

const candidatesByMode = () => {
  const defaultLocal = "http://localhost:8000/api";

  if (mode === "public") {
    return unique([
      configuredPublic,
      configuredPrimary,
      ...configuredFallbacks,
      configuredLocal,
      defaultLocal,
    ]);
  }

  if (mode === "local") {
    return unique([
      configuredLocal,
      configuredPrimary,
      ...configuredFallbacks,
      configuredPublic,
      defaultLocal,
    ]);
  }

  // auto: prefer public endpoint if defined, then explicit primary, then local.
  return unique([
    configuredPublic,
    configuredPrimary,
    ...configuredFallbacks,
    configuredLocal,
    defaultLocal,
  ]);
};

export const API_BASE_URL_CANDIDATES = candidatesByMode();

export const API_BASE_URL =
  API_BASE_URL_CANDIDATES[0] ?? "http://localhost:8000/api";

const apiOrigin = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL;
  }
})();

export const AUTH_TOKEN_STORAGE_KEY = "utslrc-auth-token";

export const resolveApiAssetUrl = (value?: string | null) => {
  if (!value) return undefined;

  // Si ya es una URL completa, devolverla directamente
  if (
    /^https?:\/\//i.test(value) ||
    /^data:/i.test(value) ||
    /^blob:/i.test(value)
  ) {
    return value;
  }

  // Rutas servidas por Vite en el frontend
  if (
    value.startsWith("/assets/") ||
    value.startsWith("/src/assets/") ||
    value.includes("?import")
  ) {
    return value;
  }

  let correctedValue = value;
  if (correctedValue.startsWith("/storage/uploads/avatars/")) {
    correctedValue = correctedValue.replace(
      "/storage/uploads/avatars/",
      "/uploads/avatars/",
    );
  }

  // Si es una ruta relativa, construirla con el origen correcto
  if (correctedValue.startsWith("/")) {
    return `${apiOrigin}${correctedValue}`;
  }

  return `${apiOrigin}/${correctedValue}`;
};

console.log("[env] API mode:", mode);
console.log("[env] API candidates:", API_BASE_URL_CANDIDATES);
console.log("[env] API_BASE_URL:", API_BASE_URL);
console.log("[env] apiOrigin:", apiOrigin);
