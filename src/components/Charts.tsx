import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, Area, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FedData } from "@/services/fedData";

interface ChartsProps {
  data: FedData[];
}

export function Charts({ data }: ChartsProps) {
  // Reverse data to show oldest to newest
  const chartData = [...data].reverse().map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    walcl: d.walcl ? d.walcl / 1000 : null,
    wresbal: d.wresbal ? d.wresbal / 1000 : null,
    spread: d.sofr_iorb_spread,
    sofr: d.sofr,
    iorb: d.iorb,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Balance Sheet Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fed Balance Sheet (WALCL)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
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
                label={{ value: 'Trillions $', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="walcl" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Balance Sheet"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* SOFR-IORB Spread Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">SOFR-IORB Spread</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
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
                label={{ value: 'Basis Points', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="spread" 
                fill="hsl(var(--accent) / 0.2)" 
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                name="Spread"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Reserve Balances Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reserve Balances (WRESBAL)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
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
                label={{ value: 'Trillions $', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="wresbal" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                name="Reserves"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* SOFR vs IORB Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">SOFR vs IORB</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
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
                label={{ value: 'Basis Points', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="sofr" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="SOFR"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="iorb" 
                stroke="hsl(var(--warning))" 
                strokeWidth={2}
                name="IORB"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}