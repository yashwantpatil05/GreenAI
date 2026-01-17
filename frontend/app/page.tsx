"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import EmptyState from "../components/EmptyState";
import RunStatusBadge from "../components/RunStatusBadge";
import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
import { useAuth } from "../hooks/useAuth";
import { apiFetch } from "../lib/api";

type Overview = {
  total_runs?: number;
  carbon_kg?: number;
  energy_kwh?: number;
  total_cost?: number;
  avg_carbon_per_run?: number;
};

type TrendPoint = {
  date: string;
  carbon_kg?: number;
  energy_kwh?: number;
  cost?: number;
};

type Hotspot = {
  job_type: string;
  runs: number;
  carbon_kg: number;
  energy_kwh: number;
  cost: number;
};

type JobRunAny = Record<string, any>;

function fmtNum(v: number | null | undefined, digits = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(n);
}

function fmtUsd(v: number | null | undefined) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

function toRunMetrics(r: JobRunAny) {
  const energy =
    Number(r.energy_kwh) ||
    Number(r.energy_kwh_total) ||
    Number(r.energy?.total_kwh) ||
    Number(r.energy?.kwh_total) ||
    0;
  const carbon =
    Number(r.carbon_kg_co2e) ||
    Number(r.carbon_kg) ||
    Number(r.energy?.emissions_kg) ||
    0;
  const cost =
    Number(r.cost_usd) ||
    Number(r.total_cost_usd) ||
    Number(r.costs?.amount_usd) ||
    0;
  return { energy, carbon, cost };
}

export default function DashboardPage() {
  const { token } = useAuth();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [runs, setRuns] = useState<JobRunAny[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    setLoading(true);
    setErr(null);

    (async () => {
      try {
        const [ov, tr, hs, jr] = await Promise.all([
          apiFetch<Overview>("/analytics/overview", {}, { token }),
          apiFetch<TrendPoint[]>("/analytics/trends?days=14", {}, { token }),
          apiFetch<Hotspot[]>("/analytics/hotspots?limit=8", {}, { token }),
          apiFetch<JobRunAny[]>("/job-runs", {}, { token }),
        ]);
        if (!alive) return;
        setOverview(ov);
        setTrends(Array.isArray(tr) ? tr : []);
        setHotspots(Array.isArray(hs) ? hs : []);
        setRuns(Array.isArray(jr) ? jr : []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load dashboard data");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  const topRuns = useMemo(() => {
    const copy = [...runs];
    copy.sort((a, b) => {
      const da = new Date(a.updated_at || a.created_at || a.end_time || a.start_time || 0).getTime();
      const db = new Date(b.updated_at || b.created_at || b.end_time || b.start_time || 0).getTime();
      return db - da;
    });
    return copy.slice(0, 8);
  }, [runs]);

  const chartData = useMemo(
    () =>
      (trends || []).map((p) => ({
        date: p.date,
        carbon_kg: Number(p.carbon_kg) || 0,
        energy_kwh: Number(p.energy_kwh) || 0,
        cost: Number(p.cost) || 0,
      })),
    [trends],
  );

  const energyBreakdown = useMemo(() => {
    if (hotspots?.length) {
      return hotspots.slice(0, 6).map((h) => ({
        name: h.job_type,
        kwh: Number(h.energy_kwh) || 0,
      }));
    }
    return [{ name: "Total", kwh: Number(overview?.energy_kwh) || 0 }];
  }, [hotspots, overview]);

  if (!token) {
    return (
      <EmptyState
        title="You're not signed in"
        description="Sign in to view dashboard metrics."
        actions={[{ label: "Go to login", href: "/login" }]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dashboard"
        subtitle="Real-time overview of carbon, energy, and costs across your recent runs."
      />

      {err ? (
        <EmptyState
          title="Dashboard data failed to load"
          description={err}
          actions={[{ label: "Retry", onClick: () => window.location.reload() }]}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Runs" value={loading ? "..." : fmtNum(overview?.total_runs)} subtitle="Total tracked" />
        <StatCard title="Carbon" value={loading ? "..." : `${fmtNum(overview?.carbon_kg, 2)} kg`} subtitle="CO2e total" />
        <StatCard title="Energy" value={loading ? "..." : `${fmtNum(overview?.energy_kwh, 2)} kWh`} subtitle="Total consumption" />
        <StatCard title="Cost" value={loading ? "..." : fmtUsd(overview?.total_cost)} subtitle="Estimated spend" />
        <StatCard title="Avg / run" value={loading ? "..." : `${fmtNum(overview?.avg_carbon_per_run, 2)} kg`} subtitle="CO2e per run" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3">
            <div className="text-sm font-medium text-white">Carbon trend</div>
            <div className="text-xs text-white/60">Last 14 days</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={8} />
                <YAxis tick={{ fontSize: 12 }} tickMargin={8} />
                <Tooltip />
                <Area type="monotone" dataKey="carbon_kg" stroke="#10b981" fill="#10b98122" />
                <Area type="monotone" dataKey="energy_kwh" stroke="#22d3ee" fill="#22d3ee22" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3">
            <div className="text-sm font-medium text-white">Energy by job type</div>
            <div className="text-xs text-white/60">Top workloads</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={energyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="kwh" fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3">
          <div className="text-sm font-medium text-white">Recent runs</div>
          <div className="text-xs text-white/60">Latest ingested jobs</div>
        </div>

        {topRuns.length === 0 ? (
          <EmptyState title="No runs yet" description="Ingest your first run to see telemetry." />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/60">
                <tr>
                  <th className="py-2 pr-4 text-left">Name</th>
                  <th className="py-2 pr-4 text-left">Type</th>
                  <th className="py-2 pr-4 text-left">Updated</th>
                  <th className="py-2 pr-4 text-left">Energy</th>
                  <th className="py-2 pr-4 text-left">CO2e</th>
                  <th className="py-2 pr-0 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topRuns.map((r) => {
                  const m = toRunMetrics(r);
                  return (
                    <tr key={r.id}>
                      <td className="py-3 pr-4">{r.run_name || r.id}</td>
                      <td className="py-3 pr-4 text-white/70">{r.job_type || "-"}</td>
                      <td className="py-3 pr-4 text-white/70">
                        {new Date(r.updated_at || r.created_at || r.end_time || r.start_time || 0).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">{fmtNum(m.energy, 3)} kWh</td>
                      <td className="py-3 pr-4">{fmtNum(m.carbon, 3)} kg</td>
                      <td className="py-3 pr-0">
                        <RunStatusBadge status={r.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
