type ViteEnv = {
  VITE_API_URL?: string;
  VITE_API_BASE_URL?: string;
};

const runtimeEnv = (import.meta as unknown as { env?: ViteEnv }).env ?? {};

export const API_BASE_URL =
  runtimeEnv.VITE_API_URL ??
  runtimeEnv.VITE_API_BASE_URL ??
  "http://localhost:8000/api";

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

console.log("[env] API_BASE_URL:", API_BASE_URL);
console.log("[env] apiOrigin:", apiOrigin);
