import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MetricInfoProps {
  title: string;
  description: string;
}

const metricDescriptions: Record<string, string> = {
  "SOFR": "Secured Overnight Financing Rate: tasso overnight garantito da collaterale. Principale tasso di riferimento USA che ha sostituito il LIBOR. Riflette il costo reale del denaro nel mercato repo.",
  "IORB": "Interest on Reserve Balances: tasso pagato dalla Fed sulle riserve bancarie. Rappresenta il 'floor' del sistema, il tasso minimo sotto cui le banche non scendono.",
  "Spread SOFR-IORB": "Differenza tra SOFR e IORB (in basis points). Spread < 10 bps indica liquidità abbondante. Spread > 15 bps segnala stress di liquidità. È l'indicatore chiave delle condizioni monetarie.",
  "Bilancio Fed": "Total Assets della Federal Reserve (WALCL). Indica il totale degli asset detenuti dalla Fed. Quando aumenta = QE (espansione), quando diminuisce = QT (contrazione). È il principale termometro della politica monetaria.",
  "Riserve Bancarie": "Reserve Balances with Federal Reserve Banks (WRESBAL). Liquidità detenuta dalle banche presso la Fed. Più è alta, più le banche hanno liquidità disponibile da prestare.",
  "Reverse Repo": "Overnight Reverse Repo (RRP): liquidità parcheggiata presso la Fed. Quando è alto indica eccesso di liquidità nel sistema che non trova impiego. In calo durante QT.",
  "Repo ON": "Overnight Repo Operations: operazioni giornaliere di prestito della Fed alle banche. Quando aumenta segnala stress di liquidità a breve termine.",
  "Repo Term": "Term Repo Operations: prestiti a più lungo termine (giorni/settimane) della Fed. Usato per gestire stress di liquidità strutturali.",
  "Treasury 3M": "Rendimento dei Treasury Bills a 3 mesi. Rappresenta il tasso risk-free a breve termine. Si muove con le aspettative sui tassi Fed.",
  "Treasury 1Y": "Rendimento dei Treasury Bills a 1 anno. Riflette aspettative su politica monetaria nel prossimo anno. Inversione 3M-1Y può segnalare recessione."
};

export function MetricInfo({ title, description }: MetricInfoProps) {
  const info = metricDescriptions[title] || description;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs" side="top">
          <p>{info}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
