import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { FedData } from "@/services/fedData";

interface FedPolicyTrackerProps {
  currentData: FedData | null;
}

export function FedPolicyTracker({ currentData }: FedPolicyTrackerProps) {
  if (!currentData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fed Policy Tracker</CardTitle>
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

  // Analizza la direzione della politica Fed
  const getPolicyDirection = () => {
    const balanceSheet = currentData.walcl || 0;
    const reserves = currentData.wresbal || 0;
    const spread = currentData.sofr_iorb_spread || 0;

    // Espansiva se bilancio alto e spread basso
    if (balanceSheet > 6800000 && spread < 0.20) {
      return {
        direction: 'Espansiva',
        trend: 'up',
        color: 'bg-green-500/10 text-green-600 border-green-500/20',
        icon: TrendingUp,
        description: 'Politica accomodante in corso'
      };
    }

    // Restrittiva se bilancio basso e spread alto
    if (balanceSheet < 6500000 && spread > 0.25) {
      return {
        direction: 'Restrittiva',
        trend: 'down',
        color: 'bg-red-500/10 text-red-600 border-red-500/20',
        icon: TrendingDown,
        description: 'Politica di contenimento attiva'
      };
    }

    return {
      direction: 'Neutrale',
      trend: 'stable',
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      icon: Minus,
      description: 'Politica in equilibrio'
    };
  };

  const policy = getPolicyDirection();
  const PolicyIcon = policy.icon;

  // Calcola prossime mosse probabili
  const getNextMoves = () => {
    const scenario = currentData.scenario;
    
    switch (scenario) {
      case 'stealth_qe':
        return [
          { move: 'Continua espansione bilancio', probability: 75 },
          { move: 'Mantiene tassi bassi', probability: 85 },
          { move: 'Aumenta liquidità', probability: 70 }
        ];
      case 'qe':
        return [
          { move: 'Accelera acquisti asset', probability: 90 },
          { move: 'Taglia tassi ulteriormente', probability: 60 },
          { move: 'Forward guidance dovish', probability: 85 }
        ];
      case 'qt':
        return [
          { move: 'Riduce bilancio', probability: 80 },
          { move: 'Alza tassi', probability: 70 },
          { move: 'Drena liquidità', probability: 75 }
        ];
      default:
        return [
          { move: 'Mantiene status quo', probability: 60 },
          { move: 'Monitora inflazione', probability: 80 },
          { move: 'Data-dependent approach', probability: 90 }
        ];
    }
  };

  const nextMoves = getNextMoves();

  // Strumenti Fed attivi
  const fedTools = [
    {
      tool: 'Balance Sheet',
      status: currentData.walcl && currentData.walcl > 7000000 ? 'Espansione' : 'Stabile',
      value: currentData.walcl ? `$${(currentData.walcl / 1000000).toFixed(2)}T` : 'N/A'
    },
    {
      tool: 'IORB Rate',
      status: currentData.iorb && currentData.iorb > 4.5 ? 'Restrittivo' : 'Accomodante',
      value: currentData.iorb ? `${currentData.iorb.toFixed(2)}%` : 'N/A'
    },
    {
      tool: 'Reverse Repo',
      status: currentData.rrpontsyd && currentData.rrpontsyd > 2000000 ? 'Attivo' : 'Limitato',
      value: currentData.rrpontsyd ? `$${(currentData.rrpontsyd / 1000000).toFixed(2)}T` : 'N/A'
    }
  ];

  return (
    <Card className="bg-slate-900/80 border-slate-800 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Fed Policy Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Direzione Politica */}
        <div className={`p-4 rounded-lg border ${policy.color}`}>
          <div className="flex items-center gap-2 mb-2">
            <PolicyIcon className="h-5 w-5" />
            <h3 className="font-semibold">Stance: {policy.direction}</h3>
          </div>
          <p className="text-sm opacity-80">{policy.description}</p>
        </div>

        {/* Strumenti Fed */}
        <div>
          <h4 className="font-medium text-sm mb-3">Strumenti Attivi:</h4>
          <div className="space-y-2">
            {fedTools.map((tool, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{tool.tool}</p>
                  <p className="text-xs text-muted-foreground">{tool.status}</p>
                </div>
                <p className="text-sm font-mono font-bold">{tool.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Prossime Mosse */}
        <div>
          <h4 className="font-medium text-sm mb-3">Prossime Mosse Probabili:</h4>
          <div className="space-y-2">
            {nextMoves.map((move, index) => (
              <div key={index} className="flex items-center justify-between">
                <p className="text-sm">{move.move}</p>
                <Badge variant="outline" className="text-xs">
                  {move.probability}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
