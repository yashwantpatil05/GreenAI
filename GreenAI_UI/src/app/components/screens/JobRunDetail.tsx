import { mockJobRuns, mockSuggestions, mockAuditLogs } from '../../../data/mockData';
import { useApp } from '../../../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { StatusBadge } from '../StatusBadge';
import { CopyButton } from '../CopyButton';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { 
  ArrowLeft, 
  GitCompare, 
  FileText, 
  Download,
  Clock,
  MapPin,
  Zap,
  Cloud,
  DollarSign,
  Server,
  Cpu,
  HardDrive
} from 'lucide-react';
import { formatCO2e, formatEnergy, formatCurrency, formatDuration, formatDateTime, formatRelativeTime } from '../../../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { SeverityBadge } from '../SeverityBadge';

export function JobRunDetail() {
  const { selectedRunId, setView, setComparisonBaseline } = useApp();
  
  const run = mockJobRuns.find(r => r.id === selectedRunId);
  const runSuggestions = mockSuggestions.filter(s => s.run_id === selectedRunId);
  const runAuditLogs = mockAuditLogs.filter(log => 
    log.resource_id === selectedRunId || log.metadata?.run_id === selectedRunId
  ).slice(0, 5);

  if (!run) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">Run not found</p>
          <Button onClick={() => setView('job-runs')} className="mt-4">
            Back to Job Runs
          </Button>
        </div>
      </div>
    );
  }

  const emissionsData = [
    { component: 'GPU', value: run.gpu_hours ? run.energy_kwh * 0.6 : 0, co2e: run.carbon_kg_co2e * 0.6 },
    { component: 'CPU', value: run.cpu_hours ? run.energy_kwh * 0.25 : 0, co2e: run.carbon_kg_co2e * 0.25 },
    { component: 'RAM', value: run.ram_gb ? run.energy_kwh * 0.10 : 0, co2e: run.carbon_kg_co2e * 0.10 },
    { component: 'Other', value: run.energy_kwh * 0.05, co2e: run.carbon_kg_co2e * 0.05 },
  ];

  const handleCompare = () => {
    setComparisonBaseline(run.id);
    setView('compare-selector');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setView('job-runs')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Job Runs
          </Button>
          <div className="flex items-center gap-3">
            <h1>{run.run_name}</h1>
            <StatusBadge status={run.status} animated />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {formatDateTime(run.start_time)}
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {run.region}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">ID:</span>
              <code className="px-2 py-0.5 bg-muted rounded text-xs">{run.id}</code>
              <CopyButton text={run.id} size="icon" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCompare}>
            <GitCompare className="mr-2 h-4 w-4" />
            Compare
          </Button>
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download JSON
          </Button>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
          <TabsTrigger value="emissions">Emissions</TabsTrigger>
          {run.cost_usd && <TabsTrigger value="costs">Costs</TabsTrigger>}
          <TabsTrigger value="suggestions">
            Suggestions
            {runSuggestions.length > 0 && (
              <Badge variant="secondary" className="ml-2">{runSuggestions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="text-2xl font-semibold">{formatDuration(run.duration_seconds)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Energy</p>
                    <p className="text-2xl font-semibold">{formatEnergy(run.energy_kwh)}</p>
                  </div>
                  <Zap className="h-8 w-8 text-warning" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">CO₂e Emissions</p>
                    <p className="text-2xl font-semibold">{formatCO2e(run.carbon_kg_co2e)}</p>
                  </div>
                  <Cloud className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            {run.cost_usd && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Cost</p>
                      <p className="text-2xl font-semibold">{formatCurrency(run.cost_usd)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-success" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Resource Details */}
          <Card>
            <CardHeader>
              <CardTitle>Resource Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {run.gpu_type && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Server className="h-4 w-4" />
                      <span className="text-sm">GPU Type</span>
                    </div>
                    <p className="font-medium">{run.gpu_type}</p>
                  </div>
                )}
                {run.gpu_hours !== undefined && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Server className="h-4 w-4" />
                      <span className="text-sm">GPU Hours</span>
                    </div>
                    <p className="font-medium">{run.gpu_hours.toFixed(2)} h</p>
                  </div>
                )}
                {run.cpu_hours !== undefined && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Cpu className="h-4 w-4" />
                      <span className="text-sm">CPU Hours</span>
                    </div>
                    <p className="font-medium">{run.cpu_hours.toFixed(2)} h</p>
                  </div>
                )}
                {run.ram_gb !== undefined && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <HardDrive className="h-4 w-4" />
                      <span className="text-sm">RAM</span>
                    </div>
                    <p className="font-medium">{run.ram_gb} GB</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Telemetry Tab */}
        <TabsContent value="telemetry" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Run Metadata</CardTitle>
                <CopyButton text={JSON.stringify(run, null, 2)} label="Copy JSON" />
              </div>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                <code>{JSON.stringify(run, null, 2)}</code>
              </pre>
            </CardContent>
          </Card>
          
          {run.tags && Object.keys(run.tags).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(run.tags).map(([key, value]) => (
                    <Badge key={key} variant="secondary">
                      {key}: {value}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Emissions Tab */}
        <TabsContent value="emissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Emissions Breakdown by Component</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={emissionsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="component" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `${value.toFixed(1)} kg`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [`${value.toFixed(2)} kg CO₂e`, 'Emissions']}
                  />
                  <Bar dataKey="co2e" radius={[8, 8, 0, 0]}>
                    {emissionsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#14b8a6" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs Tab */}
        {run.cost_usd && (
          <TabsContent value="costs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Total Cost</span>
                    <span className="text-2xl font-semibold">{formatCurrency(run.cost_usd)}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Cost per kWh</span>
                      <span className="font-medium">{formatCurrency(run.cost_usd / run.energy_kwh)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Cost per hour</span>
                      <span className="font-medium">{formatCurrency(run.cost_usd / (run.duration_seconds / 3600))}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-6">
          {runSuggestions.length > 0 ? (
            <div className="space-y-4">
              {runSuggestions.map((suggestion) => (
                <Card key={suggestion.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3>{suggestion.title}</h3>
                          <SeverityBadge severity={suggestion.severity} />
                          <Badge variant={suggestion.status === 'accepted' ? 'success' : 'secondary'}>
                            {suggestion.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">CO₂e Savings</p>
                        <p className="font-semibold text-primary">{formatCO2e(suggestion.expected_savings_co2e)}</p>
                      </div>
                      <div className="p-3 bg-warning/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Energy Savings</p>
                        <p className="font-semibold text-warning">{formatEnergy(suggestion.expected_savings_kwh)}</p>
                      </div>
                      {suggestion.expected_savings_cost && (
                        <div className="p-3 bg-success/10 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Cost Savings</p>
                          <p className="font-semibold text-success">{formatCurrency(suggestion.expected_savings_cost)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No optimization suggestions available for this run</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Related Audit Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {runAuditLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runAuditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground">
                          {formatRelativeTime(log.timestamp)}
                        </TableCell>
                        <TableCell>{log.actor_name}</TableCell>
                        <TableCell className="capitalize">{log.action} {log.resource_type}</TableCell>
                        <TableCell>
                          <StatusBadge status={log.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No audit logs found for this run</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
