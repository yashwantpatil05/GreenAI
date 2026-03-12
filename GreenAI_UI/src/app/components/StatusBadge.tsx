import { Badge } from "./ui/badge";
import { getStatusColor } from "../../lib/utils";
import { Circle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  animated?: boolean;
}

export function StatusBadge({ status, animated = false }: StatusBadgeProps) {
  const variant = getStatusColor(status);
  const isRunning = status.toLowerCase() === 'running' || status.toLowerCase() === 'generating';
  
  return (
    <Badge variant={variant as any} className="capitalize flex items-center gap-1.5">
      {isRunning && animated ? (
        <Circle className="h-2 w-2 fill-current animate-pulse" />
      ) : (
        <Circle className="h-2 w-2 fill-current" />
      )}
      {status}
    </Badge>
  );
}
