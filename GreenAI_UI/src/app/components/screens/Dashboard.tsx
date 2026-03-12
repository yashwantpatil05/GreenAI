import { mockDashboardMetrics, mockJobRuns, mockActivities } from '../../../data/mockData';
import { MetricCard } from '../MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { StatusBadge } from '../StatusBadge';
import { useApp } from '../../../context/AppContext';
import { 
  Cloud, 
  Zap, 
  Activity as ActivityIcon, 
  DollarSign,
  TrendingDown
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { formatCO2e, formatEnergy, formatCurrency, formatRelativeTime } from '../../../lib/utils';

// Generate trend data
const trendData = [
  { date: 'Dec 27', co2e: 45.2 },
  { date: 'Dec 28', co2e: 52.1 },
  { date: 'Dec 29', co2e: 38.4 },
  { date: 'Dec 30', co2e: 29.8 },
  { date: 'Dec 31', co2e: 33.5 },
  { date: 'Jan 1', co2e: 41.2 },
  { date: 'Jan 2', co2e: 68.9 },
  { date: 'Jan 3', co2e: 60.2 },
];

const energyBreakdown = [
  { name: 'GPU', value: 1456.3, color: '#14b8a6' },
  { name: 'CPU', value: 678.9, color: '#0d9488' },
  { name: 'RAM', value: 289.4, color: '#059669' },
  { name: 'Other', value: 144.9, color: '#10b981' },
];

export function Dashboard() {
  const { setView, setSelectedRunId } = useApp();
  const metrics = mockDashboardMetrics;
  
  // Get top 5 runs by CO2e
  const topRuns = [...mockJobRuns]
    .sort((a, b) => b.carbon_kg_co2e - a.carbon_kg_co2e)
    .slice(0, 5);

  const handleRunClick = (runId: string) => {
    setSelectedRunId(runId);
    setView('job-run-detail');
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total CO₂e"
          value={formatCO2e(metrics.total_co2e)}
          icon={Cloud}
          trend={metrics.co2e_trend_percent}
          trendLabel="vs last period"
        />
        <MetricCard
          title="Total Energy"
          value={formatEnergy(metrics.total_kwh)}
          icon={Zap}
        />
        <MetricCard
          title="Avg CO₂e/Run"
          value={formatCO2e(metrics.avg_co2e_per_run)}
          icon={TrendingDown}
        />
        <MetricCard
          title="Total Runs"
          value={metrics.total_runs}
          icon={ActivityIcon}
          trend={metrics.runs_trend_percent}
          trendLabel="vs last period"
        />
        <MetricCard
          title="Cost Estimate"
          value={formatCurrency(metrics.cost_estimate)}
          icon={DollarSign}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CO2e Trend */}
        <Card>
          <CardHeader>
            <CardTitle>CO₂e Emissions Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `${value} kg`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => [`${value} kg CO₂e`, 'Emissions']}
                />
                <Line 
                  type="monotone" 
                  dataKey="co2e" 
                  stroke="#14b8a6" 
                  strokeWidth={2}
                  dot={{ fill: '#14b8a6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Energy Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Energy Consumption by Component</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={energyBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {energyBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => [`${value.toFixed(1)} kWh`, 'Energy']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Hotspots */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Highest Carbon Footprint Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">CO₂e</TableHead>
                  <TableHead className="text-right">Energy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRuns.map((run) => (
                  <TableRow 
                    key={run.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRunClick(run.id)}
                  >
                    <TableCell className="font-medium">{run.run_name}</TableCell>
                    <TableCell>
                      <StatusBadge status={run.status} animated />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{run.region}</TableCell>
                    <TableCell className="text-right">{formatCO2e(run.carbon_kg_co2e)}</TableCell>
                    <TableCell className="text-right">{formatEnergy(run.energy_kwh)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockActivities.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">{activity.description}</p>
                    {activity.resource && (
                      <p className="text-sm font-medium">{activity.resource}</p>
                    )}
                    {activity.actor && (
                      <p className="text-xs text-muted-foreground">by {activity.actor}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
