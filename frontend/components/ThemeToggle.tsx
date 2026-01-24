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

function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const resolved = resolveTheme(mode);

  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
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
      media.addListener(onChange);
      return () => media.removeListener(onChange);
    }
  }, []);

  const cycle = () => {
    const nm = nextMode(mode);
    setMode(nm);
    writeStoredTheme(nm);
    applyTheme(nm);
  };

  const safeMode: ThemeMode = mounted ? mode : "system";

  const Icon = safeMode === "dark" ? Moon : safeMode === "light" ? Sun : Monitor;
  const label = safeMode === "system" ? "System" : safeMode === "light" ? "Light" : "Dark";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${label}`}
      title={`Theme: ${label} (click to cycle)`}
      data-testid="theme-toggle"
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background text-muted-foreground shadow-sm transition-all hover:bg-accent hover:text-foreground hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <Icon className="h-[18px] w-[18px]" />
      
      {/* Mode indicator dot */}
      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
        safeMode === "dark" ? "bg-indigo-500" : 
        safeMode === "light" ? "bg-amber-500" : 
        "bg-emerald-500"
      }`} />
    </button>
  );
}
