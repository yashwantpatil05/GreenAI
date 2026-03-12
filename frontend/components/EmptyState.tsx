// GreenAI/frontend/components/EmptyState.tsx
"use client";

import * as React from "react";
import Link from "next/link";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export type EmptyStateAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  icon?: React.ReactNode;
};

export type EmptyStateProps = {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: EmptyStateAction[];
  /** compact version for inside cards */
  compact?: boolean;
  className?: string;
};

function ActionButton({ a }: { a: EmptyStateAction }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition " +
    "focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:pointer-events-none disabled:opacity-50";
  const variants: Record<NonNullable<EmptyStateAction["variant"]>, string> = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow border border-primary/20 active:scale-[0.98]",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60 active:scale-[0.98]",
    ghost: "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground border border-transparent",
  };

  const cls = cn(base, variants[a.variant ?? "primary"]);

  if (a.href) {
    if (a.external) {
      return (
        <a
          href={a.href}
          target="_blank"
          rel="noreferrer"
          className={cls}
        >
          {a.icon}
          {a.label}
        </a>
      );
    }
    return (
      <Link href={a.href} className={cls}>
        {a.icon}
        {a.label}
      </Link>
    );
  }

  return (
    <button type="button" className={cls} onClick={a.onClick}>
      {a.icon}
      {a.label}
    </button>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  actions,
  compact,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-background",
        "shadow-sm",
        compact ? "p-5" : "p-8",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-60",
          "bg-[radial-gradient(900px_circle_at_25%_0%,rgba(16,185,129,0.08),transparent_50%),radial-gradient(700px_circle_at_85%_20%,rgba(52,211,153,0.06),transparent_45%)]"
        )}
      />

      <div className="relative flex flex-col items-center text-center">
        {icon ? (
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-border/60 bg-background/70 text-muted-foreground">
            {icon}
          </div>
        ) : (
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-border/60 bg-background/70 text-muted-foreground">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v18" />
              <path d="M3 12h18" />
            </svg>
          </div>
        )}

        <h3 className="text-base font-semibold text-foreground">{title}</h3>

        {description ? (
          <div className="mt-2 max-w-xl text-sm text-muted-foreground">
            {description}
          </div>
        ) : null}

        {actions?.length ? (
          <div className={cn("mt-5 flex flex-wrap items-center justify-center gap-2")}>
            {actions.map((a, idx) => (
              <ActionButton key={`${a.label}-${idx}`} a={a} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default EmptyState;
