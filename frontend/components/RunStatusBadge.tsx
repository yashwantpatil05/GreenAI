// GreenAI/frontend/components/RunStatusBadge.tsx
"use client";

import * as React from "react";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export type RunStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "canceled"
  | "unknown"
  | string;

type Props = {
  status?: RunStatus | null;
  size?: "sm" | "md";
  className?: string;
};

const MAP: Record<
  string,
  { label: string; ring: string; bg: string; text: string; dot: string }
> = {
  queued: {
    label: "Queued",
    ring: "ring-blue-500/20",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  running: {
    label: "Running",
    ring: "ring-amber-500/20",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  success: {
    label: "Success",
    ring: "ring-emerald-500/20",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  failed: {
    label: "Failed",
    ring: "ring-red-500/20",
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  },
  canceled: {
    label: "Canceled",
    ring: "ring-gray-500/20",
    bg: "bg-gray-50 dark:bg-gray-900/30",
    text: "text-gray-700 dark:text-gray-400",
    dot: "bg-gray-500",
  },
  unknown: {
    label: "Unknown",
    ring: "ring-gray-500/20",
    bg: "bg-gray-50 dark:bg-gray-900/30",
    text: "text-gray-700 dark:text-gray-400",
    dot: "bg-gray-500",
  },
};

function normalizeStatus(s?: string | null): string {
  const v = (s || "").trim().toLowerCase();
  if (!v) return "unknown";
  if (v === "completed" || v === "done" || v === "ok") return "success";
  if (v === "error") return "failed";
  return v;
}

export default function RunStatusBadge({ status, size = "sm", className }: Props) {
  const key = normalizeStatus(status ?? undefined);
  const cfg = MAP[key] ?? {
    label: status ? String(status) : "Unknown",
    ring: "ring-foreground/10",
    bg: "bg-muted/35",
    text: "text-foreground",
    dot: "bg-muted-foreground",
  };

  const isRunning = key === "running";
  const pad = size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5";
  const text = size === "sm" ? "text-xs" : "text-sm";
  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full",
        "ring-1",
        pad,
        text,
        cfg.ring,
        cfg.bg,
        cfg.text,
        className
      )}
    >
      <span className="relative flex items-center">
        <span className={cn("rounded-full", dotSize, cfg.dot)} />
        {isRunning ? (
          <span
            className={cn(
              "absolute -inset-1 rounded-full",
              "animate-ping bg-amber-500/30"
            )}
            aria-hidden="true"
          />
        ) : null}
      </span>
      <span className="leading-none">{cfg.label}</span>
    </span>
  );
}
