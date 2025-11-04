import { TrendingUp, TrendingDown, Minus, LineChart, AlertTriangle, Info, Target, Eye, BarChart3, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FedData, ScenarioState } from "@/services/fedData";
import { deriveScenario, canShowBullish, getContextColor, getRiskColor } from "@/utils/scenarioEngine";

interface ScenarioCardProps {
  scenario: string | null;
  currentData?: FedData | null;
}

// Bloomberg-style scenario configurations
const getScenarioConfig = (scenario: string, data: FedData | null) => {
  const balanceSheet = data?.walcl ? (data.walcl / 1000000).toFixed(2) : 'N/A';
  const bs_delta = data?.d_walcl_4w ? (data.d_walcl_4w/1000).toFixed(1) : 'N/A';
  const sofr_effr = data?.sofr_effr_spread?.toFixed(1) ?? 'N/A';
  const vix = data?.vix ?? 'N/A';
  const hyOAS = data?.hy_oas ?? 'N/A';
  const rrp_delta = data?.d_rrpontsyd_4w ? (data.d_rrpontsyd_4w/1000).toFixed(1) : 'N/A';
  const res_delta = data?.d_wresbal_4w ? (data.d_wresbal_4w/1000).toFixed(1) : 'N/A';

  const configs = {
    qt: {
      label: "Quantitative Tightening",
      shortLabel: "QT",
      color: "destructive",
      gradient: "from-red-500 to-red-600",
      icon: TrendingDown,
      
      // Top metric (most important)
      topMetric: {
        label: "Balance Sheet",
        value: `$${balanceSheet}T`,
        change: `${parseFloat(bs_delta) > 0 ? '+' : ''}${bs_delta}B`,
        period: "4w",
        trend: parseFloat(bs_delta) < 0 ? "down" : "up"
      },
      
      // Risk assessment
      risk: {
        level: parseFloat(sofr_effr) > 15 ? "HIGH" : parseFloat(sofr_effr) > 10 ? "MEDIUM" : "LOW",
        color: parseFloat(sofr_effr) > 15 ? "red" : parseFloat(sofr_effr) > 10 ? "yellow" : "green"
      },
      
      // Key metrics table
      metrics: [
        { label: "SOFR-EFFR", value: `${sofr_effr}bps`, status: parseFloat(sofr_effr) > 15 ? "STRESS" : "Normal" },
        { label: "Reserve Drain", value: `${res_delta}B`, status: parseFloat(res_delta) < -20 ? "AGGRESSIVE" : "Moderate" },
        { label: "VIX", value: vix, status: parseFloat(vix.toString()) > 22 ? "Elevated" : "Normal" },
        { label: "HY OAS", value: `${hyOAS}%`, status: parseFloat(hyOAS.toString()) > 5.5 ? "Stress" : "Stable" }
      ],
      
      // Headline (concise explanation)
      headline: "Fed riduce il bilancio. Liquidità esce dal sistema. Meno soldi → Asset rischiosi soffrono.",
      
      // Action cards (3 concrete steps)
      actions: [
        { icon: "📊", title: "Riduci", subtitle: "equity", detail: "-20%" },
        { icon: "📈", title: "Long", subtitle: "Treasury", detail: "3-6m" },
        { icon: "🛑", title: "Close", subtitle: "crypto 2x+", detail: "" }
      ],
      
      // Exit signals
      exitSignals: [
        "SOFR-EFFR: < 5bps",
        "RRP: > $30B spike", 
        "BS Trend: Positivo"
      ]
    },
    
    stealth_qe: {
      label: "Stealth QE",
      shortLabel: "Stealth QE",
      color: "warning",
      gradient: "from-yellow-500 to-yellow-600",
      icon: TrendingUp,
      
      topMetric: {
        label: "Balance Sheet",
        value: `$${balanceSheet}T`,
        change: `+${bs_delta}B`,
        period: "4w",
        trend: "up"
      },
      
      risk: {
        level: parseFloat(vix.toString()) < 16 ? "LOW" : "MEDIUM",
        color: parseFloat(vix.toString()) < 16 ? "green" : "yellow"
      },
      
      metrics: [
        { label: "RRP Drain", value: `${Math.abs(parseFloat(rrp_delta))}B`, status: "Fed inietta" },
        { label: "SOFR-EFFR", value: `${sofr_effr}bps`, status: "Basso stress" },
        { label: "VIX", value: vix, status: parseFloat(vix.toString()) < 16 ? "Bullish" : "Cauto" },
        { label: "Reserves", value: `+${res_delta}B`, status: "Crescita" }
      ],
      
      headline: "Fed pompa liquidità nascosto. Bilancio cresce + RRP drena = Più soldi per banche.",
      
      actions: [
        { icon: "📈", title: "Long", subtitle: "equity", detail: "+20%" },
        { icon: "🚀", title: "Long", subtitle: "crypto", detail: "momentum" },
        { icon: "🏢", title: "Buy", subtitle: "small-cap", detail: "liquidità" }
      ],
      
      exitSignals: [
        "RRP: Starts rising",
        "BS: Turns negative",
        "SOFR-EFFR: > 15bps"
      ]
    },
    
    qe: {
      label: "Quantitative Easing",
      shortLabel: "QE",
      color: "success",
      gradient: "from-green-500 to-green-600",
      icon: TrendingUp,
      
      topMetric: {
        label: "Balance Sheet",
        value: `$${balanceSheet}T`,
        change: `+${bs_delta}B`,
        period: "4w",
        trend: "up"
      },
      
      risk: {
        level: "LOW",
        color: "green"
      },
      
      metrics: [
        { label: "Reserve Flood", value: `+${res_delta}B`, status: "MASSIVE" },
        { label: "SOFR-EFFR", value: `${sofr_effr}bps`, status: "Suppressed" },
        { label: "VIX", value: vix, status: parseFloat(vix.toString()) < 20 ? "Euphoria" : "Cauto" },
        { label: "RRP", value: `${Math.abs(parseFloat(rrp_delta))}B`, status: "Overflow" }
      ],
      
      headline: "Fed annuncia ufficialmente QE. Massima espansione monetaria. Asset prices to the moon.",
      
      actions: [
        { icon: "🚀", title: "MAX", subtitle: "equity", detail: "+40%" },
        { icon: "💎", title: "MAX", subtitle: "crypto", detail: "parabolic" },
        { icon: "🥇", title: "Long", subtitle: "oro/commodities", detail: "inflazione" }
      ],
      
      exitSignals: [
        "Fed: Tapering talk",
        "Inflation: > 6%",
        "VIX: > 25"
      ]
    },
    
    neutral: {
      label: "Neutrale",
      shortLabel: "Neutral",
      color: "secondary",
      gradient: "from-blue-500 to-blue-600",
      icon: Minus,
      
      topMetric: {
        label: "Balance Sheet",
        value: `$${balanceSheet}T`,
        change: `${parseFloat(bs_delta) > 0 ? '+' : ''}${bs_delta}B`,
        period: "4w",
        trend: "flat"
      },
      
      risk: {
        level: "MEDIUM",
        color: "blue"
      },
      
      metrics: [
        { label: "SOFR-EFFR", value: `${sofr_effr}bps`, status: "Normal range" },
        { label: "Reserves", value: `${res_delta}B`, status: "Stable" },
        { label: "VIX", value: vix, status: parseFloat(vix.toString()) < 18 ? "Calm" : "Cautious" },
        { label: "RRP", value: `${Math.abs(parseFloat(rrp_delta))}B`, status: "Equilibrium" }
      ],
      
      headline: "Fed non sta né pompando né drenando liquidità. Mercati guidati da fondamentali normali.",
      
      actions: [
        { icon: "📊", title: "Focus", subtitle: "stock picking", detail: "earnings" },
        { icon: "⚖️", title: "Diversify", subtitle: "60/40", detail: "balanced" },
        { icon: "📈", title: "Follow", subtitle: "macro data", detail: "GDP/jobs" }
      ],
      
      exitSignals: [
        "BS: > ±$50B shift",
        "SOFR-EFFR: > 20bps",
        "Fed: Policy change"
      ]
    }
  };

  return configs[scenario as keyof typeof configs] || configs.neutral;
};

// Sparkline component
const Sparkline = ({ values, color }: { values: number[], color: string }) => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((value, index) => {
        const height = ((value - min) / range) * 100;
        return (
          <div
            key={index}
            className={`w-1 bg-${color}-500/60 rounded-sm`}
            style={{ height: `${Math.max(height, 10)}%` }}
          />
        );
      })}
    </div>
  );
};

export function ScenarioCard({ scenario, currentData }: ScenarioCardProps) {
  const config = getScenarioConfig(scenario || 'neutral', currentData);
  const Icon = config.icon;

  // Generate mock sparkline data based on trend
  const generateSparkline = (trend: string) => {
    const base = [45, 42, 48, 44, 46, 43, 47, 45];
    if (trend === 'up') return base.map((v, i) => v + i * 2);
    if (trend === 'down') return base.map((v, i) => v - i * 2);
    return base;
  };

  const sparklineData = generateSparkline(config.topMetric.trend);

  return (
    <Card className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-all duration-300 relative overflow-hidden">
      {/* Top gradient bar */}
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${config.gradient}`}></div>
      
      {/* Live indicator */}
      <div className="absolute top-3 right-4 flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
        <span className="text-xs text-emerald-400 font-mono">LIVE</span>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Header with icon and name */}
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg bg-gradient-to-br ${config.gradient}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{config.shortLabel}</h2>
            <p className="text-sm text-slate-400">{config.label}</p>
          </div>
        </div>

        {/* Top metric dashboard */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-400 mb-1">{config.topMetric.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{config.topMetric.value}</span>
                <span className={`text-sm font-medium ${
                  config.topMetric.trend === 'up' ? 'text-green-400' : 
                  config.topMetric.trend === 'down' ? 'text-red-400' : 'text-slate-400'
                }`}>
                  {config.topMetric.change} ({config.topMetric.period})
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={config.risk.color === 'red' ? 'destructive' : 
                             config.risk.color === 'yellow' ? 'secondary' : 'default'}>
                Risk: {config.risk.level}
              </Badge>
              <Sparkline values={sparklineData} color={config.risk.color} />
            </div>
          </div>
        </div>

        {/* Key metrics table */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            KEY METRICS
          </h3>
          <div className="space-y-2">
            {config.metrics.map((metric, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-slate-800 last:border-b-0">
                <span className="text-sm text-slate-400">{metric.label}</span>
                <div className="text-right">
                  <span className="text-sm font-mono text-white">{metric.value}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                    metric.status.includes('STRESS') || metric.status.includes('AGGRESSIVE') ? 
                    'bg-red-500/20 text-red-400' :
                    metric.status.includes('Bullish') || metric.status.includes('MASSIVE') ?
                    'bg-green-500/20 text-green-400' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {metric.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Headline */}
        <div className="bg-slate-800/30 rounded-lg p-4 border-l-4 border-slate-600">
          <p className="text-sm text-slate-200 leading-relaxed">
            {config.headline}
          </p>
        </div>

        {/* Action cards */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            COSA FARE ORA
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {config.actions.map((action, index) => (
              <div key={index} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 hover:border-slate-600 transition-colors">
                <div className="text-center">
                  <div className="text-lg mb-1">{action.icon}</div>
                  <div className="text-sm font-semibold text-white">{action.title}</div>
                  <div className="text-xs text-slate-400">{action.subtitle}</div>
                  {action.detail && (
                    <div className="text-xs text-slate-500 mt-1">{action.detail}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exit signals */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            MONITORA EXIT
          </h3>
          <div className="space-y-2">
            {config.exitSignals.map((signal, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div>
                {signal}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <DollarSign className="h-3 w-3" />
            Real FRED data
          </div>
          <div className="text-xs text-slate-500">
            15m ago
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
