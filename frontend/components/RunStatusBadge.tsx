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
    ring: "ring-foreground/10",
    bg: "bg-muted/35",
    text: "text-foreground",
    dot: "bg-muted-foreground",
  },
  running: {
    label: "Running",
    ring: "ring-foreground/10",
    bg: "bg-muted/35",
    text: "text-foreground",
    dot: "bg-foreground",
  },
  success: {
    label: "Success",
    ring: "ring-foreground/10",
    bg: "bg-muted/35",
    text: "text-foreground",
    dot: "bg-foreground",
  },
  failed: {
    label: "Failed",
    ring: "ring-foreground/10",
    bg: "bg-muted/35",
    text: "text-foreground",
    dot: "bg-foreground",
  },
  canceled: {
    label: "Canceled",
    ring: "ring-foreground/10",
    bg: "bg-muted/35",
    text: "text-foreground",
    dot: "bg-muted-foreground",
  },
  unknown: {
    label: "Unknown",
    ring: "ring-foreground/10",
    bg: "bg-muted/35",
    text: "text-foreground",
    dot: "bg-muted-foreground",
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
              "animate-ping bg-foreground/15"
            )}
            aria-hidden="true"
          />
        ) : null}
      </span>
      <span className="leading-none">{cfg.label}</span>
    </span>
  );
}
