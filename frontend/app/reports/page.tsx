"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

import SectionHeader from "../../components/SectionHeader";
import StatCard from "../../components/StatCard";
import DataTable, { type DataTableColumn } from "../../components/DataTable";
import EmptyState from "../../components/EmptyState";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
};

type Report = {
  id: string;
  project_id: string;
  name: string;
  period: string;
  status: string;
  summary?: Record<string, any> | null;
  s3_path?: string | null;
  created_at: string;
  updated_at: string;
};

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

function isHttpUrl(v?: string | null) {
  if (!v) return false;
  return v.startsWith("http://") || v.startsWith("https://");
}

function StatusPill({ value }: { value: string }) {
  const v = (value || "").toLowerCase();
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset";
  if (v.includes("complete") || v.includes("success") || v.includes("ready")) {
    return <span className={`${base} bg-emerald-500/10 text-emerald-500 ring-emerald-500/30`}>{value}</span>;
  }
  if (v.includes("fail") || v.includes("error")) {
    return <span className={`${base} bg-destructive/10 text-destructive ring-destructive/30`}>{value}</span>;
  }
  if (v.includes("run") || v.includes("progress") || v.includes("pending")) {
    return <span className={`${base} bg-amber-500/10 text-amber-500 ring-amber-500/30`}>{value}</span>;
  }
  return <span className={`${base} bg-muted text-muted-foreground ring-border`}>{value}</span>;
}

export default function ReportsPage() {
  const qc = useQueryClient();
  const { token } = useAuth();

  const [projectId, setProjectId] = React.useState<string>("");
  const [query, setQuery] = React.useState<string>("");

  const projectsQ = useQuery({
    queryKey: ["projects"],
    enabled: Boolean(token),
    queryFn: async () => {
      const res = await apiFetch<Project[]>("/projects/", {}, { token: token || undefined });
      return res ?? [];
    },
  });

  const reportsQ = useQuery({
    queryKey: ["reports"],
    enabled: Boolean(token),
    queryFn: async () => {
      const res = await apiFetch<Report[]>("/reports/", {}, { token: token || undefined });
      return res ?? [];
    },
  });

  const createReport = useMutation({
    mutationFn: async (pid: string) => {
      return apiFetch<Report>(`/reports/${pid}`, { method: "POST" }, { token: token || undefined });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const projects = projectsQ.data ?? [];
  const reports = reportsQ.data ?? [];

  const projectMap = React.useMemo(() => {
    const m = new Map<string, Project>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports
      .filter((r) => (projectId ? r.project_id === projectId : true))
      .filter((r) => {
        if (!q) return true;
        const pn = projectMap.get(r.project_id)?.name ?? "";
        return (
          r.name?.toLowerCase().includes(q) ||
          r.period?.toLowerCase().includes(q) ||
          r.status?.toLowerCase().includes(q) ||
          pn.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [reports, projectId, query, projectMap]);

  const stats = React.useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter((r) => (r.status || "").toLowerCase().includes("complete")).length;
    const running = filtered.filter((r) => {
      const s = (r.status || "").toLowerCase();
      return s.includes("run") || s.includes("progress") || s.includes("pending");
    }).length;
    const latest = filtered[0]?.created_at ? fmt(filtered[0].created_at) : "—";
    return { total, completed, running, latest };
  }, [filtered]);

  const columns = React.useMemo<DataTableColumn<Report>[]>(() => {
    return [
      {
        key: "name",
        header: "Report",
        cell: (row: Report) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.name}</span>
            <span className="text-xs text-muted-foreground">Period: {row.period}</span>
          </div>
        ),
      },
      {
        key: "project",
        header: "Project",
        cell: (row: Report) => (
          <div className="text-sm text-muted-foreground">
            {projectMap.get(row.project_id)?.name ?? row.project_id}
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (row: Report) => <StatusPill value={row.status} />,
      },
      {
        key: "created_at",
        header: "Created",
        cell: (row: Report) => <span className="text-sm text-muted-foreground">{fmt(row.created_at)}</span>,
      },
      {
        key: "actions",
        header: "",
        align: "right",
        cell: (row: Report) => {
          const href = row.s3_path || "";
          return (
            <div className="flex items-center justify-end gap-2">
              {isHttpUrl(href) ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Open
                </a>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const v = href || "";
                    if (!v) return;
                    try {
                      await navigator.clipboard.writeText(v);
                    } catch {}
                  }}
                  className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
                  disabled={!href}
                  title={href ? "Copy storage path" : "No path available"}
                >
                  Copy path
                </button>
              )}
            </div>
          );
        },
      },
    ];
  }, [projectMap]);

  const loading = projectsQ.isLoading || reportsQ.isLoading;
  const error =
    projectsQ.error?.message ||
    reportsQ.error?.message ||
    (createReport.error as any)?.message ||
    "";

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Reports"
        subtitle="Generate and access ESG-ready emission reports per project and period."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                const pid = projectId || projects[0]?.id || "";
                if (!pid) return;
                createReport.mutate(pid);
              }}
              disabled={!token || createReport.isPending || (!projectId && projects.length === 0)}
              className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              title={!projectId && projects.length === 0 ? "Create a project first" : "Generate report"}
           >
              {createReport.isPending ? "Generating..." : "Generate report"}
            </button>
          </div>
        }
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {String(error)}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Reports" value={String(stats.total)} />
        <StatCard label="Completed" value={String(stats.completed)} />
        <StatCard label="In progress" value={String(stats.running)} />
        <StatCard label="Latest" value={stats.latest} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by report, project, period, status"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No reports yet"
          description="Generate a report for a project to see it here."
          actions={[{
            label: "Generate report",
            onClick: () => {
              const pid = projectId || projects[0]?.id || "";
              if (!pid) return;
              createReport.mutate(pid);
            },
          }]}
        />
      ) : (
        <DataTable<Report> data={filtered} columns={columns} getRowId={(r) => r.id} />
      )}
    </div>
  );
}
