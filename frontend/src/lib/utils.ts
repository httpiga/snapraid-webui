import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Badge variant for SnapRAID command pills (Dashboard, Logs). */
export function getCommandBadgeVariant(
  command: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (command) {
    case "sync":
      return "default";
    case "scrub":
      return "secondary";
    case "fix":
      return "destructive";
    case "check":
      return "outline";
    default:
      return "secondary";
  }
}
