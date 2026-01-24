"use client";

import { FormEvent, useEffect, useState } from "react";

import EmptyState from "../../components/EmptyState";
import SectionHeader from "../../components/SectionHeader";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
};

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function ProjectsPage() {
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Project[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);

  async function load() {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<Project[]>("/projects", {}, { token });
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load projects");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !form.name.trim()) return;
    setCreating(true);
    setErr(null);
    try {
      await apiFetch<Project>(
        "/projects",
        {
          method: "POST",
          body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || undefined }),
        },
        { token },
      );
      setForm({ name: "", description: "" });
      await load();
    } catch (e: any) {
      setErr(e?.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  if (!token) {
    return (
      <EmptyState
        title="You’re not signed in"
        description="Sign in to manage projects."
        actions={[{ label: "Go to login", href: "/login" }]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Projects" subtitle="Organize and manage your ML workloads by project." />

      <form
        onSubmit={onCreate}
        className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm md:flex-row md:items-end"
      >
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <input
            className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <input
            className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create project"}
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {loading ? (
          <div className="rounded-2xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
            Loading projects…
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="No projects yet" description="Create your first project to begin tracking runs." />
        ) : (
          items.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
              <div className="text-lg font-semibold text-foreground">{p.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">{p.description || "No description"}</div>
              <div className="mt-3 text-xs text-muted-foreground">Created: {fmtDate(p.created_at)}</div>
              <div className="mt-2 text-xs text-muted-foreground break-all">Project ID: {p.id}</div>
            </div>
          ))
        )}
      </div>
      {err ? <div className="text-sm text-rose-500">{err}</div> : null}
    </div>
  );
}
