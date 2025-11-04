// ============================================================================
// EXPLANATION ENGINE - Sistema spiegazioni metriche per principianti
// ============================================================================
// Questo file contiene tutte le spiegazioni delle metriche in formato
// educativo/oggettivo. NO financial advice, solo dati e contesto.

export interface MetricExplanation {
  name: string;
  shortExplanation: string; // Tooltip hover (1 frase)
  fullExplanation: string; // Click dettaglio (paragrafo completo)
  thresholds?: {
    label: string;
    range: string;
    description: string;
  }[];
  historicalContext?: string;
  whatToWatch?: string;
}

export const explanations: Record<string, MetricExplanation> = {
  // ========================================================================
  // METRICHE PRINCIPALI (Hero Metrics)
  // ========================================================================
  
  balance_sheet: {
    name: "Balance Sheet Fed",
    shortExplanation: "Dimensione totale asset detenuti dalla Federal Reserve (Treasury + MBS)",
    fullExplanation: `Il Balance Sheet della Fed rappresenta il totale degli asset che la Federal Reserve possiede, principalmente Treasury bonds e Mortgage-Backed Securities (MBS).

DINAMICA:
• Quando SALE: Fed acquista titoli → inietta liquidità nel sistema → supporto ai mercati
• Quando SCENDE: Fed lascia scadere titoli senza reinvestirli → drena liquidità → pressione sui mercati

CONTESTO ATTUALE:
Il Balance Sheet si trova a $6.59T dopo il ciclo di Quantitative Tightening (QT) iniziato nel 2022.

RANGE STORICO:
• 2019 pre-COVID: ~$4T
• 2020 COVID QE: salito fino a $9T (espansione massiccia)
• 2022-2024 QT: sceso a ~$6.6T (contrazione controllata)
• 2025 attuale: $6.59T (fase stabile/lenta contrazione)`,
    thresholds: [
      { label: "Espansione Forte", range: "+50B+/settimana", description: "QE attivo - liquidità massiccia" },
      { label: "Espansione Moderata", range: "+10B a +50B/settimana", description: "Stealth QE - supporto nascosto" },
      { label: "Stabile", range: "-10B a +10B/settimana", description: "Policy neutrale" },
      { label: "Contrazione Moderata", range: "-50B a -10B/settimana", description: "QT standard" },
      { label: "Contrazione Forte", range: "-50B-/settimana", description: "QT aggressivo - drain liquidità" }
    ],
    historicalContext: "Il Balance Sheet Fed è esploso da $4T (2019) a $9T (2020) durante COVID QE. Dal 2022 la Fed ha iniziato QT portandolo a $6.6T. Variazioni >$50B/settimana sono considerate significative.",
    whatToWatch: "Monitora variazioni 4-week (Δ 4w): cambi superiori a ±$50B indicano shift policy. RRP in calo simultaneo = Fed sta iniettando liquidità nascosta."
  },

  vix: {
    name: "VIX (Fear Index)",
    shortExplanation: "Indice di volatilità S&P 500 - misura paura e incertezza del mercato",
    fullExplanation: `Il VIX (Volatility Index) misura la volatilità attesa del mercato S&P 500 nei prossimi 30 giorni, calcolata dai prezzi delle opzioni.

INTERPRETAZIONE:
• VIX BASSO: Investitori tranquilli, mercato stabile
• VIX ALTO: Investitori spaventati, aspettano forte volatilità

Il VIX è chiamato "Fear Index" perché sale quando gli investitori comprano protezione (put options) per paura di crolli.

ATTUALE: VIX 17.4 = leggermente elevato rispetto alla media storica di 15-16.`,
    thresholds: [
      { label: "Calmo", range: "< 14", description: "Euforia, greed mode, complacency risk" },
      { label: "Normale", range: "14-16", description: "Mercato stabile, volatilità normale" },
      { label: "Leggermente Elevato", range: "16-18", description: "Primi segnali nervosismo (ATTUALE: 17.4)" },
      { label: "Elevato", range: "18-22", description: "Stress moderato, cautela crescente" },
      { label: "Alto Stress", range: "22-25", description: "Nervosismo marcato, sell-off possibile" },
      { label: "Panic Mode", range: "> 25", description: "Panico, fear estremo, capitulation risk" }
    ],
    historicalContext: "Eventi storici: COVID Mar 2020 = VIX 82 (record), Crisi Lehman 2008 = VIX 80, Bull market 2017 = VIX 9-12 (calma estrema), Media 10-year = VIX 15-16.",
    whatToWatch: "Spike rapido (VIX +5 punti in 1-2 giorni) indica evento stress acuto. VIX persistente >20 per settimane = regime volatilità cambiato. VIX <12 per mesi = complacency pericolosa."
  },

  sofr_effr_spread: {
    name: "SOFR-EFFR Spread",
    shortExplanation: "Differenza tra tassi interbancari - misura stress liquidità mercato monetario",
    fullExplanation: `Lo spread SOFR-EFFR rappresenta la differenza tra:
• SOFR (Secured Overnight Financing Rate): tasso prestiti garantiti da collateral
• EFFR (Effective Federal Funds Rate): tasso prestiti interbancari non garantiti

SIGNIFICATO:
• Spread BASSO (<5bps): Liquidità abbondante, mercato monetario fluido
• Spread ALTO (>10bps): Tensione liquidità, banche faticano a prestarsi soldi

Quando le banche non si fidano tra loro o hanno carenza liquidità, lo spread si allarga rapidamente.

ATTUALE: 0.4bps = mercato monetario estremamente fluido, zero stress.`,
    thresholds: [
      { label: "Ottimo", range: "< 3bps", description: "Liquidità abbondante, zero tensioni (ATTUALE: 0.4)" },
      { label: "Normale", range: "3-5bps", description: "Mercato funziona normalmente" },
      { label: "Tensione Inizia", range: "5-10bps", description: "Prime avvisaglie stress liquidità" },
      { label: "Stress Rilevato", range: "10-20bps", description: "Tensione marcata, monitoring attivo Fed" },
      { label: "Crisi Liquidità", range: "> 20bps", description: "Disfunzione mercato monetario, interventi Fed necessari" }
    ],
    historicalContext: "Settembre 2019: spread spike a 282bps (repo crisis) richiese intervento Fed emergency. Marzo 2023 SVB collapse: spread 15bps indicò stress bancario. Normale range 2-5bps.",
    whatToWatch: "Spike improvviso >5bps in un giorno = allarme rosso stress nascosto. Spread persistente >10bps = problema sistemico liquidità. Monitorare insieme a volumi RRP e Riserve."
  },

  // ========================================================================
  // INDICATORI TECNICI
  // ========================================================================

  rrp: {
    name: "RRP (Reverse Repo)",
    shortExplanation: "Liquidità parcheggiata dalle banche presso la Fed overnight - indicatore eccesso liquidità",
    fullExplanation: `Il Reverse Repo (RRP) è la facility dove banche e money market funds parcheggiano liquidità in eccesso presso la Fed overnight, guadagnando il tasso RRP (attualmente 5.3%).

DINAMICA:
• RRP ALTO: Sistema ha troppa liquidità, nessun investimento migliore disponibile
• RRP BASSO/CALO: Liquidità viene investita altrove, mercati più attraenti

CALO RRP può significare due cose:
1. POSITIVO: Liquidità va verso risk assets (equity, credit)
2. NEGATIVO: Carenza liquidità sistemica

Serve guardare il contesto (VIX, spread) per capire quale.`,
    thresholds: [
      { label: "Flood Liquidità", range: "> $2T", description: "Eccesso massiccio liquidità sistema" },
      { label: "Elevato", range: "$1T - $2T", description: "Liquidità abbondante disponibile" },
      { label: "Normale", range: "$500B - $1T", description: "Livello equilibrato" },
      { label: "Basso", range: "< $500B", description: "Liquidità si sposta verso investimenti" },
    ],
    historicalContext: "RRP ha raggiunto $2.5T nel 2022 (picco storico post-QE). Calo da $2.5T a $300B (2024) ha supportato rally mercati. RRP vicino a zero può segnalare fine eccesso liquidità.",
    whatToWatch: "Monitora Δ 4-week: calo >$100B/mese = liquidità shift verso risk assets (positivo). Calo rapido con VIX rising = warning carenza liquidità (negativo)."
  },

  reserves: {
    name: "Riserve Bancarie",
    shortExplanation: "Liquidità depositata dalle banche presso la Fed - cushion sicurezza sistema bancario",
    fullExplanation: `Le Riserve Bancarie sono i depositi che le banche commerciali mantengono presso la Federal Reserve.

IMPORTANZA:
• Riserve ALTE: Banche hanno cushion sicurezza ampio, possono prestare liberamente
• Riserve BASSE: Banche devono conservare liquidità, prestiti si contraggono

SOGLIA CRITICA varia per ogni banca (dipende da bilancio, business model) ma generalmente sotto $3T il sistema inizia a sentire pressione.

Durante QT, le Riserve scendono perché la Fed drena liquidità dal sistema.`,
    thresholds: [
      { label: "Abbondanti", range: "> $3.5T", description: "Sistema bancario molto liquido" },
      { label: "Adeguate", range: "$3T - $3.5T", description: "Livello confortevole" },
      { label: "Soglia Attenzione", range: "$2.5T - $3T", description: "Alcune banche iniziano a sentire pressione" },
      { label: "Critiche", range: "< $2.5T", description: "Risk di disfunzioni mercato monetario" }
    ],
    historicalContext: "COVID 2020: Riserve $4.2T (QE massivo). Pre-COVID: $1.5T. Settembre 2019 repo crisis avvenne con Riserve $1.4T (troppo basse). Attuale: $3.4T = livello adeguato.",
    whatToWatch: "Velocità di calo critica: >$50B/settimana persistente può portare a stress. Se Riserve scendono verso $3T con spread che si allarga = warning early."
  },

  hy_oas: {
    name: "HY OAS (High Yield Option-Adjusted Spread)",
    shortExplanation: "Spread obbligazioni corporate high-yield vs Treasury - misura stress credito e risk appetite",
    fullExplanation: `L'HY OAS misura quanto rendimento extra richiedono gli investitori per detenere obbligazioni corporate rischiose (junk bonds) rispetto a Treasury sicuri.

INTERPRETAZIONE:
• OAS BASSO (<4%): Risk appetite alto, investitori cercano rendimento
• OAS ALTO (>5.5%): Flight to quality, investitori fuggono da credito rischioso

HY OAS è leading indicator stress credito: sale PRIMA di crisi corporate/default.

ATTUALE: Monitorare per capire se stress si sta diffondendo da mercati finanziari a economia reale.`,
    thresholds: [
      { label: "Tight", range: "< 3.5%", description: "Euforia credito, complacency risk" },
      { label: "Normale", range: "3.5% - 4.5%", description: "Risk appetite sano" },
      { label: "Elevato", range: "4.5% - 5.5%", description: "Cautela crescente credito corporate" },
      { label: "Credit Stress", range: "5.5% - 8%", description: "Fuga da high-yield, stress marcato" },
      { label: "Credit Crunch", range: "> 8%", description: "Mercato credito in crisi, default risk alto" }
    ],
    historicalContext: "COVID Mar 2020: HY OAS 11% (panic). Crisi Lehman 2008: HY OAS 20% (freeze totale). Bull 2021: HY OAS 3% (euforia). Media storica: 4-5%.",
    whatToWatch: "Spike rapido +100bps in pochi giorni = red flag stress. HY OAS >6% persistente = recessione probabile in arrivo. Divergenza (equity sale, HY OAS sale) = warning."
  },

  // ========================================================================
  // BADGE SPIEGAZIONI
  // ========================================================================

  risk_level: {
    name: "Livello Rischio",
    shortExplanation: "Sintesi stress attuale mercato basata su VIX, spread, e velocità cambio liquidità",
    fullExplanation: `Il Livello Rischio è calcolato combinando:
• VIX (volatilità attesa)
• SOFR-EFFR spread (stress liquidità)
• Balance Sheet delta (velocità cambio policy Fed)

LOGICA:
• BASSO: VIX <14, spread <3bps, ambiente calmo
• NORMALE: VIX 14-16, spread 3-5bps, mercato stabile
• MEDIO: VIX 16-22, spread 5-10bps, cautela appropriata (ATTUALE)
• ELEVATO: VIX >22, spread >10bps, stress rilevato

Questo è un indicatore AGGREGATO per sintesi rapida. Sempre verificare metriche individuali per dettaglio.`,
    whatToWatch: "Rischio che sale velocemente (da BASSO a MEDIO in 48h) è più pericoloso di rischio MEDIO stabile per settimane. Monitora velocità cambio."
  },

  sustainability: {
    name: "Sostenibilità Scenario",
    shortExplanation: "Quanto a lungo scenario attuale può durare senza interventi Fed o shock esterni",
    fullExplanation: `La Sostenibilità misura stabilità scenario corrente considerando:
• Velocità variazione Balance Sheet
• Livello Riserve bancarie vs soglie critiche
• Stress indicators (VIX, spread)

ALTA: Scenario stabile, può durare trimestri
MEDIA: Scenario attuale ma con fattori stress nascenti
BASSA: Scenario instabile, cambio probabile breve termine

Esempio: Balance Sheet in calo con Riserve che si avvicinano a $3T = BASSA sostenibilità (Fed dovrà rallentare QT).`,
    whatToWatch: "Sostenibilità BASSA non significa crash imminente, ma indica scenario vicino a punto di flesso. Fed potrebbe cambiare policy o mercati potrebbero forzare aggiustamento."
  },

  confidence: {
    name: "Confidenza Lettura",
    shortExplanation: "Affidabilità segnali attuali - quanto sono chiari/confusi gli indicatori",
    fullExplanation: `La Confidenza misura coerenza tra diversi indicatori:

ALTA: Tutti segnali vanno stessa direzione (es. VIX basso, spread basso, BS espansione = bullish chiaro)
MEDIA: Segnali misti (es. VIX elevato ma spread ok = scenario incerto)
BASSA: Segnali contraddittori (es. VIX calmo ma spread spike = qualcosa non torna)

BASSA confidenza richiede cautela extra: mercato sta mandando segnali confusi, possibile regime transition.`,
    whatToWatch: "Confidenza BASSA dopo periodi ALTA = warning cambio regime in corso. Non prendere decisioni forti quando confidenza BASSA, aspetta chiarezza."
  },

  // ========================================================================
  // SCENARI
  // ========================================================================

  stealth_qe: {
    name: "Stealth QE",
    shortExplanation: "Fed espande bilancio in modo nascosto senza annunci ufficiali - supporto mercati silenzioso",
    fullExplanation: `Stealth QE (Quantitative Easing nascosto) si verifica quando:
• Balance Sheet Fed sale
• RRP scende (Fed inietta liquidità nascosta)
• Spread SOFR-EFFR bassi (nessuna tensione)
• Nessun annuncio ufficiale QE

Fed usa strumenti tecnici (es. riduzione QT roll-off caps) per supportare mercati senza dichiararlo pubblicamente.

EFFETTO: Positivo per risk assets (equity, crypto) ma meno potente di QE ufficiale.`,
    whatToWatch: "Stealth QE funziona finché VIX rimane basso. Se VIX sale >20 nonostante Stealth QE = segnale mercato ha problemi strutturali che liquidità non risolve."
  },

  quantitative_easing: {
    name: "Quantitative Easing (QE)",
    shortExplanation: "Fed compra attivamente titoli espandendo bilancio - massima iniezione liquidità sistema",
    fullExplanation: `QE ufficiale: Fed annuncia programma acquisti Treasury/MBS per importi specifici (es. $120B/mese come COVID 2020).

EFFETTO:
• Liquidità massiccia sistema bancario
• Tassi Treasury scendono (Fed compra = domanda)
• Asset prices salgono (liquidità cerca rendimento)
• USD si indebolisce (stampa moneta)

QE è tool emergenza Fed per crisi o recessioni.`,
    historicalContext: "COVID 2020: Fed QE $120B/mese portò Balance Sheet da $4T a $9T. Crisi 2008: Fed QE salvò sistema finanziario. QE funziona ma crea distorsioni long-term.",
    whatToWatch: "QE non dura per sempre. Quando Fed annuncia tapering (riduzione acquisti) = warning fine party. Monitora Fed minutes per segnali."
  },

  quantitative_tightening: {
    name: "Quantitative Tightening (QT)",
    shortExplanation: "Fed riduce bilancio lasciando scadere titoli - drena liquidità dal sistema",
    fullExplanation: `QT: Fed lascia scadere titoli senza reinvestire, riducendo Balance Sheet e drenando liquidità.

EFFETTO:
• Riserve bancarie scendono
• Pressure su asset prices (meno liquidità disponibile)
• Tassi Treasury salgono (Fed non compra più)
• USD si rafforza (liquidità scarsa)

QT può causare stress se troppo veloce (repo crisis 2019).`,
    thresholds: [
      { label: "QT Standard", range: "$60B/mese Treasury + $35B MBS", description: "Caps massimi attuali" },
      { label: "QT Ralentato", range: "<$60B/mese", description: "Fed modera drenaggio" },
      { label: "QT Paused", range: "$0/mese", description: "Fed stoppa contrazione" }
    ],
    whatToWatch: "QT finisce quando: 1) Riserve si avvicinano a livello critico, 2) Spread iniziano ad allargarsi persistentemente, 3) Fed dichiara 'ample reserves' raggiunto."
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getExplanation = (metricKey: string): MetricExplanation | null => {
  return explanations[metricKey] || null;
};

export const getShortExplanation = (metricKey: string): string => {
  const explanation = explanations[metricKey];
  return explanation?.shortExplanation || "Metrica non disponibile";
};

export const getFullExplanation = (metricKey: string): string => {
  const explanation = explanations[metricKey];
  return explanation?.fullExplanation || "Spiegazione non disponibile";
};

