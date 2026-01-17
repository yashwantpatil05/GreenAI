// GreenAI/frontend/components/RunFilters.tsx
"use client";

import * as React from "react";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export type RunFiltersValue = {
  query: string;
  status: string; // "", "queued" | "running" | "succeeded" | "failed" | "canceled"
  jobType: string; // "", "training" | "inference" | "etl" | ...
  region: string; // "", "ap-south-1" | ...
  dateFrom: string; // ISO date: "YYYY-MM-DD"
  dateTo: string; // ISO date
  sort: "newest" | "oldest";
};

type Props = {
  value: RunFiltersValue;
  onChange: (next: RunFiltersValue) => void;
  onApply?: () => void;
  onReset?: () => void;

  loading?: boolean;

  statusOptions?: Array<{ value: string; label: string }>;
  jobTypeOptions?: Array<{ value: string; label: string }>;
  regionOptions?: Array<{ value: string; label: string }>;

  className?: string;
};

const DEFAULT_STATUS: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "queued", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
  { value: "canceled", label: "Canceled" },
];

const DEFAULT_SORT: Array<{ value: RunFiltersValue["sort"]; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

export default function RunFilters({
  value,
  onChange,
  onApply,
  onReset,
  loading,
  statusOptions = DEFAULT_STATUS,
  jobTypeOptions = [
    { value: "", label: "All job types" },
    { value: "training", label: "Training" },
    { value: "inference", label: "Inference" },
    { value: "etl", label: "ETL" },
  ],
  regionOptions = [
    { value: "", label: "All regions" },
    { value: "ap-south-1", label: "ap-south-1" },
    { value: "us-east-1", label: "us-east-1" },
    { value: "eu-west-1", label: "eu-west-1" },
  ],
  className,
}: Props) {
  const set = <K extends keyof RunFiltersValue>(k: K, v: RunFiltersValue[K]) =>
    onChange({ ...value, [k]: v });

  const handleReset = () => {
    onChange({
      query: "",
      status: "",
      jobType: "",
      region: "",
      dateFrom: "",
      dateTo: "",
      sort: "newest",
    });
    onReset?.();
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/70 backdrop-blur",
        "shadow-sm p-4 md:p-5",
        className
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-12">
          {/* Search */}
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Search
            </label>
            <div className="relative">
              <input
                value={value.query}
                onChange={(e) => set("query", e.target.value)}
                placeholder="Run name, external id, tag…"
                className={cn(
                  "w-full rounded-xl border border-border/60 bg-background/60",
                  "px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
                  "outline-none ring-0 focus:border-border",
                  loading && "opacity-70"
                )}
              />
              {value.query ? (
                <button
                  type="button"
                  onClick={() => set("query", "")}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2",
                    "rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50"
                  )}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>

          {/* Status */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Status
            </label>
            <select
              value={value.status}
              onChange={(e) => set("status", e.target.value)}
              className={cn(
                "w-full rounded-xl border border-border/60 bg-background/60",
                "px-3 py-2 text-sm text-foreground outline-none",
                "focus:border-border",
                loading && "opacity-70"
              )}
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Job type */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Job type
            </label>
            <select
              value={value.jobType}
              onChange={(e) => set("jobType", e.target.value)}
              className={cn(
                "w-full rounded-xl border border-border/60 bg-background/60",
                "px-3 py-2 text-sm text-foreground outline-none",
                "focus:border-border",
                loading && "opacity-70"
              )}
            >
              {jobTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Region
            </label>
            <select
              value={value.region}
              onChange={(e) => set("region", e.target.value)}
              className={cn(
                "w-full rounded-xl border border-border/60 bg-background/60",
                "px-3 py-2 text-sm text-foreground outline-none",
                "focus:border-border",
                loading && "opacity-70"
              )}
            >
              {regionOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Sort
            </label>
            <select
              value={value.sort}
              onChange={(e) => set("sort", e.target.value as RunFiltersValue["sort"])}
              className={cn(
                "w-full rounded-xl border border-border/60 bg-background/60",
                "px-3 py-2 text-sm text-foreground outline-none",
                "focus:border-border",
                loading && "opacity-70"
              )}
            >
              {DEFAULT_SORT.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              From
            </label>
            <input
              type="date"
              value={value.dateFrom}
              onChange={(e) => set("dateFrom", e.target.value)}
              className={cn(
                "w-full rounded-xl border border-border/60 bg-background/60",
                "px-3 py-2 text-sm text-foreground outline-none",
                "focus:border-border",
                loading && "opacity-70"
              )}
            />
          </div>

          {/* Date to */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              To
            </label>
            <input
              type="date"
              value={value.dateTo}
              onChange={(e) => set("dateTo", e.target.value)}
              className={cn(
                "w-full rounded-xl border border-border/60 bg-background/60",
                "px-3 py-2 text-sm text-foreground outline-none",
                "focus:border-border",
                loading && "opacity-70"
              )}
            />
          </div>

          {/* Actions */}
          <div className="md:col-span-2 md:flex md:items-end md:justify-end">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onApply}
                disabled={loading}
                className={cn(
                  "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium",
                  "bg-foreground text-background",
                  "hover:opacity-90 transition",
                  loading && "cursor-not-allowed opacity-70"
                )}
              >
                {loading ? "Applying…" : "Apply"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className={cn(
                  "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium",
                  "border border-border/60 bg-background/60 text-foreground",
                  "hover:bg-muted/40 transition",
                  loading && "cursor-not-allowed opacity-70"
                )}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Small helper row */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted/60 px-2 py-1 ring-1 ring-border/60">
          Filters are applied client-side unless your page wires them to API query params.
        </span>
      </div>
    </div>
  );
}
