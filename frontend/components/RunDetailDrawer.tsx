// GreenAI/frontend/components/RunDetailDrawer.tsx
"use client";

import * as React from "react";
import RunStatusBadge from "./RunStatusBadge";
import StatCard from "./StatCard";
import SectionHeader from "./SectionHeader";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export type RunDetail = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;

  run_name: string;
  job_type: string;
  region?: string | null;
  status?: string | null;

  start_time?: string | null;
  end_time?: string | null;

  organization_id?: string | null;
  project_id?: string | null;
  model_version_id?: string | null;

  dedupe_key?: string | null;
  external_run_id?: string | null;

  tags?: Record<string, any> | null;
  run_metadata?: Record<string, any> | null;

  hardware?: Record<string, any> | null;
  energy?: Record<string, any> | null;
  costs?: Record<string, any> | null;

  energy_kwh?: number | null;
  carbon_kg_co2e?: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;

  run?: RunDetail | null;
  loading?: boolean;
  error?: string | null;

  onGenerateReport?: (runId: string) => void;
  onCompare?: (runId: string) => void;

  className?: string;
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtNum(v?: number | null, digits = 4) {
  if (v === null || v === undefined) return "—";
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function pretty(obj: any) {
  if (!obj) return "—";
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function useEscape(onClose: () => void, open: boolean) {
  React.useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, open]);
}

export default function RunDetailDrawer({
  open,
  onClose,
  run,
  loading,
  error,
  onGenerateReport,
  onCompare,
  className,
}: Props) {
  useEscape(onClose, open);

  // prevent background scroll
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const title = run?.run_name || "Run details";

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Run details"
        className={cn(
          "absolute right-0 top-0 h-full w-full max-w-[720px]",
          "bg-background shadow-2xl border-l border-border/60",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-4 md:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
              {run?.status ? <RunStatusBadge status={run.status as any} /> : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="font-mono">{run?.id || "—"}</span>
              <span>•</span>
              <span>Created {fmtDate(run?.created_at)}</span>
              <span>•</span>
              <span>Updated {fmtDate(run?.updated_at)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {run?.id && onGenerateReport ? (
              <button
                type="button"
                onClick={() => onGenerateReport(run.id)}
                className={cn(
                  "hidden sm:inline-flex",
                  "rounded-xl px-3 py-2 text-xs font-semibold",
                  "bg-primary text-primary-foreground shadow-sm",
                  "hover:opacity-90 active:opacity-95 transition"
                )}
              >
                Generate report
              </button>
            ) : null}

            {run?.id && onCompare ? (
              <button
                type="button"
                onClick={() => onCompare(run.id)}
                className={cn(
                  "hidden sm:inline-flex",
                  "rounded-xl px-3 py-2 text-xs font-semibold",
                  "border border-border/60 bg-background text-foreground",
                  "hover:bg-muted/40 transition"
                )}
              >
                Compare
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-semibold",
                "border border-border/60 bg-background text-foreground",
                "hover:bg-muted/40 transition"
              )}
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-64px)] overflow-y-auto">
          <div className="px-4 py-4 md:px-6 md:py-6">
            {loading ? (
              <div className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm">
                <div className="text-sm font-medium text-foreground">Loading run…</div>
                <div className="mt-2 h-2 w-40 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-2 w-72 animate-pulse rounded bg-muted" />
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm">
                <div className="text-sm font-medium text-foreground">Couldn’t load run</div>
                <div className="mt-1 text-sm text-muted-foreground">{error}</div>
              </div>
            ) : !run ? (
              <div className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm">
                <div className="text-sm font-medium text-foreground">No run selected</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Select a run to view details.
                </div>
              </div>
            ) : (
              <>
                <SectionHeader
                  title="Overview"
                  subtitle="High-level metrics and identifiers"
                />

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <StatCard
                    title="CO₂e (kg)"
                    value={fmtNum(run.carbon_kg_co2e, 6)}
                    subtitle="Computed emissions"
                  />
                  <StatCard
                    title="Energy (kWh)"
                    value={fmtNum(run.energy_kwh, 6)}
                    subtitle="Reported or computed"
                  />
                  <StatCard
                    title="Job Type"
                    value={run.job_type || "—"}
                    subtitle={run.region ? `Region: ${run.region}` : "Region: —"}
                  />
                  <StatCard
                    title="Duration"
                    value={
                      run.start_time && run.end_time
                        ? (() => {
                            const s = new Date(run.start_time).getTime();
                            const e = new Date(run.end_time).getTime();
                            if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return "—";
                            const ms = e - s;
                            const sec = Math.floor(ms / 1000);
                            const m = Math.floor(sec / 60);
                            const r = sec % 60;
                            return `${m}m ${r}s`;
                          })()
                        : "—"
                    }
                    subtitle={`Start: ${fmtDate(run.start_time)} • End: ${fmtDate(run.end_time)}`}
                  />
                </div>

                <div className="mt-6">
                  <SectionHeader title="Identifiers" subtitle="Links and deduplication keys" />
                  <div className="mt-3 rounded-2xl border border-border/60 bg-card/70 shadow-sm">
                    <div className="grid grid-cols-1 gap-0 divide-y divide-border/60">
                      {[
                        ["organization_id", run.organization_id],
                        ["project_id", run.project_id],
                        ["model_version_id", run.model_version_id],
                        ["external_run_id", run.external_run_id],
                        ["dedupe_key", run.dedupe_key],
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-muted-foreground">{k}</div>
                            <div className="truncate font-mono text-sm text-foreground">{v || "—"}</div>
                          </div>
                          <button
                            type="button"
                            disabled={!v}
                            onClick={() => v && copy(String(v))}
                            className={cn(
                              "rounded-xl px-3 py-2 text-xs font-semibold",
                              "border border-border/60 bg-background text-foreground",
                              v ? "hover:bg-muted/40" : "opacity-50 cursor-not-allowed",
                              "transition"
                            )}
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <SectionHeader title="Tags" subtitle="User-supplied labels for this run" />
                  <div className="mt-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
                    <pre className="max-h-[260px] overflow-auto rounded-xl bg-muted/40 p-3 text-xs text-foreground">
                      {pretty(run.tags)}
                    </pre>
                  </div>
                </div>

                <div className="mt-6">
                  <SectionHeader title="Metadata" subtitle="Run metadata from SDK/CLI" />
                  <div className="mt-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
                    <pre className="max-h-[320px] overflow-auto rounded-xl bg-muted/40 p-3 text-xs text-foreground">
                      {pretty(run.run_metadata)}
                    </pre>
                  </div>
                </div>

                <div className="mt-6">
                  <SectionHeader title="Hardware" subtitle="Machine and accelerator details" />
                  <div className="mt-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
                    <pre className="max-h-[320px] overflow-auto rounded-xl bg-muted/40 p-3 text-xs text-foreground">
                      {pretty(run.hardware)}
                    </pre>
                  </div>
                </div>

                <div className="mt-6">
                  <SectionHeader title="Energy" subtitle="Raw energy signals" />
                  <div className="mt-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
                    <pre className="max-h-[320px] overflow-auto rounded-xl bg-muted/40 p-3 text-xs text-foreground">
                      {pretty(run.energy)}
                    </pre>
                  </div>
                </div>

                <div className="mt-6">
                  <SectionHeader title="Costs" subtitle="Optional cost signals" />
                  <div className="mt-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
                    <pre className="max-h-[320px] overflow-auto rounded-xl bg-muted/40 p-3 text-xs text-foreground">
                      {pretty(run.costs)}
                    </pre>
                  </div>
                </div>

                <div className="h-10" />
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
