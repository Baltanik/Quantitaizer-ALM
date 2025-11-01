import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FedData } from "@/services/fedData";
import { useState } from "react";

interface CombinedChartProps {
  data: FedData[];
}

export function CombinedChart({ data }: CombinedChartProps) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);

  // Normalize all values to 0-100 scale for comparison
  const normalizeValue = (value: number | null, min: number, max: number): number | null => {
    if (value === null) return null;
    if (max === min) return 50;
    return ((value - min) / (max - min)) * 100;
  };

  // Calculate min/max for each metric
  const getMinMax = (key: keyof FedData) => {
    const values = data.map(d => d[key] as number).filter(v => v !== null && !isNaN(v));
    if (values.length === 0) return { min: 0, max: 100 };
    return { min: Math.min(...values), max: Math.max(...values) };
  };

  const ranges = {
    sofr: getMinMax('sofr'),
    iorb: getMinMax('iorb'),
    spread: getMinMax('sofr_iorb_spread'),
    walcl: getMinMax('walcl'),
    wresbal: getMinMax('wresbal'),
    rrpontsyd: getMinMax('rrpontsyd'),
    rpontsyd: getMinMax('rpontsyd'),
    rponttld: getMinMax('rponttld'),
    dtb3: getMinMax('dtb3'),
    dtb1yr: getMinMax('dtb1yr'),
  };

  const chartData = [...data].reverse().map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sofr: normalizeValue(d.sofr, ranges.sofr.min, ranges.sofr.max),
    iorb: normalizeValue(d.iorb, ranges.iorb.min, ranges.iorb.max),
    spread: normalizeValue(d.sofr_iorb_spread, ranges.spread.min, ranges.spread.max),
    walcl: normalizeValue(d.walcl, ranges.walcl.min, ranges.walcl.max),
    wresbal: normalizeValue(d.wresbal, ranges.wresbal.min, ranges.wresbal.max),
    rrpontsyd: normalizeValue(d.rrpontsyd, ranges.rrpontsyd.min, ranges.rrpontsyd.max),
    rpontsyd: normalizeValue(d.rpontsyd, ranges.rpontsyd.min, ranges.rpontsyd.max),
    rponttld: normalizeValue(d.rponttld, ranges.rponttld.min, ranges.rponttld.max),
    dtb3: normalizeValue(d.dtb3, ranges.dtb3.min, ranges.dtb3.max),
    dtb1yr: normalizeValue(d.dtb1yr, ranges.dtb1yr.min, ranges.dtb1yr.max),
  }));

  const getStrokeWidth = (lineKey: string) => {
    if (!hoveredLine) return 1;
    return hoveredLine === lineKey ? 3 : 0.5;
  };

  const getOpacity = (lineKey: string) => {
    if (!hoveredLine) return 0.8;
    return hoveredLine === lineKey ? 1 : 0.2;
  };

  const lineConfig = [
    { key: 'spread', name: 'SOFR-IORB Spread', color: 'hsl(var(--chart-3))', primary: true },
    { key: 'walcl', name: 'Fed Balance', color: 'hsl(var(--primary))', primary: true },
    { key: 'wresbal', name: 'Reserves', color: 'hsl(var(--success))', primary: true },
    { key: 'sofr', name: 'SOFR', color: 'hsl(var(--chart-1))' },
    { key: 'iorb', name: 'IORB', color: 'hsl(var(--chart-2))' },
    { key: 'rrpontsyd', name: 'RRP', color: 'hsl(var(--warning))' },
    { key: 'rpontsyd', name: 'Repo ON', color: 'hsl(var(--chart-4))' },
    { key: 'rponttld', name: 'Repo Term', color: 'hsl(var(--chart-5))' },
    { key: 'dtb3', name: '3M T-Bill', color: 'hsl(var(--accent))' },
    { key: 'dtb1yr', name: '1Y T-Bill', color: 'hsl(var(--destructive))' },
  ];

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-lg">All Indicators Combined</CardTitle>
        <p className="text-xs text-muted-foreground">
          Normalized 0-100 scale • Hover to highlight • Gaps indicate missing data
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '10px' }}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '10px' }}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '11px',
                padding: '8px'
              }}
              formatter={(value: any) => value?.toFixed(1)}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconSize={10}
              onMouseEnter={(e) => setHoveredLine(String(e.dataKey))}
              onMouseLeave={() => setHoveredLine(null)}
            />
            
            {lineConfig.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={line.color}
                strokeWidth={getStrokeWidth(line.key)}
                name={line.name}
                dot={false}
                connectNulls={false}
                opacity={getOpacity(line.key)}
                onMouseEnter={() => setHoveredLine(line.key)}
                onMouseLeave={() => setHoveredLine(null)}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}