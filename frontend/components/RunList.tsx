"use client";

import * as React from "react";

import DataTable, { DataTableColumn } from "./DataTable";
import EmptyState from "./EmptyState";
import RunStatusBadge from "./RunStatusBadge";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export type JobRunRow = {
  id: string;
  run_name: string;
  job_type: string;
  region?: string | null;
  status?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  energy_kwh?: number | null;
  carbon_kg_co2e?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Props = {
  rows: JobRunRow[];
  loading?: boolean;
  error?: string | null;
  onRowClick?: (row: JobRunRow) => void;
  onView?: (row: JobRunRow) => void;
  className?: string;
};

function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtNum(v?: number | null, digits = 3) {
  if (v === null || v === undefined) return "-";
  if (!Number.isFinite(v)) return "-";
  return v.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export default function RunList({ rows, loading, error, onRowClick, onView, className }: Props) {
  const columns = React.useMemo<DataTableColumn<JobRunRow>[]>(() => {
    const cols: DataTableColumn<JobRunRow>[] = [
      {
        key: "run_name",
        header: "Run",
        widthClassName: "w-[24%]",
        cell: (r) => (
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{r.run_name || "-"}</div>
            <div className="truncate text-xs text-muted-foreground">
              <span className="font-mono">{r.id}</span>
            </div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        widthClassName: "w-[12%]",
        cell: (r) => <RunStatusBadge status={(r.status || "unknown") as any} />,
      },
      {
        key: "job_type",
        header: "Type",
        widthClassName: "w-[12%]",
        cell: (r) => (
          <div className="text-sm text-foreground">
            {r.job_type ? (
              <span className="rounded-lg bg-muted/60 px-2 py-1 text-xs ring-1 ring-border/60">{r.job_type}</span>
            ) : (
              "-"
            )}
          </div>
        ),
      },
      {
        key: "region",
        header: "Region",
        widthClassName: "w-[12%]",
        cell: (r) => (
          <div className="text-sm text-foreground">
            {r.region ? (
              <span className="rounded-lg bg-background/50 px-2 py-1 text-xs ring-1 ring-border/60">{r.region}</span>
            ) : (
              "-"
            )}
          </div>
        ),
      },
      {
        key: "start_time",
        header: "Start",
        widthClassName: "w-[18%]",
        cell: (r) => <div className="text-sm text-foreground">{fmtDate(r.start_time)}</div>,
      },
      {
        key: "carbon_kg_co2e",
        header: <div className="text-right">CO2e (kg)</div>,
        widthClassName: "w-[10%] text-right",
        cell: (r) => (
          <div className="text-right text-sm text-foreground tabular-nums">{fmtNum(r.carbon_kg_co2e, 4)}</div>
        ),
      },
      {
        key: "energy_kwh",
        header: <div className="text-right">Energy (kWh)</div>,
        widthClassName: "w-[12%] text-right",
        cell: (r) => <div className="text-right text-sm text-foreground tabular-nums">{fmtNum(r.energy_kwh, 4)}</div>,
      },
    ];

      if (onView || onRowClick) {
        cols.push({
          key: "__actions__",
          header: "",
          widthClassName: "w-[8%] text-right",
          cell: (r) => (
            <div className="flex justify-end gap-2">
              {onView ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onView(r);
                }}
                className={cn(
                  "rounded-lg px-2 py-1 text-xs font-medium",
                  "border border-border/60 bg-background/60 text-foreground",
                  "hover:bg-muted/40 transition"
                )}
              >
                View
              </button>
            ) : null}
          </div>
        ),
      });
    }

    return cols;
  }, [onRowClick, onView]);

  if (error) {
    return (
      <div className={cn("rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm", className)}>
        <div className="text-sm font-medium text-foreground">Couldn't load runs</div>
        <div className="mt-1 text-sm text-muted-foreground">{error}</div>
      </div>
    );
  }

  if (!loading && (!rows || rows.length === 0)) {
    return (
      <div className={className}>
        <EmptyState
          title="No job runs yet"
          description="When you ingest telemetry via the SDK/CLI, your runs will appear here."
          actions={[{ label: "Refresh", onClick: () => window.location.reload() }]}
        />
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card/70 shadow-sm", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 md:px-5">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">Job runs</div>
          <div className="text-xs text-muted-foreground">{loading ? "Loading..." : `${rows.length.toLocaleString()} run(s)`}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex rounded-full bg-muted/60 px-2 py-1 text-xs text-muted-foreground ring-1 ring-border/60">
            Tip: Click a row to view details
          </span>
        </div>
      </div>

      <div className="p-2 md:p-3">
        <DataTable<JobRunRow>
          columns={columns}
          data={rows}
          loading={loading}
          getRowId={(r) => r.id}
          onRowClick={onRowClick}
        />
      </div>
    </div>
  );
}
