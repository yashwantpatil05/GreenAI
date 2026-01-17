// Mock data for GreenAI platform
import type { 
  JobRun, 
  Project, 
  ApiKey, 
  Suggestion, 
  Report, 
  OrganizationMember, 
  Organization,
  AuditLog,
  SystemStatus,
  RateLimitInfo,
  DashboardMetrics,
  Activity
} from '../types';

export const mockProjects: Project[] = [
  {
    id: 'proj_1',
    name: 'ML Training Pipeline',
    cloud_provider: 'AWS',
    default_region: 'ap-south-1',
    created_at: '2024-11-15T10:00:00Z',
    total_runs: 47,
    total_co2e: 234.5,
    total_kwh: 1823.4
  },
  {
    id: 'proj_2',
    name: 'Inference API',
    cloud_provider: 'GCP',
    default_region: 'us-west-1',
    created_at: '2024-12-01T14:30:00Z',
    total_runs: 23,
    total_co2e: 89.2,
    total_kwh: 456.7
  },
  {
    id: 'proj_3',
    name: 'Data Processing',
    cloud_provider: 'Azure',
    default_region: 'eu-west-2',
    created_at: '2024-10-20T08:15:00Z',
    total_runs: 15,
    total_co2e: 45.3,
    total_kwh: 289.1
  }
];

export const mockJobRuns: JobRun[] = [
  {
    id: 'run_abc123',
    run_name: 'llama2-finetune-v3',
    job_type: 'training',
    status: 'completed',
    region: 'ap-south-1',
    start_time: '2025-01-03T08:30:00Z',
    end_time: '2025-01-03T12:45:00Z',
    duration_seconds: 15300,
    energy_kwh: 45.3,
    carbon_kg_co2e: 23.4,
    cost_usd: 78.50,
    project_id: 'proj_1',
    project_name: 'ML Training Pipeline',
    tags: { model: 'llama2', version: 'v3', team: 'research' },
    gpu_type: 'A100',
    gpu_hours: 4.25,
    cpu_hours: 4.25,
    ram_gb: 64
  },
  {
    id: 'run_def456',
    run_name: 'bert-inference-batch-012',
    job_type: 'inference',
    status: 'completed',
    region: 'us-west-1',
    start_time: '2025-01-03T06:15:00Z',
    end_time: '2025-01-03T06:45:00Z',
    duration_seconds: 1800,
    energy_kwh: 2.8,
    carbon_kg_co2e: 1.2,
    cost_usd: 4.20,
    project_id: 'proj_2',
    project_name: 'Inference API',
    tags: { model: 'bert', batch: '012' },
    gpu_type: 'T4',
    gpu_hours: 0.5,
    cpu_hours: 0.5,
    ram_gb: 16
  },
  {
    id: 'run_ghi789',
    run_name: 'data-etl-pipeline-daily',
    job_type: 'data-processing',
    status: 'running',
    region: 'eu-west-2',
    start_time: '2025-01-03T10:00:00Z',
    duration_seconds: 3600,
    energy_kwh: 8.5,
    carbon_kg_co2e: 3.2,
    project_id: 'proj_3',
    project_name: 'Data Processing',
    tags: { pipeline: 'daily', stage: 'etl' },
    cpu_hours: 1.0,
    ram_gb: 32
  },
  {
    id: 'run_jkl012',
    run_name: 'gpt-neox-pretrain-epoch-5',
    job_type: 'training',
    status: 'completed',
    region: 'ap-south-1',
    start_time: '2025-01-02T14:00:00Z',
    end_time: '2025-01-02T23:30:00Z',
    duration_seconds: 34200,
    energy_kwh: 124.7,
    carbon_kg_co2e: 64.5,
    cost_usd: 210.00,
    project_id: 'proj_1',
    project_name: 'ML Training Pipeline',
    tags: { model: 'gpt-neox', epoch: '5' },
    gpu_type: 'A100',
    gpu_hours: 9.5,
    cpu_hours: 9.5,
    ram_gb: 128
  },
  {
    id: 'run_mno345',
    run_name: 'stable-diffusion-xl-finetune',
    job_type: 'training',
    status: 'failed',
    region: 'us-west-1',
    start_time: '2025-01-02T09:00:00Z',
    end_time: '2025-01-02T09:15:00Z',
    duration_seconds: 900,
    energy_kwh: 1.2,
    carbon_kg_co2e: 0.5,
    cost_usd: 2.10,
    project_id: 'proj_2',
    project_name: 'Inference API',
    tags: { model: 'stable-diffusion-xl', status: 'failed' },
    gpu_type: 'V100',
    gpu_hours: 0.25,
    cpu_hours: 0.25,
    ram_gb: 32
  },
  {
    id: 'run_pqr678',
    run_name: 'yolo-v8-object-detection',
    job_type: 'inference',
    status: 'completed',
    region: 'ap-south-1',
    start_time: '2025-01-01T18:20:00Z',
    end_time: '2025-01-01T20:05:00Z',
    duration_seconds: 6300,
    energy_kwh: 12.4,
    carbon_kg_co2e: 6.4,
    cost_usd: 18.30,
    project_id: 'proj_1',
    project_name: 'ML Training Pipeline',
    tags: { model: 'yolo-v8', task: 'object-detection' },
    gpu_type: 'T4',
    gpu_hours: 1.75,
    cpu_hours: 1.75,
    ram_gb: 16
  },
  {
    id: 'run_stu901',
    run_name: 'whisper-transcription-batch',
    job_type: 'inference',
    status: 'completed',
    region: 'eu-west-2',
    start_time: '2025-01-01T12:00:00Z',
    end_time: '2025-01-01T13:30:00Z',
    duration_seconds: 5400,
    energy_kwh: 7.8,
    carbon_kg_co2e: 2.9,
    cost_usd: 12.40,
    project_id: 'proj_3',
    project_name: 'Data Processing',
    tags: { model: 'whisper', type: 'batch' },
    gpu_type: 'T4',
    gpu_hours: 1.5,
    cpu_hours: 1.5,
    ram_gb: 16
  },
  {
    id: 'run_vwx234',
    run_name: 'resnet-50-transfer-learning',
    job_type: 'training',
    status: 'completed',
    region: 'us-west-1',
    start_time: '2024-12-31T08:00:00Z',
    end_time: '2024-12-31T10:30:00Z',
    duration_seconds: 9000,
    energy_kwh: 18.5,
    carbon_kg_co2e: 7.8,
    cost_usd: 24.60,
    project_id: 'proj_2',
    project_name: 'Inference API',
    tags: { model: 'resnet-50', method: 'transfer-learning' },
    gpu_type: 'V100',
    gpu_hours: 2.5,
    cpu_hours: 2.5,
    ram_gb: 32
  },
  {
    id: 'run_yza567',
    run_name: 'clip-embedding-generation',
    job_type: 'inference',
    status: 'completed',
    region: 'ap-south-1',
    start_time: '2024-12-30T16:00:00Z',
    end_time: '2024-12-30T16:45:00Z',
    duration_seconds: 2700,
    energy_kwh: 4.2,
    carbon_kg_co2e: 2.2,
    cost_usd: 6.80,
    project_id: 'proj_1',
    project_name: 'ML Training Pipeline',
    tags: { model: 'clip', task: 'embedding' },
    gpu_type: 'T4',
    gpu_hours: 0.75,
    cpu_hours: 0.75,
    ram_gb: 16
  },
  {
    id: 'run_bcd890',
    run_name: 'transformer-xl-pretraining',
    job_type: 'training',
    status: 'completed',
    region: 'eu-west-2',
    start_time: '2024-12-29T10:00:00Z',
    end_time: '2024-12-29T20:00:00Z',
    duration_seconds: 36000,
    energy_kwh: 98.5,
    carbon_kg_co2e: 36.8,
    cost_usd: 165.00,
    project_id: 'proj_3',
    project_name: 'Data Processing',
    tags: { model: 'transformer-xl', stage: 'pretrain' },
    gpu_type: 'A100',
    gpu_hours: 10.0,
    cpu_hours: 10.0,
    ram_gb: 128
  },
  {
    id: 'run_efg123',
    run_name: 'bloom-560m-finetune',
    job_type: 'training',
    status: 'completed',
    region: 'ap-south-1',
    start_time: '2024-12-28T11:00:00Z',
    end_time: '2024-12-28T15:20:00Z',
    duration_seconds: 15600,
    energy_kwh: 42.1,
    carbon_kg_co2e: 21.8,
    cost_usd: 71.50,
    project_id: 'proj_1',
    project_name: 'ML Training Pipeline',
    tags: { model: 'bloom', size: '560m' },
    gpu_type: 'A100',
    gpu_hours: 4.33,
    cpu_hours: 4.33,
    ram_gb: 64
  },
  {
    id: 'run_hij456',
    run_name: 'wav2vec2-speech-recognition',
    job_type: 'inference',
    status: 'completed',
    region: 'us-west-1',
    start_time: '2024-12-27T14:30:00Z',
    end_time: '2024-12-27T15:15:00Z',
    duration_seconds: 2700,
    energy_kwh: 3.8,
    carbon_kg_co2e: 1.6,
    cost_usd: 5.40,
    project_id: 'proj_2',
    project_name: 'Inference API',
    tags: { model: 'wav2vec2', task: 'asr' },
    gpu_type: 'T4',
    gpu_hours: 0.75,
    cpu_hours: 0.75,
    ram_gb: 16
  }
];

export const mockSuggestions: Suggestion[] = [
  {
    id: 'sug_1',
    run_id: 'run_abc123',
    run_name: 'llama2-finetune-v3',
    category: 'GPU Optimization',
    severity: 'high',
    title: 'Switch to more efficient GPU type',
    description: 'Current A100 GPU is oversized for this workload. Consider A10G which offers 40% better energy efficiency for similar inference tasks.',
    expected_savings_co2e: 9.4,
    expected_savings_kwh: 18.1,
    expected_savings_cost: 31.40,
    status: 'new',
    action_steps: [
      'Update job config to use instance type g5.xlarge (A10G)',
      'Test training convergence with new GPU type',
      'Monitor performance metrics for 3 runs'
    ],
    evidence: { current_gpu_utilization: 0.45, recommended_gpu: 'A10G' },
    created_at: '2025-01-03T13:00:00Z'
  },
  {
    id: 'sug_2',
    run_id: 'run_jkl012',
    run_name: 'gpt-neox-pretrain-epoch-5',
    category: 'Scheduling',
    severity: 'medium',
    title: 'Schedule training during off-peak hours',
    description: 'Running this job during peak hours (14:00-23:30) uses grid energy with higher carbon intensity. Off-peak hours (22:00-06:00) in ap-south-1 have 30% lower carbon intensity.',
    expected_savings_co2e: 19.4,
    expected_savings_kwh: 0,
    expected_savings_cost: 0,
    status: 'new',
    action_steps: [
      'Update scheduler to queue this job type for off-peak execution',
      'Set start time window: 22:00-02:00 UTC',
      'Configure priority settings for time-sensitive vs carbon-optimized jobs'
    ],
    created_at: '2025-01-02T23:45:00Z'
  },
  {
    id: 'sug_3',
    run_id: 'run_abc123',
    run_name: 'llama2-finetune-v3',
    category: 'Batch Size',
    severity: 'medium',
    title: 'Increase batch size to reduce training time',
    description: 'Your current batch size of 16 is inefficient for A100 GPU memory. Increasing to batch size 32 can reduce training time by 25% with similar convergence.',
    expected_savings_co2e: 5.9,
    expected_savings_kwh: 11.3,
    expected_savings_cost: 19.60,
    status: 'accepted',
    action_steps: [
      'Update training script: set batch_size=32',
      'Enable gradient accumulation if OOM occurs',
      'Run validation to ensure model quality is maintained'
    ],
    created_at: '2025-01-03T13:10:00Z'
  },
  {
    id: 'sug_4',
    run_id: 'run_pqr678',
    run_name: 'yolo-v8-object-detection',
    category: 'Model Optimization',
    severity: 'low',
    title: 'Use quantized model for inference',
    description: 'Switch to INT8 quantized version of YOLO-v8. This reduces memory footprint and energy consumption by ~35% with minimal accuracy loss (<1%).',
    expected_savings_co2e: 2.2,
    expected_savings_kwh: 4.3,
    expected_savings_cost: 6.40,
    status: 'new',
    action_steps: [
      'Export model to ONNX format with INT8 quantization',
      'Update inference pipeline to use quantized model',
      'Run A/B test to validate accuracy threshold'
    ],
    created_at: '2025-01-01T20:30:00Z'
  },
  {
    id: 'sug_5',
    run_id: 'run_bcd890',
    run_name: 'transformer-xl-pretraining',
    category: 'Region Selection',
    severity: 'critical',
    title: 'Move workload to lower-carbon region',
    description: 'eu-west-2 has high grid carbon intensity (0.37 kg CO2e/kWh). Consider us-west-1 (0.12 kg CO2e/kWh) or eu-north-1 (0.08 kg CO2e/kWh) for 65-78% carbon reduction.',
    expected_savings_co2e: 24.0,
    expected_savings_kwh: 0,
    expected_savings_cost: 0,
    status: 'new',
    action_steps: [
      'Verify data residency compliance for alternative regions',
      'Update infrastructure config to provision resources in us-west-1',
      'Test network latency impact on data pipeline',
      'Migrate next training run to new region'
    ],
    created_at: '2024-12-29T20:30:00Z'
  },
  {
    id: 'sug_6',
    run_id: 'run_ghi789',
    run_name: 'data-etl-pipeline-daily',
    category: 'Resource Allocation',
    severity: 'medium',
    title: 'Right-size CPU allocation',
    description: 'CPU utilization averaging 32%. Current instance type is oversized. Downgrade to save 45% on compute costs and energy.',
    expected_savings_co2e: 1.4,
    expected_savings_kwh: 3.8,
    expected_savings_cost: 8.20,
    status: 'in-progress',
    action_steps: [
      'Monitor CPU usage for 1 week to confirm pattern',
      'Update terraform config: change instance type to t3.xlarge',
      'Deploy and monitor for performance regression'
    ],
    created_at: '2025-01-03T11:00:00Z'
  },
  {
    id: 'sug_7',
    run_id: 'run_def456',
    run_name: 'bert-inference-batch-012',
    category: 'Idle Resources',
    severity: 'high',
    title: 'Enable auto-scaling to zero',
    description: 'Inference endpoint remains idle 78% of the time but keeps GPU warm. Enable scale-to-zero to eliminate idle energy consumption.',
    expected_savings_co2e: 14.5,
    expected_savings_kwh: 34.2,
    expected_savings_cost: 52.00,
    status: 'new',
    action_steps: [
      'Configure autoscaler: min_replicas=0, max_replicas=5',
      'Set cold-start timeout to 30s (acceptable for batch workload)',
      'Update monitoring to track scale-up/down events',
      'Enable after validating latency SLA'
    ],
    created_at: '2025-01-03T07:00:00Z'
  },
  {
    id: 'sug_8',
    run_id: 'run_vwx234',
    run_name: 'resnet-50-transfer-learning',
    category: 'Model Efficiency',
    severity: 'low',
    title: 'Use pre-trained checkpoint to reduce training',
    description: 'Fine-tuning from scratch. Using a checkpoint from epoch 15 (publicly available) can reduce training time by 60%.',
    expected_savings_co2e: 4.7,
    expected_savings_kwh: 11.1,
    expected_savings_cost: 14.80,
    status: 'dismissed',
    action_steps: [
      'Download pre-trained checkpoint from model hub',
      'Update training script to load from checkpoint',
      'Adjust learning rate schedule for fine-tuning'
    ],
    created_at: '2024-12-31T11:00:00Z'
  }
];

export const mockReports: Report[] = [
  {
    id: 'rep_1',
    name: 'December 2024 ESG Summary',
    type: 'monthly-esg',
    status: 'completed',
    created_at: '2025-01-02T09:00:00Z',
    completed_at: '2025-01-02T09:02:00Z',
    download_url: '#',
    scope: 'All Projects',
    template: 'Executive'
  },
  {
    id: 'rep_2',
    name: 'llama2-finetune-v3 Technical Report',
    type: 'run',
    status: 'completed',
    created_at: '2025-01-03T13:30:00Z',
    completed_at: '2025-01-03T13:31:00Z',
    download_url: '#',
    scope: 'run_abc123',
    template: 'Technical'
  },
  {
    id: 'rep_3',
    name: 'Q4 2024 Carbon Footprint',
    type: 'monthly-esg',
    status: 'generating',
    created_at: '2025-01-03T10:00:00Z',
    scope: 'All Projects',
    template: 'ESG'
  },
  {
    id: 'rep_4',
    name: 'Comparison: gpt-neox epoch-4 vs epoch-5',
    type: 'comparison',
    status: 'completed',
    created_at: '2025-01-02T23:50:00Z',
    completed_at: '2025-01-02T23:51:00Z',
    download_url: '#',
    template: 'Technical'
  },
  {
    id: 'rep_5',
    name: 'Weekly Training Summary - Week 1',
    type: 'monthly-esg',
    status: 'completed',
    created_at: '2025-01-01T08:00:00Z',
    completed_at: '2025-01-01T08:01:00Z',
    download_url: '#',
    scope: 'ML Training Pipeline',
    template: 'Executive'
  }
];

export const mockApiKeys: ApiKey[] = [
  {
    id: 'key_1',
    name: 'Production Ingestion Key',
    scopes: ['job-runs:write', 'job-runs:read'],
    created_at: '2024-11-20T10:00:00Z',
    last_used_at: '2025-01-03T11:30:00Z',
    status: 'active',
    project_id: 'proj_1'
  },
  {
    id: 'key_2',
    name: 'CI/CD Pipeline Key',
    scopes: ['job-runs:write'],
    created_at: '2024-12-01T14:00:00Z',
    last_used_at: '2025-01-03T08:15:00Z',
    status: 'active',
    project_id: 'proj_1'
  },
  {
    id: 'key_3',
    name: 'Analytics Dashboard (Read-Only)',
    scopes: ['analytics:read', 'job-runs:read'],
    created_at: '2024-11-15T09:00:00Z',
    last_used_at: '2025-01-02T16:00:00Z',
    status: 'active'
  },
  {
    id: 'key_4',
    name: 'Legacy Key - Deprecated',
    scopes: ['*'],
    created_at: '2024-10-01T08:00:00Z',
    last_used_at: '2024-12-15T12:00:00Z',
    status: 'revoked'
  }
];

export const mockOrgMembers: OrganizationMember[] = [
  {
    id: 'user_1',
    email: 'sarah.chen@company.com',
    name: 'Sarah Chen',
    role: 'owner',
    joined_at: '2024-10-01T08:00:00Z',
    last_active: '2025-01-03T11:45:00Z'
  },
  {
    id: 'user_2',
    email: 'marcus.johnson@company.com',
    name: 'Marcus Johnson',
    role: 'admin',
    joined_at: '2024-10-15T10:00:00Z',
    last_active: '2025-01-03T10:20:00Z'
  },
  {
    id: 'user_3',
    email: 'priya.sharma@company.com',
    name: 'Priya Sharma',
    role: 'engineer',
    joined_at: '2024-11-01T12:00:00Z',
    last_active: '2025-01-03T09:30:00Z'
  },
  {
    id: 'user_4',
    email: 'alex.rivera@company.com',
    name: 'Alex Rivera',
    role: 'engineer',
    joined_at: '2024-11-20T14:00:00Z',
    last_active: '2025-01-02T18:00:00Z'
  },
  {
    id: 'user_5',
    email: 'emma.wilson@company.com',
    name: 'Emma Wilson',
    role: 'viewer',
    joined_at: '2024-12-10T09:00:00Z',
    last_active: '2025-01-03T08:00:00Z'
  }
];

export const mockOrganization: Organization = {
  id: 'org_1',
  name: 'Acme AI Labs',
  region_preference: 'ap-south-1',
  created_at: '2024-10-01T08:00:00Z',
  member_count: 5
};

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'audit_1',
    timestamp: '2025-01-03T11:30:15Z',
    actor_id: 'user_2',
    actor_name: 'Marcus Johnson',
    actor_email: 'marcus.johnson@company.com',
    action: 'create',
    resource_type: 'api_key',
    resource_id: 'key_2',
    resource_name: 'CI/CD Pipeline Key',
    status: 'success',
    ip_address: '203.45.67.89',
    request_id: 'req_abc123',
    metadata: { scopes: ['job-runs:write'] }
  },
  {
    id: 'audit_2',
    timestamp: '2025-01-03T10:15:42Z',
    actor_id: 'user_1',
    actor_name: 'Sarah Chen',
    actor_email: 'sarah.chen@company.com',
    action: 'invite',
    resource_type: 'member',
    resource_id: 'user_5',
    resource_name: 'Emma Wilson',
    status: 'success',
    ip_address: '198.51.100.42',
    request_id: 'req_def456',
    metadata: { role: 'viewer' }
  },
  {
    id: 'audit_3',
    timestamp: '2025-01-03T09:45:12Z',
    actor_id: 'user_3',
    actor_name: 'Priya Sharma',
    actor_email: 'priya.sharma@company.com',
    action: 'create',
    resource_type: 'project',
    resource_id: 'proj_3',
    resource_name: 'Data Processing',
    status: 'success',
    ip_address: '192.0.2.15',
    request_id: 'req_ghi789'
  },
  {
    id: 'audit_4',
    timestamp: '2025-01-02T16:30:00Z',
    actor_id: 'user_2',
    actor_name: 'Marcus Johnson',
    actor_email: 'marcus.johnson@company.com',
    action: 'revoke',
    resource_type: 'api_key',
    resource_id: 'key_4',
    resource_name: 'Legacy Key - Deprecated',
    status: 'success',
    ip_address: '203.45.67.89',
    request_id: 'req_jkl012',
    metadata: { reason: 'security_rotation' }
  },
  {
    id: 'audit_5',
    timestamp: '2025-01-02T14:20:30Z',
    actor_id: 'user_4',
    actor_name: 'Alex Rivera',
    actor_email: 'alex.rivera@company.com',
    action: 'update',
    resource_type: 'project',
    resource_id: 'proj_2',
    resource_name: 'Inference API',
    status: 'success',
    ip_address: '198.51.100.88',
    request_id: 'req_mno345',
    metadata: { changed_fields: ['default_region'] }
  },
  {
    id: 'audit_6',
    timestamp: '2025-01-01T11:00:00Z',
    actor_id: 'user_1',
    actor_name: 'Sarah Chen',
    actor_email: 'sarah.chen@company.com',
    action: 'delete',
    resource_type: 'api_key',
    resource_id: 'key_old_1',
    status: 'failed',
    ip_address: '198.51.100.42',
    request_id: 'req_pqr678',
    metadata: { error: 'key_in_use' }
  }
];

export const mockSystemStatus: SystemStatus[] = [
  {
    component: 'API Gateway',
    status: 'healthy',
    last_check: '2025-01-03T11:59:30Z',
    response_time_ms: 45,
    uptime_percent: 99.98
  },
  {
    component: 'PostgreSQL Database',
    status: 'healthy',
    last_check: '2025-01-03T11:59:28Z',
    response_time_ms: 12,
    uptime_percent: 99.99
  },
  {
    component: 'Supabase Auth',
    status: 'healthy',
    last_check: '2025-01-03T11:59:25Z',
    response_time_ms: 89,
    uptime_percent: 99.95
  },
  {
    component: 'Background Worker',
    status: 'healthy',
    last_check: '2025-01-03T11:58:00Z',
    uptime_percent: 99.97
  }
];

export const mockRateLimitInfo: RateLimitInfo = {
  requests_remaining: 8432,
  requests_limit: 10000,
  reset_time: '2025-01-03T12:00:00Z',
  window_seconds: 3600
};

export const mockDashboardMetrics: DashboardMetrics = {
  total_co2e: 369.3,
  total_kwh: 2569.5,
  avg_co2e_per_run: 30.8,
  total_runs: 12,
  cost_estimate: 627.90,
  period_start: '2024-12-27T00:00:00Z',
  period_end: '2025-01-03T11:59:59Z',
  co2e_trend_percent: -8.3,
  runs_trend_percent: 12.5
};

export const mockActivities: Activity[] = [
  {
    id: 'act_1',
    type: 'ingestion',
    timestamp: '2025-01-03T11:30:00Z',
    description: 'Job run ingested',
    resource: 'llama2-finetune-v3'
  },
  {
    id: 'act_2',
    type: 'audit',
    timestamp: '2025-01-03T11:30:15Z',
    description: 'API key created',
    actor: 'Marcus Johnson',
    resource: 'CI/CD Pipeline Key'
  },
  {
    id: 'act_3',
    type: 'ingestion',
    timestamp: '2025-01-03T10:00:00Z',
    description: 'Job run started',
    resource: 'data-etl-pipeline-daily'
  },
  {
    id: 'act_4',
    type: 'audit',
    timestamp: '2025-01-03T10:15:42Z',
    description: 'Member invited',
    actor: 'Sarah Chen',
    resource: 'Emma Wilson'
  },
  {
    id: 'act_5',
    type: 'audit',
    timestamp: '2025-01-03T09:45:12Z',
    description: 'Project created',
    actor: 'Priya Sharma',
    resource: 'Data Processing'
  }
];
