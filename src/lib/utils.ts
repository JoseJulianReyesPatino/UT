import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatGroupCode(code?: string | null) {
  if (!code) return "-";
  return String(code).replace(/_/g, "-").trim();
}
