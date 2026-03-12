import { useState } from 'react';
import { mockJobRuns } from '../../../data/mockData';
import { useApp } from '../../../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { formatCO2e, formatEnergy, formatDateTime } from '../../../lib/utils';

export function CompareSelector() {
  const { 
    comparisonBaseline, 
    setComparisonBaseline, 
    comparisonCandidate, 
    setComparisonCandidate,
    setView 
  } = useApp();

  const completedRuns = mockJobRuns.filter(r => r.status === 'completed');

  const handleCompare = () => {
    if (comparisonBaseline && comparisonCandidate) {
      setView('compare-result');
    }
  };

  const baselineRun = completedRuns.find(r => r.id === comparisonBaseline);
  const candidateRun = completedRuns.find(r => r.id === comparisonCandidate);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setView('job-runs')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1>Compare Job Runs</h1>
        <p className="text-muted-foreground">
          Select two completed runs to compare their carbon footprint and performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Baseline Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Baseline Run</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Run</Label>
              <Select value={comparisonBaseline || ''} onValueChange={setComparisonBaseline}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose baseline run" />
                </SelectTrigger>
                <SelectContent>
                  {completedRuns.map((run) => (
                    <SelectItem key={run.id} value={run.id}>
                      {run.run_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {baselineRun && (
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{baselineRun.run_name}</span>
                  <StatusBadge status={baselineRun.status} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Energy</p>
                    <p className="font-medium">{formatEnergy(baselineRun.energy_kwh)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">CO₂e</p>
                    <p className="font-medium">{formatCO2e(baselineRun.carbon_kg_co2e)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Started</p>
                    <p className="font-medium">{formatDateTime(baselineRun.start_time)}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Candidate Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Candidate Run</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Run</Label>
              <Select value={comparisonCandidate || ''} onValueChange={setComparisonCandidate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose candidate run" />
                </SelectTrigger>
                <SelectContent>
                  {completedRuns.map((run) => (
                    <SelectItem key={run.id} value={run.id} disabled={run.id === comparisonBaseline}>
                      {run.run_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {candidateRun && (
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{candidateRun.run_name}</span>
                  <StatusBadge status={candidateRun.status} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Energy</p>
                    <p className="font-medium">{formatEnergy(candidateRun.energy_kwh)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">CO₂e</p>
                    <p className="font-medium">{formatCO2e(candidateRun.carbon_kg_co2e)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Started</p>
                    <p className="font-medium">{formatDateTime(candidateRun.start_time)}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button 
          size="lg"
          onClick={handleCompare}
          disabled={!comparisonBaseline || !comparisonCandidate}
          className="gap-2"
        >
          Compare Runs
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
