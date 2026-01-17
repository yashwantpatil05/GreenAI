// GreenAI/frontend/components/StatCard.tsx
"use client";

import * as React from "react";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type Trend = {
  /** e.g. +12.4 or -3.1 */
  value: number;
  /** optional label like "vs last 7 days" */
  label?: string;
};

export type StatCardProps = {
  title?: string;
  label?: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;

  /** Right-side icon */
  icon?: React.ReactNode;

  /** Delta/Trend chip */
  trend?: Trend;

  /** Small inline sparkline; provide 8–30 points */
  sparkline?: number[];

  /** Extra footer line */
  footer?: React.ReactNode;

  /** Loading skeleton */
  loading?: boolean;

  /** Clickable card */
  onClick?: () => void;

  className?: string;
};

function Sparkline({ data }: { data: number[] }) {
  if (!data?.length) return null;

  const w = 120;
  const h = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const pts = data
    .map((v, i) => {
      const x = (i / Math.max(1, data.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="mt-2 overflow-visible"
      aria-hidden="true"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-muted-foreground/70"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrendChip({ trend }: { trend: Trend }) {
  const up = trend.value >= 0;
  const label = `${up ? "+" : ""}${trend.value.toFixed(
    Math.abs(trend.value) < 10 ? 1 : 0
  )}%`;

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
          up
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {up ? <path d="M7 14l5-5 5 5" /> : <path d="M7 10l5 5 5-5" />}
        </svg>
        {label}
      </span>

      {trend.label ? (
        <span className="text-xs text-muted-foreground">{trend.label}</span>
      ) : null}
    </div>
  );
}

export function StatCard({
  title,
  label,
  value,
  subtitle,
  icon,
  trend,
  sparkline,
  footer,
  loading,
  onClick,
  className,
}: StatCardProps) {
  const clickable = typeof onClick === "function";
  const heading = title || label || "";

  return (
    <section
      role={clickable ? "button" : "region"}
      tabIndex={clickable ? 0 : -1}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/60 bg-background",
        "shadow-sm transition",
        clickable &&
          "cursor-pointer hover:border-border hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring/40",
        className
      )}
      aria-label={heading}
    >
      {/* soft highlight */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
          "bg-[radial-gradient(900px_circle_at_20%_0%,rgba(99,102,241,0.08),transparent_45%),radial-gradient(700px_circle_at_90%_20%,rgba(16,185,129,0.08),transparent_40%)]",
          "group-hover:opacity-100"
        )}
      />

      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium tracking-wide text-muted-foreground">
              {heading}
            </div>

            <div className="mt-2">
              {loading ? (
                <div className="h-8 w-44 animate-pulse rounded-md bg-muted/60" />
              ) : (
                <div className="truncate text-2xl font-semibold leading-8 text-foreground">
                  {value}
                </div>
              )}

              {subtitle ? (
                <div className="mt-1 text-sm text-muted-foreground">
                  {subtitle}
                </div>
              ) : null}
            </div>
          </div>

          {icon ? (
            <div
              className={cn(
                "grid h-11 w-11 place-items-center rounded-2xl border border-border/60",
                "bg-background/60 text-muted-foreground"
              )}
              aria-hidden="true"
            >
              {icon}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {trend ? <TrendChip trend={trend} /> : null}
            {footer ? (
              <div className="mt-2 text-xs text-muted-foreground">{footer}</div>
            ) : null}
          </div>

          {sparkline?.length ? (
            <div className="text-muted-foreground/70">
              <Sparkline data={sparkline} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default StatCard;
