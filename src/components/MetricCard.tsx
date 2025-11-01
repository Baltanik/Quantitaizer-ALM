import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface MetricCardProps {
  title: string;
  value: number | null;
  previousValue?: number | null;
  historicalData?: Array<{ value: number | null }>;
  unit?: string;
  format?: 'number' | 'bps' | 'billion';
}

export function MetricCard({ 
  title, 
  value, 
  previousValue, 
  historicalData = [],
  unit = '', 
  format = 'number' 
}: MetricCardProps) {
  const formatValue = (val: number | null) => {
    if (val === null) return 'N/A';
    
    switch (format) {
      case 'bps':
        return val.toFixed(2);
      case 'billion':
        return (val / 1000).toFixed(2);
      default:
        return val.toFixed(2);
    }
  };

  const getUnit = () => {
    switch (format) {
      case 'bps':
        return ' bps';
      case 'billion':
        return 'T';
      default:
        return unit;
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

  // Filter out null values for chart
  const chartData = historicalData.filter(d => d.value !== null);

  return (
    <Card className="hover:border-primary/50 transition-all duration-300 relative overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-mono font-bold flex items-baseline gap-1">
                {format === 'billion' && <span className="text-lg">$</span>}
                {formatValue(value)}
                <span className="text-sm text-muted-foreground">{getUnit()}</span>
              </p>
              {trend !== null && (
                <p className={`text-xs font-mono mt-1 flex items-center gap-1 ${trendColor}`}>
                  <TrendIcon className="h-3 w-3" />
                  {Math.abs(trend).toFixed(2)}%
                </p>
              )}
            </div>
          </div>
          
          {chartData.length > 1 && (
            <div className="h-12 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}