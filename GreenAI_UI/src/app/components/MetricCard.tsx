import { Card, CardContent } from './ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  className?: string;
}

export function MetricCard({ title, value, icon: Icon, trend, trendLabel, className }: MetricCardProps) {
  const isPositiveTrend = trend && trend > 0;
  const isNegativeTrend = trend && trend < 0;
  
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-semibold tracking-tight">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1.5 text-sm">
                {isPositiveTrend ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-success">+{trend}%</span>
                  </>
                ) : isNegativeTrend ? (
                  <>
                    <TrendingDown className="h-4 w-4 text-primary" />
                    <span className="text-primary">{trend}%</span>
                  </>
                ) : null}
                {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
              </div>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
