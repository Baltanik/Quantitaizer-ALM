import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ScenarioCardProps {
  scenario: string | null;
}

const scenarioConfig = {
  stealth_qe: {
    label: "Stealth QE",
    color: "success",
    icon: TrendingUp,
    description: "Espansione bilancio Fed con spread contratti",
    analysis: "La Fed sta espandendo il proprio bilancio in modo silenzioso, iniettando liquidità nel sistema finanziario. Lo spread SOFR-IORB rimane contenuto, indicando condizioni di mercato stabili nonostante l'aumento della liquidità. Questo scenario è tipicamente positivo per gli asset rischiosi.",
    indicators: "• Bilancio Fed in crescita\n• Spread SOFR-IORB < 10 bps\n• Riserve bancarie in aumento",
    bgClass: "bg-success/10 border-success/20",
    textClass: "text-success",
  },
  qe: {
    label: "Quantitative Easing",
    color: "success",
    icon: TrendingUp,
    description: "Espansione monetaria attiva da parte della Fed",
    analysis: "La Federal Reserve sta attivamente espandendo il proprio bilancio attraverso acquisti di titoli, iniettando massiccia liquidità nel sistema bancario. Questo aumenta le riserve e riduce i tassi di interesse, stimolando prestiti e investimenti. Storicamente molto favorevole per mercati azionari e asset rischiosi.",
    indicators: "• Bilancio Fed in forte crescita\n• Acquisti attivi di treasury/MBS\n• Riserve bancarie in rapida espansione\n• Pressione ribassista sui tassi",
    bgClass: "bg-success/10 border-success/20",
    textClass: "text-success",
  },
  qt: {
    label: "Quantitative Tightening",
    color: "destructive",
    icon: TrendingDown,
    description: "Contrazione del bilancio Fed",
    analysis: "La Fed sta riducendo il proprio bilancio lasciando scadere i titoli senza reinvestirli, drenando liquidità dal sistema finanziario. Questo riduce le riserve bancarie e può causare stress sui mercati. Lo spread SOFR-IORB tende ad ampliarsi indicando stress nella liquidità. Generalmente negativo per asset rischiosi.",
    indicators: "• Bilancio Fed in contrazione\n• Riserve bancarie in calo\n• Spread SOFR-IORB in espansione (> 15 bps)\n• Possibili tensioni di liquidità",
    bgClass: "bg-destructive/10 border-destructive/20",
    textClass: "text-destructive",
  },
  neutral: {
    label: "Neutrale",
    color: "warning",
    icon: Minus,
    description: "Condizioni monetarie stabili",
    analysis: "La Fed mantiene una politica neutrale senza espandere né contrarre significativamente il bilancio. Le condizioni di liquidità sono stabili, con spread contenuti e riserve costanti. Questo scenario riflette un equilibrio tra domanda e offerta di liquidità nel sistema bancario.",
    indicators: "• Bilancio Fed stabile\n• Spread SOFR-IORB nella norma (5-15 bps)\n• Riserve bancarie stabili\n• Operazioni repo/reverse repo equilibrate",
    bgClass: "bg-warning/10 border-warning/20",
    textClass: "text-warning",
  },
};

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  const config = scenarioConfig[scenario as keyof typeof scenarioConfig] || scenarioConfig.neutral;
  const Icon = config.icon;

  return (
    <Card className={`${config.bgClass} border-2 shadow-lg`}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Scenario di Mercato Attuale
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${config.bgClass}`}>
            <Icon className={`h-8 w-8 ${config.textClass}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-2xl font-bold ${config.textClass}`}>
              {config.label}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {config.description}
            </p>
          </div>
          <Badge variant={config.color as any} className="text-xs">
            ATTIVO
          </Badge>
        </div>
        
        <div className="pt-4 border-t border-border/50 space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-2">📊 Analisi</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {config.analysis}
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-sm mb-2">🎯 Indicatori Chiave</h4>
            <pre className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line font-sans">
              {config.indicators}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}