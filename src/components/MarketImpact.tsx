import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Zap, Target } from "lucide-react";
import { FedData } from "@/services/fedData";
import { 
  RISK_SENTIMENT_THRESHOLDS, 
  isExpansiveScenario, 
  isRestrictiveScenario 
} from "@/config/thresholds";

interface MarketImpactProps {
  currentData: FedData | null;
}

export function MarketImpact({ currentData }: MarketImpactProps) {
  if (!currentData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Analizza l'impatto sui mercati
  // NOTA: Usa SEMPRE scenario dal DB (calcolato dalla edge function)
  // Non duplicare la logica qui!
  const getMarketImpact = () => {
    const scenario = currentData.scenario || 'neutral';
    const spread = currentData.sofr_effr_spread || 0; // FIXED: Campo corretto
    
    switch (scenario) {
      case 'stealth_qe':
        return {
          equity: { impact: 'Positivo', strength: 'Alto', icon: TrendingUp, color: 'text-green-600' },
          bonds: { impact: 'Positivo', strength: 'Medio', icon: TrendingUp, color: 'text-green-600' },
          dollar: { impact: 'Negativo', strength: 'Medio', icon: TrendingDown, color: 'text-red-600' },
          crypto: { impact: 'Positivo', strength: 'Alto', icon: TrendingUp, color: 'text-green-600' }
        };
      case 'qe':
        return {
          equity: { impact: 'Molto Positivo', strength: 'Molto Alto', icon: TrendingUp, color: 'text-green-600' },
          bonds: { impact: 'Positivo', strength: 'Alto', icon: TrendingUp, color: 'text-green-600' },
          dollar: { impact: 'Negativo', strength: 'Alto', icon: TrendingDown, color: 'text-red-600' },
          crypto: { impact: 'Molto Positivo', strength: 'Molto Alto', icon: TrendingUp, color: 'text-green-600' }
        };
      case 'qt':
        return {
          equity: { impact: 'Negativo', strength: 'Alto', icon: TrendingDown, color: 'text-red-600' },
          bonds: { impact: 'Negativo', strength: 'Medio', icon: TrendingDown, color: 'text-red-600' },
          dollar: { impact: 'Positivo', strength: 'Medio', icon: TrendingUp, color: 'text-green-600' },
          crypto: { impact: 'Negativo', strength: 'Alto', icon: TrendingDown, color: 'text-red-600' }
        };
      case 'contraction':
        return {
          equity: { impact: 'Negativo', strength: 'Medio', icon: TrendingDown, color: 'text-red-600' },
          bonds: { impact: 'Misto', strength: 'Medio', icon: Target, color: 'text-yellow-600' },
          dollar: { impact: 'Positivo', strength: 'Alto', icon: TrendingUp, color: 'text-green-600' },
          crypto: { impact: 'Negativo', strength: 'Medio', icon: TrendingDown, color: 'text-red-600' }
        };
      default:
        return {
          equity: { impact: 'Neutrale', strength: 'Basso', icon: Target, color: 'text-blue-600' },
          bonds: { impact: 'Neutrale', strength: 'Basso', icon: Target, color: 'text-blue-600' },
          dollar: { impact: 'Neutrale', strength: 'Basso', icon: Target, color: 'text-blue-600' },
          crypto: { impact: 'Neutrale', strength: 'Medio', icon: Target, color: 'text-blue-600' }
        };
    }
  };

  const impact = getMarketImpact();

  // Settori più impattati (usa helper da config)
  const getSectorImpact = () => {
    const scenario = currentData.scenario || 'neutral';
    
    if (isExpansiveScenario(scenario)) {
      return [
        { sector: 'Tech Growth', impact: '+', strength: 'Alto' },
        { sector: 'Real Estate', impact: '+', strength: 'Alto' },
        { sector: 'Financials', impact: '+', strength: 'Medio' },
        { sector: 'Utilities', impact: '-', strength: 'Basso' },
        { sector: 'Energy', impact: '+', strength: 'Medio' }
      ];
    } else if (isRestrictiveScenario(scenario)) {
      return [
        { sector: 'Tech Growth', impact: '-', strength: 'Alto' },
        { sector: 'Real Estate', impact: '-', strength: 'Alto' },
        { sector: 'Financials', impact: '+', strength: 'Medio' },
        { sector: 'Utilities', impact: '+', strength: 'Basso' },
        { sector: 'Energy', impact: '-', strength: 'Medio' }
      ];
    } else {
      return [
        { sector: 'Tech Growth', impact: '=', strength: 'Basso' },
        { sector: 'Real Estate', impact: '=', strength: 'Basso' },
        { sector: 'Financials', impact: '=', strength: 'Basso' },
        { sector: 'Utilities', impact: '=', strength: 'Basso' },
        { sector: 'Energy', impact: '=', strength: 'Basso' }
      ];
    }
  };

  const sectorImpact = getSectorImpact();

  // Risk-On vs Risk-Off (usa soglie da config)
  const getRiskSentiment = () => {
    const scenario = currentData.scenario || 'neutral';
    const spread = currentData.sofr_effr_spread || 0;
    const vix = currentData.vix || 20;
    
    const { RISK_ON, RISK_OFF } = RISK_SENTIMENT_THRESHOLDS;
    
    // Risk-On: scenario espansivo + spread basso + VIX basso
    if (isExpansiveScenario(scenario) && spread < RISK_ON.spread_max && vix < RISK_ON.vix_max) {
      return { 
        sentiment: 'Risk-On', 
        badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30',
        description: 'Liquidità abbondante e volatilità bassa favoriscono risk assets' 
      };
    }
    
    // Risk-Off: scenario restrittivo O spread alto O VIX alto
    if (isRestrictiveScenario(scenario) || spread > RISK_OFF.spread_min || vix > RISK_OFF.vix_min) {
      return { 
        sentiment: 'Risk-Off', 
        badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
        description: 'Liquidità scarsa o volatilità alta favoriscono safe haven' 
      };
    }
    
    // Neutrale
    return { 
      sentiment: 'Neutrale', 
      badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30 hover:bg-slate-500/30',
      description: 'Sentiment bilanciato - condizioni miste' 
    };
  };

  const riskSentiment = getRiskSentiment();

  return (
    <Card className="bg-slate-900/80 border-slate-800 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Market Impact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Sentiment - Migliorato esteticamente */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-slate-800/50 to-slate-700/30 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-slate-400" />
              Risk Sentiment
            </h4>
            <div className={`px-3 py-1 rounded-full text-sm font-medium border transition-all duration-200 ${riskSentiment.badgeClass}`}>
              {riskSentiment.sentiment}
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{riskSentiment.description}</p>
        </div>

        {/* Asset Classes - Migliorato esteticamente */}
        <div>
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-slate-400" />
            Impatto Asset Classes:
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(impact).map(([asset, data]) => {
              const Icon = data.icon;
              return (
                <div key={asset} className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${data.color}`} />
                    <span className="text-sm font-medium capitalize text-slate-200">{asset}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">{data.impact}</p>
                  <p className="text-xs text-slate-400">Forza: {data.strength}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Settori - Migliorato esteticamente */}
        <div>
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-slate-400" />
            Impatto Settoriale:
          </h4>
          <div className="space-y-2">
            {sectorImpact.map((sector, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200">
                <span className="text-sm font-medium text-slate-200">{sector.sector}</span>
                <div className="flex items-center gap-3">
                  <div className="w-20 px-2 py-1 rounded text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/30 flex items-center justify-between">
                    <span>{sector.strength}</span>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      sector.impact === '+' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                      sector.impact === '-' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                      'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                    }`}>
                      {sector.impact}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
