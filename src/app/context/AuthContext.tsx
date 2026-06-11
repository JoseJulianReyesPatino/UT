import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect, useRef, useCallback } from "react";
import { AUTH_TOKEN_STORAGE_KEY, resolveApiAssetUrl } from "../lib/env";
import { apiFetch } from "../lib/api";
import { clearAvatarCache } from "../lib/avatar";

type UserRole = "docente" | "tutor" | "administrador";

interface User {
  id: string;
  name: string;
  firstNames?: string;
  lastNames?: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  avatar?: string;
  phone?: string;
  area?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<Pick<User, "name" | "firstNames" | "lastNames" | "avatar" | "phone" | "area">>) => void;
  refreshUser: () => Promise<User | null>;
  isAuthenticated: boolean;
  isReady: boolean;
  notice: { type: "success" | "error"; message: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type ApiRolePayload = string | { code?: string | null; name?: string | null };

type ApiLoginResponse = {
  token: string;
  user: {
    id: number | string;
    full_name: string;
    first_names?: string | null;
    last_names?: string | null;
    email: string;
    phone?: string | null;
    area?: string | null;
    avatar_url?: string | null;
    is_active?: boolean;
    created_at?: string | null;
    roles?: ApiRolePayload[];
  };
};

const normalizeRoleToken = (role: ApiRolePayload): string => {
  if (typeof role === "string") {
    return role.toLowerCase();
  }

  const code = role?.code?.toLowerCase().trim();
  if (code) return code;

  const name = role?.name?.toLowerCase().trim();
  return name ?? "";
};

const normalizeRoles = (roles: ApiRolePayload[] | undefined): UserRole[] => {
  const result: UserRole[] = [];
  (roles ?? []).forEach((r) => {
    const s = normalizeRoleToken(r);
    if (!s) return;

    if (s.includes('admin') || s.includes('administrador')) {
      if (!result.includes('administrador')) result.push('administrador');
      return;
    }

    if (s.includes('tutor')) {
      if (!result.includes('tutor')) result.push('tutor');
      return;
    }

    if (s.includes('docente') || s.includes('teacher')) {
      if (!result.includes('docente')) result.push('docente');
    }
  });

  return result.length > 0 ? result : ['docente'];
};

const splitNameParts = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstNames: fullName.trim(), lastNames: "" };
  }

  return {
    firstNames: parts.slice(0, -1).join(" "),
    lastNames: parts.slice(-1).join(" "),
  };
};

const profileCacheKey = (userId: string) => `utslrc-profile:${userId}`;
const defaultProfileAvatar = "/src/assets/profile.webp";

const loadCachedProfile = (userId: string) => {
  try {
    const raw = localStorage.getItem(profileCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Pick<User, "firstNames" | "lastNames" | "avatar">>;
    return parsed;
  } catch {
    return null;
  }
};

const saveCachedProfile = (user: User) => {
  let avatarToCache = "";
  if (user.avatar && !user.avatar.startsWith("data:") && user.avatar.length <= 2000) {
    avatarToCache = user.avatar;
  }

  localStorage.setItem(
    profileCacheKey(user.id),
    JSON.stringify({
      firstNames: user.firstNames ?? "",
      lastNames: user.lastNames ?? "",
      avatar: avatarToCache,
    }),
  );
};

const removeCachedProfile = (userId: string) => {
  localStorage.removeItem(profileCacheKey(userId));
};

const mapApiUser = (apiUser: ApiLoginResponse["user"]): User => {
  const roles = normalizeRoles(apiUser.roles);
  const primaryRole = roles.includes("administrador")
    ? "administrador"
    : roles.includes("tutor")
      ? "tutor"
      : "docente";
  const apiNames = {
    firstNames: apiUser.first_names?.trim() ?? "",
    lastNames: apiUser.last_names?.trim() ?? "",
  };
  const fallbackNames = splitNameParts(apiUser.full_name);
  const cachedProfile = loadCachedProfile(String(apiUser.id));

  const avatarUrl = apiUser.avatar_url && apiUser.avatar_url !== "/api/default-avatar"
    ? resolveApiAssetUrl(apiUser.avatar_url)
    : cachedProfile?.avatar && cachedProfile.avatar !== "/api/default-avatar"
      ? resolveApiAssetUrl(cachedProfile.avatar)
      : defaultProfileAvatar;

  return {
    id: String(apiUser.id),
    name: apiUser.full_name,
    firstNames: apiNames.firstNames || cachedProfile?.firstNames || fallbackNames.firstNames,
    lastNames: apiNames.lastNames || cachedProfile?.lastNames || fallbackNames.lastNames,
    email: apiUser.email,
    role: primaryRole,
    roles,
    avatar: avatarUrl,
    phone: apiUser.phone ?? undefined,
    area: apiUser.area ?? undefined,
    createdAt: apiUser.created_at ?? undefined,
  };
};

export function AuthProvider(props: Readonly<{ children: ReactNode }>) {
  const { children } = props;
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const noticeTimerRef = useRef<number | null>(null);

  const flashNotice = (type: "success" | "error", message: string) => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }

    setNotice({ type, message });
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 2600);
  };

  const login = async (email: string, password: string) => {
    try {
      localStorage.removeItem("utslrc-user-profiles");
      const payload = (await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })) as ApiLoginResponse;

      const apiUser = mapApiUser(payload.user);
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, payload.token);
      saveCachedProfile(apiUser);
      flashNotice('success', 'Accediendo al sistema');
      setUser(apiUser);
    } catch (err: any) {
      if (err && err.status === 422) {
        flashNotice('error', 'Correo o contraseña inválidos');
        const e = new Error('Correo o contraseña inválidos');
        (e as any).status = 422;
        throw e;
      }
      flashNotice('error', err instanceof Error ? err.message : 'No fue posible iniciar sesión');
      throw err;
    }
  };

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) {
      return null;
    }

    try {
      const payload = (await apiFetch('/auth/me', { method: 'GET' })) as { user: ApiLoginResponse['user'] };
      const apiUser = mapApiUser(payload.user);
      setUser(apiUser);
      saveCachedProfile(apiUser);
      
      // Disparar evento de actualización de usuario
      window.dispatchEvent(new CustomEvent('ut-user-updated', { detail: { user: apiUser } }));
      
      return apiUser;
    } catch (error) {
      console.error('Error refreshing user:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    localStorage.removeItem("utslrc-user-profiles");

    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) {
      setIsReady(true);
      return;
    }

    (async () => {
      try {
        const payload = (await apiFetch('/auth/me', { method: 'GET' })) as { user: ApiLoginResponse['user'] };
        const apiUser = mapApiUser(payload.user);
        setUser(apiUser);
        saveCachedProfile(apiUser);
      } catch {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        setUser(null);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const logout = () => {
    if (user) {
      removeCachedProfile(user.id);
    }
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setUser(null);
    setNotice(null);
    clearAvatarCache();
  };

  const updateProfile = useCallback((updates: Partial<Pick<User, "name" | "firstNames" | "lastNames" | "avatar" | "phone" | "area">>) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      
      const nextUser = { ...currentUser, ...updates };
      saveCachedProfile(nextUser);
      return nextUser;
    });
  }, []);

  const value = useMemo(
    () => ({ 
      user, 
      login, 
      logout, 
      updateProfile, 
      refreshUser,
      isAuthenticated: !!user, 
      isReady, 
      notice 
    }),
    [isReady, notice, user, updateProfile, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}