import { FedData } from '@/services/fedData';

/**
 * QUANTITAIZER V2 - LIQUIDITY SCORE ENGINE
 * 
 * Calcola un score quantitativo 0-100 che riassume lo stato di liquidità
 * del sistema finanziario USA basato su dati Fed e indicatori di mercato.
 * 
 * Componenti Score:
 * - Balance Sheet (0-25): Espansione/contrazione bilancio Fed
 * - Reserves (0-25): Rotazione liquidità RRP→Reserves
 * - Market Stress (0-25): VIX + HY OAS + SOFR spread (inverso)
 * - Momentum (0-25): Trend ultimi 30 giorni
 */

export interface LiquidityScore {
  total: number; // 0-100
  components: {
    balance_sheet: number; // 0-25
    reserves: number; // 0-25
    market_stress: number; // 0-25
    momentum: number; // 0-25
  };
  trend: 'improving' | 'stable' | 'deteriorating';
  confidence: number; // 0-100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D';
}

/**
 * Calcola il Liquidity Score completo
 */
export function calculateLiquidityScore(data: FedData, historical: FedData[]): LiquidityScore {
  // Validazione dati
  if (!data || historical.length < 30) {
    return createDefaultScore();
  }

  // Calcola componenti individuali
  const balanceSheetScore = calculateBalanceSheetScore(data.d_walcl_4w, data.walcl, historical);
  const reservesScore = calculateReservesScore(data.d_wresbal_4w, data.wresbal, data.d_rrpontsyd_4w, historical);
  const marketStressScore = calculateMarketStressScore(data.vix, data.hy_oas, data.sofr_iorb_spread);
  const momentumScore = calculateMomentumScore(historical);

  const total = balanceSheetScore + reservesScore + marketStressScore + momentumScore;
  
  // Determina trend basato su score storico
  const trend = determineTrend(total, historical);
  
  // Calcola confidence basato su qualità dati
  const confidence = calculateConfidence(data);
  
  // Assegna grade
  const grade = assignGrade(total);

  return {
    total: Math.round(total),
    components: {
      balance_sheet: Math.round(balanceSheetScore),
      reserves: Math.round(reservesScore),
      market_stress: Math.round(marketStressScore),
      momentum: Math.round(momentumScore)
    },
    trend,
    confidence,
    grade
  };
}

/**
 * Balance Sheet Component (0-25)
 * Valuta l'impatto del bilancio Fed sulla liquidità
 */
export function calculateBalanceSheetScore(d_walcl_4w: number | null, walcl: number | null, historical: FedData[]): number {
  if (d_walcl_4w === null || walcl === null) return 12.5; // Neutral se dati mancanti

  // Calcola media e std dev storica per normalizzazione
  const historicalDeltas = historical
    .map(d => d.d_walcl_4w)
    .filter(d => d !== null) as number[];
  
  if (historicalDeltas.length === 0) return 12.5;

  const meanDelta = historicalDeltas.reduce((a, b) => a + b, 0) / historicalDeltas.length;
  const stdDelta = Math.sqrt(historicalDeltas.reduce((a, b) => a + Math.pow(b - meanDelta, 2), 0) / historicalDeltas.length);

  // Z-score del delta corrente
  const zScore = stdDelta > 0 ? (d_walcl_4w - meanDelta) / stdDelta : 0;

  // Converti z-score in score 0-25
  // Espansione positiva = score alto, contrazione = score basso
  let score = 12.5 + (zScore * 5); // ±2 std dev = ±10 punti

  // Bonus per espansioni significative (>$50B in 4w)
  if (d_walcl_4w > 50000) {
    score += 5;
  }
  
  // Penalità per contrazioni significative (<-$50B in 4w)
  if (d_walcl_4w < -50000) {
    score -= 5;
  }

  return Math.max(0, Math.min(25, score));
}

/**
 * Reserves Component (0-25)
 * Valuta la rotazione liquidità e livello riserve
 */
export function calculateReservesScore(
  d_wresbal_4w: number | null, 
  wresbal: number | null, 
  d_rrpontsyd_4w: number | null,
  historical: FedData[]
): number {
  if (d_wresbal_4w === null || wresbal === null) return 12.5;

  let score = 12.5; // Base neutral

  // 1) Rotazione RRP → Reserves (segnale positivo)
  if (d_rrpontsyd_4w !== null && d_rrpontsyd_4w < 0 && d_wresbal_4w > 0) {
    const rotationMagnitude = Math.abs(d_rrpontsyd_4w) + d_wresbal_4w;
    score += Math.min(8, rotationMagnitude / 50); // Max +8 punti per rotazione forte
  }

  // 2) Crescita riserve assoluta
  if (d_wresbal_4w > 20) {
    score += Math.min(5, d_wresbal_4w / 40); // Max +5 punti
  } else if (d_wresbal_4w < -50) {
    score -= Math.min(8, Math.abs(d_wresbal_4w) / 25); // Penalità per drenaggio
  }

  // 3) Livello assoluto riserve (contesto storico)
  const historicalReserves = historical
    .map(d => d.wresbal)
    .filter(d => d !== null) as number[];
  
  if (historicalReserves.length > 0) {
    const percentile = calculatePercentile(wresbal, historicalReserves);
    if (percentile > 75) {
      score += 3; // Riserve abbondanti
    } else if (percentile < 25) {
      score -= 3; // Riserve scarse
    }
  }

  return Math.max(0, Math.min(25, score));
}

/**
 * Market Stress Component (0-25)
 * Valuta stress di mercato (inverso: meno stress = score più alto)
 */
export function calculateMarketStressScore(
  vix: number | null, 
  hy_oas: number | null, 
  sofr_iorb_spread: number | null
): number {
  let score = 25; // Inizia da massimo (no stress)

  // 1) VIX Penalty
  if (vix !== null) {
    if (vix > 30) {
      score -= 10; // Stress estremo
    } else if (vix > 22) {
      score -= 6; // Stress elevato
    } else if (vix > 18) {
      score -= 3; // Stress moderato
    }
    // VIX < 16 = bonus +2
    if (vix < 16) {
      score += 2;
    }
  }

  // 2) High Yield OAS Penalty
  if (hy_oas !== null) {
    if (hy_oas > 6.0) {
      score -= 8; // Credit stress estremo
    } else if (hy_oas > 5.0) {
      score -= 5; // Credit stress elevato
    } else if (hy_oas > 4.5) {
      score -= 2; // Credit stress moderato
    }
    // HY OAS < 3.5 = bonus +2
    if (hy_oas < 3.5) {
      score += 2;
    }
  }

  // 3) SOFR-IORB Spread Penalty
  if (sofr_iorb_spread !== null) {
    const spreadBps = sofr_iorb_spread * 100; // Converti in basis points
    if (spreadBps > 25) {
      score -= 7; // Tensione liquidità estrema
    } else if (spreadBps > 15) {
      score -= 4; // Tensione liquidità elevata
    } else if (spreadBps > 10) {
      score -= 2; // Tensione liquidità moderata
    }
    // Spread negativo = bonus +1 (SOFR < IORB)
    if (spreadBps < 0) {
      score += 1;
    }
  }

  return Math.max(0, Math.min(25, score));
}

/**
 * Momentum Component (0-25)
 * Valuta il trend degli ultimi 30 giorni
 */
export function calculateMomentumScore(historical: FedData[]): number {
  if (historical.length < 30) return 12.5;

  // Prendi ultimi 30 giorni
  const recent30 = historical.slice(0, 30);
  
  // Calcola score per ogni giorno
  const dailyScores = recent30.map(data => {
    const bs = calculateBalanceSheetScore(data.d_walcl_4w, data.walcl, historical);
    const res = calculateReservesScore(data.d_wresbal_4w, data.wresbal, data.d_rrpontsyd_4w, historical);
    const stress = calculateMarketStressScore(data.vix, data.hy_oas, data.sofr_iorb_spread);
    return bs + res + stress; // Escludi momentum per evitare ricorsione
  });

  if (dailyScores.length < 2) return 12.5;

  // Calcola trend lineare
  const trend = calculateLinearTrend(dailyScores);
  
  // Converti trend in score 0-25
  // Trend positivo = momentum alto, trend negativo = momentum basso
  let momentumScore = 12.5 + (trend * 2); // Scala il trend

  // Bonus per trend consistente
  const consistency = calculateTrendConsistency(dailyScores);
  momentumScore += consistency * 3; // Max +3 per alta consistenza

  return Math.max(0, Math.min(25, momentumScore));
}

/**
 * Determina il trend del Liquidity Score
 */
function determineTrend(currentScore: number, historical: FedData[]): 'improving' | 'stable' | 'deteriorating' {
  if (historical.length < 7) return 'stable';

  // Calcola score medio ultimi 7 giorni vs precedenti 7
  const recent7 = historical.slice(0, 7);
  const previous7 = historical.slice(7, 14);

  if (recent7.length < 7 || previous7.length < 7) return 'stable';

  const recentAvg = recent7.reduce((sum, data) => {
    const score = calculateQuickScore(data);
    return sum + score;
  }, 0) / 7;

  const previousAvg = previous7.reduce((sum, data) => {
    const score = calculateQuickScore(data);
    return sum + score;
  }, 0) / 7;

  const change = recentAvg - previousAvg;

  if (change > 3) return 'improving';
  if (change < -3) return 'deteriorating';
  return 'stable';
}

/**
 * Calcola confidence basato su qualità dati
 */
function calculateConfidence(data: FedData): number {
  let confidence = 100;

  // Penalità per dati mancanti
  const criticalFields = [
    data.walcl, data.wresbal, data.rrpontsyd,
    data.d_walcl_4w, data.d_wresbal_4w, data.d_rrpontsyd_4w,
    data.vix, data.hy_oas, data.sofr_iorb_spread
  ];

  const missingFields = criticalFields.filter(field => field === null).length;
  confidence -= missingFields * 10; // -10% per campo mancante

  // Penalità per dati vecchi
  const dataAge = (new Date().getTime() - new Date(data.date).getTime()) / (1000 * 60 * 60 * 24);
  if (dataAge > 7) {
    confidence -= Math.min(30, (dataAge - 7) * 3); // -3% per giorno oltre 7
  }

  return Math.max(0, Math.min(100, confidence));
}

/**
 * Assegna grade basato su score totale
 */
function assignGrade(score: number): 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C+';
  if (score >= 50) return 'C';
  return 'D';
}

// === UTILITY FUNCTIONS ===

function createDefaultScore(): LiquidityScore {
  return {
    total: 50,
    components: {
      balance_sheet: 12.5,
      reserves: 12.5,
      market_stress: 12.5,
      momentum: 12.5
    },
    trend: 'stable',
    confidence: 0,
    grade: 'C'
  };
}

function calculatePercentile(value: number, array: number[]): number {
  const sorted = [...array].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v >= value);
  return index === -1 ? 100 : (index / sorted.length) * 100;
}

function calculateLinearTrend(values: number[]): number {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const sumX = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // 0² + 1² + 2² + ... + (n-1)²
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return isNaN(slope) ? 0 : slope;
}

function calculateTrendConsistency(values: number[]): number {
  if (values.length < 3) return 0;
  
  const changes = [];
  for (let i = 1; i < values.length; i++) {
    changes.push(values[i] - values[i - 1]);
  }
  
  const positiveChanges = changes.filter(c => c > 0).length;
  const negativeChanges = changes.filter(c => c < 0).length;
  const totalChanges = changes.length;
  
  // Consistenza = quanto sono allineati i cambiamenti
  const consistency = Math.abs(positiveChanges - negativeChanges) / totalChanges;
  return consistency;
}

function calculateQuickScore(data: FedData): number {
  // Versione semplificata per calcoli trend
  let score = 50;
  
  if (data.d_walcl_4w && data.d_walcl_4w > 0) score += 10;
  if (data.d_wresbal_4w && data.d_wresbal_4w > 0) score += 10;
  if (data.d_rrpontsyd_4w && data.d_rrpontsyd_4w < 0) score += 10;
  if (data.vix && data.vix < 20) score += 10;
  if (data.hy_oas && data.hy_oas < 5) score += 10;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Funzione helper per interpretazione score
 */
export function interpretLiquidityScore(score: LiquidityScore): {
  interpretation: string;
  recommendation: string;
  riskLevel: 'low' | 'medium' | 'high';
  marketOutlook: string;
} {
  const { total, trend, grade } = score;
  
  let interpretation = '';
  let recommendation = '';
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  let marketOutlook = '';

  if (total >= 80) {
    interpretation = 'Condizioni di liquidità eccellenti. Sistema finanziario ben lubrificato.';
    recommendation = 'Ambiente favorevole per risk assets. Considera posizioni long BTC/equity.';
    riskLevel = 'low';
    marketOutlook = 'Bullish';
  } else if (total >= 65) {
    interpretation = 'Condizioni di liquidità buone. Supporto Fed moderato.';
    recommendation = 'Ambiente neutro-positivo. Mantieni esposizione bilanciata.';
    riskLevel = 'medium';
    marketOutlook = 'Neutral-Bullish';
  } else if (total >= 45) {
    interpretation = 'Condizioni di liquidità neutre. Monitorare sviluppi Fed.';
    recommendation = 'Cautela. Riduci leverage e monitora stress indicators.';
    riskLevel = 'medium';
    marketOutlook = 'Neutral';
  } else {
    interpretation = 'Condizioni di liquidità stressate. Possibile tensione sistemica.';
    recommendation = 'Risk-off. Considera posizioni difensive (USD, Treasuries).';
    riskLevel = 'high';
    marketOutlook = 'Bearish';
  }

  // Aggiusta per trend
  if (trend === 'improving') {
    marketOutlook += ' (migliorando)';
  } else if (trend === 'deteriorating') {
    marketOutlook += ' (peggiorando)';
  }

  return { interpretation, recommendation, riskLevel, marketOutlook };
}
