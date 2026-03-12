"use client";

import { useState } from "react";

type Language = "python" | "curl" | "nodejs";

interface CodeSnippetProps {
  apiKey?: string;
  projectId?: string;
  showInstall?: boolean;
}

function buildPython(apiKey: string, projectId: string): string {
  return `import greenai

# Initialize once (or set GREENAI_API_KEY + GREENAI_PROJECT_ID env vars)
greenai.init(
    api_key="${apiKey}",
    project_id="${projectId}"
)

# Wrap your training job
with greenai.track("my-training-run"):
    model.fit(X_train, y_train)

# Carbon data is automatically sent to your dashboard`;
}

function buildCurl(apiKey: string, projectId: string): string {
  return `curl -X POST https://api.greenai.dev/api/ingest/job-run \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "run_id": "run-001",
    "run_name": "my-training-run",
    "project_id": "${projectId}",
    "status": "success",
    "start_time": "2026-02-15T10:00:00Z",
    "end_time": "2026-02-15T12:00:00Z",
    "hardware": {
      "gpu_count": 1,
      "gpu_model": "NVIDIA A100",
      "cpu_count": 8
    },
    "region": "us-east-1",
    "job_type": "training"
  }'`;
}

function buildNodejs(apiKey: string, projectId: string): string {
  return `const axios = require('axios');

const client = axios.create({
  baseURL: 'https://api.greenai.dev',
  headers: { 'X-API-Key': '${apiKey}' }
});

await client.post('/api/ingest/job-run', {
  run_id: 'run-001',
  run_name: 'my-training-run',
  project_id: '${projectId}',
  status: 'success',
  start_time: new Date().toISOString(),
  end_time: new Date().toISOString(),
  hardware: { gpu_count: 1, gpu_model: 'NVIDIA A100' },
  region: 'us-east-1',
  job_type: 'training'
});`;
}

const INSTALL_CMD = "pip install greenai-tracker";

const LANG_LABELS: Record<Language, string> = {
  python: "Python",
  curl: "cURL",
  nodejs: "Node.js",
};

export default function CodeSnippet({ apiKey, projectId, showInstall = true }: CodeSnippetProps) {
  const [lang, setLang] = useState<Language>("python");
  const [codeCopied, setCodeCopied] = useState(false);
  const [installCopied, setInstallCopied] = useState(false);

  const displayKey = apiKey || "YOUR_API_KEY";
  const displayProject = projectId || "YOUR_PROJECT_ID";

  const codeMap: Record<Language, string> = {
    python: buildPython(displayKey, displayProject),
    curl: buildCurl(displayKey, displayProject),
    nodejs: buildNodejs(displayKey, displayProject),
  };

  const code = codeMap[lang];

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function copyInstall() {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setInstallCopied(true);
      setTimeout(() => setInstallCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Header with language tabs */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-2">
        <div className="flex gap-1">
          {(Object.keys(LANG_LABELS) as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                lang === l
                  ? "bg-background border border-border/60 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          {codeCopied ? (
            <>
              <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code block */}
      <pre className="overflow-x-auto bg-[#0d1117] px-5 py-4 text-xs leading-relaxed text-[#e6edf3] font-mono">
        <code>{code}</code>
      </pre>

      {/* Install command */}
      {showInstall && lang === "python" && (
        <div className="border-t border-border/60 bg-muted/10 px-4 py-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">Install SDK first:</div>
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-3 py-2">
            <code className="font-mono text-xs text-foreground">{INSTALL_CMD}</code>
            <button
              onClick={copyInstall}
              className="ml-3 flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            >
              {installCopied ? (
                <>
                  <svg className="h-3 w-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
