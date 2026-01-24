"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import EmptyState from "../../components/EmptyState";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

type Json = Record<string, any>;

type JobRun = {
  id: string;
  created_at: string;
  updated_at: string;
  run_name: string;
  job_type: string;
  region: string;
  status: string | null;
  start_time: string | null;
  end_time: string | null;
  project_id: string;
  organization_id: string;
  model_version_id: string | null;
  dedupe_key: string | null;
  external_run_id: string | null;
  tags: Json | null;
  run_metadata: Json | null;
  energy_kwh: number | null;
  carbon_kg_co2e: number | null;
};

type JobRunDetail = JobRun & {
  hardware: Json | null;
  energy: Json | null;
  costs: Json | null;
};

function fmtDT(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function fmtNum(v?: number | null, digits = 3) {
  if (v === null || v === undefined) return "—";
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(v);
}

function statusTone(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (["success", "succeeded", "completed", "done"].includes(s)) return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
  if (["failed", "error", "cancelled", "canceled"].includes(s)) return "bg-rose-500/15 text-rose-300 ring-rose-500/30";
  if (["running", "in_progress", "processing"].includes(s)) return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
  return "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30";
}

export default function JobRunsPage() {
  const { token } = useAuth();

  const [projectId, setProjectId] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [rows, setRows] = useState<JobRun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobRunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (projectId.trim()) p.project_id = projectId.trim();
    if (from) p.start = new Date(`${from}T00:00:00.000Z`).toISOString();
    if (to) p.end = new Date(`${to}T23:59:59.999Z`).toISOString();
    return p;
  }, [projectId, from, to]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      return (
        (r.run_name || "").toLowerCase().includes(needle) ||
        (r.job_type || "").toLowerCase().includes(needle) ||
        (r.region || "").toLowerCase().includes(needle) ||
        (r.status || "").toLowerCase().includes(needle) ||
        (r.external_run_id || "").toLowerCase().includes(needle) ||
        (r.dedupe_key || "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q]);

  const stats = useMemo(() => {
    const totalRuns = filtered.length;
    let energy = 0;
    let carbon = 0;
    for (const r of filtered) {
      energy += Number(r.energy_kwh || 0);
      carbon += Number(r.carbon_kg_co2e || 0);
    }
    return { totalRuns, energy, carbon };
  }, [filtered]);

  async function loadList() {
    if (!token) {
      setRows([]);
      setLoading(false);
      setErr("Not authenticated");
      return;
    }

    setLoading(true);
    setErr(null);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const qs = new URLSearchParams(queryParams).toString();
      const path = qs ? `/job-runs?${qs}` : "/job-runs";
      const data = await apiFetch<JobRun[]>(path, { signal: ac.signal }, { token });
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setErr(e?.message || "Failed to load job runs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    if (!token) return;
    setDetailLoading(true);
    setDetailErr(null);
    setDetail(null);

    try {
      const data = await apiFetch<JobRunDetail>(`/job-runs/${id}`, {}, { token });
      setDetail(data);
    } catch (e: any) {
      setDetailErr(e?.message || "Failed to load run detail");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, queryParams.project_id, queryParams.start, queryParams.end]);

  useEffect(() => {
    if (open && selectedId) loadDetail(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedId]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Telemetry</div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Job Runs
          </h1>
          <div className="mt-1 text-sm text-muted-foreground">
            Filter, inspect, and audit ingested runs.
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadList}
            className="inline-flex items-center justify-center rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Project ID</label>
          <input
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="UUID"
            className="h-10 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-border"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Search</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="run name, status, region…"
            className="h-10 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-border"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground outline-none ring-0 focus:border-border"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground outline-none ring-0 focus:border-border"
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Runs" value={stats.totalRuns.toString()} />
        <StatCard label="Energy (kWh)" value={fmtNum(stats.energy, 4)} />
        <StatCard label="Carbon (kgCO₂e)" value={fmtNum(stats.carbon, 4)} />
      </div>

      <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="text-sm font-medium text-foreground">
            Runs
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {loading ? "Loading…" : `${filtered.length} shown`}
            </span>
          </div>
          {err ? <div className="text-xs text-rose-600 dark:text-rose-400">{err}</div> : null}
        </div>

        {loading ? (
          <div className="p-6 text-sm text-zinc-600 dark:text-zinc-400">Loading job runs…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10">
            <EmptyState title="No runs found" description="Try changing filters or ingest a run via SDK/API key." />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-600 dark:bg-zinc-900/30 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Run</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Region</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Start</th>
                  <th className="px-4 py-3 font-medium">End</th>
                  <th className="px-4 py-3 font-medium">Energy (kWh)</th>
                  <th className="px-4 py-3 font-medium">Carbon (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/30"
                    onClick={() => {
                      setSelectedId(r.id);
                      setOpen(true);
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{r.run_name}</div>
                      <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{r.id}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{r.job_type}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{r.region}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ${statusTone(r.status)}`}
                      >
                        {r.status || "unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{fmtDT(r.start_time)}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{fmtDT(r.end_time)}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{fmtNum(r.energy_kwh, 6)}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{fmtNum(r.carbon_kg_co2e, 6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} title="Run details">
        {!selectedId ? null : detailLoading ? (
          <div className="p-4 text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
        ) : detailErr ? (
          <div className="p-4 text-sm text-rose-600 dark:text-rose-400">{detailErr}</div>
        ) : !detail ? (
          <div className="p-4 text-sm text-zinc-600 dark:text-zinc-400">No details.</div>
        ) : (
          <div className="space-y-4 p-4">
            <div>
              <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{detail.run_name}</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{detail.id}</div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Info label="Job type" value={detail.job_type} />
              <Info label="Region" value={detail.region} />
              <Info label="Status" value={detail.status || "unknown"} />
              <Info label="Project" value={detail.project_id} mono />
              <Info label="Org" value={detail.organization_id} mono />
              <Info label="External run id" value={detail.external_run_id || "—"} mono />
              <Info label="Dedupe key" value={detail.dedupe_key || "—"} mono />
              <Info label="Start time" value={fmtDT(detail.start_time)} />
              <Info label="End time" value={fmtDT(detail.end_time)} />
              <Info label="Energy (kWh)" value={fmtNum(detail.energy_kwh, 6)} />
              <Info label="Carbon (kgCO₂e)" value={fmtNum(detail.carbon_kg_co2e, 6)} />
            </div>

            <JsonBlock title="Tags" data={detail.tags} />
            <JsonBlock title="Metadata" data={detail.run_metadata} />
            <JsonBlock title="Hardware" data={detail.hardware} />
            <JsonBlock title="Energy payload" data={detail.energy} />
            <JsonBlock title="Costs" data={detail.costs} />
          </div>
        )}
      </Drawer>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}

function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-xl transform border-l border-zinc-200 bg-white shadow-2xl transition-transform dark:border-zinc-800 dark:bg-zinc-950 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="h-[calc(100%-49px)] overflow-y-auto">{children}</div>
      </div>
    </>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className={`mt-1 text-sm text-zinc-900 dark:text-zinc-100 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function JsonBlock({ title, data }: { title: string; data: any }) {
  const pretty = useMemo(() => {
    if (!data || (typeof data === "object" && Object.keys(data).length === 0)) return null;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{title}</div>
      {pretty ? (
        <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-zinc-50 p-3 text-xs text-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200">
          {pretty}
        </pre>
      ) : (
        <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">—</div>
      )}
    </div>
  );
}
