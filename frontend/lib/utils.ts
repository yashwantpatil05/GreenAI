import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind className merge helper (shadcn-style)
 * - clsx handles conditional classes
 * - twMerge resolves Tailwind conflicts safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
