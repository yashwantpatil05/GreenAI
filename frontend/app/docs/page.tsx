"use client";

import { useState } from "react";
import CodeSnippet from "../../components/CodeSnippet";
import { useAuth } from "../../hooks/useAuth";

type Tab = "quickstart" | "sdk" | "rest" | "frameworks" | "faq";

const TAB_LABELS: Record<Tab, string> = {
  quickstart: "Quick Start",
  sdk: "Python SDK",
  rest: "REST API",
  frameworks: "Framework Guides",
  faq: "FAQ",
};

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-xs text-foreground">
      {children}
    </code>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>;
}

function SmallCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function doCopy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }
  return (
    <div className="relative rounded-xl overflow-hidden border border-border/60">
      <pre className="bg-[#0d1117] px-4 py-3 text-xs text-[#e6edf3] font-mono overflow-x-auto">{code}</pre>
      <button
        onClick={doCopy}
        className="absolute right-2 top-2 rounded-lg border border-border/40 bg-background/80 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export default function DocsPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("quickstart");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Documentation</h1>
        <p className="mt-1 text-sm text-muted-foreground">SDK reference, API docs, framework guides, and FAQs.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border/60 overflow-x-auto pb-0">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Quick Start */}
      {tab === "quickstart" && (
        <div className="space-y-6 max-w-3xl">
          <Section title="Install the SDK">
            <Prose>Install the <InlineCode>greenai-tracker</InlineCode> package from PyPI:</Prose>
            <SmallCodeBlock code="pip install greenai-tracker" />
          </Section>

          <Section title="3-line integration">
            <Prose>Add carbon tracking to any Python ML script in 3 lines:</Prose>
            <CodeSnippet showInstall={false} />
          </Section>

          <Section title="Environment variable config">
            <Prose>
              Set these once in your <InlineCode>.env</InlineCode> file and never pass credentials in code:
            </Prose>
            <SmallCodeBlock code={`GREENAI_API_KEY=gai_live_your_key_here\nGREENAI_PROJECT_ID=proj_your_project_id`} />
            <Prose>Then use the SDK with zero arguments:</Prose>
            <SmallCodeBlock code={`import greenai\n\n# Reads from environment variables automatically\nwith greenai.track("my-run"):\n    model.fit(X_train, y_train)`} />
          </Section>

          <Section title="Decorator pattern">
            <SmallCodeBlock code={`import greenai\n\n@greenai.track_function(run_name="training")\ndef train_model(X, y):\n    model.fit(X, y)\n\ntrain_model(X_train, y_train)  # Carbon tracked automatically`} />
          </Section>
        </div>
      )}

      {/* Python SDK */}
      {tab === "sdk" && (
        <div className="space-y-6 max-w-3xl">
          <Section title="greenai.init()">
            <Prose>Initialize the default tracker. Call once at program start.</Prose>
            <SmallCodeBlock code={`greenai.init(\n    api_key="gai_live_...",     # or GREENAI_API_KEY env var\n    project_id="proj_...",      # or GREENAI_PROJECT_ID env var\n    job_type="training",        # training | inference | data_processing\n    region="us-east-1",        # auto-detected if on cloud VM\n    sample_interval=15,         # power sampling interval in seconds\n)`} />
          </Section>

          <Section title="greenai.track()">
            <Prose>Context manager — tracks start/end and submits carbon data on exit.</Prose>
            <SmallCodeBlock code={`with greenai.track("bert-finetuning"):\n    trainer.train()\n# Carbon data sent to dashboard automatically`} />
            <Prose>Or override credentials per-run:</Prose>
            <SmallCodeBlock code={`with greenai.track("bert-v2", api_key="gai_...", project_id="proj_..."):\n    trainer.train()`} />
          </Section>

          <Section title="greenai.track_function()">
            <Prose>Decorator for standalone training functions.</Prose>
            <SmallCodeBlock code={`@greenai.track_function(run_name="resnet-training")\ndef train():\n    model.fit(X, y)\n\ntrain()  # tracked automatically`} />
          </Section>

          <Section title="GreenAITracker (low-level)">
            <Prose>For manual start/stop control:</Prose>
            <SmallCodeBlock code={`from greenai import GreenAITracker\n\ntracker = GreenAITracker(\n    api_key="gai_...",\n    project_id="proj_...",\n    region="us-east-1",\n)\n\ntracker.start("run-name")\n# ... training ...\ntracker.stop()  # sends payload`} />
          </Section>

          <Section title="greenai.validate()">
            <Prose>Check your API key is valid before running a long job:</Prose>
            <SmallCodeBlock code={`result = greenai.validate()\nprint(result)\n# {'valid': True, 'project': 'My Project', 'plan': 'starter', 'job_runs_remaining': 9750}`} />
          </Section>

          <Section title="Hardware detection">
            <Prose>
              The SDK automatically detects hardware. On machines with NVIDIA GPUs it uses{" "}
              <InlineCode>pynvml</InlineCode> for real-time power draw. Install the GPU extra for this:
            </Prose>
            <SmallCodeBlock code="pip install greenai-tracker[gpu]" />
            <Prose>CPU power is estimated from utilisation × TDP using <InlineCode>psutil</InlineCode>.</Prose>
          </Section>
        </div>
      )}

      {/* REST API */}
      {tab === "rest" && (
        <div className="space-y-6 max-w-3xl">
          <Section title="Base URL">
            <SmallCodeBlock code="https://api.greenai.dev" />
          </Section>

          <Section title="Authentication">
            <Prose>All ingest endpoints use an <InlineCode>X-API-Key</InlineCode> header:</Prose>
            <SmallCodeBlock code={`curl -H "X-API-Key: gai_live_..." https://api.greenai.dev/api/ingest/job-run`} />
            <Prose>Dashboard endpoints use a JWT Bearer token obtained from login.</Prose>
          </Section>

          <Section title="POST /api/ingest/job-run">
            <Prose>Submit a completed job run.</Prose>
            <SmallCodeBlock code={`curl -X POST https://api.greenai.dev/api/ingest/job-run \\\n  -H "X-API-Key: gai_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "run_id": "run-001",\n    "run_name": "bert-training",\n    "project_id": "proj_...",\n    "status": "success",\n    "start_time": "2026-02-15T10:00:00Z",\n    "end_time": "2026-02-15T12:00:00Z",\n    "hardware": { "gpu_count": 2, "gpu_model": "NVIDIA A100" },\n    "energy": { "total_kwh": 10.5 },\n    "region": "us-east-1",\n    "job_type": "training"\n  }'`} />
          </Section>

          <Section title="POST /api/job-runs/validate">
            <Prose>Validate that your API key is active.</Prose>
            <SmallCodeBlock code={`curl -X POST https://api.greenai.dev/api/job-runs/validate \\\n  -H "X-API-Key: gai_live_..."\n\n# Response:\n# { "valid": true, "project": "My Project", "plan": "starter", "job_runs_remaining": 9750 }`} />
          </Section>

          <Section title="GET /api/analytics/summary">
            <Prose>Get total emissions, energy, and run counts.</Prose>
            <SmallCodeBlock code={`curl https://api.greenai.dev/api/analytics/summary \\\n  -H "Authorization: Bearer <jwt-token>"`} />
          </Section>

          <Section title="GET /api/exports/job-runs/csv">
            <Prose>Download all job runs as CSV.</Prose>
            <SmallCodeBlock code={`curl "https://api.greenai.dev/api/exports/job-runs/csv?start_date=2026-01-01&end_date=2026-02-01" \\\n  -H "Authorization: Bearer <jwt-token>" \\\n  -o export.csv`} />
          </Section>

          <Section title="Error codes">
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/25 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Code</th>
                    <th className="px-3 py-2 text-left font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {[
                    ["401", "Invalid or missing API key"],
                    ["402", "Subscription limit exceeded"],
                    ["409", "Duplicate run_id"],
                    ["429", "Rate limit exceeded (100 req/min for ingest)"],
                    ["500", "Internal server error"],
                  ].map(([code, meaning]) => (
                    <tr key={code}>
                      <td className="px-3 py-2 font-mono text-foreground">{code}</td>
                      <td className="px-3 py-2 text-muted-foreground">{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}

      {/* Framework Guides */}
      {tab === "frameworks" && (
        <div className="space-y-8 max-w-3xl">
          <Section title="PyTorch / PyTorch Lightning">
            <Prose>Use the built-in callback for PyTorch Lightning trainers:</Prose>
            <SmallCodeBlock code={`from greenai.integrations.pytorch import GreenAICallback\nimport pytorch_lightning as pl\n\ntrainer = pl.Trainer(\n    max_epochs=10,\n    callbacks=[\n        GreenAICallback(\n            api_key="gai_live_...",\n            project_id="proj_...",\n            region="us-east-1",\n        )\n    ]\n)\ntrainer.fit(model, datamodule=dm)`} />
            <Prose>For plain PyTorch, use the context manager:</Prose>
            <SmallCodeBlock code={`import greenai\n\ngreenai.init(api_key="gai_...", project_id="proj_...")\n\nwith greenai.track("resnet-training"):\n    for epoch in range(epochs):\n        for batch in dataloader:\n            optimizer.zero_grad()\n            loss = model(batch)\n            loss.backward()\n            optimizer.step()`} />
          </Section>

          <Section title="HuggingFace Transformers">
            <Prose>Pass the callback to the Trainer:</Prose>
            <SmallCodeBlock code={`from greenai.integrations.huggingface import GreenAICallback\nfrom transformers import Trainer, TrainingArguments\n\ntraining_args = TrainingArguments(output_dir="./results", num_train_epochs=3)\n\ntrainer = Trainer(\n    model=model,\n    args=training_args,\n    train_dataset=train_dataset,\n    callbacks=[\n        GreenAICallback(\n            api_key="gai_live_...",\n            project_id="proj_...",\n        )\n    ]\n)\ntrainer.train()`} />
          </Section>

          <Section title="Scikit-learn">
            <Prose>Wrap any estimator with <InlineCode>track_fit</InlineCode>:</Prose>
            <SmallCodeBlock code={`from greenai.integrations.sklearn import track_fit\nfrom sklearn.ensemble import RandomForestClassifier\n\nmodel = RandomForestClassifier(n_estimators=100)\nmodel = track_fit(\n    model,\n    api_key="gai_live_...",\n    project_id="proj_...",\n    run_name="random-forest-training",\n)\nmodel.fit(X_train, y_train)  # carbon tracked automatically`} />
          </Section>

          <Section title="Framework-agnostic (any training loop)">
            <SmallCodeBlock code={`import greenai\n\ngreenai.init(api_key="gai_...", project_id="proj_...")\n\nwith greenai.track("xgboost-run"):\n    import xgboost as xgb\n    model = xgb.XGBClassifier()\n    model.fit(X_train, y_train)`} />
          </Section>
        </div>
      )}

      {/* FAQ */}
      {tab === "faq" && (
        <div className="space-y-4 max-w-3xl">
          {[
            {
              q: "What if I don't have a GPU?",
              a: "No problem. The SDK falls back to CPU-only power estimation using psutil utilisation × TDP lookup. You'll still get carbon data.",
            },
            {
              q: "How accurate are the carbon numbers?",
              a: "On machines with NVIDIA GPUs, power is read directly via pynvml — accuracy is within 5%. CPU-only estimates use utilisation × TDP and are typically accurate within 15-20%.",
            },
            {
              q: "Can I track inference, not just training?",
              a: "Yes. Pass job_type='inference' to greenai.init() or greenai.track(). Both types appear separately in your analytics.",
            },
            {
              q: "What cloud regions are supported?",
              a: "80+ regions across AWS, GCP, and Azure including all major regions. On-premises defaults to a global average. Cloud region is auto-detected on EC2/GCE/Azure VMs.",
            },
            {
              q: "How do I backfill historical runs?",
              a: "Use the REST API and set start_time / end_time to historical dates. The SDK also accepts start_time and end_time overrides.",
            },
            {
              q: "Is my API key stored securely?",
              a: "Keys are hashed (bcrypt) before storage. The raw key is only shown once at creation. Use environment variables — never hardcode keys.",
            },
            {
              q: "What happens if the API is unreachable?",
              a: "The SDK queues payloads locally and retries on the next run. No data is lost during brief outages.",
            },
            {
              q: "Does tracking add latency to my training?",
              a: "No. Power sampling runs in a background daemon thread. The only overhead is a single HTTP request at the end of the run.",
            },
            {
              q: "Can multiple team members share a project?",
              a: "Yes. All team members under the same organisation can see project data. API keys are scoped per-project.",
            },
            {
              q: "How do I delete data?",
              a: "Contact support@greenai.dev for data deletion requests (GDPR compliant). Individual runs can be deleted via the API.",
            },
          ].map(({ q, a }) => (
            <details key={q} className="group rounded-xl border border-border/60 bg-card">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-foreground list-none">
                {q}
                <span className="ml-2 shrink-0 text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="border-t border-border/60 px-4 py-3 text-sm text-muted-foreground">{a}</div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
