type ViteEnv = {
  VITE_API_BASE_URL?: string;
};

const runtimeEnv = (import.meta as unknown as { env?: ViteEnv }).env ?? {};

export const API_BASE_URL =
  runtimeEnv.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";
export const AUTH_TOKEN_STORAGE_KEY = "utslrc-auth-token";
