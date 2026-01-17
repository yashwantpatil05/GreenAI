"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

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

function statusPill(status?: string) {
  const s = (status || "unknown").toLowerCase();
  if (["success", "succeeded", "completed", "done"].includes(s)) return "bg-emerald-600";
  if (["running", "in_progress", "processing"].includes(s)) return "bg-blue-600";
  if (["failed", "error"].includes(s)) return "bg-rose-600";
  if (["queued", "pending"].includes(s)) return "bg-amber-600";
  return "bg-slate-600";
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
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/job-runs"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              ← Back
            </Link>

            <div>
              <div className="text-sm text-slate-500">Job Run</div>
              <div className="text-2xl font-bold text-slate-900">{loading ? "Loading..." : run?.run_name || "-"}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-white ${statusPill(
                run?.status
              )}`}
            >
              {(run?.status || "unknown").toUpperCase()}
            </span>
          </div>
        </div>

        {err ? (
          <div className="card mt-6 border-rose-200">
            <div className="font-semibold text-rose-700">Unable to load job run</div>
            <div className="mt-2 text-sm text-slate-700">{err}</div>
            <div className="mt-4 text-sm text-slate-600">
              If you created this run with an API key, make sure you're logged in as a user from the same organization.
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="card">
            <div className="text-xs uppercase tracking-wide text-slate-500">Carbon</div>
            <div className="mt-2 text-2xl font-bold">{fmtNum(run?.carbon_kg_co2e ?? 0, 4)} kg CO2e</div>
          </div>

          <div className="card">
            <div className="text-xs uppercase tracking-wide text-slate-500">Energy</div>
            <div className="mt-2 text-2xl font-bold">{fmtNum(run?.energy_kwh ?? 0, 4)} kWh</div>
          </div>

          <div className="card">
            <div className="text-xs uppercase tracking-wide text-slate-500">Duration</div>
            <div className="mt-2 text-2xl font-bold">{durationSec === null ? "-" : `${durationSec}s`}</div>
          </div>

          <div className="card">
            <div className="text-xs uppercase tracking-wide text-slate-500">Region</div>
            <div className="mt-2 text-2xl font-bold">{run?.region || "-"}</div>
            <div className="mt-1 text-sm text-slate-600">{run?.job_type || "-"}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card">
            <div className="text-sm font-semibold text-slate-900">Metadata</div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-2">
              <InfoRow label="Project ID" value={run?.project_id || "-"} />
              <InfoRow label="Organization ID" value={run?.organization_id || "-"} />
              <InfoRow label="Start" value={fmtDate(run?.start_time)} />
              <InfoRow label="End" value={fmtDate(run?.end_time)} />
              <InfoRow label="Deduplication key" value={run?.dedupe_key || "-"} />
              <InfoRow label="External run ID" value={run?.external_run_id || "-"} />
            </div>
          </div>

          <div className="card">
            <div className="text-sm font-semibold text-slate-900">Tags</div>
            <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-slate-900/90 p-3 text-xs text-slate-100">
{safeJson(run?.tags)}
            </pre>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <div className="text-sm font-semibold text-slate-900">Hardware</div>
            <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-slate-900/90 p-3 text-xs text-slate-100">
{safeJson(run?.hardware)}
            </pre>
          </div>

          <div className="card">
            <div className="text-sm font-semibold text-slate-900">Energy / Costs</div>
            <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-slate-900/90 p-3 text-xs text-slate-100">
{safeJson(run?.energy)}
            </pre>
            <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-slate-900/90 p-3 text-xs text-slate-100">
{safeJson(run?.costs)}
            </pre>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="truncate text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
