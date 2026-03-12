import { useState } from 'react';
import { mockJobRuns } from '../../../data/mockData';
import { useApp } from '../../../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { StatusBadge } from '../StatusBadge';
import { EmptyState } from '../EmptyState';
import { 
  Search, 
  Filter, 
  Download, 
  GitCompare, 
  FileText,
  Lightbulb,
  Eye,
  Activity
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { formatCO2e, formatEnergy, formatDuration, formatDateTime } from '../../../lib/utils';
import type { JobStatus } from '../../../types';

export function JobRuns() {
  const { setView, setSelectedRunId, setComparisonBaseline, setComparisonCandidate } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('all');

  const filteredRuns = mockJobRuns.filter(run => {
    const matchesSearch = run.run_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         run.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
    const matchesJobType = jobTypeFilter === 'all' || run.job_type === jobTypeFilter;
    return matchesSearch && matchesStatus && matchesJobType;
  });

  const handleViewRun = (runId: string) => {
    setSelectedRunId(runId);
    setView('job-run-detail');
  };

  const handleCompare = (runId: string) => {
    setComparisonBaseline(runId);
    setView('compare-selector');
  };

  if (mockJobRuns.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={Activity}
            title="No job runs yet"
            description="Start ingesting telemetry data from your ML jobs to see them here. Use the API key from your project to send data."
            action={{
              label: "View Documentation",
              onClick: () => setView('docs')
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Job Runs</h1>
          <p className="text-muted-foreground">
            Monitor and analyze your ML job emissions and energy consumption
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="inference">Inference</SelectItem>
                  <SelectItem value="data-processing">Data Processing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run Name</TableHead>
                <TableHead>Job Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Energy</TableHead>
                <TableHead className="text-right">CO₂e</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRuns.map((run) => (
                <TableRow key={run.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell 
                    className="font-medium"
                    onClick={() => handleViewRun(run.id)}
                  >
                    {run.run_name}
                  </TableCell>
                  <TableCell className="capitalize">{run.job_type.replace('-', ' ')}</TableCell>
                  <TableCell>
                    <StatusBadge status={run.status} animated />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{run.region}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(run.start_time)}</TableCell>
                  <TableCell>{formatDuration(run.duration_seconds)}</TableCell>
                  <TableCell className="text-right">{formatEnergy(run.energy_kwh)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCO2e(run.carbon_kg_co2e)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{run.project_name}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewRun(run.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCompare(run.id)}>
                          <GitCompare className="mr-2 h-4 w-4" />
                          Compare
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="mr-2 h-4 w-4" />
                          Generate Report
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Lightbulb className="mr-2 h-4 w-4" />
                          View Suggestions
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredRuns.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No runs found matching your filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
