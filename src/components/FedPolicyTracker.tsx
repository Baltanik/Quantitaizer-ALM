import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { FedData } from "@/services/fedData";
import { ExplanationTooltip } from "@/components/ui/ExplanationTooltip";

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

  // Analizza la direzione della politica Fed con linguaggio user-friendly
  const getPolicyDirection = () => {
    const balanceSheet = currentData.walcl || 0;
    const bsDelta = currentData.d_walcl_4w || 0;
    const iorb = currentData.iorb || 0;
    const spread = currentData.sofr_effr_spread || 0; // FIXED: Campo corretto
    const scenario = currentData.scenario;

    // IMPROVED: Logica più sofisticata e comunicazione chiara
    
    // QE Attivo
    if (scenario === 'qe' || bsDelta > 50000) {
      return {
        direction: 'QE Attivo',
        trend: 'up',
        color: 'bg-green-500/10 text-green-600 border-green-500/20',
        icon: TrendingUp,
        description: 'Fed espande bilancio attivamente - supporto massimo mercati',
        explanation: 'La Fed sta comprando titoli e iniettando liquidità massiccia nel sistema. Ambiente molto favorevole per risk assets.'
      };
    }

    // Stealth QE
    if (scenario === 'stealth_qe' || (bsDelta > 5000 && spread < 0.05)) {
      return {
        direction: 'Stealth QE',
        trend: 'up',
        color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        icon: TrendingUp,
        description: 'Fed supporta mercati silenziosamente - liquidità nascosta',
        explanation: 'La Fed inietta liquidità senza annunci ufficiali. Bilancio cresce gradualmente mentre spread rimangono bassi.'
      };
    }

    // QT Aggressivo
    if (scenario === 'contraction' || bsDelta < -50000 || spread > 0.15) {
      return {
        direction: 'QT Aggressivo',
        trend: 'down',
        color: 'bg-red-500/10 text-red-600 border-red-500/20',
        icon: TrendingDown,
        description: 'Fed drena liquidità velocemente - pressione sui mercati',
        explanation: 'Contrazione rapida del bilancio con possibili tensioni liquidità. Ambiente difficile per risk assets.'
      };
    }

    // QT Graduale (caso attuale)
    if (scenario === 'qt' || (bsDelta < -1000 && iorb > 3.5)) {
      return {
        direction: 'QT Graduale',
        trend: 'down',
        color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        icon: TrendingDown,
        description: 'Fed riduce bilancio lentamente, tassi ancora sopra neutrale',
        explanation: `Bilancio ${(bsDelta/1000).toFixed(1)}B (quasi stabile) ma IORB ${iorb.toFixed(2)}% ancora sopra neutrale (~2.5%). Transizione verso policy meno restrittiva.`
      };
    }

    // Transizione verso Neutrale
    if (Math.abs(bsDelta) < 5000 && iorb > 2.5 && iorb < 4.5) {
      return {
        direction: 'Transizione',
        trend: 'stable',
        color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
        icon: Minus,
        description: 'Fed in pausa - valuta prossime mosse',
        explanation: `Bilancio stabile (${(bsDelta/1000).toFixed(1)}B) e tassi ${iorb.toFixed(2)}% in range di valutazione. Fed osserva dati prima di decidere direzione.`
      };
    }

    // Neutrale
    return {
      direction: 'Neutrale',
      trend: 'stable',
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      icon: Minus,
      description: 'Policy equilibrata - né espansiva né restrittiva',
      explanation: 'Tassi vicini al neutrale e bilancio stabile. Fed non sta né stimolando né frenando l\'economia.'
    };
  };

  const policy = getPolicyDirection();
  const PolicyIcon = policy.icon;


  // Strumenti Fed attivi con spiegazioni user-friendly
  const fedTools = [
    {
      tool: 'Balance Sheet',
      status: (() => {
        const bsDelta = currentData.d_walcl_4w || 0;
        if (Math.abs(bsDelta) < 5000) return 'Stabile';
        if (bsDelta > 20000) return 'Espansione Forte';
        if (bsDelta > 5000) return 'Espansione';
        if (bsDelta < -20000) return 'Contrazione Forte';
        return 'Contrazione Lenta';
      })(),
      value: currentData.walcl ? `$${(currentData.walcl / 1000000).toFixed(2)}T` : 'N/A',
      explanation: `Variazione 4w: ${currentData.d_walcl_4w ? (currentData.d_walcl_4w/1000).toFixed(1) + 'B' : 'N/A'}. Bilancio stabile indica Fed non sta né pompando né drenando liquidità attivamente.`
    },
    {
      tool: 'IORB Rate',
      status: (() => {
        const iorb = currentData.iorb || 0;
        if (iorb > 4.5) return 'Molto Restrittivo';
        if (iorb > 3.5) return 'Restrittivo';
        if (iorb > 2.5) return 'Sopra Neutrale';
        if (iorb > 1.5) return 'Neutrale';
        return 'Accomodante';
      })(),
      value: currentData.iorb ? `${currentData.iorb.toFixed(2)}%` : 'N/A',
      explanation: `Tasso ${currentData.iorb?.toFixed(2)}% è sopra il neutrale (~2.5%). Fed paga questo tasso alle banche per parcheggiare liquidità, controllando i tassi di mercato.`
    },
    {
      tool: 'Reverse Repo',
      status: (() => {
        const rrp = currentData.rrpontsyd || 0;
        if (rrp > 1000000) return 'Flood Liquidità';
        if (rrp > 500000) return 'Molto Attivo';
        if (rrp > 100000) return 'Attivo';
        if (rrp > 10000) return 'Moderato';
        return 'Limitato';
      })(),
      value: currentData.rrpontsyd ? `$${(currentData.rrpontsyd / 1000).toFixed(0)}B` : '$0B',
      explanation: `RRP basso (${currentData.rrpontsyd ? (currentData.rrpontsyd/1000).toFixed(0) : '0'}B) indica liquidità non in eccesso. Banche/MMF non parcheggiano grandi somme presso la Fed.`
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
            <h3 className="font-semibold flex items-center gap-2">
              Stance: {policy.direction}
              <div className="relative">
                <Info className="h-4 w-4 text-slate-400 hover:text-emerald-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-slate-200 text-xs rounded-lg border border-slate-600 w-80 opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="font-semibold mb-1">Perché "{policy.direction}"?</div>
                  <div className="text-slate-300">{policy.explanation}</div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
              </div>
            </h3>
          </div>
          <p className="text-sm opacity-80">{policy.description}</p>
        </div>

        {/* Strumenti Fed */}
        <div>
          <h4 className="font-medium text-sm mb-3">Strumenti Attivi:</h4>
          <div className="space-y-2">
            {fedTools.map((tool, index) => (
              <div key={index} className="p-3 rounded bg-muted/50 hover:bg-muted/70 transition-colors group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{tool.tool}</p>
                    <div className="relative">
                      <Info className="h-3.5 w-3.5 text-slate-400 hover:text-emerald-400 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-slate-200 text-xs rounded-lg border border-slate-600 w-72 opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="text-slate-300">{tool.explanation}</div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-mono font-bold">{tool.value}</p>
                </div>
                <p className="text-xs text-muted-foreground">{tool.status}</p>
              </div>
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
