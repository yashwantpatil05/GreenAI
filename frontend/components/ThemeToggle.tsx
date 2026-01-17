// GreenAI/frontend/components/ThemeToggle.tsx
"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "gai.theme";

function getSystemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") return getSystemPrefersDark() ? "dark" : "light";
  return mode;
}

/**
 * Apply theme to <html>.
 * IMPORTANT: only "dark" class is used by Tailwind. "light" is optional.
 */
function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const resolved = resolveTheme(mode);

  // Tailwind uses "dark" class. Keep "light" for readability/explicitness.
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");

  // browser UI color scheme
  root.style.colorScheme = resolved;
}

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function writeStoredTheme(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, mode);
}

function nextMode(mode: ThemeMode): ThemeMode {
  return mode === "system" ? "light" : mode === "light" ? "dark" : "system";
}

export function ThemeToggle() {
  const [mode, setMode] = React.useState<ThemeMode>("system");
  const [mounted, setMounted] = React.useState(false);

  // Init (avoid hydration mismatch for icons/labels)
  React.useEffect(() => {
    const stored = readStoredTheme();
    setMode(stored);
    applyTheme(stored);
    setMounted(true);

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;

    const onChange = () => {
      const current = readStoredTheme();
      if (current === "system") applyTheme("system");
    };

    try {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    } catch {
      // eslint-disable-next-line deprecation/deprecation
      media.addListener(onChange);
      // eslint-disable-next-line deprecation/deprecation
      return () => media.removeListener(onChange);
    }
  }, []);

  const cycle = () => {
    const nm = nextMode(mode);
    setMode(nm);
    writeStoredTheme(nm);
    applyTheme(nm);
  };

  // Render a stable skeleton until mounted (prevents "flash" + mismatch)
  const safeMode: ThemeMode = mounted ? mode : "system";

  const label =
    safeMode === "system"
      ? "Theme: System"
      : safeMode === "light"
      ? "Theme: Light"
      : "Theme: Dark";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className={[
        "group inline-flex h-10 items-center gap-2 rounded-full border border-border/60 bg-background px-3",
        "text-sm text-muted-foreground shadow-sm transition",
        "hover:bg-accent/60 hover:text-foreground",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
      ].join(" ")}
    >
      <span className="grid h-8 w-8 place-items-center rounded-full border border-border/60 bg-muted/30">
        {safeMode === "dark" ? (
          <Moon className="h-4 w-4" />
        ) : safeMode === "light" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Monitor className="h-4 w-4" />
        )}
      </span>

      <span className="hidden sm:inline">
        {safeMode === "system" ? "System" : safeMode === "light" ? "Light" : "Dark"}
      </span>

      <span className="ml-1 hidden rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground md:inline">
        {safeMode === "system" ? "Auto" : "Manual"}
      </span>
    </button>
  );
}
