import React, { createContext, useContext, useState, ReactNode, useMemo } from "react";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_PROFILE_STORAGE_KEY = "utslrc-user-profiles";

const getStoredProfiles = (): Record<string, Partial<User>> => {
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<User>>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const setStoredProfiles = (profiles: Record<string, Partial<User>>) => {
  localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profiles));
};

export function AuthProvider(props: Readonly<{ children: ReactNode }>) {
  const { children } = props;
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const normalizedEmail = email.trim().toLowerCase();

    const mockUser: User = normalizedEmail === "docente1@universidad.edu" || normalizedEmail === "docente@universidad.edu"
      ? {
          id: "3",
          name: "Mtro. Docente 1",
          email: email,
          role: "docente",
          roles: ["docente"],
        }
      : normalizedEmail === "docente2@universidad.edu" || normalizedEmail === "tutor.docente@universidad.edu"
      ? {
          id: "3",
          name: "Dra. Docente 2",
          email: email,
          role: "docente",
          roles: ["docente", "tutor"],
        }
      : normalizedEmail.includes("admin")
      ? {
          id: "1",
          name: "Esmeralda Torres",
          email: email,
          role: "administrador",
          roles: ["administrador"],
        }
      : normalizedEmail.includes("tutor")
      ? {
          id: "2",
          name: "Mtro. Juan Pérez",
          email: email,
          role: "tutor",
          roles: ["tutor"],
        }
      : {
          id: "3",
          name: "Mtro. Juan Pérez",
          email: email,
          role: "docente",
          roles: ["docente"],
        };
    
    const storedProfiles = getStoredProfiles();
    const savedProfile = storedProfiles[email] ?? {};
    setUser({ ...mockUser, ...savedProfile, email, roles: savedProfile.roles ?? mockUser.roles });
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = (updates: Partial<Pick<User, "name" | "avatar" | "phone" | "area">>) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      const nextUser = { ...currentUser, ...updates };
      const storedProfiles = getStoredProfiles();
      storedProfiles[currentUser.email] = {
        ...storedProfiles[currentUser.email],
        name: nextUser.name,
        avatar: nextUser.avatar,
        phone: nextUser.phone,
        area: nextUser.area,
      };
      setStoredProfiles(storedProfiles);
      return nextUser;
    });
  };

  const value = useMemo(
    () => ({ user, login, logout, updateProfile, isAuthenticated: !!user }),
    [user]
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
