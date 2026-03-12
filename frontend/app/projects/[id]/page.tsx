"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  default_cloud_provider?: string | null;
  default_region?: string | null;
};

function fmtDate(s?: string) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cloudProvider, setCloudProvider] = useState("");
  const [region, setRegion] = useState("");

  const dirty = useMemo(() => {
    if (!project) return false;
    return (
      (name ?? "") !== (project.name ?? "") ||
      (description ?? "") !== (project.description ?? "") ||
      (cloudProvider ?? "") !== (project.default_cloud_provider ?? "") ||
      (region ?? "") !== (project.default_region ?? "")
    );
  }, [project, name, description, cloudProvider, region]);

  async function load() {
    if (!token) {
      setLoading(false);
      setProject(null);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<Project>(`/projects/${id}`, {}, { token });
      setProject(data);
      setName(data?.name ?? "");
      setDescription(data?.description ?? "");
      setCloudProvider(data?.default_cloud_provider ?? "");
      setRegion(data?.default_region ?? "");
    } catch (e: any) {
      setErr(e?.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  async function onSave() {
    if (!token || !project) return;

    const n = name.trim();
    if (!n) {
      setErr("Project name is required.");
      return;
    }
    if (n.length > 200) {
      setErr("Project name is too long (max 200 chars).");
      return;
    }

    setSaving(true);
    setErr(null);
    try {
      const payload = {
        name: n,
        description: description.trim() ? description.trim() : null,
        default_cloud_provider: cloudProvider.trim() ? cloudProvider.trim() : null,
        default_region: region.trim() ? region.trim() : null,
      };

      const updated = await apiFetch<Project>(
        `/projects/${project.id}`,
        { method: "PATCH", body: JSON.stringify(payload) },
        { token }
      );

      setProject(updated);
      setName(updated?.name ?? "");
      setDescription(updated?.description ?? "");
      setCloudProvider(updated?.default_cloud_provider ?? "");
      setRegion(updated?.default_region ?? "");
    } catch (e: any) {
      setErr(e?.message || "Failed to save project");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!token || !project) return;
    const ok = window.confirm(`Delete project "${project.name}"? This cannot be undone.`);
    if (!ok) return;

    setDeleting(true);
    setErr(null);
    try {
      await apiFetch(`/projects/${project.id}`, { method: "DELETE" }, { token });
      router.push("/projects");
    } catch (e: any) {
      setErr(e?.message || "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-6">
        <div className="card">
          <div className="text-lg font-semibold">Project</div>
          <div className="mt-2 text-sm text-gray-500">You are not signed in.</div>
          <div className="mt-4">
            <Link className="btn" href="/login">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-gray-500">
          <Link className="hover:underline" href="/projects">
            Projects
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700 dark:text-gray-200">{project?.name ?? "Loading..."}</span>
        </div>

        <div className="flex items-center gap-2">
          <Link className="btn" href={`/api-keys?project=${id}`}>
            API Keys
          </Link>
          <Link className="btn" href={`/runs?project=${id}`}>
            Runs
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-lg font-semibold">{loading ? "Loading..." : project?.name || "Project"}</div>
            <div className="mt-1 text-sm text-gray-500">
              Project settings impact ingestion defaults and reporting.
            </div>
            {project?.id ? <div className="mt-2 text-xs text-gray-500">{project.id}</div> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn" onClick={load} disabled={loading || saving}>
              Refresh
            </button>
            <button className="btn" onClick={onSave} disabled={!dirty || saving || loading}>
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button className="btn" onClick={onDelete} disabled={deleting || loading}>
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {err}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="mb-1 text-xs font-medium text-gray-500">Project Name</div>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-300 dark:border-white/10 dark:bg-white/5"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project name"
                  disabled={loading || saving || deleting}
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-xs font-medium text-gray-500">Description</div>
                <textarea
                  className="min-h-[110px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-300 dark:border-white/10 dark:bg-white/5"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                  disabled={loading || saving || deleting}
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">Default Cloud Provider</div>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-300 dark:border-white/10 dark:bg-white/5"
                  value={cloudProvider}
                  onChange={(e) => setCloudProvider(e.target.value)}
                  placeholder="e.g., AWS, GCP, Azure"
                  disabled={loading || saving || deleting}
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">Default Region</div>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-300 dark:border-white/10 dark:bg-white/5"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g., ap-south-1"
                  disabled={loading || saving || deleting}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            <div className="text-sm font-semibold">Metadata</div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-800 dark:text-gray-200">{fmtDate(project?.created_at)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Updated</span>
                <span className="text-gray-800 dark:text-gray-200">{fmtDate(project?.updated_at)}</span>
              </div>
              <div className="pt-2">
                <div className="text-xs font-medium text-gray-500">Helpful</div>
                <div className="mt-2 flex flex-col gap-2">
                  <Link className="btn" href={`/api-keys?project=${id}`}>
                    Create / View API Keys
                  </Link>
                  <Link className="btn" href={`/runs?project=${id}`}>
                    Inspect Job Runs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {dirty ? <div className="mt-4 text-xs text-gray-500">You have unsaved changes.</div> : null}
      </div>
    </div>
  );
}
