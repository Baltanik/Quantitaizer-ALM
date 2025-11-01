import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { getMetricDescription } from "@/lib/metricDescriptions";

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
    if (!value || value === null) return null;
    
    // Debug logging per SOFR
    if (title === 'SOFR') {
      console.log('🔍 TREND CALCULATION DEBUG for', title);
      console.log('   Current value:', value);
      console.log('   Previous value:', previousValue);
      console.log('   Historical data length:', historicalData.length);
    }
    
    // Prima prova a usare previousValue se disponibile
    if (previousValue !== null && previousValue !== undefined && previousValue !== 0) {
      const change = ((value - previousValue) / Math.abs(previousValue)) * 100;
      
      if (title === 'SOFR') {
        console.log('   Using previousValue:', previousValue);
        console.log('   Calculated change:', change.toFixed(4) + '%');
      }
      
      return change;
    }
    
    // Altrimenti usa l'ultimo valore valido dall'array storico
    const validHistoricalValues = historicalData
      .filter(d => d.value !== null && d.value !== undefined && !isNaN(d.value))
      .map(d => d.value);
    
    if (validHistoricalValues.length === 0) return null;
    
    // Prendi l'ultimo valore storico come precedente
    const lastHistoricalValue = validHistoricalValues[validHistoricalValues.length - 1];
    if (!lastHistoricalValue || lastHistoricalValue === 0) return null;
    
    const change = ((value - lastHistoricalValue) / Math.abs(lastHistoricalValue)) * 100;
    
    if (title === 'SOFR') {
      console.log('   Using historical value:', lastHistoricalValue);
      console.log('   Calculated change:', change.toFixed(4) + '%');
    }
    
    return change;
  };

  const trend = getTrend();
  const TrendIcon = trend === null ? Minus : trend > 0 ? TrendingUp : TrendingDown;
  const trendColor = trend === null ? 'text-muted-foreground' : trend > 0 ? 'text-success' : 'text-destructive';

  // Filter out null values for chart
  const chartData = historicalData.filter(d => d.value !== null);

  return (
    <Card className="hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 relative overflow-hidden bg-slate-900/80 border-slate-800">
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
          
          {/* Spiegazione della metrica */}
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {getMetricDescription(title)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}