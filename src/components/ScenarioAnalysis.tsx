import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, AlertTriangle } from "lucide-react";
import { FedData } from "@/services/fedData";

interface ScenarioAnalysisProps {
  currentData: FedData | null;
}

export function ScenarioAnalysis({ currentData }: ScenarioAnalysisProps) {
  if (!currentData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analisi Scenario</CardTitle>
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

  const getScenarioNarrative = (scenario: string | null, data: FedData) => {
    // Calcola metriche chiave per narrazioni data-driven
    const balanceSheet = data.walcl ? (data.walcl / 1000000).toFixed(2) : 'N/A';
    const reserves = data.wresbal ? (data.wresbal / 1000).toFixed(2) : 'N/A';
    const sofr_effr = data.sofr_effr_spread?.toFixed(1) ?? 'N/A';
    const effr_iorb = data.effr_iorb_spread?.toFixed(1) ?? 'N/A';
    const rrp_value = data.rrpontsyd ? (data.rrpontsyd/1000).toFixed(1) : 'N/A';
    const rrp_delta = data.d_rrpontsyd_4w ? (data.d_rrpontsyd_4w/1000).toFixed(1) : 'N/A';
    const bs_delta_4w = data.d_walcl_4w ? (data.d_walcl_4w/1000).toFixed(1) : 'N/A';
    const res_delta_4w = data.d_wresbal_4w ? (data.d_wresbal_4w/1000).toFixed(1) : 'N/A';
    const vix = data.vix ?? 'N/A';
    const hyOAS = data.hy_oas ?? 'N/A';
    const dxy = data.dxy_broad ?? 'N/A';
    const confidence = data.confidence ?? 'media';

    switch (scenario) {
      case 'qt':
        return {
          title: 'QT (Quantitative Tightening)',
          description: `🔴 Fed riduce bilancio: $${balanceSheet}T (-${Math.abs(parseFloat(bs_delta_4w))}B ultimi 28gg)`,
          color: 'bg-red-500/10 text-red-600 border-red-500/20',
          icon: TrendingDown,
          narrative: `
🔴 CONTRAZIONE FED IN CORSO

📊 DATI ATTUALI:
• Balance Sheet: $${balanceSheet}T (${parseFloat(bs_delta_4w) > 0 ? '+' : ''}${bs_delta_4w}B ultimi 28gg)
• Riserve: $${reserves}T (${parseFloat(res_delta_4w) > 0 ? '+' : ''}${res_delta_4w}B ultimi 28gg)
• SOFR-EFFR: ${sofr_effr} bps ${parseFloat(sofr_effr) > 10 ? '⚠️ ELEVATO (stress)' : '✅ Normal'}
• RRP: $${rrp_value}B (${parseFloat(rrp_delta) > 0 ? '+' : ''}${rrp_delta}B 4w)

⚡ COSA SIGNIFICA:
La Fed sta riducendo la liquidità del sistema. 
Meno soldi in circolazione = più difficile per aziende finanziarsi = 
Equity soffrono, Treasury sale, Dollaro rinforza.

🎯 COSA FARE:
✅ Riduci esposizione equity (-20%)
✅ Aumenta cash in Treasury short-term (+15%)
❌ Evita crypto leveraged
✅ Long USD vs EM currencies

📈 MONITORA:
Se SOFR-EFFR torna <5bps oppure RRP spika >$30B = Fed potrebbe tornare QE

⚠️ Risk: ${parseFloat(vix) > 22 ? '🔴 ALTO - VIX ' + vix : '🟡 MEDIO - Situazione controllata'}
          `,
          confidence: confidence
        };

      case 'stealth_qe':
        return {
          title: 'Stealth QE (Espansione Nascosta)',
          description: `🟡 Fed inietta liquidità: $${balanceSheet}T (+${bs_delta_4w}B), RRP drena $${Math.abs(parseFloat(rrp_delta))}B`,
          color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
          icon: TrendingUp,
          narrative: `
🟡 ESPANSIONE NASCOSTA (Stealth QE) 

📊 DATI ATTUALI:
• Balance Sheet: $${balanceSheet}T (+${bs_delta_4w}B ultimi 28gg)
• RRP: $${rrp_value}B (${parseFloat(rrp_delta) > 0 ? '+' : ''}${rrp_delta}B drenaggio = Fed inietta)
• SOFR-EFFR: ${sofr_effr} bps ✅ Spread basso = Fed non preme sul freno
• Riserve: $${reserves}T (${parseFloat(res_delta_4w) > 0 ? '+' : ''}${res_delta_4w}B)

⚡ COSA SIGNIFICA:
Fed sta pompando liquidità SENZA annunciarlo ufficialmente.
Bilancio cresce + RRP drena = Più soldi per banche = Asset rischiosi salgono.

🎯 COSA FARE:
✅ Long equity (+20% esposizione)
✅ Long crypto (momentum positivo)
❌ Evita USD strength bets
✅ Compra small-cap (beneficiano liquidità)

📈 MONITORA:
Se RRP torna a salire oppure balance sheet cala = Fed inverte a QT

✅ Sentiment: ${parseFloat(vix) < 16 ? '🟢 BULLISH - Mercato calmo' : '🟡 Cauto - VIX ' + vix}
          `,
          confidence: confidence
        };

      case 'qe':
        return {
          title: 'QE Completo (Quantitative Easing)',
          description: `🟢 Fed espande aggressivamente: $${balanceSheet}T (+${bs_delta_4w}B), acquisti attivi`,
          color: 'bg-green-500/10 text-green-600 border-green-500/20',
          icon: TrendingUp,
          narrative: `
🟢 QE COMPLETO - STAMPA MONETA

📊 DATI ATTUALI:
• Balance Sheet: $${balanceSheet}T (+${bs_delta_4w}B AGGRESSIVA espansione)
• Riserve: $${reserves}T (+${res_delta_4w}B flood di liquidità)
• SOFR-EFFR: ${sofr_effr} bps (Fed mantiene spread bassi)
• RRP: $${rrp_value}B (overflow di liquidità)

⚡ COSA SIGNIFICA:
Fed annuncia ufficialmente che sta comprando bond = stampa soldi.
Massima espansione monetaria = Asset prices to the moon.

🎯 COSA FARE:
🚀 Max long equity (+40% esposizione)
🚀 Max long crypto (parabolic move)
🚀 Long commodities/oro (inflazione)
❌ Evita cash e bonds (perdono valore)

📈 MONITORA:
Quando Fed inizia a parlare di "tapering" = inizio fine party

🎉 Sentiment: ${parseFloat(vix) < 20 ? '🟢 EUPHORIA MODE' : '🟡 Cauto nonostante QE'}
          `,
          confidence: confidence
        };

      default:
        return {
          title: 'Neutrale (Equilibrio)',
          description: `⚪ Fed in equilibrio: $${balanceSheet}T (${bs_delta_4w}B), spread normali`,
          color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
          icon: Activity,
          narrative: `
⚪ NEUTRALE - EQUILIBRIO MONETARIO

📊 DATI ATTUALI:
• Balance Sheet: $${balanceSheet}T (${parseFloat(bs_delta_4w) > 0 ? '+' : ''}${bs_delta_4w}B stabile)
• Riserve: $${reserves}T (${parseFloat(res_delta_4w) > 0 ? '+' : ''}${res_delta_4w}B equilibrate)
• SOFR-EFFR: ${sofr_effr} bps ✅ Range normale (5-15bps)
• RRP: $${rrp_value}B (funzione normale)

⚡ COSA SIGNIFICA:
Fed non sta né pompando né drenando liquidità.
Mercati guidati da fondamentali economici normali.

🎯 COSA FARE:
📊 Focus su stock picking (+earnings quality)
📊 Diversificazione bilanciata
📊 Segui dati macro (GDP, inflazione, jobs)
✅ Risk management normale

📈 MONITORA:
Cambi in balance sheet trend oppure spread che si ampliano

📈 Sentiment: ${parseFloat(vix) < 18 ? '🟢 CALM - Mercato stabile' : '🟡 Cautela - VIX ' + vix}
          `,
          confidence: confidence
        };
    }
  };

  const details = getScenarioNarrative(currentData.scenario, currentData);
  const Icon = details.icon;

  // Calcola metriche chiave aggiuntive
  const balanceSheet = currentData.walcl ? (currentData.walcl / 1000000).toFixed(2) : 'N/A';
  const reserves = currentData.wresbal ? (currentData.wresbal / 1000).toFixed(2) : 'N/A';
  const sofr_iorb = currentData.sofr_iorb_spread?.toFixed(1) ?? 'N/A';
  const sofr_effr = currentData.sofr_effr_spread?.toFixed(1) ?? 'N/A';
  const effr_iorb = currentData.effr_iorb_spread?.toFixed(1) ?? 'N/A';
  const rrp_value = currentData.rrpontsyd ? (currentData.rrpontsyd/1000).toFixed(1) : 'N/A';
  const rrp_delta = currentData.d_rrpontsyd_4w ? (currentData.d_rrpontsyd_4w/1000).toFixed(1) : 'N/A';
  const bs_delta_4w = currentData.d_walcl_4w ? (currentData.d_walcl_4w/1000).toFixed(1) : 'N/A';
  const res_delta_4w = currentData.d_wresbal_4w ? (currentData.d_wresbal_4w/1000).toFixed(1) : 'N/A';
  const vix = currentData.vix ?? 'N/A';
  const hyOAS = currentData.hy_oas ?? 'N/A';

  // Risk assessment
  const isStressed = parseFloat(sofr_effr) > 10;
  const isHighVix = parseFloat(vix.toString()) > 22;
  const isRrpSpike = Math.abs(parseFloat(rrp_delta)) > 20;

  return (
    <Card className="bg-slate-900/80 border-slate-800 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          Analisi Scenario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario Badge con Description */}
        <div className={`p-4 rounded-lg border ${details.color}`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">{details.title}</h3>
              <p className="text-sm mt-1 opacity-80">{details.description}</p>
            </div>
            <Badge variant={details.confidence === 'alta' ? 'destructive' : 'outline'} className="ml-2">
              {details.confidence} confidence
            </Badge>
          </div>
        </div>

        {/* SEZIONE 1: Money Market Health */}
        <div>
          <h4 className="font-semibold mb-3 text-emerald-400">💰 Money Market Health</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">SOFR</div>
              <div className="text-lg font-bold">{currentData.sofr?.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">EFFR</div>
              <div className="text-lg font-bold">{currentData.effr?.toFixed(2)}%</div>
            </div>
            <div className={`border-l-2 pl-4 ${isStressed ? 'border-red-500' : 'border-green-500'}`}>
              <div className="text-xs text-muted-foreground">SOFR-EFFR</div>
              <div className="text-lg font-bold">{sofr_effr} bps</div>
              {isStressed && (
                <div className="text-xs text-red-500 mt-1">⚠️ Elevated stress</div>
              )}
            </div>
            <div className="border-l-2 border-blue-500 pl-4">
              <div className="text-xs text-muted-foreground">IORB</div>
              <div className="text-lg font-bold">{currentData.iorb?.toFixed(2)}%</div>
            </div>
          </div>
        </div>

        {/* SEZIONE 2: Fed Balance Sheet Dynamics */}
        <div>
          <h4 className="font-semibold mb-3 text-emerald-400">📊 Fed Balance Sheet Dynamics</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Balance Sheet</span>
              <span className="text-sm font-mono">
                ${balanceSheet}T 
                <span className={parseFloat(bs_delta_4w) > 0 ? 'text-green-500' : 'text-red-500'}>
                  ({parseFloat(bs_delta_4w) > 0 ? '+' : ''}{bs_delta_4w}B 4w)
                </span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Reserves</span>
              <span className="text-sm font-mono">
                ${reserves}T 
                <span className={parseFloat(res_delta_4w) > 0 ? 'text-green-500' : 'text-red-500'}>
                  ({parseFloat(res_delta_4w) > 0 ? '+' : ''}{res_delta_4w}B 4w)
                </span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">RRP</span>
              <span className="text-sm font-mono">
                ${rrp_value}B 
                <span className={parseFloat(rrp_delta) > 0 ? 'text-green-500' : 'text-blue-500'}>
                  ({parseFloat(rrp_delta) > 0 ? '+' : ''}{rrp_delta}B 4w) {isRrpSpike ? '🚨 SPIKE' : 'Normal'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* SEZIONE 3: Risk Context */}
        <div>
          <h4 className="font-semibold mb-3 text-emerald-400">⚠️ Market Risk Context</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">VIX</div>
              <div className={`text-lg font-bold ${
                parseFloat(vix.toString()) > 22 ? 'text-red-500' : 
                parseFloat(vix.toString()) > 16 ? 'text-yellow-500' : 
                'text-green-500'
              }`}>
                {vix}
              </div>
              <div className="text-xs mt-1">
                {parseFloat(vix.toString()) > 22 ? 'Elevated' : 
                 parseFloat(vix.toString()) > 16 ? 'Normal' : 'Low'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">HY OAS</div>
              <div className={`text-lg font-bold ${
                parseFloat(hyOAS.toString()) > 5.5 ? 'text-red-500' : 
                parseFloat(hyOAS.toString()) > 4 ? 'text-yellow-500' : 
                'text-green-500'
              }`}>
                {hyOAS}%
              </div>
              <div className="text-xs mt-1">
                Credit {parseFloat(hyOAS.toString()) > 5.5 ? 'Stress' : 'Stable'}
              </div>
            </div>
          </div>
        </div>

        {/* SEZIONE 4: Data-Driven Analysis */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3 text-emerald-400">📈 Analisi Data-Driven</h4>
          <div className="bg-muted/20 border border-muted-foreground/20 rounded p-4">
            <pre className="text-xs whitespace-pre-wrap text-slate-300 leading-relaxed">
              {details.narrative}
            </pre>
          </div>
        </div>

        {/* DISCLAIMER */}
        <div className="bg-muted/50 border border-muted-foreground/20 rounded p-3 text-xs">
          ⓘ Scenario analysis basato su dati Fed reali (FRED). 
          SOFR-EFFR spread indica stress money market.
          RRP spike può precedere segnali di espansione Fed.
          Confidence: <strong>{details.confidence}</strong>
        </div>
      </CardContent>
    </Card>
  );
}
