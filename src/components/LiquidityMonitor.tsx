import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Droplets, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { FedData } from "@/services/fedData";
import { useState } from "react";
import { LIQUIDITY_THRESHOLDS, isRestrictiveScenario } from "@/config/thresholds";

interface LiquidityMonitorProps {
  currentData: FedData | null;
}

export function LiquidityMonitor({ currentData }: LiquidityMonitorProps) {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  if (!currentData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monitor Liquidità</CardTitle>
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

  // Calcola livello di liquidità (0-100)
  const calculateLiquidityLevel = () => {
    // NOTE: wresbal è in MILIONI (es: 2888643 = $2.89T)
    const reserves = currentData.wresbal || 0;
    const spread = currentData.sofr_effr_spread || 0;
    const scenario = currentData.scenario || 'neutral';
    
    // Soglie da config centralizzato
    const { RESERVES, SPREAD, SCORE } = LIQUIDITY_THRESHOLDS;
    
    // Normalizza riserve (critical_low -> optimal_max = 0-50 punti)
    const reserveRange = RESERVES.optimal_max - RESERVES.critical_low;
    const reserveScore = Math.min(
      Math.max((reserves - RESERVES.critical_low) / reserveRange * SCORE.reserves_weight, 0), 
      SCORE.reserves_weight
    );

    // Normalizza spread (0-crisis invertito = 0-50 punti)
    const spreadScore = Math.max(
      SCORE.spread_weight - ((spread / SPREAD.crisis) * SCORE.spread_weight), 
      0
    );
    
    // Penalità per scenario restrittivo
    const scenarioPenalty = isRestrictiveScenario(scenario) ? SCORE.qt_penalty : 0;
    
    return Math.round(Math.max(reserveScore + spreadScore - scenarioPenalty, 0));
  };

  const liquidityLevel = calculateLiquidityLevel();
  
  const getLiquidityStatus = (level: number) => {
    if (level >= 80) return {
      status: 'Ottimale',
      color: 'text-green-600',
      bgColor: 'bg-green-500',
      icon: CheckCircle,
      description: 'Sistema pieno di cash! Banche prestano facile, mercati supportati. Momento ideale per risk assets.'
    };
    if (level >= 60) return {
      status: 'Buona',
      color: 'text-blue-600',
      bgColor: 'bg-blue-500',
      icon: Droplets,
      description: 'Liquidità normale. Nessun problema, mercati funzionano bene. Condizioni standard.'
    };
    if (level >= 40) return {
      status: 'Moderata',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500',
      icon: Clock,
      description: 'Liquidità calante. Attenzione: se scende ancora, rischio volatilità aumenta. Monitora spread.'
    };
    return {
      status: 'Stress',
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      icon: AlertTriangle,
      description: 'ALERT! Poca liquidità nel sistema. Rischio spike volatilità, possibili problemi nei mercati.'
    };
  };

  const status = getLiquidityStatus(liquidityLevel);
  const StatusIcon = status.icon;

  // Metriche di liquidità con spiegazioni (soglie da config)
  const { RESERVES, RRP, SPREAD } = LIQUIDITY_THRESHOLDS;
  
  const metrics = [
    {
      label: 'Riserve Bancarie',
      // wresbal in MILIONI → /1000000 per $T
      value: currentData.wresbal ? `$${(currentData.wresbal / 1000000).toFixed(2)}T` : 'N/A',
      target: `>$${(RESERVES.optimal_min / 1000000).toFixed(1)}T`,
      isGood: (currentData.wresbal || 0) > RESERVES.optimal_min,
      explanation: `Le riserve bancarie sono i depositi che le banche tengono presso la Fed. Attualmente $${currentData.wresbal ? (currentData.wresbal / 1000000).toFixed(2) : 'N/A'}T. Sopra $${(RESERVES.optimal_min / 1000000).toFixed(1)}T = sistema bancario liquido, sotto = possibili tensioni.`
    },
    {
      label: 'Reverse Repo',
      // rrpontsyd GIÀ in MILIARDI → usare diretto
      value: currentData.rrpontsyd !== null && currentData.rrpontsyd !== undefined ? `$${currentData.rrpontsyd.toFixed(1)}B` : 'N/A',
      target: `<$${RRP.low}B`,
      isGood: (currentData.rrpontsyd || 0) < RRP.low,
      explanation: `RRP è dove banche/fondi parcheggiano liquidità in eccesso presso la Fed. Attualmente $${currentData.rrpontsyd?.toFixed(1) ?? '0'}B. RRP alto = troppa liquidità parcheggiata, RRP basso = liquidità investita altrove.`
    },
    {
      label: 'Spread SOFR-EFFR',
      // spread in DECIMALE → *100 per bps
      value: currentData.sofr_effr_spread ? `${(currentData.sofr_effr_spread * 100).toFixed(1)}bps` : 'N/A',
      target: `<${(SPREAD.normal * 100).toFixed(0)}bps`,
      isGood: (currentData.sofr_effr_spread || 0) < SPREAD.normal,
      explanation: `Spread tra tassi interbancari garantiti (SOFR) e non garantiti (EFFR). Attualmente ${currentData.sofr_effr_spread ? (currentData.sofr_effr_spread * 100).toFixed(1) : 'N/A'}bps. Spread basso = mercato monetario fluido, spread alto = tensioni liquidità.`
    }
  ];

  return (
    <Card className="bg-slate-900/80 border-slate-800 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          Monitor Liquidità
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Livello Liquidità */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${status.color}`} />
              <span className="font-medium">{status.status}</span>
            </div>
            <span className="text-sm text-muted-foreground">{liquidityLevel}%</span>
          </div>
          <Progress value={liquidityLevel} className="h-2" />
          <p className="text-xs text-muted-foreground">{status.description}</p>
        </div>

        {/* Metriche Dettagliate */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Indicatori Chiave:</h4>
          {metrics.map((metric, index) => {
            const isExpanded = expandedMetric === metric.label;
            return (
              <div key={index} className="rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                <button 
                  onClick={() => setExpandedMetric(isExpanded ? null : metric.label)}
                  className="w-full p-3 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{metric.label}</p>
                      {isExpanded ? 
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : 
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      }
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold">{metric.value}</p>
                      <div className={`text-xs ${metric.isGood ? 'text-green-600' : 'text-yellow-600'}`}>
                        {metric.isGood ? '✓ OK' : '⚠ Watch'}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Target: {metric.target}</p>
                </button>
                
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-muted">
                    <div className="mt-3 p-3 bg-slate-800/50 rounded text-xs">
                      <div className="font-semibold mb-2 text-emerald-400">Cosa significa:</div>
                      <div className="text-slate-300 leading-relaxed">{metric.explanation}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Alert se necessario */}
        {liquidityLevel < 50 && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Attenzione</span>
            </div>
            <p className="text-xs text-yellow-600/80 mt-1">
              Liquidità sotto livelli ottimali. Monitorare spread e riserve.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
