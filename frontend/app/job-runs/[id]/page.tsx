"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import SectionHeader from "@/components/SectionHeader";
import StatCard from "@/components/StatCard";
import RunStatusBadge from "@/components/RunStatusBadge";

type Json = Record<string, any>;

type JobRun = {
  id: string;
  created_at?: string;
  updated_at?: string;
  run_name: string;
  job_type: string;
  region: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  project_id?: string;
  organization_id?: string;
  model_version_id?: string | null;
  dedupe_key?: string | null;
  external_run_id?: string | null;
  tags?: Json;
  run_metadata?: Json;
  hardware?: Json;
  energy?: Json;
  costs?: Json;
  energy_kwh?: number;
  carbon_kg_co2e?: number;
};

function fmtDate(s?: string) {
  if (!s) return "-";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
}

function fmtNum(n?: number, digits = 3) {
  if (n === null || n === undefined) return "-";
  if (Number.isNaN(n)) return "-";
  return n.toFixed(digits).replace(/\.?0+$/, "");
}

function safeJson(obj: any) {
  if (!obj || (typeof obj === "object" && Object.keys(obj).length === 0)) return "-";
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return "-";
  }
}

export default function JobRunDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id;
  const router = useRouter();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<JobRun | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const durationSec = useMemo(() => {
    if (!run?.start_time || !run?.end_time) return null;
    const a = new Date(run.start_time).getTime();
    const b = new Date(run.end_time).getTime();
    if (Number.isNaN(a) || Number.isNaN(b)) return null;
    return Math.max(0, Math.round((b - a) / 1000));
  }, [run?.start_time, run?.end_time]);

  useEffect(() => {
    if (!jobId) return;
    if (!token) {
      router.replace("/login");
      return;
    }

    let mounted = true;
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await apiFetch<JobRun>(`/job-runs/${jobId}`, { signal: ctrl.signal }, { token });
        if (!mounted) return;
        setRun(data);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "Failed to load job run");
        setRun(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      ctrl.abort();
    };
  }, [jobId, token, router]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/job-runs"
            className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <div>
            <div className="text-sm text-muted-foreground">Job Run Details</div>
            <h1 className="text-2xl font-bold text-foreground">
              {loading ? "Loading..." : run?.run_name || "-"}
            </h1>
          </div>
        </div>

        {run?.status && <RunStatusBadge status={run.status} />}
      </div>

      {/* Error Message */}
      {err ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <div className="font-semibold text-destructive">Unable to load job run</div>
          <div className="mt-2 text-sm text-destructive/80">{err}</div>
          <div className="mt-4 text-sm text-muted-foreground">
            If you created this run with an API key, make sure you're logged in as a user from the same organization.
          </div>
        </div>
      ) : null}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Carbon Footprint"
          value={`${fmtNum(run?.carbon_kg_co2e ?? 0, 4)} kg`}
          subtitle="CO2e emissions"
        />
        <StatCard
          title="Energy Usage"
          value={`${fmtNum(run?.energy_kwh ?? 0, 4)} kWh`}
          subtitle="Total energy consumed"
        />
        <StatCard
          title="Duration"
          value={durationSec === null ? "-" : `${durationSec}s`}
          subtitle="Execution time"
        />
        <StatCard
          title="Region"
          value={run?.region || "-"}
          subtitle={run?.job_type || "Type unknown"}
        />
      </div>

      {/* Metadata and Tags */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Metadata</h3>
          <div className="mt-4 space-y-3">
            <InfoRow label="Project ID" value={run?.project_id || "-"} />
            <InfoRow label="Organization ID" value={run?.organization_id || "-"} />
            <InfoRow label="Start Time" value={fmtDate(run?.start_time)} />
            <InfoRow label="End Time" value={fmtDate(run?.end_time)} />
            <InfoRow label="Deduplication Key" value={run?.dedupe_key || "-"} />
            <InfoRow label="External Run ID" value={run?.external_run_id || "-"} />
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Tags</h3>
          <pre className="mt-4 max-h-64 overflow-auto rounded-xl border border-border/40 bg-muted/30 p-3 text-xs text-foreground">
{safeJson(run?.tags)}
          </pre>
        </div>
      </div>

      {/* Hardware, Energy, and Costs */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground">Hardware Configuration</h3>
          <pre className="mt-4 max-h-72 overflow-auto rounded-xl border border-border/40 bg-muted/30 p-3 text-xs text-foreground">
{safeJson(run?.hardware)}
          </pre>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Energy & Costs</h3>
          <div className="space-y-3">
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Energy Data</div>
              <pre className="max-h-48 overflow-auto rounded-xl border border-border/40 bg-muted/30 p-3 text-xs text-foreground">
{safeJson(run?.energy)}
              </pre>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Cost Data</div>
              <pre className="max-h-48 overflow-auto rounded-xl border border-border/40 bg-muted/30 p-3 text-xs text-foreground">
{safeJson(run?.costs)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/40 bg-background/50 px-3 py-2.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-medium text-foreground" title={value}>
        {value}
      </span>
    </div>
  );
}
