import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Droplets, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { FedData } from "@/services/fedData";

interface LiquidityMonitorProps {
  currentData: FedData | null;
}

export function LiquidityMonitor({ currentData }: LiquidityMonitorProps) {
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
    const reserves = currentData.wresbal || 0;
    const spread = currentData.sofr_iorb_spread || 0;
    
    // Normalizza riserve (0-4000 miliardi = 0-50 punti)
    const reserveScore = Math.min((reserves / 4000) * 50, 50);
    
    // Normalizza spread (0-50bps invertito = 0-50 punti)
    const spreadScore = Math.max(50 - (spread / 0.50) * 50, 0);
    
    return Math.round(reserveScore + spreadScore);
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

  // Metriche di liquidità
  const metrics = [
    {
      label: 'Riserve Bancarie',
      value: currentData.wresbal ? `$${(currentData.wresbal / 1000).toFixed(2)}T` : 'N/A',
      target: '$3.0T',
      isGood: (currentData.wresbal || 0) > 3000
    },
    {
      label: 'Reverse Repo',
      value: currentData.rrpontsyd ? `$${(currentData.rrpontsyd / 1000).toFixed(2)}T` : 'N/A',
      target: '<$2.0T',
      isGood: (currentData.rrpontsyd || 0) < 2000000
    },
    {
      label: 'Spread SOFR-IORB',
      value: currentData.sofr_iorb_spread ? `${currentData.sofr_iorb_spread.toFixed(2)}bps` : 'N/A',
      target: '<15bps',
      isGood: (currentData.sofr_iorb_spread || 0) < 0.15
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
          {metrics.map((metric, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">{metric.label}</p>
                <p className="text-xs text-muted-foreground">Target: {metric.target}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-bold">{metric.value}</p>
                <div className={`text-xs ${metric.isGood ? 'text-green-600' : 'text-yellow-600'}`}>
                  {metric.isGood ? '✓ OK' : '⚠ Watch'}
                </div>
              </div>
            </div>
          ))}
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
