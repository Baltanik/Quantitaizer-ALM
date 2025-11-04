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
        // Gli spread nel DB sono in formato decimale (0.27 = 27 bps)
        // Moltiplichiamo per 100 per mostrare in basis points
        return (val * 100).toFixed(2);
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

    // Prima prova a usare previousValue se disponibile
    // FIX: Accetta anche previousValue === 0 (spread può essere 0), solo non undefined/null/NaN
    if (previousValue !== null && previousValue !== undefined && !isNaN(previousValue)) {
      // NUOVO FIX: Se previousValue è identico a value, salta al fallback storico
      if (previousValue === value) {
        // Continua al fallback storico sotto
      } else {
        // FIX: Per il calcolo, se previousValue è 0 (o molto vicino), usa un valore minimo per evitare divisione per 0
        const prevForCalc = Math.abs(previousValue) < 0.001 ? 0.001 : Math.abs(previousValue);
        const change = ((value - previousValue) / prevForCalc) * 100;

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
          console.warn(`⚠️ ${title}: Change ${change.toFixed(2)}% exceeds ${maxChange}% threshold. Current: ${value}, Previous: ${previousValue}`);
          return null;
        }

        return change;
      }
    }

    // Altrimenti usa l'ultimo valore valido dall'array storico
    const validHistoricalValues = historicalData
      .filter(d => d.value !== null && d.value !== undefined && !isNaN(d.value))
      .map(d => d.value);

    if (validHistoricalValues.length === 0) return null;

    // NUOVO FIX: Trova il primo valore storico DIVERSO dal valore corrente
    // (partendo dalla fine dell'array, che contiene i valori più vecchi)
    let lastHistoricalValue = null;
    for (let i = validHistoricalValues.length - 1; i >= 0; i--) {
      if (validHistoricalValues[i] !== value) {
        lastHistoricalValue = validHistoricalValues[i];
        break;
      }
    }

    // Se tutti i valori storici sono uguali al valore corrente, non c'è variazione
    if (lastHistoricalValue === null) return null;

    // FIX: Per il calcolo, se valore storico è 0 (o molto vicino), usa un minimo per evitare divisione per 0
    const histForCalc = Math.abs(lastHistoricalValue) < 0.001 ? 0.001 : Math.abs(lastHistoricalValue);
    const change = ((value - lastHistoricalValue) / histForCalc) * 100;

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
      console.warn(`⚠️ ${title}: Historical change ${change.toFixed(2)}% exceeds ${maxChange}% threshold. Current: ${value}, Historical: ${lastHistoricalValue}`);
      return null;
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
      {/* RESPONSIVE: Mobile CoinMarketCap style, Desktop traditional */}
      {!isExpanded ? (
        <>
          {/* MOBILE LAYOUT: CoinMarketCap style */}
          <div className="sm:hidden px-4 py-3 flex items-center min-h-[56px]">
            {/* Left: Title - Larghezza fissa per allineamento perfetto */}
            <div className="w-36 flex-shrink-0 pr-3">
              <p className="text-sm font-medium text-muted-foreground uppercase truncate leading-tight">
                {title}
              </p>
            </div>
            
            {/* Center: Value - Allineato a destra con spazio controllato, NO LINE BREAK */}
            <div className="flex-1 text-right pr-4">
              <p className="font-mono font-bold text-base text-white leading-tight whitespace-nowrap">
                {format === 'billion' && <span className="text-sm">$</span>}
                <span>{formatValue(value)}</span>
                <span className="text-muted-foreground text-sm ml-0.5">{getUnit()}</span>
              </p>
            </div>
            
            {/* Right: Trend - Larghezza fissa per evitare sovrapposizioni */}
            <div className="w-16 flex items-center justify-center">
              {trend !== null && (
                <div className={`flex items-center gap-1 ${trendColor}`}>
                  <TrendIcon className="h-3 w-3 flex-shrink-0" />
                  <span className="font-mono text-xs font-semibold">
                    {Math.abs(trend).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            
            {/* Far Right: Expand button - Separato per evitare sovrapposizioni */}
            <div className="w-8 flex items-center justify-center">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-muted/20 rounded transition-colors"
                aria-label="Espandi"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* DESKTOP LAYOUT: Traditional card style */}
          <div className="hidden sm:block">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center justify-between">
                <span>{title}</span>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 hover:bg-muted/20 rounded transition-colors"
                  aria-label="Espandi"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="font-mono font-bold text-2xl flex items-baseline gap-1 whitespace-nowrap">
                    {format === 'billion' && <span className="text-base">$</span>}
                    <span className="flex items-baseline gap-0">
                      {formatValue(value)}
                      <span className="text-muted-foreground ml-0.5 text-xs">{getUnit()}</span>
                    </span>
                  </p>
                  {trend !== null && (
                    <p className={`font-mono mt-1 flex items-center gap-1 ${trendColor} text-xs`}>
                      <TrendIcon className="h-2.5 w-2.5" />
                      {Math.abs(trend).toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        </>
      ) : (
        // EXPANDED VIEW: Layout tradizionale
        <>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center justify-between">
              <span>{title}</span>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-muted/20 rounded transition-colors"
                aria-label="Comprimi"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Contenuto espanso */}
            <div className="flex items-end justify-between">
              <div>
                <p className="font-mono font-bold text-3xl flex items-baseline gap-1 whitespace-nowrap">
                  {format === 'billion' && <span className="text-lg">$</span>}
                  <span className="flex items-baseline gap-0">
                    {formatValue(value)}
                    <span className="text-muted-foreground ml-0.5 text-sm">{getUnit()}</span>
                  </span>
                </p>
                {trend !== null && (
                  <p className={`font-mono mt-1 flex items-center gap-1 ${trendColor} text-xs`}>
                    <TrendIcon className="h-3 w-3" />
                    {Math.abs(trend).toFixed(2)}%
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </>
      )}
      
      {/* Contenuto espandibile - solo quando expanded */}
      {isExpanded && (
        <CardContent className="pt-0 space-y-3">
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
        </CardContent>
      )}
    </Card>
  );
}