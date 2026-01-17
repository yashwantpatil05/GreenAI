// Type definitions for GreenAI platform

export type JobStatus = 'running' | 'completed' | 'failed' | 'pending';
export type SuggestionSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SuggestionStatus = 'new' | 'accepted' | 'dismissed' | 'in-progress';
export type ReportType = 'run' | 'comparison' | 'monthly-esg';
export type ReportStatus = 'generating' | 'completed' | 'failed';
export type UserRole = 'owner' | 'admin' | 'engineer' | 'viewer';
export type AuditAction = 'create' | 'update' | 'delete' | 'revoke' | 'invite';

export interface JobRun {
  id: string;
  run_name: string;
  job_type: string;
  status: JobStatus;
  region: string;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  energy_kwh: number;
  carbon_kg_co2e: number;
  cost_usd?: number;
  project_id: string;
  project_name: string;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
  gpu_type?: string;
  cpu_hours?: number;
  gpu_hours?: number;
  ram_gb?: number;
}

export interface Project {
  id: string;
  name: string;
  cloud_provider: string;
  default_region: string;
  created_at: string;
  total_runs: number;
  total_co2e: number;
  total_kwh: number;
}

export interface ApiKey {
  id: string;
  name: string;
  key?: string; // Only shown once on creation
  scopes: string[];
  created_at: string;
  last_used_at?: string;
  status: 'active' | 'revoked';
  project_id?: string;
}

export interface Suggestion {
  id: string;
  run_id: string;
  run_name: string;
  category: string;
  severity: SuggestionSeverity;
  title: string;
  description: string;
  expected_savings_co2e: number;
  expected_savings_kwh: number;
  expected_savings_cost?: number;
  status: SuggestionStatus;
  action_steps: string[];
  evidence?: Record<string, any>;
  created_at: string;
}

export interface Report {
  id: string;
  name: string;
  type: ReportType;
  status: ReportStatus;
  created_at: string;
  completed_at?: string;
  download_url?: string;
  scope?: string;
  template?: string;
}

export interface ComparisonResult {
  baseline: JobRun;
  candidate: JobRun;
  deltas: {
    co2e_delta: number;
    co2e_delta_percent: number;
    kwh_delta: number;
    kwh_delta_percent: number;
    cost_delta?: number;
    cost_delta_percent?: number;
    runtime_delta: number;
    runtime_delta_percent: number;
  };
  metadata_changes: Record<string, { old: any; new: any }>;
  recommendations: string[];
}

export interface OrganizationMember {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  joined_at: string;
  last_active?: string;
  avatar?: string;
}

export interface Organization {
  id: string;
  name: string;
  region_preference: string;
  created_at: string;
  member_count: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  action: AuditAction;
  resource_type: string;
  resource_id: string;
  resource_name?: string;
  status: 'success' | 'failed';
  ip_address?: string;
  user_agent?: string;
  request_id: string;
  metadata?: Record<string, any>;
}

export interface SystemStatus {
  component: string;
  status: 'healthy' | 'degraded' | 'down';
  last_check: string;
  response_time_ms?: number;
  uptime_percent?: number;
}

export interface RateLimitInfo {
  requests_remaining: number;
  requests_limit: number;
  reset_time: string;
  window_seconds: number;
}

export interface DashboardMetrics {
  total_co2e: number;
  total_kwh: number;
  avg_co2e_per_run: number;
  total_runs: number;
  cost_estimate: number;
  period_start: string;
  period_end: string;
  co2e_trend_percent: number;
  runs_trend_percent: number;
}

export interface Activity {
  id: string;
  type: 'ingestion' | 'audit';
  timestamp: string;
  description: string;
  actor?: string;
  resource?: string;
}
