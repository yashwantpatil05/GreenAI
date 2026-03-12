"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import CodeSnippet from "./CodeSnippet";

const ONBOARDING_KEY = "greenai_onboarding_done";

type Step = 1 | 2 | 3 | 4;

type Project = {
  id: string;
  name: string;
};

type ApiKey = {
  id: string;
  name: string;
  raw_key?: string | null;
  project_id?: string | null;
};

export default function OnboardingWizard() {
  const { token } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>(1);

  // Step 2
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectErr, setProjectErr] = useState<string | null>(null);

  // Step 3
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatedProjectId, setGeneratedProjectId] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [keyErr, setKeyErr] = useState<string | null>(null);

  // Step 4
  const [validating, setValidating] = useState(false);
  const [validateResult, setValidateResult] = useState<{ valid: boolean; project?: string; plan?: string; job_runs_remaining?: number } | null>(null);
  const [validateErr, setValidateErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done && token) {
      setVisible(true);
      void loadProjects();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadProjects() {
    if (!token) return;
    try {
      const data = await apiFetch<{ items: Project[] }>("/projects", { method: "GET" }, { token });
      const list = data?.items || [];
      setProjects(list);
      if (list.length) setSelectedProjectId(list[0].id);
    } catch {
      // ignore
    }
  }

  function dismiss() {
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_KEY, "1");
    }
    setVisible(false);
  }

  async function createProject() {
    if (!token) return;
    const name = newProjectName.trim();
    if (!name) { setProjectErr("Enter a project name."); return; }
    setCreatingProject(true);
    setProjectErr(null);
    try {
      const proj = await apiFetch<Project>("/projects", { method: "POST", body: JSON.stringify({ name }) }, { token });
      setProjects((prev) => [proj, ...prev]);
      setSelectedProjectId(proj.id);
      setNewProjectName("");
    } catch (e: any) {
      setProjectErr(e?.message || "Failed to create project");
    } finally {
      setCreatingProject(false);
    }
  }

  async function generateKey() {
    if (!token || !selectedProjectId) return;
    setGeneratingKey(true);
    setKeyErr(null);
    try {
      const key = await apiFetch<ApiKey>(
        "/projects/api-keys",
        { method: "POST", body: JSON.stringify({ name: "onboarding-key", scopes: ["ingest"], project_id: selectedProjectId }) },
        { token }
      );
      setGeneratedKey(key?.raw_key || null);
      setGeneratedProjectId(selectedProjectId);
      setStep(3);
    } catch (e: any) {
      setKeyErr(e?.message || "Failed to generate key");
    } finally {
      setGeneratingKey(false);
    }
  }

  async function validateConnection() {
    if (!generatedKey) return;
    setValidating(true);
    setValidateErr(null);
    setValidateResult(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${base}/api/job-runs/validate`, {
        method: "POST",
        headers: { "X-API-Key": generatedKey, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Invalid or expired API key");
      const data = await res.json();
      setValidateResult({ valid: true, ...data });
    } catch (e: any) {
      setValidateErr(e?.message || "Connection failed");
    } finally {
      setValidating(false);
    }
  }

  if (!visible) return null;

  const steps = [
    { num: 1, label: "Welcome" },
    { num: 2, label: "Project" },
    { num: 3, label: "API Key" },
    { num: 4, label: "Verify" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-background shadow-2xl my-auto">
        {/* Close / Skip */}
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground hover:bg-accent z-10"
          aria-label="Skip onboarding"
        >
          ✕
        </button>

        {/* Step progress */}
        <div className="border-b border-border/60 px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-2 flex-1">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  step > s.num
                    ? "bg-emerald-500 text-white"
                    : step === s.num
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {step > s.num ? "✓" : s.num}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step === s.num ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div className={`h-px flex-1 ${step > s.num ? "bg-emerald-500" : "bg-border/60"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-5">
          {/* Step 1 — Welcome */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Welcome to GreenAI</h2>
                <p className="mt-1 text-sm text-muted-foreground">Track the carbon footprint of your ML jobs in 3 lines of code.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { icon: "⚡", title: "Real-time monitoring", desc: "GPU & CPU power draw sampled every 15s" },
                  { icon: "📊", title: "Rich analytics", desc: "Trends, hotspots, and regional breakdowns" },
                  { icon: "🌍", title: "Carbon reports", desc: "Export PDF/CSV for stakeholders" },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="text-2xl">{item.icon}</div>
                    <div className="mt-2 text-sm font-semibold text-foreground">{item.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
                This wizard takes about 2 minutes. You&apos;ll have your first tracked run ready to go.
              </div>
            </div>
          )}

          {/* Step 2 — Create/Select Project */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Create or select a project</h2>
                <p className="mt-1 text-sm text-muted-foreground">Projects group your ML jobs for reporting.</p>
              </div>

              {projectErr && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {projectErr}
                </div>
              )}

              {projects.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-foreground">Select existing project</label>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProjectId(p.id)}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                          selectedProjectId === p.id
                            ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                            : "border-border/60 bg-background text-foreground hover:bg-accent"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={projects.length > 0 ? "border-t border-border/60 pt-4" : ""}>
                <label className="text-xs font-medium text-foreground">
                  {projects.length > 0 ? "Or create a new project" : "Create your first project"}
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void createProject(); }}
                    placeholder="e.g., Production Training"
                    className="flex-1 rounded-xl border border-border/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={() => void createProject()}
                    disabled={creatingProject}
                    className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
                  >
                    {creatingProject ? "..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — API Key + Code Snippet */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Your API key &amp; quick start</h2>
                <p className="mt-1 text-sm text-muted-foreground">Add 3 lines to your training script. Your key is pre-filled below.</p>
              </div>

              {keyErr && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {keyErr}
                </div>
              )}

              {!generatedKey ? (
                <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-4">Click below to generate your API key</p>
                  <button
                    onClick={() => void generateKey()}
                    disabled={generatingKey || !selectedProjectId}
                    className="rounded-xl bg-black px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
                  >
                    {generatingKey ? "Generating..." : "Generate API Key"}
                  </button>
                </div>
              ) : (
                <CodeSnippet
                  apiKey={generatedKey}
                  projectId={generatedProjectId ?? undefined}
                  showInstall={true}
                />
              )}
            </div>
          )}

          {/* Step 4 — Verify Connection */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Verify your connection</h2>
                <p className="mt-1 text-sm text-muted-foreground">Test that your API key is working before you write any code.</p>
              </div>

              {!validateResult && !validateErr && (
                <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Click below to validate your API key against the backend.
                  </p>
                  <button
                    onClick={() => void validateConnection()}
                    disabled={validating || !generatedKey}
                    className="rounded-xl bg-black px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
                  >
                    {validating ? "Testing..." : "Test Connection"}
                  </button>
                </div>
              )}

              {validateErr && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <span>✗</span> Connection failed
                  </div>
                  <p className="mt-1 text-xs text-destructive/80">{validateErr}</p>
                  <button
                    onClick={() => { setValidateErr(null); setValidateResult(null); }}
                    className="mt-3 text-xs text-muted-foreground underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {validateResult?.valid && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>✓</span> Connection successful!
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    {validateResult.project && (
                      <div className="rounded-lg bg-emerald-500/10 px-3 py-2">
                        <div className="text-muted-foreground">Project</div>
                        <div className="font-medium text-foreground mt-0.5">{validateResult.project}</div>
                      </div>
                    )}
                    {validateResult.plan && (
                      <div className="rounded-lg bg-emerald-500/10 px-3 py-2">
                        <div className="text-muted-foreground">Plan</div>
                        <div className="font-medium text-foreground mt-0.5 capitalize">{validateResult.plan}</div>
                      </div>
                    )}
                    {validateResult.job_runs_remaining !== undefined && (
                      <div className="rounded-lg bg-emerald-500/10 px-3 py-2 col-span-2">
                        <div className="text-muted-foreground">Job runs remaining this month</div>
                        <div className="font-medium text-foreground mt-0.5">{validateResult.job_runs_remaining.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/60 px-6 py-4">
          <button
            onClick={dismiss}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Skip for now
          </button>
          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as Step)}
                className="rounded-xl border border-border/60 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={() => {
                  if (step === 2 && !selectedProjectId) {
                    setProjectErr("Select or create a project first.");
                    return;
                  }
                  if (step === 3 && !generatedKey) {
                    void generateKey();
                    return;
                  }
                  setStep((s) => (s + 1) as Step);
                }}
                disabled={step === 3 && generatingKey}
                className="rounded-xl bg-black px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {step === 3 && !generatedKey ? "Generate & Continue" : "Next"}
              </button>
            ) : (
              <button
                onClick={dismiss}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Go to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Exported function to re-open the wizard
export function openOnboardingWizard() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(ONBOARDING_KEY);
    window.location.reload();
  }
}
