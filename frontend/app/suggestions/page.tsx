"use client";

import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import SectionHeader from "@/components/SectionHeader";
import StatCard from "@/components/StatCard";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

type Suggestion = {
  id: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  project_id?: string | null;
  job_run_id?: string | null;
  category: string;
  title: string;
  description?: string | null;
  effort?: string | null;
  impact_kwh?: number | null;
  impact_co2_kg?: number | null;
  priority?: number | null;
  status: string;
};

function fmtNum(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function SuggestionsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | string>("all");
  const [category, setCategory] = useState<"all" | string>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const data = await apiFetch<Suggestion[]>("/suggestions", {}, token ? { token } : {});
        if (cancelled) return;
        setRows(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message || "Failed to load suggestions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.category) s.add(r.category);
    return ["all", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const statuses = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.status) s.add(r.status);
    return ["all", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (category !== "all" && r.category !== category) return false;
      if (!qq) return true;
      const hay =
        `${r.title ?? ""} ${r.description ?? ""} ${r.category ?? ""} ${r.effort ?? ""} ${r.status ?? ""}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [rows, q, status, category]);

  const totals = useMemo(() => {
    const open = rows.filter((r) => (r.status || "").toLowerCase() === "open").length;
    const impactKwh = rows.reduce((acc, r) => acc + (Number(r.impact_kwh) || 0), 0);
    const impactCo2 = rows.reduce((acc, r) => acc + (Number(r.impact_co2_kg) || 0), 0);
    return { open, impactKwh, impactCo2 };
  }, [rows]);

  if (!token) {
    return (
      <AppShell>
        <EmptyState
          title="You're not signed in"
          description="Sign in to view optimization suggestions."
          actions={[{ label: "Go to login", href: "/login" }]}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <SectionHeader
          title="Optimization Suggestions"
          subtitle="Actionable recommendations generated from your job runs and telemetry."
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard title="Open suggestions" value={fmtNum(totals.open)} />
          <StatCard title="Potential energy savings (kWh)" value={fmtNum(totals.impactKwh)} />
          <StatCard title="Potential CO2e reduction (kg)" value={fmtNum(totals.impactCo2)} />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[360px]">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search suggestions"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-neutral-900"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-neutral-900"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All statuses" : s}
                  </option>
                ))}
              </select>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-neutral-900"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "All categories" : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-black/50 dark:text-white/50">
            {loading ? "Loading..." : `${filtered.length} of ${rows.length}`}
          </div>
        </div>

        {err ? (
          <EmptyState title="Couldn't load suggestions" description={err} />
        ) : loading ? (
          <div className="rounded-2xl border border-black/10 p-6 dark:border-white/10">
            <div className="text-sm text-black/60 dark:text-white/60">Loading suggestions...</div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No suggestions found"
            description="Once you ingest runs, we'll surface optimization opportunities here."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            <div className="grid grid-cols-12 gap-0 border-b border-black/10 bg-black/[0.02] px-4 py-3 text-xs font-medium text-black/60 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/60">
              <div className="col-span-4">Suggestion</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Effort</div>
              <div className="col-span-2">Impact</div>
              <div className="col-span-1">Priority</div>
              <div className="col-span-1">Status</div>
            </div>

            <div className="divide-y divide-black/10 dark:divide-white/10">
              {filtered.map((s) => {
                const impactKwh = Number(s.impact_kwh) || 0;
                const impactCo2 = Number(s.impact_co2_kg) || 0;

                return (
                  <div key={s.id} className="grid grid-cols-12 gap-0 px-4 py-3 text-sm">
                    <div className="col-span-4">
                      <div className="font-medium">{s.title}</div>
                      {s.description ? (
                        <div className="mt-1 line-clamp-2 text-xs text-black/60 dark:text-white/60">
                          {s.description}
                        </div>
                      ) : null}
                      <div className="mt-2 text-[11px] text-black/40 dark:text-white/40">{fmtDate(s.created_at)}</div>
                    </div>

                    <div className="col-span-2 flex items-start">
                      <span className="rounded-full border border-black/10 px-2 py-1 text-xs dark:border-white/10">
                        {s.category}
                      </span>
                    </div>

                    <div className="col-span-2 flex items-start text-xs text-black/70 dark:text-white/70">
                      {s.effort || "-"}
                    </div>

                    <div className="col-span-2 flex flex-col items-start text-xs">
                      <div>{fmtNum(impactKwh)} kWh</div>
                      <div className="text-black/50 dark:text-white/50">{fmtNum(impactCo2)} kg CO2e</div>
                    </div>

                    <div className="col-span-1 flex items-start text-xs">
                      {typeof s.priority === "number" ? s.priority : "-"}
                    </div>

                    <div className="col-span-1 flex items-start">
                      <span className="rounded-full border border-black/10 px-2 py-1 text-xs dark:border-white/10">
                        {s.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
