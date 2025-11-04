import { TrendingUp, TrendingDown, AlertTriangle, Target, Activity, Zap, Clock, Signal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { FedData, LeadingIndicatorsData } from "@/services/fedData";

interface LeadingIndicatorsProps {
  data: FedData | null;
}

/**
 * QUANTITAIZER V2 - LEADING INDICATORS COMPONENT
 * 
 * Mostra indicatori anticipatori che precedono i cambiamenti di scenario.
 * Fornisce early warning sui pivot Fed e cambiamenti di liquidità.
 */
export function LeadingIndicators({ data }: LeadingIndicatorsProps) {
  if (!data?.leading_indicators) {
    return (
      <Card className="bg-slate-800 border-slate-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Signal className="h-4 w-4" />
            Leading Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-slate-400">
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Dati non disponibili</p>
              <p className="text-xs mt-1">Necessari almeno 30 giorni di storico</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const indicators = data.leading_indicators;

  // Helper functions
  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'bullish': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'bearish': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    }
  };

  const getSignalEmoji = (signal: string) => {
    switch (signal) {
      case 'bullish': return '🟢';
      case 'bearish': return '🔴';
      default: return '🟡';
    }
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 70) return 'text-red-400';
    if (risk >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'deteriorating': return <TrendingDown className="h-4 w-4 text-red-400" />;
      default: return <Activity className="h-4 w-4 text-slate-400" />;
    }
  };

  const getAccelerationIcon = (acceleration: string) => {
    switch (acceleration) {
      case 'accelerating': return <Zap className="h-4 w-4 text-orange-400" />;
      case 'decelerating': return <Clock className="h-4 w-4 text-blue-400" />;
      default: return <Activity className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-600 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Signal className="h-4 w-4 text-blue-400" />
            Leading Indicators V2
          </CardTitle>
          <Badge variant="outline" className="text-xs border-blue-400/30 text-blue-400">
            EARLY WARNING
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Signal */}
        <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl p-4 border border-slate-600/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-300">Overall Signal</span>
            <div className="flex items-center gap-2">
              <span className="text-lg">{getSignalEmoji(indicators.overall_signal)}</span>
              <Badge className={`${getSignalColor(indicators.overall_signal)} border font-medium`}>
                {indicators.overall_signal.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Confidence</span>
            <span>{indicators.confidence}%</span>
          </div>
          <Progress value={indicators.confidence} className="h-2 bg-slate-700 mt-1" />
        </div>

        <Separator className="bg-slate-600/50" />

        {/* Indicators Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* RRP Velocity */}
          <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getAccelerationIcon(indicators.rrp_acceleration)}
                <span className="text-sm font-medium text-slate-300">RRP Velocity</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white">
                  {indicators.rrp_velocity > 0 ? '+' : ''}{indicators.rrp_velocity}
                </span>
                <span className="text-xs text-slate-400">B$/day</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 capitalize">{indicators.rrp_acceleration}</span>
                {indicators.rrp_velocity < -10 && (
                  <Badge variant="outline" className="text-xs border-green-400/30 text-green-400">
                    BULLISH
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Credit Stress */}
          <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getTrendIcon(indicators.credit_trend)}
                <span className="text-sm font-medium text-slate-300">Credit Stress</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${getRiskColor(indicators.credit_stress_index)}`}>
                  {indicators.credit_stress_index}
                </span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
              <div className="space-y-1">
                <Progress 
                  value={indicators.credit_stress_index} 
                  className="h-2 bg-slate-700"
                />
                <span className="text-xs text-slate-400 capitalize">{indicators.credit_trend}</span>
              </div>
            </div>
          </div>

          {/* Repo Spike Risk */}
          <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${getRiskColor(indicators.repo_spike_risk)}`} />
                <span className="text-sm font-medium text-slate-300">Repo Risk</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${getRiskColor(indicators.repo_spike_risk)}`}>
                  {indicators.repo_spike_risk}
                </span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
              <div className="space-y-1">
                <Progress 
                  value={indicators.repo_spike_risk} 
                  className="h-2 bg-slate-700"
                />
                {indicators.repo_spike_risk > 60 && (
                  <Badge variant="outline" className="text-xs border-red-400/30 text-red-400">
                    HIGH RISK
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* QT Pivot Probability */}
          <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-slate-300">QT Pivot</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-purple-400">
                  {indicators.qt_pivot_probability}%
                </span>
                <span className="text-xs text-slate-400">prob</span>
              </div>
              <div className="space-y-1">
                <Progress 
                  value={indicators.qt_pivot_probability} 
                  className="h-2 bg-slate-700"
                />
                {indicators.qt_pivot_probability > 60 && (
                  <Badge variant="outline" className="text-xs border-purple-400/30 text-purple-400">
                    LIKELY
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-600/50" />

        {/* TGA Analysis */}
        <div className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-medium text-slate-300">Treasury General Account</span>
            </div>
            <Badge 
              variant="outline" 
              className={`text-xs ${
                indicators.tga_impact === 'positive' 
                  ? 'border-green-400/30 text-green-400' 
                  : indicators.tga_impact === 'negative'
                  ? 'border-red-400/30 text-red-400'
                  : 'border-slate-400/30 text-slate-400'
              }`}
            >
              {indicators.tga_impact.toUpperCase()}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Trend:</span>
            <span className="text-sm font-medium text-slate-300 capitalize">
              {indicators.tga_trend}
            </span>
          </div>
          
          <div className="mt-2 text-xs text-slate-400">
            {indicators.tga_impact === 'positive' && '💧 TGA drenaggio → liquidità in aumento'}
            {indicators.tga_impact === 'negative' && '🏦 TGA accumulo → liquidità in calo'}
            {indicators.tga_impact === 'neutral' && '➡️ TGA stabile → impatto neutro'}
          </div>
        </div>

        {/* Key Alerts */}
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-lg p-4 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-300">Key Signals</span>
          </div>
          
          <div className="space-y-2 text-sm">
            {indicators.rrp_velocity < -20 && (
              <div className="flex items-center gap-2 text-green-400">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                RRP drenaggio accelerato ({indicators.rrp_velocity}B$/day)
              </div>
            )}
            
            {indicators.credit_stress_index > 70 && (
              <div className="flex items-center gap-2 text-red-400">
                <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                Credit stress elevato ({indicators.credit_stress_index}/100)
              </div>
            )}
            
            {indicators.repo_spike_risk > 60 && (
              <div className="flex items-center gap-2 text-orange-400">
                <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                Alto rischio tensioni repo ({indicators.repo_spike_risk}/100)
              </div>
            )}
            
            {indicators.qt_pivot_probability > 60 && (
              <div className="flex items-center gap-2 text-purple-400">
                <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                Alta probabilità pivot Fed ({indicators.qt_pivot_probability}%)
              </div>
            )}
            
            {/* Default message if no alerts */}
            {indicators.rrp_velocity >= -20 && 
             indicators.credit_stress_index <= 70 && 
             indicators.repo_spike_risk <= 60 && 
             indicators.qt_pivot_probability <= 60 && (
              <div className="flex items-center gap-2 text-slate-400">
                <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                Nessun segnale critico rilevato
              </div>
            )}
          </div>
        </div>

        {/* Timeframe & Actionable */}
        <div className="bg-slate-700/20 rounded-lg p-3 border border-slate-600/20">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-slate-300">Timeframe:</span>
              <span className="text-blue-400 font-medium">1-2 settimane</span>
            </div>
            <div className="text-xs text-slate-400">
              Leading indicators anticipano scenario changes
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
