import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Small numeric helper
export function clamp(value: number, min: number, max: number) {
  if (min > max) [min, max] = [max, min];
  return Math.min(max, Math.max(min, value));
}
