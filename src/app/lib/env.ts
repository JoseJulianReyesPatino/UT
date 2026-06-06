type ViteEnv = {
  VITE_API_BASE_URL?: string;
};

const runtimeEnv = (import.meta as unknown as { env?: ViteEnv }).env ?? {};

export const API_BASE_URL =
  runtimeEnv.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

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
  if (/^https?:\/\//i.test(value) || /^\/\//.test(value)) {
    return value;
  }
  if (value.startsWith("/")) {
    return `${apiOrigin}${value}`;
  }
  return `${apiOrigin}/${value}`;
};
