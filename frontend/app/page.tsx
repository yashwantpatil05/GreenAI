"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  TrendingDown, TrendingUp, Leaf, Zap, Target, Award, 
  AlertTriangle, CheckCircle2, Clock, Activity, 
  Globe, Building2, Users, BarChart3, ArrowRight,
  Sparkles, Trophy, Flame
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line
} from "recharts";
import Link from "next/link";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import EmptyState from "@/components/EmptyState";

// Types
type DashboardStats = {
  total_carbon_kg: number;
  total_energy_kwh: number;
  total_runs: number;
  active_projects: number;
  carbon_trend: number; // percentage change
  energy_trend: number;
  carbon_saved_kg: number;
  efficiency_score: number; // 0-100
  industry_comparison: number; // percentage better/worse than industry
};

type CarbonTrendPoint = {
  date: string;
  carbon: number;
  energy: number;
};

type TopProject = {
  id: string;
  name: string;
  carbon_kg: number;
  runs: number;
};

type RecentRun = {
  id: string;
  name: string;
  project_name: string;
  carbon_kg: number;
  status: string;
  created_at: string;
};

type CarbonBreakdown = {
  category: string;
  value: number;
  color: string;
};

// Mock data for demo
const mockStats: DashboardStats = {
  total_carbon_kg: 1247.5,
  total_energy_kwh: 4892.3,
  total_runs: 156,
  active_projects: 8,
  carbon_trend: -12.5,
  energy_trend: -8.3,
  carbon_saved_kg: 178.4,
  efficiency_score: 78,
  industry_comparison: 23,
};

const mockTrendData: CarbonTrendPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  carbon: Math.random() * 50 + 30 + (i > 20 ? -10 : 0),
  energy: Math.random() * 200 + 150 + (i > 20 ? -30 : 0),
}));

const mockTopProjects: TopProject[] = [
  { id: "1", name: "GPT-4 Fine-tuning", carbon_kg: 456.2, runs: 45 },
  { id: "2", name: "Image Classification", carbon_kg: 234.1, runs: 67 },
  { id: "3", name: "NLP Pipeline", carbon_kg: 189.8, runs: 28 },
  { id: "4", name: "Recommendation Engine", carbon_kg: 156.3, runs: 16 },
];

const mockBreakdown: CarbonBreakdown[] = [
  { category: "Training", value: 65, color: "#10b981" },
  { category: "Inference", value: 20, color: "#14b8a6" },
  { category: "Data Processing", value: 10, color: "#06b6d4" },
  { category: "Other", value: 5, color: "#0891b2" },
];

const mockRecentRuns: RecentRun[] = [
  { id: "1", name: "bert-finetune-v3", project_name: "NLP Pipeline", carbon_kg: 12.4, status: "completed", created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: "2", name: "resnet-training", project_name: "Image Classification", carbon_kg: 8.7, status: "completed", created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
  { id: "3", name: "gpt4-batch-inference", project_name: "GPT-4 Fine-tuning", carbon_kg: 23.1, status: "running", created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
];

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  unit, 
  trend, 
  trendLabel,
  icon: Icon, 
  color = "emerald",
  size = "normal"
}: { 
  title: string; 
  value: string | number; 
  unit?: string;
  trend?: number;
  trendLabel?: string;
  icon: any; 
  color?: "emerald" | "teal" | "cyan" | "amber" | "rose";
  size?: "normal" | "large";
}) {
  const colorMap = {
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-500 border-emerald-500/30",
    teal: "from-teal-500/20 to-teal-500/5 text-teal-500 border-teal-500/30",
    cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-500 border-cyan-500/30",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-500 border-amber-500/30",
    rose: "from-rose-500/20 to-rose-500/5 text-rose-500 border-rose-500/30",
  };

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-lg ${size === "large" ? "col-span-2" : ""}`}>
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorMap[color]} opacity-0 group-hover:opacity-100 transition-opacity`} />
      
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${colorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-rose-500" : "text-emerald-500"}`}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <div className={`${size === "large" ? "text-4xl" : "text-2xl"} font-bold text-foreground`}>
            {typeof value === "number" ? value.toLocaleString() : value}
            {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{title}</div>
          {trendLabel && (
            <div className="mt-1 text-xs text-muted-foreground">{trendLabel}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Efficiency Score Ring
function EfficiencyScore({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  
  const getColor = (s: number) => {
    if (s >= 80) return { stroke: "#10b981", bg: "bg-emerald-500/10", text: "text-emerald-500" };
    if (s >= 60) return { stroke: "#f59e0b", bg: "bg-amber-500/10", text: "text-amber-500" };
    return { stroke: "#ef4444", bg: "bg-rose-500/10", text: "text-rose-500" };
  };
  
  const colors = getColor(score);
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg className="h-32 w-32 -rotate-90 transform">
          <circle cx="64" cy="64" r="45" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="8" />
          <circle
            cx="64"
            cy="64"
            r="45"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${colors.text}`}>{score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div className="mt-2 text-sm font-medium text-foreground">Efficiency Score</div>
      <div className="text-xs text-muted-foreground">
        {score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Improvement"}
      </div>
    </div>
  );
}

// Carbon Insights Card
function InsightsCard() {
  const insights = [
    { type: "success", icon: CheckCircle2, message: "Your carbon emissions decreased by 12.5% this month" },
    { type: "warning", icon: AlertTriangle, message: "Project 'GPT-4 Fine-tuning' exceeds carbon budget by 15%" },
    { type: "tip", icon: Sparkles, message: "Switch to spot instances to save up to 30% carbon" },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold text-foreground">AI Insights</h3>
      </div>
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-xl p-3 ${
              insight.type === "success" ? "bg-emerald-500/10" :
              insight.type === "warning" ? "bg-amber-500/10" : "bg-cyan-500/10"
            }`}
          >
            <insight.icon className={`h-4 w-4 mt-0.5 shrink-0 ${
              insight.type === "success" ? "text-emerald-500" :
              insight.type === "warning" ? "text-amber-500" : "text-cyan-500"
            }`} />
            <span className="text-sm text-foreground">{insight.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Leaderboard Card
function LeaderboardCard({ projects }: { projects: TopProject[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-foreground">Carbon Leaderboard</h3>
        </div>
        <Link href="/projects" className="text-xs text-primary hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-3">
        {projects.slice(0, 4).map((project, i) => (
          <div key={project.id} className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold text-sm ${
              i === 0 ? "bg-amber-500/20 text-amber-500" :
              i === 1 ? "bg-zinc-400/20 text-zinc-400" :
              i === 2 ? "bg-amber-700/20 text-amber-700" :
              "bg-muted text-muted-foreground"
            }`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{project.name}</div>
              <div className="text-xs text-muted-foreground">{project.runs} runs</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-foreground">{project.carbon_kg.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">kg CO₂</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Industry Comparison
function IndustryComparison({ percentage }: { percentage: number }) {
  const isBetter = percentage > 0;
  
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5 text-cyan-500" />
        <h3 className="font-semibold text-foreground">Industry Benchmark</h3>
      </div>
      <div className="flex items-center justify-center py-4">
        <div className="relative">
          <div className={`flex h-24 w-24 items-center justify-center rounded-full ${
            isBetter ? "bg-emerald-500/20" : "bg-rose-500/20"
          }`}>
            <span className={`text-2xl font-bold ${isBetter ? "text-emerald-500" : "text-rose-500"}`}>
              {isBetter ? "-" : "+"}{Math.abs(percentage)}%
            </span>
          </div>
        </div>
      </div>
      <div className="text-center">
        <div className={`text-sm font-medium ${isBetter ? "text-emerald-500" : "text-rose-500"}`}>
          {isBetter ? "Better than industry average" : "Above industry average"}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Based on similar AI workloads
        </div>
      </div>
    </div>
  );
}

// Main Dashboard Component
export default function DashboardPage() {
  const { token, ready } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trendData, setTrendData] = useState<CarbonTrendPoint[]>([]);
  const [topProjects, setTopProjects] = useState<TopProject[]>([]);
  const [breakdown, setBreakdown] = useState<CarbonBreakdown[]>([]);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch real analytics data
        const analyticsData = await apiFetch<any>("/analytics/dashboard", {}, { token });
        
        if (analyticsData && analyticsData.total_runs > 0) {
          setHasData(true);
          setStats(analyticsData);
          // Set other real data if available
        } else {
          setHasData(false);
        }
      } catch (error) {
        // If analytics endpoint doesn't exist or returns error, check if we have any job runs
        try {
          const runs = await apiFetch<any[]>("/job-runs", {}, { token });
          if (runs && runs.length > 0) {
            setHasData(true);
            // Calculate basic stats from runs
            const totalCarbon = runs.reduce((sum, r) => sum + (r.carbon_emissions_kg || 0), 0);
            const totalEnergy = runs.reduce((sum, r) => sum + (r.energy_consumed_kwh || 0), 0);
            setStats({
              total_carbon_kg: totalCarbon,
              total_energy_kwh: totalEnergy,
              total_runs: runs.length,
              active_projects: 0,
              carbon_trend: 0,
              energy_trend: 0,
              carbon_saved_kg: 0,
              efficiency_score: 0,
              industry_comparison: 0,
            });
          } else {
            setHasData(false);
          }
        } catch {
          setHasData(false);
        }
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [token]);

  if (!ready) return null;

  if (!token) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="text-center py-16">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
            <Leaf className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Welcome to GreenAI</h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Track, analyze, and reduce the carbon footprint of your AI workloads.
            Start your sustainability journey today.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link 
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
            >
              Sign in <ArrowRight className="h-4 w-4" />
            </Link>
            <Link 
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent transition-all"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded bg-muted" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-2xl bg-muted" />)}
          </div>
          <div className="h-80 rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (!hasData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="text-center space-y-6">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10">
            <BarChart3 className="h-12 w-12 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-3">Welcome to Your Dashboard</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
              Your carbon tracking dashboard is ready! Start sending job run data to see analytics, trends, and insights.
            </p>
          </div>
          
          <div className="rounded-2xl border border-border/60 bg-card p-8 max-w-2xl mx-auto text-left">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-500" />
              Quick Start Guide
            </h3>
            <ol className="space-y-4 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 font-semibold text-xs">1</span>
                <div>
                  <strong className="text-foreground">Create a Project</strong> - Go to <Link href="/projects" className="text-primary hover:underline">Projects</Link> and create your first project
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 font-semibold text-xs">2</span>
                <div>
                  <strong className="text-foreground">Generate API Key</strong> - Go to <Link href="/api-keys" className="text-primary hover:underline">API Keys</Link> and create a key for your project
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 font-semibold text-xs">3</span>
                <div>
                  <strong className="text-foreground">Send Job Run Data</strong> - Use your API key to track ML workloads (see <code className="px-2 py-1 bg-muted rounded text-xs">/app/HOW_TO_USE_GREENAI.md</code> for integration guide)
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 font-semibold text-xs">4</span>
                <div>
                  <strong className="text-foreground">View Analytics</strong> - Return here to see carbon emissions, trends, and insights
                </div>
              </li>
            </ol>
          </div>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Link 
              href="/projects"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
            >
              Create Your First Project <ArrowRight className="h-4 w-4" />
            </Link>
            <a 
              href="/app/HOW_TO_USE_GREENAI.md"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent transition-all"
            >
              View Integration Guide
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Show dashboard with real data
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Carbon Dashboard</h1>
          <p className="text-muted-foreground">Monitor your AI carbon footprint in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="h-10 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground">
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 90 days</option>
            <option>This year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Carbon Emissions"
          value={(stats?.total_carbon_kg ?? 0).toFixed(1)}
          unit="kg CO₂e"
          trend={stats?.carbon_trend}
          trendLabel="vs last month"
          icon={Leaf}
          color="emerald"
        />
        <StatCard
          title="Energy Consumed"
          value={(stats?.total_energy_kwh ?? 0).toFixed(1)}
          unit="kWh"
          trend={stats?.energy_trend}
          icon={Zap}
          color="teal"
        />
        <StatCard
          title="Carbon Saved"
          value={(stats?.carbon_saved_kg ?? 0).toFixed(1)}
          unit="kg CO₂e"
          icon={Target}
          color="cyan"
        />
        <StatCard
          title="Total Job Runs"
          value={stats?.total_runs ?? 0}
          icon={Activity}
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Carbon Trend Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Carbon Emissions Trend</h3>
              <p className="text-xs text-muted-foreground">Daily CO₂e emissions over time</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="carbonGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="carbon" stroke="#10b981" fill="url(#carbonGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Efficiency Score */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 flex flex-col items-center justify-center">
          <EfficiencyScore score={stats?.efficiency_score ?? 0} />
          <div className="mt-4 w-full">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress to goal</span>
              <span>78%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* AI Insights */}
        <InsightsCard />
        
        {/* Leaderboard */}
        <LeaderboardCard projects={topProjects} />
        
        {/* Industry Comparison */}
        <IndustryComparison percentage={stats?.industry_comparison} />
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Carbon Breakdown */}
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-teal-500" />
            <h3 className="font-semibold text-foreground">Carbon Breakdown</h3>
          </div>
          <div className="flex items-center gap-6">
            <div className="h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {breakdown.map((item) => (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-foreground">{item.category}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Runs */}
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold text-foreground">Recent Runs</h3>
            </div>
            <Link href="/job-runs" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentRuns.map((run) => (
              <div key={run.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className={`h-2 w-2 rounded-full ${
                  run.status === "completed" ? "bg-emerald-500" :
                  run.status === "running" ? "bg-amber-500 animate-pulse" :
                  "bg-rose-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{run.name}</div>
                  <div className="text-xs text-muted-foreground">{run.project_name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">{run.carbon_kg.toFixed(1)} kg</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-primary/10 to-teal-500/10 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Ready to reduce your carbon footprint?</h3>
            <p className="text-muted-foreground">Get AI-powered suggestions to optimize your ML workloads</p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/suggestions" 
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all"
            >
              <Sparkles className="h-4 w-4" /> Get Suggestions
            </Link>
            <Link 
              href="/reports"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-all"
            >
              Generate Report
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
