import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Zap, Target } from "lucide-react";
import { FedData } from "@/services/fedData";

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
  const getMarketImpact = () => {
    const scenario = currentData.scenario;
    const spread = currentData.sofr_iorb_spread || 0;
    
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

  // Settori più impattati
  const getSectorImpact = () => {
    const scenario = currentData.scenario;
    
    if (scenario === 'stealth_qe' || scenario === 'qe') {
      return [
        { sector: 'Tech Growth', impact: '+', strength: 'Alto' },
        { sector: 'Real Estate', impact: '+', strength: 'Alto' },
        { sector: 'Financials', impact: '+', strength: 'Medio' },
        { sector: 'Utilities', impact: '-', strength: 'Basso' },
        { sector: 'Energy', impact: '+', strength: 'Medio' }
      ];
    } else if (scenario === 'qt' || scenario === 'contraction') {
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

  // Risk-On vs Risk-Off
  const getRiskSentiment = () => {
    const scenario = currentData.scenario;
    const spread = currentData.sofr_iorb_spread || 0;
    
    if ((scenario === 'stealth_qe' || scenario === 'qe') && spread < 0.15) {
      return { sentiment: 'Risk-On', color: 'text-green-600', description: 'Liquidità abbondante favorisce risk assets' };
    } else if ((scenario === 'qt' || scenario === 'contraction') || spread > 0.25) {
      return { sentiment: 'Risk-Off', color: 'text-red-600', description: 'Liquidità scarsa favorisce safe haven' };
    } else {
      return { sentiment: 'Neutrale', color: 'text-blue-600', description: 'Sentiment bilanciato' };
    }
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
        {/* Risk Sentiment */}
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">Risk Sentiment</h4>
            <Badge className={riskSentiment.color}>{riskSentiment.sentiment}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{riskSentiment.description}</p>
        </div>

        {/* Asset Classes */}
        <div>
          <h4 className="font-medium text-sm mb-3">Impatto Asset Classes:</h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(impact).map(([asset, data]) => {
              const Icon = data.icon;
              return (
                <div key={asset} className="p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-3 w-3 ${data.color}`} />
                    <span className="text-sm font-medium capitalize">{asset}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{data.impact}</p>
                  <p className="text-xs text-muted-foreground">Forza: {data.strength}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Settori */}
        <div>
          <h4 className="font-medium text-sm mb-3">Impatto Settoriale:</h4>
          <div className="space-y-2">
            {sectorImpact.map((sector, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/30">
                <span className="text-sm">{sector.sector}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${
                    sector.impact === '+' ? 'text-green-600' : 
                    sector.impact === '-' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {sector.impact}
                  </span>
                  <Badge variant="outline" className="text-xs">{sector.strength}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
