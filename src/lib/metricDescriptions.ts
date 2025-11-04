// Descrizioni BREVI e PROFESSIONALI per ogni metrica
export const metricDescriptions: Record<string, string> = {
  "SOFR": "Tasso di riferimento overnight USA per prestiti garantiti. Influenza direttamente i costi di finanziamento bancario.",
  
  "IORB": "Tasso pagato dalla Fed alle banche sulle riserve. Rappresenta il floor dei tassi di mercato.",
  
  "EFFR": "Tasso effettivo Fed Funds. Tasso overnight non garantito tra banche. Riflette condizioni reali del mercato monetario.",
  
  "Spread SOFR-IORB": "Indicatore di stress liquidità. <15bps = liquidità abbondante, >25bps = tensioni nel sistema.",
  
  "SOFR-EFFR Spread": "Differenza tra tassi garantiti e non garantiti. >10bps = stress mercato monetario, >20bps = tensioni critiche.",
  
  "Bilancio Fed": "Dimensione totale bilancio Fed. Espansione = QE, contrazione = QT. Range normale $6-8T.",
  
  "Riserve Bancarie": "Depositi bancari presso la Fed. >$3T = liquidità abbondante, <$2T = possibile credit crunch.",
  
  "Reverse Repo": "Strumento Fed per assorbire liquidità in eccesso. Volumi alti indicano surplus di liquidità.",
  
  "Repo ON": "Operazioni giornaliere di prestito della Fed alle banche. Quando aumenta segnala stress di liquidità a breve termine.",
  
  "Repo Term": "Prestiti Fed a termine per stress di liquidità. Attivazione segnala tensioni straordinarie nel sistema.",
  
  "Treasury 3M": "Rendimento titoli USA a 3 mesi. Riflette aspettative sui tassi Fed a breve termine.",
  
  "Treasury 1Y": "Rendimento titoli USA a 1 anno. Confronto con 3M indica forma curva rendimenti e aspettative crescita.",
  
  "VIX": "Indice di volatilità implicita S&P 500. <16 = mercati calmi, 16-22 = normale, >22 = stress/paura. Indicatore chiave del sentiment di rischio.",
  
  "HY OAS": "Option Adjusted Spread obbligazioni high yield vs Treasury. <400bps = appetito rischio, >550bps = stress creditizio. Misura premio per rischio credito.",
  
  "Curva 10Y-3M": "Spread rendimenti Treasury 10 anni vs 3 mesi. >150bps = crescita attesa, <50bps = rallentamento, <0 = possibile recessione.",
  
  "Dollar Index": "Indice forza dollaro USA vs basket valute. >105 = dollaro forte (flight to quality), <95 = dollaro debole (risk-on globale)."
};

// Funzione helper per ottenere la descrizione
export function getMetricDescription(title: string): string {
  return metricDescriptions[title] || "Descrizione non disponibile per questa metrica.";
}
