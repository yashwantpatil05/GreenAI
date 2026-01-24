"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
};

type ApiKey = {
  id: string;
  created_at?: string;
  name: string;
  key_prefix?: string | null;
  scopes?: string[] | null;
  is_active?: boolean;
  revoked_at?: string | null;
  project_id?: string | null;
  organization_id?: string | null;
  raw_key?: string | null;
};

function fmt(dt?: string | null) {
  if (!dt) return "-";
  const parsed = new Date(dt);
  return Number.isNaN(parsed.getTime()) ? dt : parsed.toLocaleString();
}

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function ApiKeysPage() {
  const { token } = useAuth();
  const isAuthenticated = !!token;

  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);

  const [err, setErr] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newProjectId, setNewProjectId] = useState<string>("");
  const [newScopes, setNewScopes] = useState<string[]>(["ingest"]);

  const [rawKey, setRawKey] = useState<string | null>(null);

  const scopeOptions = useMemo(
    () => [
      { id: "ingest", label: "Ingest telemetry" },
      { id: "read", label: "Read dashboards" },
      { id: "admin", label: "Admin operations" },
    ],
    []
  );

  async function loadProjects() {
    if (!token) return;
    setProjectsLoading(true);
    try {
      const data = await apiFetch<Project[]>("/projects/", { method: "GET" }, { token });
      setProjects(data || []);
      if (!newProjectId && data?.length) setNewProjectId(data[0].id);
    } catch (e: any) {
      setErr(e?.message || "Failed to load projects");
    } finally {
      setProjectsLoading(false);
    }
  }

  async function loadKeys() {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<ApiKey[]>("/projects/api-keys", { method: "GET" }, { token });
      setKeys(data || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    void loadProjects();
    void loadKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredKeys = useMemo(() => {
    return [...keys].sort((a, b) => {
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      return tb - ta;
    });
  }, [keys]);

  async function onCreate() {
    if (!token) return;
    setErr(null);

    const name = newName.trim();
    if (!name) {
      setErr("Please enter an API key name.");
      return;
    }
    if (!newProjectId) {
      setErr("Please select a project.");
      return;
    }
    if (!newScopes.length) {
      setErr("Select at least one scope.");
      return;
    }

    setCreating(true);
    try {
      const payload = { name, scopes: newScopes, project_id: newProjectId };
      const created = await apiFetch<ApiKey>(
        "/projects/api-keys",
        { method: "POST", body: JSON.stringify(payload) },
        { token }
      );

      setKeys((prev) => [created, ...prev]);
      setCreateOpen(false);
      setNewName("");
      setNewScopes(["ingest"]);

      if (created?.raw_key) setRawKey(created.raw_key);
      else setErr("API key created, but raw key was not returned (check backend response).");
    } catch (e: any) {
      setErr(e?.message || "Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  async function onRevoke(id: string) {
    if (!token) return;
    setErr(null);
    try {
      const updated = await apiFetch<ApiKey>(`/projects/api-keys/${id}/revoke`, { method: "POST" }, { token });
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, ...updated } : k)));
    } catch (e: any) {
      setErr(e?.message || "Failed to revoke API key");
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="px-6 py-8">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="mt-2 text-sm text-neutral-500">You need to be logged in to manage API keys.</p>
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex items-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
            <p className="mt-1 text-sm text-neutral-500">Create scoped keys for SDK/CLI ingestion. Raw keys are shown once.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setErr(null);
                setCreateOpen(true);
              }}
              className="inline-flex items-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              disabled={projectsLoading}
            >
              + New API Key
            </button>
            <button
              onClick={() => {
                void loadProjects();
                void loadKeys();
              }}
              className="inline-flex items-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-neutral-900">Keys ({filteredKeys.length})</div>
              <div className="text-xs text-neutral-500">{loading ? "Loading..." : "Up to date"}</div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200">
              <div className="grid grid-cols-12 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-600">
                <div className="col-span-4">Name</div>
                <div className="col-span-3">Key Prefix</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Created</div>
                <div className="col-span-1 text-right">Action</div>
              </div>

              {loading ? (
                <div className="px-3 py-6 text-sm text-neutral-500">Loading API keys...</div>
              ) : filteredKeys.length === 0 ? (
                <div className="px-3 py-6 text-sm text-neutral-500">
                  No API keys yet. Click <span className="font-medium">New API Key</span>.
                </div>
              ) : (
                <div className="divide-y divide-neutral-200">
                  {filteredKeys.map((k) => {
                    const active = k.is_active !== false && !k.revoked_at;
                    return (
                      <div key={k.id} className="grid grid-cols-12 items-center px-3 py-3">
                        <div className="col-span-4">
                          <div className="text-sm font-medium text-neutral-900">{k.name}</div>
                          <div className="mt-0.5 text-xs text-neutral-500">Scopes: {(k.scopes || ["ingest"]).join(", ")}</div>
                        </div>

                        <div className="col-span-3">
                          <div className="font-mono text-xs text-neutral-700">{k.key_prefix || "-"}</div>
                        </div>

                        <div className="col-span-2">
                          <span
                            className={classNames(
                              "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                              active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"
                            )}
                          >
                            {active ? "Active" : "Revoked"}
                          </span>
                        </div>

                        <div className="col-span-2 text-xs text-neutral-600">{fmt(k.created_at)}</div>

                        <div className="col-span-1 flex justify-end">
                          {active ? (
                            <button
                              onClick={() => void onRevoke(k.id)}
                              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-50"
                            >
                              Revoke
                            </button>
                          ) : (
                            <span className="text-xs text-neutral-400">-</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-3 text-xs text-neutral-500">
              Tip: use your key in SDK/CLI via <span className="font-mono">X-API-Key</span>.
            </div>
          </div>
        </div>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <div className="text-base font-semibold">Create API Key</div>
                <div className="mt-0.5 text-xs text-neutral-500">You'll see the raw key only once.</div>
              </div>
              <button
                onClick={() => setCreateOpen(false)}
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="grid gap-4">
                <div>
                  <label className="text-xs font-medium text-neutral-700">Key name</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., ingest-prod"
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-700">Project</label>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                    disabled={projectsLoading}
                  >
                    {projectsLoading ? (
                      <option>Loading...</option>
                    ) : projects.length ? (
                      projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))
                    ) : (
                      <option value="">No projects found</option>
                    )}
                  </select>
                  {!projectsLoading && projects.length === 0 && (
                    <div className="mt-2 text-xs text-neutral-500">
                      Create a project first in <span className="font-medium">Projects</span>.
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-700">Scopes</label>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {scopeOptions.map((s) => {
                      const checked = newScopes.includes(s.id);
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => {
                            setNewScopes((prev) =>
                              checked ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                            );
                          }}
                          className={classNames(
                            "rounded-xl border px-3 py-2 text-left text-xs",
                            checked
                              ? "border-black bg-black text-white"
                              : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                          )}
                        >
                          <div className="font-medium">{s.id}</div>
                          <div className={classNames("mt-0.5", checked ? "text-white/80" : "text-neutral-500")}>
                            {s.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-4">
              <button
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void onCreate()}
                disabled={creating || projects.length === 0}
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rawKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <div className="text-base font-semibold">API Key Created</div>
                <div className="mt-0.5 text-xs text-neutral-500">Copy and store it securely — it won't be shown again.</div>
              </div>
              <button
                onClick={() => setRawKey(null)}
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <div className="break-all font-mono text-xs text-neutral-800">{rawKey}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-4">
              <button
                onClick={() => {
                  void copy(rawKey);
                }}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
              >
                Copy
              </button>
              <button
                onClick={() => setRawKey(null)}
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
