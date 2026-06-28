import { useEffect, useState } from "react";
import { resolveApiAssetUrl, AUTH_TOKEN_STORAGE_KEY } from "./env";

const avatarUrlCache = new Map<string, string>();
const CACHE_CLEAR_EVENT = "ut-avatar-cache-cleared";

// Obtener la URL base del backend
const getBackendBaseUrl = (): string => {
  const apiUrl =
    import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";
  const cleanUrl = apiUrl.replace(/\/api$/, "").replace(/\/$/, "");

  if (!cleanUrl) {
    return "http://localhost:8000";
  }

  return cleanUrl;
};

// Función para obtener URL de avatar con timestamp (con caché persistente)
export const getAvatarUrlWithTimestamp = (
  url?: string | null,
): string | undefined => {
  if (!url) return undefined;

  // Si es una data URL (base64), retornar tal cual
  if (url.startsWith("data:")) return url;

  if (
    url.startsWith("/assets/") ||
    url.startsWith("/src/assets/") ||
    url.includes("?import")
  ) {
    return url;
  }

  // Si ya es una URL absoluta
  if (url.startsWith("http://") || url.startsWith("https://")) {
    // Verificar si ya tenemos una versión en caché
    if (avatarUrlCache.has(url)) {
      return avatarUrlCache.get(url);
    }

    // Si la URL ya tiene timestamp, usarla directamente
    if (url.includes("t=")) {
      avatarUrlCache.set(url, url);
      return url;
    }

    const separator = url.includes("?") ? "&" : "?";
    const urlWithTimestamp = `${url}${separator}t=${Date.now()}`;
    avatarUrlCache.set(url, urlWithTimestamp);
    return urlWithTimestamp;
  }

  // Si es una URL relativa — usar resolveApiAssetUrl para obtener el origen correcto (ngrok/local)
  if (url.startsWith("/")) {
    const fullUrl = resolveApiAssetUrl(url) ?? `${getBackendBaseUrl()}${url}`;

    if (avatarUrlCache.has(fullUrl)) {
      return avatarUrlCache.get(fullUrl);
    }

    const separator = fullUrl.includes("?") ? "&" : "?";
    const urlWithTimestamp = `${fullUrl}${separator}t=${Date.now()}`;
    avatarUrlCache.set(fullUrl, urlWithTimestamp);
    return urlWithTimestamp;
  }

  return url;
};

// Función para limpiar la caché (llamar después de actualizar el avatar)
export const clearAvatarCache = () => {
  avatarUrlCache.clear();
  window.dispatchEvent(new CustomEvent(CACHE_CLEAR_EVENT));
};

// Función para obtener iniciales de un nombre
export const getInitials = (name?: string): string => {
  if (!name) return "U";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  const firstInitial = parts[0].charAt(0).toUpperCase();
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();

  return `${firstInitial}${lastInitial}`;
};

// Función para verificar si es una URL de imagen
export const isImageUrl = (value?: string | null): boolean => {
  if (!value) return false;
  return (
    value.startsWith("http") ||
    value.startsWith("https") ||
    value.startsWith("/api/users/") ||
    value.startsWith("/assets/") ||
    value.startsWith("/uploads/") ||
    value.startsWith("uploads/") ||
    value.startsWith("/storage/") ||
    value.startsWith("data:")
  );
};

const isProtectedAvatarRoute = (value: string) =>
  value.startsWith("/api/users/") || value.startsWith("/uploads/");

const isRenderableAvatarSource = (value: string) => {
  return (
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/")
  );
};

const toFetchHeaders = () => {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

export const useResolvedAvatarUrl = (
  url?: string | null,
): string | undefined => {
  const [cacheEpoch, setCacheEpoch] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(() => {
    if (!url || !isRenderableAvatarSource(url)) {
      return undefined;
    }

    return url.startsWith("data:") ||
      url.startsWith("blob:") ||
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("/")
      ? getAvatarUrlWithTimestamp(url)
      : undefined;
  });

  useEffect(() => {
    const onCacheCleared = () => {
      setResolvedUrl(undefined);
      setCacheEpoch((v) => v + 1);
    };
    window.addEventListener(CACHE_CLEAR_EVENT, onCacheCleared);
    return () => window.removeEventListener(CACHE_CLEAR_EVENT, onCacheCleared);
  }, []);

  useEffect(() => {
    if (!url || !isRenderableAvatarSource(url)) {
      setResolvedUrl(undefined);
      return;
    }

    if (url.startsWith("data:") || url.startsWith("blob:")) {
      setResolvedUrl(getAvatarUrlWithTimestamp(url));
      return;
    }

    // Para URLs absolutas http/https, extraer el path y verificar si es ruta protegida
    let effectiveUrl = url;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      try {
        const parsed = new URL(url);
        const path = parsed.pathname;
        if (!isProtectedAvatarRoute(path)) {
          setResolvedUrl(getAvatarUrlWithTimestamp(url));
          return;
        }
        effectiveUrl = path; // usar solo el path para el fetch autenticado
      } catch {
        setResolvedUrl(getAvatarUrlWithTimestamp(url));
        return;
      }
    }

    const cachedUrl = avatarUrlCache.get(effectiveUrl);
    if (cachedUrl) {
      setResolvedUrl(cachedUrl);
      return;
    }

    if (!isProtectedAvatarRoute(effectiveUrl)) {
      setResolvedUrl(getAvatarUrlWithTimestamp(effectiveUrl));
      return;
    }

    let isActive = true;
    const abortController = new AbortController();
    const absoluteUrl = resolveApiAssetUrl(effectiveUrl) ?? effectiveUrl;

    (async () => {
      try {
        const response = await fetch(absoluteUrl, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            ...toFetchHeaders(),
            "ngrok-skip-browser-warning": "true",
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Avatar fetch failed: ${response.status}`);
        }

        const blob = await response.blob();
        if (!isActive) {
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        avatarUrlCache.set(effectiveUrl, objectUrl);
        setResolvedUrl(objectUrl);
      } catch {
        if (!isActive) {
          return;
        }

        setResolvedUrl(getAvatarUrlWithTimestamp(effectiveUrl));
      }
    })();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [url, cacheEpoch]);

  return resolvedUrl;
};
