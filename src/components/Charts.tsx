import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, Area, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FedData } from "@/services/fedData";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ChartsProps {
  data: FedData[];
}

export function Charts({ data }: ChartsProps) {
  // Helper to calculate dynamic domain with padding
  const getDomain = (dataKey: string, dataArray: any[]) => {
    const values = dataArray.map(d => d[dataKey]).filter((v): v is number => v !== null && !isNaN(v));
    if (values.length === 0) return [0, 100];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1; // 10% padding
    return [Math.max(0, min - padding), max + padding];
  };

  // Reverse data to show oldest to newest
  const chartData = [...data].reverse().map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    walcl: d.walcl ? d.walcl / 1000 : null,
    wresbal: d.wresbal ? d.wresbal / 1000 : null,
    rrpontsyd: d.rrpontsyd ? d.rrpontsyd / 1000 : null,
    spread: d.sofr_iorb_spread,
    sofr: d.sofr,
    iorb: d.iorb,
    rpontsyd: d.rpontsyd,
    rponttld: d.rponttld,
    dtb3: d.dtb3,
    dtb1yr: d.dtb1yr,
  }));

  return (
    <Accordion type="multiple" className="w-full space-y-4">
      {/* Interest Rates */}
      <AccordionItem value="interest-rates" className="border rounded-lg px-4">
        <AccordionTrigger className="text-lg font-semibold hover:no-underline">
          Interest Rates
        </AccordionTrigger>
        <AccordionContent className="pt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">SOFR-IORB Spread</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    domain={getDomain('spread', chartData)}
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
                    fill="hsl(var(--chart-3) / 0.2)" 
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    name="Spread"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">SOFR vs IORB</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    domain={getDomain('sofr', chartData)}
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                    label={{ value: '%', angle: -90, position: 'insideLeft' }}
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
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Treasury Bills</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    domain={getDomain('dtb3', chartData)}
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                    label={{ value: '%', angle: -90, position: 'insideLeft' }}
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
                    dataKey="dtb3" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    name="3M T-Bill"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="dtb1yr" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    name="1Y T-Bill"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Fed Balance & Liquidity */}
      <AccordionItem value="fed-balance" className="border rounded-lg px-4">
        <AccordionTrigger className="text-lg font-semibold hover:no-underline">
          Fed Balance & Liquidity
        </AccordionTrigger>
        <AccordionContent className="pt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fed Balance Sheet (WALCL)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    domain={getDomain('walcl', chartData)}
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reserve Balances (WRESBAL)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    domain={getDomain('wresbal', chartData)}
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reverse Repo (RRP)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    domain={getDomain('rrpontsyd', chartData)}
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
                    dataKey="rrpontsyd" 
                    stroke="hsl(var(--warning))" 
                    strokeWidth={2}
                    name="RRP"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Repo Operations */}
      <AccordionItem value="repo-operations" className="border rounded-lg px-4">
        <AccordionTrigger className="text-lg font-semibold hover:no-underline">
          Repo Operations
        </AccordionTrigger>
        <AccordionContent className="pt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Repo Overnight (RPONTSYD)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    domain={getDomain('rpontsyd', chartData)}
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'Billions $', angle: -90, position: 'insideLeft' }}
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
                    dataKey="rpontsyd" 
                    stroke="hsl(var(--chart-4))" 
                    strokeWidth={2}
                    name="Repo ON"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Repo Term (RPONTTLD)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    domain={getDomain('rponttld', chartData)}
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'Billions $', angle: -90, position: 'insideLeft' }}
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
                    dataKey="rponttld" 
                    stroke="hsl(var(--chart-5))" 
                    strokeWidth={2}
                    name="Repo Term"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}