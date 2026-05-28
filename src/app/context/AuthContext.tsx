import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect, useRef } from "react";
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY } from "../lib/env";
import { apiFetch } from "../lib/api";

type UserRole = "docente" | "tutor" | "administrador";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  avatar?: string;
  phone?: string;
  area?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<Pick<User, "name" | "avatar" | "phone" | "area">>) => void;
  isAuthenticated: boolean;
  notice: { type: "success" | "error"; message: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type ApiLoginResponse = {
  token: string;
  user: {
    id: number | string;
    full_name: string;
    email: string;
    phone?: string | null;
    area?: string | null;
    avatar_url?: string | null;
    is_active?: boolean;
    roles?: Array<UserRole | string>;
  };
};

const normalizeRoles = (roles: Array<UserRole | string> | undefined): UserRole[] => {
  const normalizedRoles = (roles ?? []).filter((role): role is UserRole => role === "docente" || role === "tutor" || role === "administrador");
  return normalizedRoles.length > 0 ? normalizedRoles : ["docente"];
};

const mapApiUser = (apiUser: ApiLoginResponse["user"]): User => {
  const roles = normalizeRoles(apiUser.roles);
  const primaryRole = roles.includes("administrador")
    ? "administrador"
    : roles.includes("tutor")
      ? "tutor"
      : "docente";

  return {
    id: String(apiUser.id),
    name: apiUser.full_name,
    email: apiUser.email,
    role: primaryRole,
    roles,
    avatar: apiUser.avatar_url ?? undefined,
    phone: apiUser.phone ?? undefined,
    area: apiUser.area ?? undefined,
  };
};

export function AuthProvider(props: Readonly<{ children: ReactNode }>) {
  const { children } = props;
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
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
      flashNotice('success', 'Accediendo al sistema');
      setUser(apiUser);
    } catch (err: any) {
      // Normalize 422 (invalid credentials) to a friendly message and preserve status
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

  useEffect(() => {
    localStorage.removeItem("utslrc-user-profiles");

    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) return;

    (async () => {
      try {
        const payload = (await apiFetch('/auth/me', { method: 'GET' })) as { user: ApiLoginResponse['user'] };
        const apiUser = mapApiUser(payload.user);
        setUser(apiUser);
      } catch {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        setUser(null);
      }
    })();
  }, []);

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setUser(null);
    setNotice(null);
  };

  const updateProfile = (updates: Partial<Pick<User, "name" | "avatar" | "phone" | "area">>) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      return { ...currentUser, ...updates };
    });
  };

  const value = useMemo(
    () => ({ user, login, logout, updateProfile, isAuthenticated: !!user, notice }),
    [notice, user]
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
