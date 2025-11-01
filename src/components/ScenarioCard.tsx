import { TrendingUp, TrendingDown, Minus, LineChart, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FedData, ScenarioState } from "@/services/fedData";
import { deriveScenario, canShowBullish, getContextColor, getRiskColor } from "@/utils/scenarioEngine";

interface ScenarioCardProps {
  scenario: string | null;
  currentData?: FedData | null;
}

const scenarioConfig = {
  stealth_qe: {
    label: "Stealth QE",
    color: "success",
    icon: TrendingUp,
    description: "Espansione bilancio Fed con spread contratti",
    analysis: "La Fed sta espandendo il proprio bilancio in modo silenzioso, iniettando liquidità nel sistema finanziario. Lo spread SOFR-IORB rimane contenuto, indicando condizioni di mercato stabili nonostante l'aumento della liquidità. Questo scenario è tipicamente positivo per gli asset rischiosi.",
    indicators: [
      { icon: TrendingUp, label: "Bilancio Fed", status: "In crescita" },
      { icon: LineChart, label: "Spread SOFR-IORB", status: "< 10 bps" },
      { icon: TrendingUp, label: "Riserve bancarie", status: "In aumento" }
    ],
    bgClass: "bg-success/5 border-success/30",
    textClass: "text-success",
    badgeVariant: "default" as const,
  },
  qe: {
    label: "Quantitative Easing",
    color: "success",
    icon: TrendingUp,
    description: "Espansione monetaria attiva da parte della Fed",
    analysis: "La Federal Reserve sta attivamente espandendo il proprio bilancio attraverso acquisti di titoli, iniettando massiccia liquidità nel sistema bancario. Questo aumenta le riserve e riduce i tassi di interesse, stimolando prestiti e investimenti. Storicamente molto favorevole per mercati azionari e asset rischiosi.",
    indicators: [
      { icon: TrendingUp, label: "Bilancio Fed", status: "Forte crescita" },
      { icon: TrendingUp, label: "Acquisti attivi", status: "Treasury/MBS" },
      { icon: TrendingUp, label: "Riserve bancarie", status: "Rapida espansione" },
      { icon: TrendingDown, label: "Tassi", status: "Pressione ribassista" }
    ],
    bgClass: "bg-success/5 border-success/30",
    textClass: "text-success",
    badgeVariant: "default" as const,
  },
  qt: {
    label: "Quantitative Tightening",
    color: "destructive",
    icon: TrendingDown,
    description: "Contrazione del bilancio Fed",
    analysis: "La Fed sta riducendo il proprio bilancio lasciando scadere i titoli senza reinvestirli, drenando liquidità dal sistema finanziario. Questo riduce le riserve bancarie e può causare stress sui mercati. Lo spread SOFR-IORB tende ad ampliarsi indicando stress nella liquidità. Generalmente negativo per asset rischiosi.",
    indicators: [
      { icon: TrendingDown, label: "Bilancio Fed", status: "In contrazione" },
      { icon: TrendingDown, label: "Riserve bancarie", status: "In calo" },
      { icon: TrendingUp, label: "Spread SOFR-IORB", status: "> 15 bps" },
      { icon: AlertTriangle, label: "Liquidità", status: "Tensioni possibili" }
    ],
    bgClass: "bg-destructive/5 border-destructive/30",
    textClass: "text-destructive",
    badgeVariant: "destructive" as const,
  },
  neutral: {
    label: "Neutrale",
    color: "warning",
    icon: Minus,
    description: "Condizioni monetarie stabili",
    analysis: "La Fed mantiene una politica neutrale senza espandere né contrarre significativamente il bilancio. Le condizioni di liquidità sono stabili, con spread contenuti e riserve costanti. Questo scenario riflette un equilibrio tra domanda e offerta di liquidità nel sistema bancario.",
    indicators: [
      { icon: Minus, label: "Bilancio Fed", status: "Stabile" },
      { icon: LineChart, label: "Spread SOFR-IORB", status: "5-15 bps (normale)" },
      { icon: Minus, label: "Riserve bancarie", status: "Stabili" },
      { icon: Info, label: "Repo/Reverse Repo", status: "Equilibrati" }
    ],
    bgClass: "bg-warning/5 border-warning/30",
    textClass: "text-warning",
    badgeVariant: "secondary" as const,
  },
};

export function ScenarioCard({ scenario, currentData }: ScenarioCardProps) {
  const config = scenarioConfig[scenario as keyof typeof scenarioConfig] || scenarioConfig.neutral;
  const Icon = config.icon;

  // Calcola qualificatori scenario se abbiamo i dati
  let scenarioState: ScenarioState | null = null;
  if (currentData) {
    try {
      scenarioState = deriveScenario({
        walcl: currentData.walcl || 0,
        dWalcl_4w: currentData.d_walcl_4w || 0,
        wresbal: currentData.wresbal || 0,
        dWresbal_4w: currentData.d_wresbal_4w || 0,
        rrpon: currentData.rrpontsyd || 0,
        dRrpon_4w: currentData.d_rrpontsyd_4w || 0,
        sofr: currentData.sofr || 0,
        iorb: currentData.iorb || 0,
        vix: currentData.vix || 20, // Default neutrale
        hyOAS: currentData.hy_oas || 4.5, // Default neutrale
        t10y3m: currentData.t10y3m || 1, // Default neutrale
        dT10y3m_4w: currentData.d_t10y3m_4w || 0,
        dxyBroad: currentData.dxy_broad || 100, // Default neutrale
        dDxy_4w: currentData.d_dxy_4w || 0
      });
    } catch (error) {
      console.warn('Error calculating scenario qualifiers:', error);
    }
  }

  return (
    <Card className="bg-slate-800 border-slate-600 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 relative overflow-hidden">
      {/* Data Processing Animation - Light Beam Perimeter */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-300 to-transparent animate-pulse shadow-lg shadow-emerald-400/50" style={{animationDuration: '2s'}}></div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-300 to-transparent animate-pulse shadow-lg shadow-emerald-400/50" style={{animationDuration: '2.5s', animationDelay: '0.5s'}}></div>
      <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-emerald-300 to-transparent animate-pulse shadow-lg shadow-emerald-400/50" style={{animationDuration: '3s', animationDelay: '1s'}}></div>
      <div className="absolute right-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-emerald-300 to-transparent animate-pulse shadow-lg shadow-emerald-400/50" style={{animationDuration: '2.8s', animationDelay: '1.5s'}}></div>
      
      {/* Flowing Data Stream */}
      <div className="absolute top-2 right-4 flex items-center gap-1 opacity-80">
        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-ping delay-100"></div>
        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-ping delay-300"></div>
        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-ping delay-500"></div>
        <span className="text-xs text-emerald-400 font-mono ml-2 animate-pulse">LIVE</span>
      </div>
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Scenario di Mercato Attuale
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Hero Section */}
        <div className="flex items-start gap-4">
          <div className={`p-4 rounded-xl ${config.bgClass} ring-2 ring-${config.color}/20`}>
            <Icon className={`h-10 w-10 ${config.textClass}`} />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-3xl font-bold text-white">
              {config.label}
            </h3>
            <p className="text-base text-slate-200">
              {config.description}
            </p>
          </div>
        </div>

        {/* Scenario Qualifiers */}
        {scenarioState && (
          <>
            <div className="flex flex-wrap gap-2">
              {/* Context Badge */}
              <Badge className={`${getContextColor(scenarioState.context)} border`}>
                {scenarioState.context.replace('_', ' ').toUpperCase()}
              </Badge>
              
              {/* Risk Level Badge */}
              <Badge className={`${getRiskColor(scenarioState.risk_level)} border`}>
                Rischio: {scenarioState.risk_level.toUpperCase()}
              </Badge>
              
              {/* Sustainability Badge */}
              <Badge variant="outline" className="text-slate-300">
                Sostenibilità: {scenarioState.sustainability.toUpperCase()}
              </Badge>
              
              {/* Confidence Badge */}
              <Badge variant="outline" className="text-slate-300">
                Confidenza: {scenarioState.confidence.toUpperCase()}
              </Badge>
            </div>

            {/* Warning Banner per Risk Elevato */}
            {scenarioState.risk_level !== 'normale' && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="font-semibold text-red-400 text-sm">Attenzione Investitori</h5>
                  <p className="text-sm text-red-300">
                    Questo pattern è associato a stress di mercato. La liquidità può sostenere i prezzi 
                    temporaneamente ma non significa risk-on sostenibile. Valuta sempre risk management appropriato.
                  </p>
                </div>
              </div>
            )}

            {/* Drivers List */}
            {scenarioState.drivers.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-semibold text-sm text-slate-300">Drivers Chiave:</h5>
                <div className="grid gap-1">
                  {scenarioState.drivers.map((driver, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-slate-400">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                      {driver}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <Separator />

        {/* Analysis Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <LineChart className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-sm">Analisi Situazione</h4>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed pl-8">
            {config.analysis}
          </p>
        </div>

        <Separator />

        {/* Indicators Grid */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Info className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-sm">Indicatori Chiave</h4>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 pl-8">
            {config.indicators.map((indicator, index) => {
              const IndicatorIcon = indicator.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border/50 hover:bg-card/70 transition-all duration-300 relative"
                >
                  {/* Data processing indicator */}
                  <div className="absolute top-1 right-1 w-1 h-1 bg-emerald-400/40 rounded-full animate-ping" style={{animationDelay: `${index * 200}ms`}}></div>
                  
                  <div className="p-1.5 rounded-md bg-muted">
                    <IndicatorIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white">
                      {indicator.label}
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {indicator.status}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
