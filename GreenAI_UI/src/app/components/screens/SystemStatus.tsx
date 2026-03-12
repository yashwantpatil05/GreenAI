import { mockSystemStatus, mockRateLimitInfo } from '../../../data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { StatusBadge } from '../StatusBadge';
import { Progress } from '../ui/progress';
import { Server, Database, Shield, Cpu, Clock } from 'lucide-react';
import { formatDateTime } from '../../../lib/utils';

export function SystemStatus() {
  const rateLimitPercent = (mockRateLimitInfo.requests_remaining / mockRateLimitInfo.requests_limit) * 100;
  
  const resetTime = new Date(mockRateLimitInfo.reset_time);
  const now = new Date();
  const minutesUntilReset = Math.max(0, Math.floor((resetTime.getTime() - now.getTime()) / 60000));

  return (
    <div className="space-y-6">
      <div>
        <h1>System Status</h1>
        <p className="text-muted-foreground">
          Monitor system health and rate limits
        </p>
      </div>

      {/* Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockSystemStatus.map((component) => (
          <Card key={component.component}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-muted rounded-lg">
                    {component.component.includes('API') && <Server className="h-5 w-5" />}
                    {component.component.includes('Database') && <Database className="h-5 w-5" />}
                    {component.component.includes('Auth') && <Shield className="h-5 w-5" />}
                    {component.component.includes('Worker') && <Cpu className="h-5 w-5" />}
                  </div>
                  <StatusBadge status={component.status} />
                </div>
                <div>
                  <p className="font-medium">{component.component}</p>
                  {component.response_time_ms && (
                    <p className="text-sm text-muted-foreground">
                      {component.response_time_ms}ms response
                    </p>
                  )}
                  {component.uptime_percent && (
                    <p className="text-sm text-muted-foreground">
                      {component.uptime_percent}% uptime
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">API Requests</span>
              <span className="text-sm text-muted-foreground">
                {mockRateLimitInfo.requests_remaining.toLocaleString()} / {mockRateLimitInfo.requests_limit.toLocaleString()} remaining
              </span>
            </div>
            <Progress value={rateLimitPercent} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Window</p>
              <p className="text-lg font-semibold">{mockRateLimitInfo.window_seconds / 60} minutes</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Resets In</p>
              <p className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {minutesUntilReset} minutes
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Reset Time</p>
              <p className="text-lg font-semibold">{formatDateTime(mockRateLimitInfo.reset_time)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-success">0.02%</p>
            <p className="text-sm text-muted-foreground mt-2">Last 24 hours</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Avg Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">42ms</p>
            <p className="text-sm text-muted-foreground mt-2">P95: 89ms</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-success">99.98%</p>
            <p className="text-sm text-muted-foreground mt-2">Last 30 days</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
