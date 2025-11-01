import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FedData } from "@/services/fedData";

interface CombinedChartProps {
  data: FedData[];
}

export function CombinedChart({ data }: CombinedChartProps) {
  // Normalize all values to 0-100 scale for comparison
  const normalizeValue = (value: number | null, min: number, max: number): number | null => {
    if (value === null) return null;
    if (max === min) return 50;
    return ((value - min) / (max - min)) * 100;
  };

  // Calculate min/max for each metric
  const getMinMax = (key: keyof FedData) => {
    const values = data.map(d => d[key] as number).filter(v => v !== null);
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

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-xl">All Indicators Combined (Normalized 0-100)</CardTitle>
        <p className="text-sm text-muted-foreground">
          All metrics scaled to 0-100 for comparison - shows relative trends across all indicators
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              label={{ value: 'Normalized Value (0-100)', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: any) => value?.toFixed(2)}
            />
            <Legend />
            
            {/* Primary indicators */}
            <Line 
              type="monotone" 
              dataKey="sofr" 
              stroke="hsl(var(--chart-1))" 
              strokeWidth={2}
              name="SOFR"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="iorb" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              name="IORB"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="spread" 
              stroke="hsl(var(--chart-3))" 
              strokeWidth={3}
              name="SOFR-IORB Spread"
              dot={false}
            />
            
            {/* Balance sheet indicators */}
            <Line 
              type="monotone" 
              dataKey="walcl" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              name="Fed Balance Sheet"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="wresbal" 
              stroke="hsl(var(--success))" 
              strokeWidth={2}
              name="Reserve Balances"
              dot={false}
            />
            
            {/* Repo indicators */}
            <Line 
              type="monotone" 
              dataKey="rrpontsyd" 
              stroke="hsl(var(--warning))" 
              strokeWidth={1.5}
              name="Reverse Repo"
              dot={false}
              strokeDasharray="5 5"
            />
            <Line 
              type="monotone" 
              dataKey="rpontsyd" 
              stroke="hsl(var(--chart-4))" 
              strokeWidth={1.5}
              name="Repo ON"
              dot={false}
              strokeDasharray="3 3"
            />
            <Line 
              type="monotone" 
              dataKey="rponttld" 
              stroke="hsl(var(--chart-5))" 
              strokeWidth={1.5}
              name="Repo Term"
              dot={false}
              strokeDasharray="3 3"
            />
            
            {/* Treasury rates */}
            <Line 
              type="monotone" 
              dataKey="dtb3" 
              stroke="hsl(var(--accent))" 
              strokeWidth={1.5}
              name="3M Treasury"
              dot={false}
              opacity={0.7}
            />
            <Line 
              type="monotone" 
              dataKey="dtb1yr" 
              stroke="hsl(var(--destructive))" 
              strokeWidth={1.5}
              name="1Y Treasury"
              dot={false}
              opacity={0.7}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}