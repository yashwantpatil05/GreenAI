import { mockJobRuns } from '../../../data/mockData';
import { useApp } from '../../../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ArrowLeft, TrendingDown, TrendingUp, FileText } from 'lucide-react';
import { formatCO2e, formatEnergy, formatCurrency, formatDuration } from '../../../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function CompareResult() {
  const { comparisonBaseline, comparisonCandidate, setView } = useApp();
  
  const baseline = mockJobRuns.find(r => r.id === comparisonBaseline);
  const candidate = mockJobRuns.find(r => r.id === comparisonCandidate);

  if (!baseline || !candidate) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Invalid comparison selection</p>
          <Button onClick={() => setView('compare-selector')}>
            Select Runs to Compare
          </Button>
        </div>
      </div>
    );
  }

  // Calculate deltas
  const co2eDelta = candidate.carbon_kg_co2e - baseline.carbon_kg_co2e;
  const co2eDeltaPercent = (co2eDelta / baseline.carbon_kg_co2e) * 100;
  const kwhDelta = candidate.energy_kwh - baseline.energy_kwh;
  const kwhDeltaPercent = (kwhDelta / baseline.energy_kwh) * 100;
  const runtimeDelta = candidate.duration_seconds - baseline.duration_seconds;
  const runtimeDeltaPercent = (runtimeDelta / baseline.duration_seconds) * 100;
  const costDelta = candidate.cost_usd && baseline.cost_usd ? candidate.cost_usd - baseline.cost_usd : null;
  const costDeltaPercent = costDelta && baseline.cost_usd ? (costDelta / baseline.cost_usd) * 100 : null;

  const comparisonData = [
    {
      metric: 'CO₂e',
      Baseline: baseline.carbon_kg_co2e,
      Candidate: candidate.carbon_kg_co2e,
    },
    {
      metric: 'Energy (kWh)',
      Baseline: baseline.energy_kwh,
      Candidate: candidate.energy_kwh,
    },
    {
      metric: 'Duration (h)',
      Baseline: baseline.duration_seconds / 3600,
      Candidate: candidate.duration_seconds / 3600,
    },
  ];

  const metadataChanges = [];
  if (baseline.tags && candidate.tags) {
    for (const key of Object.keys({ ...baseline.tags, ...candidate.tags })) {
      if (baseline.tags[key] !== candidate.tags[key]) {
        metadataChanges.push({
          key,
          old: baseline.tags[key] || 'N/A',
          new: candidate.tags[key] || 'N/A',
        });
      }
    }
  }

  const recommendations = [];
  if (co2eDelta < 0) {
    recommendations.push('Excellent! Candidate run achieved lower carbon emissions. Consider applying these optimizations across similar workloads.');
  } else {
    recommendations.push('Candidate run has higher emissions. Review the configuration changes and consider reverting to baseline settings.');
  }
  if (runtimeDelta < 0) {
    recommendations.push('Runtime improved in candidate run. Faster execution reduces total energy consumption.');
  }

  const DeltaDisplay = ({ delta, percent, unit }: { delta: number; percent: number; unit: string }) => {
    const isImprovement = delta < 0;
    return (
      <div className={`flex items-center gap-2 ${isImprovement ? 'text-primary' : 'text-destructive'}`}>
        {isImprovement ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
        <span className="font-semibold">
          {delta > 0 && '+'}{delta.toFixed(2)} {unit}
        </span>
        <span className="text-sm">
          ({percent > 0 && '+'}{percent.toFixed(1)}%)
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setView('compare-selector')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1>Comparison Results</h1>
          <p className="text-muted-foreground">
            {baseline.run_name} vs {candidate.run_name}
          </p>
        </div>
        <Button className="gap-2">
          <FileText className="h-4 w-4" />
          Generate Comparison PDF
        </Button>
      </div>

      {/* Delta Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">CO₂e Delta</p>
            <DeltaDisplay delta={co2eDelta} percent={co2eDeltaPercent} unit="kg" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Energy Delta</p>
            <DeltaDisplay delta={kwhDelta} percent={kwhDeltaPercent} unit="kWh" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Runtime Delta</p>
            <DeltaDisplay delta={runtimeDelta} percent={runtimeDeltaPercent} unit="s" />
          </CardContent>
        </Card>
        {costDelta !== null && costDeltaPercent !== null && (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Cost Delta</p>
              <DeltaDisplay delta={costDelta} percent={costDeltaPercent} unit="USD" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Before/After Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Before vs After Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="Baseline" fill="#6b7280" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Candidate" fill="#14b8a6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* What Changed */}
      {metadataChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metadataChanges.map((change) => (
                <div key={change.key} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <span className="font-medium min-w-[100px]">{change.key}</span>
                  <div className="flex items-center gap-2 flex-1">
                    <Badge variant="secondary">{change.old}</Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="secondary">{change.new}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="text-primary mt-1">•</span>
                <span className="text-sm">{rec}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
