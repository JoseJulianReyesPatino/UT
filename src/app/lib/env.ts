type ViteEnv = {
  VITE_API_URL?: string;  // Cambiado de VITE_API_BASE_URL a VITE_API_URL
  VITE_API_BASE_URL?: string; // Mantener por compatibilidad
};

const runtimeEnv = (import.meta as unknown as { env?: ViteEnv }).env ?? {};

// Priorizar VITE_API_URL, luego VITE_API_BASE_URL, luego el default
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
  
  // Si ya es una URL completa (http o https), devolverla directamente
  if (/^https?:\/\//i.test(value) || /^\/\//.test(value)) {
    return value;
  }
  
  // Si es una ruta relativa, construirla con el origen correcto
  // IMPORTANTE: Usar apiOrigin que ya tiene el protocolo correcto
  if (value.startsWith("/")) {
    return `${apiOrigin}${value}`;
  }
  
  return `${apiOrigin}/${value}`;
};

// Para depuración - puedes eliminar después
console.log('[env] API_BASE_URL:', API_BASE_URL);
console.log('[env] apiOrigin:', apiOrigin);