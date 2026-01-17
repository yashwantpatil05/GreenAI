import { Badge } from "./ui/badge";
import { getSeverityColor } from "../../lib/utils";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

interface SeverityBadgeProps {
  severity: string;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const variant = getSeverityColor(severity);
  
  const getIcon = () => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-3 w-3" />;
      case 'medium':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };
  
  return (
    <Badge variant={variant as any} className="capitalize flex items-center gap-1.5">
      {getIcon()}
      {severity}
    </Badge>
  );
}
