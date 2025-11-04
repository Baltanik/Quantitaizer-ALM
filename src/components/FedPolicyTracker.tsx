import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, TrendingUp, TrendingDown, Minus, Info, ChevronDown, ChevronRight } from "lucide-react";
import { FedData } from "@/services/fedData";
import { useState } from "react";

interface FedPolicyTrackerProps {
  currentData: FedData | null;
}

export function FedPolicyTracker({ currentData }: FedPolicyTrackerProps) {
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [expandedStance, setExpandedStance] = useState(false);

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
    // Spread è in decimale (0.05 = 5 bps), quindi confrontiamo con valore decimale
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
    // Spread è in decimale (0.15 = 15 bps)
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
        <div className={`rounded-lg border ${policy.color}`}>
          <button 
            onClick={() => setExpandedStance(!expandedStance)}
            className="w-full p-4 text-left hover:bg-black/10 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <PolicyIcon className="h-5 w-5" />
              <h3 className="font-semibold flex items-center gap-2">
                Stance: {policy.direction}
                {expandedStance ? 
                  <ChevronDown className="h-4 w-4 text-slate-400" /> : 
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                }
              </h3>
            </div>
            <p className="text-sm opacity-80">{policy.description}</p>
          </button>
          
          {expandedStance && (
            <div className="px-4 pb-4 border-t border-current/20">
              <div className="mt-3 p-3 bg-black/10 rounded text-sm">
                <div className="font-semibold mb-2 text-emerald-400">Perché "{policy.direction}"?</div>
                <div className="text-slate-300 leading-relaxed">{policy.explanation}</div>
              </div>
            </div>
          )}
        </div>

        {/* Strumenti Fed */}
        <div>
          <h4 className="font-medium text-sm mb-3">Strumenti Attivi:</h4>
          <div className="space-y-2">
            {fedTools.map((tool, index) => {
              const isExpanded = expandedTool === tool.tool;
              return (
                <div key={index} className="rounded bg-muted/50 hover:bg-muted/70 transition-colors">
                  <button 
                    onClick={() => setExpandedTool(isExpanded ? null : tool.tool)}
                    className="w-full p-3 text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{tool.tool}</p>
                        {isExpanded ? 
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : 
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        }
                      </div>
                      <p className="text-sm font-mono font-bold">{tool.value}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{tool.status}</p>
                  </button>
                  
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-muted">
                      <div className="mt-3 p-3 bg-slate-800/50 rounded text-xs">
                        <div className="font-semibold mb-2 text-emerald-400">Come funziona:</div>
                        <div className="text-slate-300 leading-relaxed">{tool.explanation}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
