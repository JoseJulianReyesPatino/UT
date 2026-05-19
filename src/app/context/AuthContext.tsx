import React, { createContext, useContext, useState, ReactNode, useMemo } from "react";

type UserRole = "docente" | "administrador";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider(props: Readonly<{ children: ReactNode }>) {
  const { children } = props;
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const mockUser: User = email.includes("admin")
      ? {
          id: "1",
          name: "Mtra. María González",
          email: email,
          role: "administrador",
        }
      : {
          id: "2",
          name: "Mtro. Juan Pérez",
          email: email,
          role: "docente",
        };
    
    setUser(mockUser);
  };

  const logout = () => {
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, login, logout, isAuthenticated: !!user }),
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
