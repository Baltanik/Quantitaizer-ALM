// Descrizioni BREVI e PROFESSIONALI per ogni metrica
export const metricDescriptions: Record<string, string> = {
  "SOFR": "Tasso di riferimento overnight USA per prestiti garantiti. Influenza direttamente i costi di finanziamento bancario.",
  
  "IORB": "Tasso pagato dalla Fed alle banche sulle riserve. Rappresenta il floor dei tassi di mercato.",
  
  "Spread SOFR-IORB": "Indicatore di stress liquidità. <15bps = liquidità abbondante, >25bps = tensioni nel sistema.",
  
  "Bilancio Fed": "Dimensione totale bilancio Fed. Espansione = QE, contrazione = QT. Range normale $6-8T.",
  
  "Riserve Bancarie": "Depositi bancari presso la Fed. >$3T = liquidità abbondante, <$2T = possibile credit crunch.",
  
  "Reverse Repo": "Strumento Fed per assorbire liquidità in eccesso. Volumi alti indicano surplus di liquidità.",
  
  "Repo ON": "Operazioni giornaliere di prestito della Fed alle banche. Quando aumenta segnala stress di liquidità a breve termine.",
  
  "Repo Term": "Prestiti Fed a termine per stress di liquidità. Attivazione segnala tensioni straordinarie nel sistema.",
  
  "Treasury 3M": "Rendimento titoli USA a 3 mesi. Riflette aspettative sui tassi Fed a breve termine.",
  
  "Treasury 1Y": "Rendimento titoli USA a 1 anno. Confronto con 3M indica forma curva rendimenti e aspettative crescita."
};

// Funzione helper per ottenere la descrizione
export function getMetricDescription(title: string): string {
  return metricDescriptions[title] || "Descrizione non disponibile per questa metrica.";
}
