const avatarUrlCache = new Map<string, string>();

// Obtener la URL base del backend
const getBackendBaseUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
  const cleanUrl = apiUrl.replace(/\/api$/, '').replace(/\/$/, '');
  
  if (!cleanUrl) {
    return 'http://localhost:8000';
  }
  
  return cleanUrl;
};

// Función para obtener URL de avatar con timestamp (con caché persistente)
export const getAvatarUrlWithTimestamp = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  
  // Si es una data URL (base64), retornar tal cual
  if (url.startsWith('data:')) return url;
  
  // Si ya es una URL absoluta
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Verificar si ya tenemos una versión en caché
    if (avatarUrlCache.has(url)) {
      return avatarUrlCache.get(url);
    }
    
    // Si la URL ya tiene timestamp, usarla directamente
    if (url.includes('t=')) {
      avatarUrlCache.set(url, url);
      return url;
    }
    
    const separator = url.includes('?') ? '&' : '?';
    const urlWithTimestamp = `${url}${separator}t=${Date.now()}`;
    avatarUrlCache.set(url, urlWithTimestamp);
    return urlWithTimestamp;
  }
  
  // Si es una URL relativa
  if (url.startsWith('/')) {
    const baseUrl = getBackendBaseUrl();
    const fullUrl = `${baseUrl}${url}`;
    
    if (avatarUrlCache.has(fullUrl)) {
      return avatarUrlCache.get(fullUrl);
    }
    
    const separator = fullUrl.includes('?') ? '&' : '?';
    const urlWithTimestamp = `${fullUrl}${separator}t=${Date.now()}`;
    avatarUrlCache.set(fullUrl, urlWithTimestamp);
    return urlWithTimestamp;
  }
  
  return url;
};

// Función para limpiar la caché (llamar después de actualizar el avatar)
export const clearAvatarCache = () => {
  avatarUrlCache.clear();
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
  return value.startsWith('http') || 
         value.startsWith('https') ||
         value.startsWith('/api/users/') || 
         value.startsWith('/storage/') ||
         value.startsWith('data:');
};