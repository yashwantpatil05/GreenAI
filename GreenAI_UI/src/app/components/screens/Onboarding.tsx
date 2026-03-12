import { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Leaf, Check, ChevronRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { CodeBlock } from '../CodeBlock';
import { CopyButton } from '../CopyButton';
import { toast } from 'sonner';

const steps = [
  { id: 0, title: 'Organization Setup', description: 'Confirm your details' },
  { id: 1, title: 'Create Project', description: 'Set up your first project' },
  { id: 2, title: 'Generate API Key', description: 'Secure your integration' },
  { id: 3, title: 'SDK Integration', description: 'Connect your application' },
  { id: 4, title: 'Test Ingestion', description: 'Send your first telemetry' },
];

export function Onboarding() {
  const { onboardingStep, setOnboardingStep, setView } = useApp();
  const [orgData, setOrgData] = useState({ name: 'Acme AI Labs', region: 'ap-south-1' });
  const [projectData, setProjectData] = useState({ name: '', provider: 'AWS', region: 'ap-south-1' });
  const [apiKeyData, setApiKeyData] = useState({ name: '', scopes: ['job-runs:write', 'job-runs:read'] });
  const [generatedKey, setGeneratedKey] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testRunData, setTestRunData] = useState({ runName: '', jobType: 'training' });
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (onboardingStep === 2 && !generatedKey) {
      // Generate API key
      const key = `gai_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      setGeneratedKey(key);
      toast.success('API Key generated successfully');
    } else if (onboardingStep === 4) {
      // Complete onboarding
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        toast.success('Test telemetry sent successfully!');
        setView('dashboard');
      }, 1500);
      return;
    }
    setOnboardingStep(onboardingStep + 1);
  };

  const handleSkip = () => {
    setView('dashboard');
    toast.info('Setup incomplete. Please complete onboarding to start ingesting data.');
  };

  const canProceed = () => {
    switch (onboardingStep) {
      case 0:
        return orgData.name && orgData.region;
      case 1:
        return projectData.name && projectData.provider && projectData.region;
      case 2:
        return generatedKey && understood;
      case 3:
        return true;
      case 4:
        return testRunData.runName && testRunData.jobType;
      default:
        return false;
    }
  };

  const curlExample = `curl -X POST https://api.greenai.io/api/job-runs/ingest \\
  -H "X-API-Key: ${generatedKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "run_name": "my-first-run",
    "job_type": "training",
    "region": "ap-south-1",
    "start_time": "2025-01-03T10:00:00Z",
    "end_time": "2025-01-03T11:30:00Z",
    "energy_kwh": 12.5,
    "carbon_kg_co2e": 6.4,
    "metadata": {
      "model": "bert",
      "gpu_type": "T4"
    }
  }'`;

  const pythonExample = `from greenai import Client

client = Client(api_key="${generatedKey || 'YOUR_API_KEY'}")

client.ingest_run(
    run_name="my-first-run",
    job_type="training",
    region="ap-south-1",
    start_time="2025-01-03T10:00:00Z",
    end_time="2025-01-03T11:30:00Z",
    energy_kwh=12.5,
    carbon_kg_co2e=6.4,
    metadata={
        "model": "bert",
        "gpu_type": "T4"
    }
)`;

  const nodeExample = `const { GreenAI } = require('@greenai/sdk');

const client = new GreenAI({
  apiKey: '${generatedKey || 'YOUR_API_KEY'}'
});

await client.ingestRun({
  runName: 'my-first-run',
  jobType: 'training',
  region: 'ap-south-1',
  startTime: '2025-01-03T10:00:00Z',
  endTime: '2025-01-03T11:30:00Z',
  energyKwh: 12.5,
  carbonKgCo2e: 6.4,
  metadata: {
    model: 'bert',
    gpuType: 'T4'
  }
});`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="p-2 bg-primary rounded-lg">
              <Leaf className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-semibold">GreenAI Setup</h1>
          </div>
          <p className="text-muted-foreground">
            Let's get you started with carbon-aware AI monitoring
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      index < onboardingStep
                        ? 'bg-primary border-primary text-primary-foreground'
                        : index === onboardingStep
                        ? 'border-primary text-primary'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {index < onboardingStep ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-xs font-medium">{step.title}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      index < onboardingStep ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[onboardingStep].title}</CardTitle>
            <CardDescription>{steps[onboardingStep].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 0: Organization Setup */}
            {onboardingStep === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={orgData.name}
                    onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Preferred Region</Label>
                  <Select value={orgData.region} onValueChange={(v) => setOrgData({ ...orgData, region: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ap-south-1">ap-south-1 (Mumbai)</SelectItem>
                      <SelectItem value="us-west-1">us-west-1 (N. California)</SelectItem>
                      <SelectItem value="eu-west-2">eu-west-2 (London)</SelectItem>
                      <SelectItem value="eu-north-1">eu-north-1 (Stockholm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 1: Create Project */}
            {onboardingStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    placeholder="ML Training Pipeline"
                    value={projectData.name}
                    onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider">Cloud Provider</Label>
                  <Select value={projectData.provider} onValueChange={(v) => setProjectData({ ...projectData, provider: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AWS">AWS</SelectItem>
                      <SelectItem value="GCP">Google Cloud</SelectItem>
                      <SelectItem value="Azure">Azure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultRegion">Default Region</Label>
                  <Select value={projectData.region} onValueChange={(v) => setProjectData({ ...projectData, region: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ap-south-1">ap-south-1 (Mumbai)</SelectItem>
                      <SelectItem value="us-west-1">us-west-1 (N. California)</SelectItem>
                      <SelectItem value="eu-west-2">eu-west-2 (London)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Generate API Key */}
            {onboardingStep === 2 && (
              <div className="space-y-4">
                {!generatedKey ? (
                  <div className="space-y-2">
                    <Label htmlFor="keyName">API Key Name</Label>
                    <Input
                      id="keyName"
                      placeholder="Production Ingestion Key"
                      value={apiKeyData.name}
                      onChange={(e) => setApiKeyData({ ...apiKeyData, name: e.target.value })}
                    />
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg space-y-3">
                      <p className="text-sm font-medium text-warning">⚠️ Save your API key now!</p>
                      <p className="text-sm text-muted-foreground">
                        This key will only be shown once. Copy it and store it securely.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Your API Key</Label>
                      <div className="flex gap-2">
                        <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm">
                          {showKey ? generatedKey : '•'.repeat(generatedKey.length)}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowKey(!showKey)}
                        >
                          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <CopyButton text={generatedKey} />
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="understand"
                        checked={understood}
                        onCheckedChange={(checked) => setUnderstood(checked as boolean)}
                      />
                      <label htmlFor="understand" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        I understand this key will not be shown again and I have saved it securely
                      </label>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3: SDK Integration */}
            {onboardingStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Use one of the following code examples to integrate GreenAI into your application.
                  Make sure to include your API key in the <code className="px-1 py-0.5 bg-muted rounded">X-API-Key</code> header.
                </p>
                <CodeBlock
                  examples={[
                    { language: 'curl', code: curlExample },
                    { language: 'python', code: pythonExample },
                    { language: 'node', code: nodeExample },
                  ]}
                />
              </div>
            )}

            {/* Step 4: Test Ingestion */}
            {onboardingStep === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Let's send a test telemetry data point to verify your setup is working correctly.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="runName">Run Name</Label>
                  <Input
                    id="runName"
                    placeholder="test-run-001"
                    value={testRunData.runName}
                    onChange={(e) => setTestRunData({ ...testRunData, runName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobType">Job Type</Label>
                  <Select value={testRunData.jobType} onValueChange={(v) => setTestRunData({ ...testRunData, jobType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="inference">Inference</SelectItem>
                      <SelectItem value="data-processing">Data Processing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button variant="ghost" onClick={handleSkip}>
                Skip for now
              </Button>
              <Button onClick={handleNext} disabled={!canProceed() || loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : onboardingStep === 4 ? (
                  'Complete Setup'
                ) : (
                  <>
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
