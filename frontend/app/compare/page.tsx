"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import SectionHeader from "../../components/SectionHeader";
import StatCard from "../../components/StatCard";
import EmptyState from "../../components/EmptyState";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

type JobRun = {
  id: string;
  run_name: string;
  job_type: string;
  region: string;
  status: string;
  energy_kwh?: number | null;
  carbon_kg_co2e?: number | null;
};

type ComparisonResult = {
  deltas: Record<string, number | null>;
  explanation?: string;
};

export default function ComparePage() {
  const { token } = useAuth();

  const [baselineId, setBaselineId] = React.useState<string>("");
  const [candidateId, setCandidateId] = React.useState<string>("");

  const runsQ = useQuery({
    queryKey: ["job-runs", token],
    enabled: Boolean(token),
    queryFn: async () => apiFetch<JobRun[]>("/job-runs", {}, { token: token || undefined }),
  });

  const compareM = useMutation({
    mutationFn: async ({ runA, runB }: { runA: string; runB: string }) =>
      apiFetch<ComparisonResult>(
        `/job-runs/compare?run_a=${encodeURIComponent(runA)}&run_b=${encodeURIComponent(runB)}`,
        {},
        { token: token || undefined },
      ),
  });

  const runs = runsQ.data ?? [];
  const canCompare = Boolean(baselineId && candidateId && baselineId !== candidateId);

  if (!token) {
    return (
      <EmptyState
        title="You're not signed in"
        description="Sign in to compare runs."
        actions={[{ label: "Go to login", href: "/login" }]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Compare Job Runs"
        subtitle="Select two completed runs to compare their carbon footprint and performance."
        actions={
          <button
            type="button"
            onClick={() => {
              if (!canCompare) return;
              compareM.mutate({ runA: baselineId, runB: candidateId });
            }}
            disabled={!canCompare || compareM.isPending}
            className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {compareM.isPending ? "Comparing..." : "Compare"}
          </button>
        }
      />

      {runsQ.isLoading ? (
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">Loading runs...</div>
      ) : runs.length === 0 ? (
        <EmptyState title="No runs available" description="Ingest at least two runs to compare." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SelectCard
            label="Baseline Run"
            helper="Pick the before run"
            value={baselineId}
            onChange={setBaselineId}
            runs={runs}
          />
          <SelectCard
            label="Candidate Run"
            helper="Pick the after run"
            value={candidateId}
            onChange={setCandidateId}
            runs={runs}
          />
        </div>
      )}

      {compareM.data ? (
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4">
            <div className="text-sm font-semibold text-foreground">Result</div>
            <div className="text-xs text-muted-foreground">Baseline vs Candidate deltas</div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {Object.entries(compareM.data.deltas).map(([k, v]) => (
              <StatCard key={k} label={k} value={v === null || v === undefined ? "-" : v.toFixed(3)} />
            ))}
          </div>
          {compareM.data.explanation ? (
            <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-foreground">
              {compareM.data.explanation}
            </div>
          ) : null}
        </div>
      ) : compareM.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {String((compareM.error as any)?.message || "Compare failed")}
        </div>
      ) : null}
    </div>
  );
}

function SelectCard({
  label,
  helper,
  value,
  onChange,
  runs,
}: {
  label: string;
  helper: string;
  value: string;
  onChange: (v: string) => void;
  runs: JobRun[];
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">{helper}</div>
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Select run</option>
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.run_name} · {r.region} · {r.job_type}
            </option>
          ))}
        </select>
      </div>
      {value ? (
        <div className="rounded-xl border border-dashed border-border/60 p-3 text-sm text-foreground">
          Selected: {runs.find((r) => r.id === value)?.run_name || value}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 p-3 text-sm text-muted-foreground">
          Choose a run to see metrics.
        </div>
      )}
    </div>
  );
}
