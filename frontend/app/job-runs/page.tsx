"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import EmptyState from "../../components/EmptyState";
import RunStatusBadge from "../../components/RunStatusBadge";
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

const REGIONS = [
  "us-east-1","us-east-2","us-west-1","us-west-2",
  "eu-west-1","eu-west-2","eu-central-1",
  "ap-south-1","ap-southeast-1","ap-southeast-2","ap-northeast-1",
  "us-central1","us-east4","europe-west1","asia-south1",
  "eastus","westeurope","southeastasia","local",
];

const GPU_MODELS = [
  "CPU Only","NVIDIA A100","NVIDIA A100 80GB","NVIDIA H100",
  "NVIDIA V100","NVIDIA T4","NVIDIA A10","NVIDIA RTX 4090",
  "NVIDIA RTX 3090","NVIDIA RTX 4080","NVIDIA A10G",
];

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

  // Manual test run form
  const [testRunOpen, setTestRunOpen] = useState(false);
  const [testRunName, setTestRunName] = useState("test-run");
  const [testJobType, setTestJobType] = useState("training");
  const [testRegion, setTestRegion] = useState("us-east-1");
  const [testDurationHours, setTestDurationHours] = useState("1");
  const [testGpuModel, setTestGpuModel] = useState("NVIDIA T4");
  const [testGpuCount, setTestGpuCount] = useState("1");
  const [testProjectId, setTestProjectId] = useState("");
  const [testRunning, setTestRunning] = useState(false);
  const [testRunErr, setTestRunErr] = useState<string | null>(null);
  const [testRunResult, setTestRunResult] = useState<{ emissions_kg?: number; energy_kwh?: number } | null>(null);

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

  const [testApiKey, setTestApiKey] = useState("");

  async function submitTestRun() {
    if (!testApiKey.trim()) {
      setTestRunErr("Paste your API key (from the API Keys page).");
      return;
    }
    setTestRunning(true);
    setTestRunErr(null);
    setTestRunResult(null);
    try {
      const durationHours = parseFloat(testDurationHours) || 1;
      const now = new Date();
      const startTime = new Date(now.getTime() - durationHours * 3600 * 1000);
      const endTime = now;

      const hardware: Record<string, any> = { cpu_count: 8 };
      if (testGpuModel !== "CPU Only") {
        hardware.gpu_model = testGpuModel;
        hardware.gpu_count = parseInt(testGpuCount) || 1;
      }

      const payload: Record<string, any> = {
        run_name: testRunName || "test-run",
        job_type: testJobType,
        region: testRegion,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "success",
        hardware,
      };
      if (testProjectId.trim()) payload.project_id = testProjectId.trim();

      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${base}/api/job-runs/`, {
        method: "POST",
        headers: {
          "X-API-Key": testApiKey.trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.detail || `HTTP ${res.status}`);
      }

      const result = await res.json();
      setTestRunResult({ emissions_kg: result.carbon_kg_co2e ?? result.emissions_kg, energy_kwh: result.energy_kwh });
      setTestRunOpen(false);
      void loadList();
    } catch (e: any) {
      setTestRunErr(e?.message || "Failed to submit test run");
    } finally {
      setTestRunning(false);
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
            onClick={() => { setTestRunErr(null); setTestRunResult(null); setTestRunOpen(true); }}
            className="inline-flex items-center justify-center rounded-xl bg-black px-3 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 dark:bg-white dark:text-black"
          >
            + Add Test Run
          </button>
          <button
            onClick={async () => {
              if (!token) return;
              try {
                const params = new URLSearchParams();
                if (projectId.trim()) params.set("project_id", projectId.trim());
                if (from) params.set("start_date", new Date(`${from}T00:00:00.000Z`).toISOString());
                if (to) params.set("end_date", new Date(`${to}T23:59:59.999Z`).toISOString());

                const url = `/api/exports/job-runs/csv?${params.toString()}`;
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${url}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });

                if (!response.ok) throw new Error("Export failed");

                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = downloadUrl;
                a.download = response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "export.csv";
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(downloadUrl);
                document.body.removeChild(a);
              } catch (e: any) {
                setErr(e?.message || "Export failed");
              }
            }}
            className="inline-flex items-center justify-center rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
          >
            Export CSV
          </button>
          <button
            onClick={async () => {
              if (!token) return;
              try {
                const params = new URLSearchParams();
                if (projectId.trim()) params.set("project_id", projectId.trim());
                if (from) params.set("start_date", new Date(`${from}T00:00:00.000Z`).toISOString());
                if (to) params.set("end_date", new Date(`${to}T23:59:59.999Z`).toISOString());

                const url = `/api/exports/job-runs/json?${params.toString()}`;
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${url}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });

                if (!response.ok) throw new Error("Export failed");

                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = downloadUrl;
                a.download = response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "export.json";
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(downloadUrl);
                document.body.removeChild(a);
              } catch (e: any) {
                setErr(e?.message || "Export failed");
              }
            }}
            className="inline-flex items-center justify-center rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
          >
            Export JSON
          </button>
          <button
            onClick={loadList}
            className="inline-flex items-center justify-center rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          {err ? <div className="text-xs text-destructive">{err}</div> : null}
        </div>

        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading job runs…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10">
            <EmptyState title="No runs found" description="Try changing filters or ingest a run via SDK/API key." />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-muted/25 text-xs text-muted-foreground">
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
              <tbody className="divide-y divide-border/60">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer hover:bg-accent/40 transition"
                    onClick={() => {
                      setSelectedId(r.id);
                      setOpen(true);
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{r.run_name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{r.id}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.job_type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.region}</td>
                    <td className="px-4 py-3">
                      <RunStatusBadge status={r.status || "unknown"} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDT(r.start_time)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDT(r.end_time)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtNum(r.energy_kwh, 6)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtNum(r.carbon_kg_co2e, 6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Test run success banner */}
      {testRunResult && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-emerald-700 dark:text-emerald-400">
            Test run submitted! Carbon: <strong>{testRunResult.emissions_kg?.toFixed(4) ?? "—"} kg CO₂e</strong>
            {testRunResult.energy_kwh !== undefined && (
              <span className="ml-2 text-muted-foreground">Energy: {testRunResult.energy_kwh?.toFixed(4)} kWh</span>
            )}
          </div>
          <button onClick={() => setTestRunResult(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}

      {/* Test run modal */}
      {testRunOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div>
                <div className="text-base font-semibold">Add Test Run</div>
                <div className="mt-0.5 text-xs text-muted-foreground">Experience carbon tracking without writing any code.</div>
              </div>
              <button onClick={() => setTestRunOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent" aria-label="Close">✕</button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {testRunErr && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{testRunErr}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-foreground">API Key <span className="text-muted-foreground">(paste from API Keys page)</span></label>
                  <input
                    type="password"
                    value={testApiKey}
                    onChange={(e) => setTestApiKey(e.target.value)}
                    placeholder="gai_live_..."
                    className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-medium text-foreground">Run Name</label>
                  <input
                    value={testRunName}
                    onChange={(e) => setTestRunName(e.target.value)}
                    placeholder="my-test-run"
                    className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Job Type</label>
                  <select
                    value={testJobType}
                    onChange={(e) => setTestJobType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {["training","inference","data_processing","fine_tuning"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Region</label>
                  <select
                    value={testRegion}
                    onChange={(e) => setTestRegion(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Duration (hours)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={testDurationHours}
                    onChange={(e) => setTestDurationHours(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">GPU Count</label>
                  <input
                    type="number"
                    min="0"
                    value={testGpuCount}
                    onChange={(e) => setTestGpuCount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-medium text-foreground">Hardware</label>
                  <select
                    value={testGpuModel}
                    onChange={(e) => setTestGpuModel(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {GPU_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-medium text-foreground">Project ID <span className="text-muted-foreground">(optional, from your API key&apos;s project)</span></label>
                  <input
                    value={testProjectId}
                    onChange={(e) => setTestProjectId(e.target.value)}
                    placeholder="Leave blank to use API key's project"
                    className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
              <button
                onClick={() => setTestRunOpen(false)}
                className="rounded-xl border border-border/60 bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => void submitTestRun()}
                disabled={testRunning}
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {testRunning ? "Submitting..." : "Submit Run"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title="Run details">
        {!selectedId ? null : detailLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : detailErr ? (
          <div className="p-4 text-sm text-destructive">{detailErr}</div>
        ) : !detail ? (
          <div className="p-4 text-sm text-muted-foreground">No details.</div>
        ) : (
          <div className="space-y-4 p-4">
            <div>
              <div className="text-lg font-semibold text-foreground">{detail.run_name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{detail.id}</div>
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
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
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
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-xl transform border-l border-border/60 bg-background shadow-2xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-accent"
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
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm text-foreground ${mono ? "font-mono text-xs" : ""}`}>
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
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="text-xs font-semibold text-foreground">{title}</div>
      {pretty ? (
        <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-muted/30 p-3 text-xs text-foreground">
          {pretty}
        </pre>
      ) : (
        <div className="mt-2 text-sm text-muted-foreground">—</div>
      )}
    </div>
  );
}
