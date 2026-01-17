import { useState } from 'react';
import { mockSuggestions } from '../../../data/mockData';
import { useApp } from '../../../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { SeverityBadge } from '../SeverityBadge';
import { Badge } from '../ui/badge';
import { Lightbulb, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { formatCO2e, formatEnergy, formatCurrency } from '../../../lib/utils';

export function Suggestions() {
  const { setView, setSelectedSuggestionId } = useApp();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredSuggestions = mockSuggestions.filter(sug => {
    const matchesSeverity = severityFilter === 'all' || sug.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || sug.status === statusFilter;
    return matchesSeverity && matchesStatus;
  });

  const sortedSuggestions = [...filteredSuggestions].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const handleViewDetails = (id: string) => {
    setSelectedSuggestionId(id);
    setView('suggestion-detail');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Optimization Suggestions</h1>
          <p className="text-muted-foreground">
            AI-powered recommendations to reduce your carbon footprint and costs
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Suggestions</CardTitle>
            <div className="flex items-center gap-3">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedSuggestions.map((suggestion) => (
            <Card key={suggestion.id} className="border-l-4" style={{ borderLeftColor: 
              suggestion.severity === 'critical' || suggestion.severity === 'high' ? 'hsl(var(--destructive))' :
              suggestion.severity === 'medium' ? 'hsl(var(--warning))' : 'hsl(var(--muted-foreground))'
            }}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3>{suggestion.title}</h3>
                        <SeverityBadge severity={suggestion.severity} />
                        <Badge variant={
                          suggestion.status === 'accepted' ? 'success' :
                          suggestion.status === 'in-progress' ? 'warning' :
                          suggestion.status === 'dismissed' ? 'secondary' : 'default'
                        }>
                          {suggestion.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{suggestion.category}</Badge>
                        <span>•</span>
                        <span>Run: {suggestion.run_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
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

                  <div className="flex items-center gap-2 pt-2">
                    <Button size="sm" onClick={() => handleViewDetails(suggestion.id)}>
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    {suggestion.status === 'new' && (
                      <>
                        <Button size="sm" variant="outline">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark Accepted
                        </Button>
                        <Button size="sm" variant="ghost">
                          <XCircle className="mr-2 h-4 w-4" />
                          Dismiss
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {sortedSuggestions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No suggestions match your filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
