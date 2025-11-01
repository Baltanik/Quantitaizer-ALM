import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number | null;
  previousValue?: number | null;
  unit?: string;
  format?: 'number' | 'bps' | 'billion';
}

export function MetricCard({ 
  title, 
  value, 
  previousValue, 
  unit = '', 
  format = 'number' 
}: MetricCardProps) {
  const formatValue = (val: number | null) => {
    if (val === null) return 'N/A';
    
    switch (format) {
      case 'bps':
        return `${val.toFixed(2)} bps`;
      case 'billion':
        return `$${(val / 1000).toFixed(2)}T`;
      default:
        return `${val.toFixed(2)}${unit}`;
    }
  };

  const getTrend = () => {
    if (!value || !previousValue) return null;
    const change = ((value - previousValue) / previousValue) * 100;
    return change;
  };

  const trend = getTrend();
  const TrendIcon = trend === null ? Minus : trend > 0 ? TrendingUp : TrendingDown;
  const trendColor = trend === null ? 'text-muted-foreground' : trend > 0 ? 'text-success' : 'text-destructive';

  return (
    <Card className="hover:border-primary/50 transition-all duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-mono font-bold">
              {formatValue(value)}
            </p>
            {trend !== null && (
              <p className={`text-xs font-mono mt-1 flex items-center gap-1 ${trendColor}`}>
                <TrendIcon className="h-3 w-3" />
                {Math.abs(trend).toFixed(2)}%
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}