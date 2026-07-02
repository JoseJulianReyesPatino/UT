import { useEffect, useState } from "react";
import { resolveApiAssetUrl, AUTH_TOKEN_STORAGE_KEY } from "./env";

const avatarUrlCache = new Map<string, string>();
const CACHE_CLEAR_EVENT = "ut-avatar-cache-cleared";

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
    const fullUrl = resolveApiAssetUrl(url) ?? url;

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
  // Limpiar también los object URLs creados con URL.createObjectURL
  avatarUrlCache.forEach((value) => {
    if (value.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(value);
      } catch {
        // Ignorar errores al revocar URLs
      }
    }
  });
  avatarUrlCache.clear();
  globalThis.window?.dispatchEvent(new CustomEvent(CACHE_CLEAR_EVENT));
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
    // Si no hay URL, retornar undefined inmediatamente
    if (!url || !isRenderableAvatarSource(url)) {
      return undefined;
    }

    // Para data URLs, retornar directamente sin procesar
    if (url.startsWith("data:") || url.startsWith("blob:")) {
      return url;
    }

    // Para URLs normales, usar getAvatarUrlWithTimestamp
    return getAvatarUrlWithTimestamp(url);
  });

  // Escuchar eventos de limpieza de caché
  useEffect(() => {
    const onCacheCleared = () => {
      setResolvedUrl(undefined);
      setCacheEpoch((v) => v + 1);
    };
    const win = globalThis.window;
    win?.addEventListener(CACHE_CLEAR_EVENT, onCacheCleared);
    return () => win?.removeEventListener(CACHE_CLEAR_EVENT, onCacheCleared);
  }, []);

  // Efecto principal para resolver la URL
  useEffect(() => {
    // Si no hay URL o no es renderizable, limpiar y salir
    if (!url || !isRenderableAvatarSource(url)) {
      setResolvedUrl(undefined);
      return;
    }

    // Para data URLs o blob URLs, usarlas directamente sin fetch
    if (url.startsWith("data:") || url.startsWith("blob:")) {
      setResolvedUrl(url);
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

    // Verificar caché
    const cachedUrl = avatarUrlCache.get(effectiveUrl);
    if (cachedUrl) {
      setResolvedUrl(cachedUrl);
      return;
    }

    // Si no es ruta protegida, usar timestamp
    if (!isProtectedAvatarRoute(effectiveUrl)) {
      setResolvedUrl(getAvatarUrlWithTimestamp(effectiveUrl));
      return;
    }

    // Para rutas protegidas, hacer fetch con autenticación
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

        if (!isActive) return;

        if (response.status === 404) {
          // Si el avatar no existe (404), limpiar la caché y no mostrar nada
          avatarUrlCache.delete(effectiveUrl);
          setResolvedUrl(undefined);
          return;
        }

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
      } catch (error) {
        if (!isActive) {
          return;
        }

        // Si el error es 404 o similar, no mostrar nada
        if (error instanceof Error && error.message.includes('404')) {
          setResolvedUrl(undefined);
          return;
        }

        // Como fallback, usar la URL con timestamp
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