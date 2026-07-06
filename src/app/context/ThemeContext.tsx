import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider(props: Readonly<{ children: ReactNode }>) {
  const { children } = props;
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof globalThis.window === "undefined") {
      return "dark";
    }

    const savedTheme = localStorage.getItem("theme") as Theme | null;
    return savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
  });

  // Cargar tema del localStorage al montar
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme("dark");
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const htmlElement = document.documentElement;
    if (newTheme === "dark") {
      htmlElement.classList.add("dark");
      htmlElement.dataset.theme = "dark";
    } else {
      htmlElement.classList.remove("dark");
      htmlElement.dataset.theme = "light";
    }
  };

  const updateTheme = (newTheme: Theme) => {
    const html = document.documentElement;
    html.classList.add("no-transitions");
    applyTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    setTheme(newTheme);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        html.classList.remove("no-transitions");
      });
    });
  };

  const toggleTheme = () => {
    updateTheme(theme === "dark" ? "light" : "dark");
  };

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme: updateTheme }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
