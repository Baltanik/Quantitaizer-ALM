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

  const getScenarioDetails = (scenario: string | null) => {
    switch (scenario) {
      case 'stealth_qe':
        return {
          title: 'Stealth QE (Espansione Nascosta)',
          description: 'La Fed sta pompando liquidità nel sistema senza annunciarlo ufficialmente. Bilancio cresce ma spread resta basso.',
          color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
          icon: TrendingUp,
          implications: [
            'Più soldi nel sistema = supporto ai mercati',
            'Azioni e crypto tendono a salire',
            'Dollaro tende a indebolirsi',
            'Rischio inflazione a medio termine'
          ]
        };
      case 'qe':
        return {
          title: 'QE Completo (Stampa Moneta)',
          description: 'Fed annuncia ufficialmente che sta comprando bond = stampa soldi. Massima espansione monetaria.',
          color: 'bg-green-500/10 text-green-600 border-green-500/20',
          icon: TrendingUp,
          implications: [
            'Mercati tendono a esplodere al rialzo',
            'Inflazione alta garantita',
            'Dollaro debole, oro forte',
            'Momento migliore per risk assets'
          ]
        };
      case 'qt':
        return {
          title: 'QT (Drenaggio Liquidità)',
          description: 'Fed ritira liquidità dal sistema. Bilancio si riduce = meno soldi disponibili = mercati sotto pressione.',
          color: 'bg-red-500/10 text-red-600 border-red-500/20',
          icon: TrendingDown,
          implications: [
            'Azioni e crypto tendono a scendere',
            'Dollaro forte, tassi alti',
            'Aumenta rischio recessione',
            'Meglio cash e bond quality'
          ]
        };
      case 'contraction':
        return {
          title: 'Contrazione (Bilancio Fed in Calo)',
          description: 'Fed sta riducendo il bilancio attivamente. Liquidità del sistema in diminuzione, pressione sui mercati.',
          color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
          icon: TrendingDown,
          implications: [
            'Mercati sotto pressione da liquidità scarsa',
            'Volatilità in aumento',
            'Dollaro tende a rafforzarsi',
            'Cautela su risk assets'
          ]
        };
      default:
        return {
          title: 'Neutrale (Equilibrio)',
          description: 'Fed non sta né pompando né drenando liquidità. Mercati guidati da fondamentali economici normali.',
          color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
          icon: Activity,
          implications: [
            'Mercati seguono earnings e dati macro',
            'Nessun vento a favore o contrario',
            'Stock picking più importante',
            'Crescita economica guida direzione'
          ]
        };
    }
  };

  const details = getScenarioDetails(currentData.scenario);
  const Icon = details.icon;

  // Calcola metriche chiave
  const balanceSheet = currentData.walcl ? (currentData.walcl / 1000000).toFixed(2) : 'N/A';
  const reserves = currentData.wresbal ? (currentData.wresbal / 1000).toFixed(2) : 'N/A';
  const spread = currentData.sofr_iorb_spread?.toFixed(2) ?? 'N/A';

  return (
    <Card className="bg-slate-900/80 border-slate-800 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          Analisi Scenario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scenario Badge */}
        <div className={`p-4 rounded-lg border ${details.color}`}>
          <h3 className="font-semibold text-lg">{details.title}</h3>
          <p className="text-sm mt-1 opacity-80">{details.description}</p>
        </div>

        {/* Metriche Chiave */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-mono font-bold whitespace-nowrap">${balanceSheet}T</p>
            <p className="text-xs text-muted-foreground">Bilancio Fed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-mono font-bold whitespace-nowrap">${reserves}T</p>
            <p className="text-xs text-muted-foreground">Riserve</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-mono font-bold whitespace-nowrap">{spread}bps</p>
            <p className="text-xs text-muted-foreground">Spread</p>
          </div>
        </div>

        {/* Implicazioni */}
        <div>
          <h4 className="font-medium text-sm mb-2">Implicazioni di Mercato:</h4>
          <ul className="space-y-1">
            {details.implications.map((implication, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="w-1 h-1 bg-primary rounded-full"></div>
                {implication}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
