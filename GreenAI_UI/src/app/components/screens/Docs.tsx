import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CodeBlock } from '../CodeBlock';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { BookOpen, Code, Zap, Shield, Cloud } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

export function Docs() {
  const installExamples = [
    {
      language: 'python',
      code: `pip install greenai`
    },
    {
      language: 'node',
      code: `npm install @greenai/sdk`
    }
  ];

  const quickstartExamples = [
    {
      language: 'python',
      code: `from greenai import Client
import time

# Initialize client
client = Client(api_key="YOUR_API_KEY")

# Track your ML job
start_time = time.time()

# Your ML training code here
# ...

end_time = time.time()

# Ingest telemetry
client.ingest_run(
    run_name="bert-training-001",
    job_type="training",
    region="ap-south-1",
    start_time=start_time,
    end_time=end_time,
    energy_kwh=12.5,
    carbon_kg_co2e=6.4,
    metadata={
        "model": "bert-base",
        "gpu_type": "T4",
        "batch_size": 32
    }
)`
    },
    {
      language: 'node',
      code: `const { GreenAI } = require('@greenai/sdk');

// Initialize client
const client = new GreenAI({
  apiKey: 'YOUR_API_KEY'
});

// Track your ML job
const startTime = Date.now();

// Your ML training code here
// ...

const endTime = Date.now();

// Ingest telemetry
await client.ingestRun({
  runName: 'bert-training-001',
  jobType: 'training',
  region: 'ap-south-1',
  startTime: new Date(startTime).toISOString(),
  endTime: new Date(endTime).toISOString(),
  energyKwh: 12.5,
  carbonKgCo2e: 6.4,
  metadata: {
    model: 'bert-base',
    gpuType: 'T4',
    batchSize: 32
  }
});`
    },
    {
      language: 'curl',
      code: `curl -X POST https://api.greenai.io/api/job-runs/ingest \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "run_name": "bert-training-001",
    "job_type": "training",
    "region": "ap-south-1",
    "start_time": "2025-01-03T10:00:00Z",
    "end_time": "2025-01-03T11:30:00Z",
    "energy_kwh": 12.5,
    "carbon_kg_co2e": 6.4,
    "metadata": {
      "model": "bert-base",
      "gpu_type": "T4",
      "batch_size": 32
    }
  }'`
    }
  ];

  const ciIntegration = [
    {
      language: 'yaml',
      code: `# GitHub Actions Example
name: ML Training with Carbon Tracking

on:
  push:
    branches: [ main ]

jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install greenai
      
      - name: Run training with telemetry
        env:
          GREENAI_API_KEY: \${{ secrets.GREENAI_API_KEY }}
        run: |
          python train.py --track-carbon`
    }
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1>Documentation</h1>
        <p className="text-muted-foreground">
          Get started with GreenAI carbon & energy telemetry
        </p>
      </div>

      <Alert>
        <BookOpen className="h-4 w-4" />
        <AlertDescription>
          Track carbon emissions and energy consumption for your AI/ML workloads. Get actionable insights to reduce your environmental impact.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="quickstart">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quickstart">Quickstart</TabsTrigger>
          <TabsTrigger value="install">Installation</TabsTrigger>
          <TabsTrigger value="ci">CI Integration</TabsTrigger>
          <TabsTrigger value="best-practices">Best Practices</TabsTrigger>
        </TabsList>

        {/* Quickstart */}
        <TabsContent value="quickstart" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>Quickstart Guide</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-3">1. Get Your API Key</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Navigate to API Keys section and create a new key with <code className="px-1 py-0.5 bg-muted rounded">job-runs:write</code> scope.
                </p>
              </div>

              <div>
                <h3 className="mb-3">2. Install SDK</h3>
                <CodeBlock examples={installExamples} />
              </div>

              <div>
                <h3 className="mb-3">3. Track Your First Job</h3>
                <CodeBlock examples={quickstartExamples} />
              </div>

              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-sm">
                  <strong>✓ Success!</strong> Your telemetry data will appear in the Job Runs dashboard within seconds.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Installation */}
        <TabsContent value="install" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Code className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>SDK Installation</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-3">Python SDK</h3>
                <CodeBlock examples={[{ language: 'bash', code: 'pip install greenai' }]} />
                <p className="text-sm text-muted-foreground mt-2">
                  Requires Python 3.7+
                </p>
              </div>

              <div>
                <h3 className="mb-3">Node.js SDK</h3>
                <CodeBlock examples={[{ language: 'bash', code: 'npm install @greenai/sdk' }]} />
                <p className="text-sm text-muted-foreground mt-2">
                  Requires Node.js 14+
                </p>
              </div>

              <div>
                <h3 className="mb-3">Direct API Access</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Use the REST API directly with any HTTP client. Base URL: <code className="px-1 py-0.5 bg-muted rounded">https://api.greenai.io</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CI Integration */}
        <TabsContent value="ci" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Cloud className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>CI/CD Integration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-3">GitHub Actions</h3>
                <CodeBlock examples={ciIntegration} />
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4>Important: Store API Key Securely</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Never commit API keys to version control</li>
                  <li>Use GitHub Secrets, AWS Secrets Manager, or similar</li>
                  <li>Rotate keys regularly</li>
                  <li>Use separate keys for different environments</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Best Practices */}
        <TabsContent value="best-practices" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>Best Practices</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-3">Tagging Strategy</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Use consistent tags to enable better analytics and comparisons:
                </p>
                <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                  <li><code className="px-1 py-0.5 bg-muted rounded">model</code> - Model name (e.g., bert, gpt-neox)</li>
                  <li><code className="px-1 py-0.5 bg-muted rounded">version</code> - Model or training version</li>
                  <li><code className="px-1 py-0.5 bg-muted rounded">team</code> - Team or department name</li>
                  <li><code className="px-1 py-0.5 bg-muted rounded">environment</code> - dev, staging, production</li>
                  <li><code className="px-1 py-0.5 bg-muted rounded">gpu_type</code> - GPU hardware used</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3">Carbon-Aware Scheduling</h3>
                <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                  <li>Schedule non-urgent jobs during off-peak hours with lower grid carbon intensity</li>
                  <li>Use GreenAI suggestions to identify optimal regions and times</li>
                  <li>Consider carbon intensity alongside compute costs</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3">Monitoring & Alerts</h3>
                <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                  <li>Set up regular report generation for stakeholders</li>
                  <li>Review suggestions weekly to optimize carbon footprint</li>
                  <li>Track trends over time to measure improvement</li>
                  <li>Use comparison feature to validate optimization efforts</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
