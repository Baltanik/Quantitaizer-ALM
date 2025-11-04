import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { getMetricDescription } from "@/lib/metricDescriptions";
import { useState, useEffect } from "react";

interface MetricCardProps {
  title: string;
  value: number | null | undefined;
  previousValue?: number | null | undefined;
  historicalData?: Array<{ value: number | null | undefined }>;
  unit?: string;
  format?: 'number' | 'bps' | 'billion';
  defaultExpanded?: boolean;
}

export function MetricCard({ 
  title, 
  value, 
  previousValue, 
  historicalData = [],
  unit = '', 
  format = 'number',
  defaultExpanded = false
}: MetricCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Sincronizza con il controllo globale
  useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);
  const formatValue = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    
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
    if (!value || value === null || value === undefined || isNaN(value)) return null;
    
    // Debug logging per tutti i principali indicatori
    if (['SOFR', 'IORB', 'Bilancio Fed', 'Riserve Bancarie'].includes(title)) {
      console.log('🔍 TREND CALCULATION DEBUG for', title);
      console.log('   Current value:', value);
      console.log('   Previous value:', previousValue);
      console.log('   Historical data length:', historicalData.length);
    }
    
    // Prima prova a usare previousValue se disponibile
    if (previousValue !== null && previousValue !== undefined && !isNaN(previousValue) && Math.abs(previousValue) > 0.001) {
      const change = ((value - previousValue) / Math.abs(previousValue)) * 100;
      
      // Controllo di sanità: soglie diverse per strumenti diversi
      let maxChange = 100; // Default per tassi e bilanci
      
      // Strumenti di emergenza Fed possono avere variazioni più ampie
      if (['Repo ON', 'Repo Term', 'Reverse Repo'].includes(title)) {
        maxChange = 2000; // Fino a 2000% per strumenti di emergenza
      }
      
      // Spread possono avere variazioni molto ampie (es. da 0.18 a 0.36 = +100%)
      if (title.includes('Spread') || title.includes('spread')) {
        maxChange = 500; // Fino a 500% per spread
      }
      
      if (Math.abs(change) > maxChange) {
        if (['SOFR', 'IORB', 'Bilancio Fed', 'Riserve Bancarie', 'Repo ON', 'Repo Term'].includes(title)) {
          console.log('   🚨 CHANGE TOO HIGH for', title);
          console.log('   Current:', value, 'Previous:', previousValue);
          console.log('   Change:', change.toFixed(4) + '% (EXCEEDS', maxChange + '% - RETURNING NULL)');
        }
        return null;
      }
      
      if (['SOFR', 'IORB', 'Bilancio Fed', 'Riserve Bancarie', 'Repo ON', 'Repo Term'].includes(title)) {
        console.log('   ✅ Using previousValue:', previousValue);
        console.log('   ✅ Calculated change:', change.toFixed(4) + '%');
      }
      
      return change;
    } else if (['SOFR', 'IORB', 'Bilancio Fed', 'Riserve Bancarie', 'Repo ON', 'Repo Term'].includes(title)) {
      console.log('   ❌ previousValue not usable:', previousValue, typeof previousValue, 'abs:', Math.abs(previousValue || 0));
    }
    
    // Altrimenti usa l'ultimo valore valido dall'array storico
    const validHistoricalValues = historicalData
      .filter(d => d.value !== null && d.value !== undefined && !isNaN(d.value))
      .map(d => d.value);
    
    if (validHistoricalValues.length === 0) return null;
    
    // Prendi l'ultimo valore storico come precedente
    const lastHistoricalValue = validHistoricalValues[validHistoricalValues.length - 1];
    if (!lastHistoricalValue || Math.abs(lastHistoricalValue) <= 0.001) return null;
    
    const change = ((value - lastHistoricalValue) / Math.abs(lastHistoricalValue)) * 100;
    
    // Controllo di sanità anche per dati storici
    let maxChange = 100; // Default per tassi e bilanci
    if (['Repo ON', 'Repo Term', 'Reverse Repo'].includes(title)) {
      maxChange = 2000; // Fino a 2000% per strumenti di emergenza
    }
    
    // Spread possono avere variazioni molto ampie
    if (title.includes('Spread') || title.includes('spread')) {
      maxChange = 500; // Fino a 500% per spread
    }
    
    if (Math.abs(change) > maxChange) {
      if (['SOFR', 'IORB', 'Bilancio Fed', 'Riserve Bancarie', 'Repo ON', 'Repo Term'].includes(title)) {
        console.log('   🚨 HISTORICAL CHANGE TOO HIGH for', title);
        console.log('   Current:', value, 'Historical:', lastHistoricalValue);
        console.log('   Change:', change.toFixed(4) + '% (EXCEEDS', maxChange + '% - RETURNING NULL)');
      }
      return null;
    }
    
    if (['SOFR', 'IORB', 'Bilancio Fed', 'Riserve Bancarie', 'Repo ON', 'Repo Term'].includes(title)) {
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
  
  // Calculate dynamic Y-axis domain for better visualization
  const getYAxisDomain = () => {
    if (chartData.length === 0) return ['auto', 'auto'];
    
    const values = chartData.map(d => d.value as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    // Se il range è molto piccolo, espandi per mostrare variazioni
    if (range < max * 0.01) { // Se variazione < 1%
      const center = (min + max) / 2;
      const expandedRange = Math.max(center * 0.02, range * 10); // Almeno 2% o 10x il range
      return [center - expandedRange, center + expandedRange];
    }
    
    // Altrimenti usa padding normale
    const padding = range * 0.1;
    return [min - padding, max + padding];
  };

  return (
    <Card className={`hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 relative overflow-hidden bg-slate-900/80 border-slate-800 ${
      isExpanded ? 'row-span-2' : ''
    }`}>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center justify-between">
          <span>{title}</span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-muted/20 rounded transition-colors"
            aria-label={isExpanded ? "Comprimi" : "Espandi"}
          >
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className={isExpanded ? "space-y-3" : "pb-3"}>
        {/* Contenuto sempre visibile - compatto */}
        <div className="flex items-end justify-between">
          <div>
            <p className={`font-mono font-bold flex items-baseline gap-1 whitespace-nowrap ${
              isExpanded ? "text-3xl" : "text-2xl"
            }`}>
              {format === 'billion' && <span className={isExpanded ? "text-lg" : "text-base"}>$</span>}
              <span className="flex items-baseline gap-0">
                {formatValue(value)}
                <span className={`text-muted-foreground ml-0.5 ${
                  isExpanded ? "text-sm" : "text-xs"
                }`}>{getUnit()}</span>
              </span>
            </p>
            {trend !== null && (
              <p className={`font-mono mt-1 flex items-center gap-1 ${trendColor} ${
                isExpanded ? "text-xs" : "text-[10px]"
              }`}>
                <TrendIcon className={isExpanded ? "h-3 w-3" : "h-2.5 w-2.5"} />
                {Math.abs(trend).toFixed(2)}%
              </p>
            )}
          </div>
        </div>
        
        {/* Contenuto espandibile */}
        {isExpanded && (
          <>
            {chartData.length > 1 && (
              <div className="h-12 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <YAxis 
                      domain={getYAxisDomain()}
                      hide={true}
                    />
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
          </>
        )}
      </CardContent>
    </Card>
  );
}