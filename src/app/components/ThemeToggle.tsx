import { useTheme } from "@/app/context/ThemeContext";
import { Button } from "@/app/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDarkTheme = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative overflow-hidden rounded-full transition-colors duration-300 ease-out"
      title={`Cambiar a modo ${theme === "dark" ? "claro" : "oscuro"}`}
    >
      <Sun
        className={`absolute h-[1.2rem] w-[1.2rem] transition-all duration-300 ease-out motion-reduce:transition-none ${isDarkTheme ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-45 opacity-0"}`}
      />
      <Moon
        className={`absolute h-[1.2rem] w-[1.2rem] transition-all duration-300 ease-out motion-reduce:transition-none ${isDarkTheme ? "scale-75 rotate-45 opacity-0" : "scale-100 rotate-0 opacity-100"}`}
      />
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}
