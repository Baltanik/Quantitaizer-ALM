import { FedData } from '@/services/fedData';

/**
 * QUANTITAIZER V2 - LEADING INDICATORS ENGINE
 * 
 * Calcola indicatori anticipatori che precedono i cambiamenti di scenario
 * di liquidità. Questi indicatori forniscono early warning sui pivot Fed.
 * 
 * Indicatori:
 * - TGA Trend: Treasury General Account (liquidità governo)
 * - RRP Velocity: Velocità di drenaggio Reverse Repo
 * - Credit Stress Index: Composite stress credito
 * - Repo Spike Risk: Rischio tensioni repo market
 * - QT Pivot Probability: Probabilità cambio policy Fed
 */

export interface LeadingIndicators {
  tga_trend: 'expanding' | 'contracting' | 'stable';
  tga_impact: 'positive' | 'negative' | 'neutral'; // Impatto su liquidità
  rrp_velocity: number; // B$/day - velocità drenaggio
  rrp_acceleration: 'accelerating' | 'decelerating' | 'stable';
  credit_stress_index: number; // 0-100
  credit_trend: 'improving' | 'deteriorating' | 'stable';
  repo_spike_risk: number; // 0-100
  qt_pivot_probability: number; // 0-100
  overall_signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
}

/**
 * Calcola tutti gli indicatori leading
 */
export function calculateLeadingIndicators(data: FedData, historical: FedData[]): LeadingIndicators {
  if (!data || historical.length < 14) {
    return createDefaultIndicators();
  }

  // Calcola componenti individuali
  const tgaAnalysis = analyzeTGATrend(data, historical);
  const rrpAnalysis = analyzeRRPVelocity(data, historical);
  const creditStress = calculateCreditStressIndex(data, historical);
  const repoRisk = calculateRepoSpikeRisk(data, historical);
  const pivotProb = calculateQTPivotProbability(data, historical);

  // Determina segnale overall
  const overallSignal = determineOverallSignal({
    tga_impact: tgaAnalysis.impact,
    rrp_acceleration: rrpAnalysis.acceleration,
    credit_stress_index: creditStress.index,
    repo_spike_risk: repoRisk,
    qt_pivot_probability: pivotProb
  });

  // Calcola confidence
  const confidence = calculateIndicatorConfidence(data, historical);

  return {
    tga_trend: tgaAnalysis.trend,
    tga_impact: tgaAnalysis.impact,
    rrp_velocity: rrpAnalysis.velocity,
    rrp_acceleration: rrpAnalysis.acceleration,
    credit_stress_index: creditStress.index,
    credit_trend: creditStress.trend,
    repo_spike_risk: repoRisk,
    qt_pivot_probability: pivotProb,
    overall_signal: overallSignal,
    confidence
  };
}

/**
 * Analizza Treasury General Account trend
 * TGA in espansione drena liquidità, in contrazione la inietta
 */
function analyzeTGATrend(data: FedData, historical: FedData[]): {
  trend: 'expanding' | 'contracting' | 'stable';
  impact: 'positive' | 'negative' | 'neutral';
} {
  // Per ora usiamo proxy basati su dati disponibili
  // TODO: Aggiungere serie WTREGEN quando disponibile
  
  // Proxy: Analizza pattern bilancio Fed + riserve per inferire TGA
  const recent7 = historical.slice(0, 7);
  const previous7 = historical.slice(7, 14);

  if (recent7.length < 7 || previous7.length < 7) {
    return { trend: 'stable', impact: 'neutral' };
  }

  // Calcola delta medio bilancio Fed
  const recentBSChange = recent7.reduce((sum, d) => sum + (d.d_walcl_4w || 0), 0) / 7;
  const previousBSChange = previous7.reduce((sum, d) => sum + (d.d_walcl_4w || 0), 0) / 7;

  // Calcola delta medio riserve
  const recentResChange = recent7.reduce((sum, d) => sum + (d.d_wresbal_4w || 0), 0) / 7;
  const previousResChange = previous7.reduce((sum, d) => sum + (d.d_wresbal_4w || 0), 0) / 7;

  // TGA proxy: Se bilancio Fed stabile ma riserve variano → probabile TGA movement
  const bsStable = Math.abs(recentBSChange) < 20000; // <$20B change
  const resVolatile = Math.abs(recentResChange) > 10; // >$10B change

  let trend: 'expanding' | 'contracting' | 'stable' = 'stable';
  let impact: 'positive' | 'negative' | 'neutral' = 'neutral';

  if (bsStable && resVolatile) {
    if (recentResChange > previousResChange + 5) {
      trend = 'contracting'; // TGA drena → riserve aumentano
      impact = 'positive'; // Liquidità iniettata
    } else if (recentResChange < previousResChange - 5) {
      trend = 'expanding'; // TGA accumula → riserve diminuiscono
      impact = 'negative'; // Liquidità drenata
    }
  }

  return { trend, impact };
}

/**
 * Analizza velocità e accelerazione RRP
 */
function analyzeRRPVelocity(data: FedData, historical: FedData[]): {
  velocity: number;
  acceleration: 'accelerating' | 'decelerating' | 'stable';
} {
  if (historical.length < 14) {
    return { velocity: 0, acceleration: 'stable' };
  }

  // Calcola velocità media ultimi 7 giorni (B$/day)
  const recent7 = historical.slice(0, 7);
  const totalChange = recent7.reduce((sum, d) => sum + (d.d_rrpontsyd_4w || 0), 0);
  const velocity = totalChange / 7; // B$/day average

  // Calcola accelerazione confrontando con settimana precedente
  const previous7 = historical.slice(7, 14);
  const previousTotalChange = previous7.reduce((sum, d) => sum + (d.d_rrpontsyd_4w || 0), 0);
  const previousVelocity = previousTotalChange / 7;

  const accelerationChange = velocity - previousVelocity;
  
  let acceleration: 'accelerating' | 'decelerating' | 'stable' = 'stable';
  
  if (Math.abs(accelerationChange) > 2) { // >$2B/day change
    if (velocity < 0 && accelerationChange < -2) {
      acceleration = 'accelerating'; // Drenaggio accelera
    } else if (velocity < 0 && accelerationChange > 2) {
      acceleration = 'decelerating'; // Drenaggio rallenta
    } else if (velocity > 0 && accelerationChange > 2) {
      acceleration = 'accelerating'; // Accumulo accelera
    } else if (velocity > 0 && accelerationChange < -2) {
      acceleration = 'decelerating'; // Accumulo rallenta
    }
  }

  return { velocity: Number(velocity.toFixed(1)), acceleration };
}

/**
 * Calcola Credit Stress Index composito
 */
function calculateCreditStressIndex(data: FedData, historical: FedData[]): {
  index: number;
  trend: 'improving' | 'deteriorating' | 'stable';
} {
  let stressIndex = 0;
  let components = 0;

  // 1) High Yield OAS (peso 40%)
  if (data.hy_oas !== null) {
    let hyScore = 0;
    if (data.hy_oas > 8) hyScore = 100;
    else if (data.hy_oas > 6) hyScore = 80;
    else if (data.hy_oas > 5) hyScore = 60;
    else if (data.hy_oas > 4) hyScore = 40;
    else if (data.hy_oas > 3) hyScore = 20;
    else hyScore = 0;
    
    stressIndex += hyScore * 0.4;
    components++;
  }

  // 2) VIX (peso 30%)
  if (data.vix !== null) {
    let vixScore = 0;
    if (data.vix > 40) vixScore = 100;
    else if (data.vix > 30) vixScore = 80;
    else if (data.vix > 25) vixScore = 60;
    else if (data.vix > 20) vixScore = 40;
    else if (data.vix > 15) vixScore = 20;
    else vixScore = 0;
    
    stressIndex += vixScore * 0.3;
    components++;
  }

  // 3) SOFR-IORB Spread (peso 20%)
  if (data.sofr_iorb_spread !== null) {
    const spreadBps = data.sofr_iorb_spread * 100;
    let spreadScore = 0;
    if (spreadBps > 50) spreadScore = 100;
    else if (spreadBps > 30) spreadScore = 80;
    else if (spreadBps > 20) spreadScore = 60;
    else if (spreadBps > 10) spreadScore = 40;
    else if (spreadBps > 5) spreadScore = 20;
    else spreadScore = 0;
    
    stressIndex += spreadScore * 0.2;
    components++;
  }

  // 4) Yield Curve Inversion (peso 10%)
  if (data.t10y3m !== null) {
    let curveScore = 0;
    if (data.t10y3m < -1) curveScore = 100;
    else if (data.t10y3m < -0.5) curveScore = 80;
    else if (data.t10y3m < 0) curveScore = 60;
    else if (data.t10y3m < 0.5) curveScore = 20;
    else curveScore = 0;
    
    stressIndex += curveScore * 0.1;
    components++;
  }

  // Normalizza per componenti disponibili
  if (components > 0) {
    stressIndex = stressIndex / (components * 0.1); // Riporta a scala 0-100
  }

  // Calcola trend
  const trend = calculateStressTrend(stressIndex, historical);

  return {
    index: Math.round(stressIndex),
    trend
  };
}

/**
 * Calcola rischio spike nel repo market
 */
function calculateRepoSpikeRisk(data: FedData, historical: FedData[]): number {
  let riskScore = 0;

  // 1) SOFR-IORB spread corrente (40% peso)
  if (data.sofr_iorb_spread !== null) {
    const spreadBps = data.sofr_iorb_spread * 100;
    if (spreadBps > 25) riskScore += 40;
    else if (spreadBps > 15) riskScore += 30;
    else if (spreadBps > 10) riskScore += 20;
    else if (spreadBps > 5) riskScore += 10;
  }

  // 2) Volatilità storica spread (30% peso)
  const recentSpreads = historical
    .slice(0, 14)
    .map(d => d.sofr_iorb_spread)
    .filter(s => s !== null) as number[];

  if (recentSpreads.length > 5) {
    const spreadVolatility = calculateVolatility(recentSpreads);
    if (spreadVolatility > 0.15) riskScore += 30;
    else if (spreadVolatility > 0.10) riskScore += 20;
    else if (spreadVolatility > 0.05) riskScore += 10;
  }

  // 3) Livello riserve (20% peso)
  if (data.wresbal !== null) {
    if (data.wresbal < 3000) riskScore += 20; // <$3T riserve = rischio alto
    else if (data.wresbal < 3500) riskScore += 15;
    else if (data.wresbal < 4000) riskScore += 10;
  }

  // 4) Trend RRP (10% peso)
  if (data.d_rrpontsyd_4w !== null && data.d_rrpontsyd_4w < -100) {
    riskScore += 10; // RRP drenaggio rapido = rischio
  }

  return Math.min(100, riskScore);
}

/**
 * Calcola probabilità QT Pivot (Fed cambia policy)
 */
function calculateQTPivotProbability(data: FedData, historical: FedData[]): number {
  let pivotProb = 0;

  // 1) Stress sistemico (40% peso)
  if (data.vix !== null && data.hy_oas !== null) {
    const stressLevel = (data.vix > 25 ? 1 : 0) + (data.hy_oas > 6 ? 1 : 0);
    pivotProb += stressLevel * 20; // Max 40 punti
  }

  // 2) Tensione repo market (30% peso)
  if (data.sofr_iorb_spread !== null) {
    const spreadBps = data.sofr_iorb_spread * 100;
    if (spreadBps > 30) pivotProb += 30;
    else if (spreadBps > 20) pivotProb += 20;
    else if (spreadBps > 15) pivotProb += 10;
  }

  // 3) Livello riserve critiche (20% peso)
  if (data.wresbal !== null) {
    if (data.wresbal < 2500) pivotProb += 20; // Livello critico
    else if (data.wresbal < 3000) pivotProb += 15;
    else if (data.wresbal < 3500) pivotProb += 10;
  }

  // 4) Pattern storico pre-pivot (10% peso)
  const historicalPattern = analyzeHistoricalPivotPattern(historical);
  pivotProb += historicalPattern * 10;

  return Math.min(100, pivotProb);
}

/**
 * Determina segnale overall basato su tutti gli indicatori
 */
function determineOverallSignal(indicators: {
  tga_impact: 'positive' | 'negative' | 'neutral';
  rrp_acceleration: 'accelerating' | 'decelerating' | 'stable';
  credit_stress_index: number;
  repo_spike_risk: number;
  qt_pivot_probability: number;
}): 'bullish' | 'bearish' | 'neutral' {
  let bullishSignals = 0;
  let bearishSignals = 0;

  // TGA Impact
  if (indicators.tga_impact === 'positive') bullishSignals++;
  else if (indicators.tga_impact === 'negative') bearishSignals++;

  // RRP Acceleration (drenaggio = bullish per liquidità)
  if (indicators.rrp_acceleration === 'accelerating') bullishSignals++;

  // Credit Stress
  if (indicators.credit_stress_index < 30) bullishSignals++;
  else if (indicators.credit_stress_index > 60) bearishSignals++;

  // Repo Risk
  if (indicators.repo_spike_risk < 25) bullishSignals++;
  else if (indicators.repo_spike_risk > 60) bearishSignals++;

  // QT Pivot Probability
  if (indicators.qt_pivot_probability > 70) bullishSignals++; // Pivot = bullish
  else if (indicators.qt_pivot_probability < 20) bearishSignals++;

  if (bullishSignals > bearishSignals + 1) return 'bullish';
  if (bearishSignals > bullishSignals + 1) return 'bearish';
  return 'neutral';
}

// === UTILITY FUNCTIONS ===

function createDefaultIndicators(): LeadingIndicators {
  return {
    tga_trend: 'stable',
    tga_impact: 'neutral',
    rrp_velocity: 0,
    rrp_acceleration: 'stable',
    credit_stress_index: 50,
    credit_trend: 'stable',
    repo_spike_risk: 25,
    qt_pivot_probability: 15,
    overall_signal: 'neutral',
    confidence: 0
  };
}

function calculateStressTrend(currentStress: number, historical: FedData[]): 'improving' | 'deteriorating' | 'stable' {
  if (historical.length < 7) return 'stable';

  // Calcola stress medio ultimi 7 giorni vs precedenti 7
  const recent7 = historical.slice(0, 7);
  const previous7 = historical.slice(7, 14);

  if (recent7.length < 7 || previous7.length < 7) return 'stable';

  const recentAvgStress = recent7.reduce((sum, d) => {
    let stress = 0;
    if (d.hy_oas) stress += d.hy_oas * 10;
    if (d.vix) stress += d.vix;
    return sum + stress;
  }, 0) / 7;

  const previousAvgStress = previous7.reduce((sum, d) => {
    let stress = 0;
    if (d.hy_oas) stress += d.hy_oas * 10;
    if (d.vix) stress += d.vix;
    return sum + stress;
  }, 0) / 7;

  const change = recentAvgStress - previousAvgStress;

  if (change > 5) return 'deteriorating';
  if (change < -5) return 'improving';
  return 'stable';
}

function calculateVolatility(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function analyzeHistoricalPivotPattern(historical: FedData[]): number {
  // Semplificato: cerca pattern di stress crescente
  if (historical.length < 30) return 0;

  const recent30 = historical.slice(0, 30);
  let stressIncreasing = 0;

  for (let i = 0; i < 25; i++) {
    const current = recent30[i];
    const previous = recent30[i + 5];

    if (current.vix && previous.vix && current.vix > previous.vix) {
      stressIncreasing++;
    }
    if (current.hy_oas && previous.hy_oas && current.hy_oas > previous.hy_oas) {
      stressIncreasing++;
    }
  }

  return Math.min(1, stressIncreasing / 50); // Normalizza 0-1
}

function calculateIndicatorConfidence(data: FedData, historical: FedData[]): number {
  let confidence = 100;

  // Penalità per dati mancanti
  const criticalFields = [data.vix, data.hy_oas, data.sofr_iorb_spread, data.wresbal, data.d_rrpontsyd_4w];
  const missingFields = criticalFields.filter(field => field === null).length;
  confidence -= missingFields * 15;

  // Penalità per storico insufficiente
  if (historical.length < 30) {
    confidence -= (30 - historical.length) * 2;
  }

  // Penalità per dati vecchi
  const dataAge = (new Date().getTime() - new Date(data.date).getTime()) / (1000 * 60 * 60 * 24);
  if (dataAge > 5) {
    confidence -= Math.min(25, (dataAge - 5) * 3);
  }

  return Math.max(0, Math.min(100, confidence));
}

/**
 * Funzione helper per interpretazione indicatori
 */
export function interpretLeadingIndicators(indicators: LeadingIndicators): {
  summary: string;
  keySignals: string[];
  timeframe: string;
  actionable: string;
} {
  const { overall_signal, confidence, qt_pivot_probability, credit_stress_index } = indicators;

  let summary = '';
  const keySignals: string[] = [];
  let timeframe = '1-2 settimane';
  let actionable = '';

  // Summary basato su overall signal
  if (overall_signal === 'bullish') {
    summary = 'Indicatori leading suggeriscono miglioramento liquidità in arrivo';
    actionable = 'Prepara posizioni risk-on. Monitora conferme dai dati Fed';
  } else if (overall_signal === 'bearish') {
    summary = 'Indicatori leading segnalano possibile stress liquidità';
    actionable = 'Riduci leverage. Considera hedging o posizioni difensive';
  } else {
    summary = 'Indicatori leading mostrano segnali misti o neutrali';
    actionable = 'Mantieni posizione bilanciata. Attendi maggiore chiarezza';
  }

  // Key signals
  if (indicators.tga_impact === 'positive') {
    keySignals.push('TGA in drenaggio (liquidità in aumento)');
  } else if (indicators.tga_impact === 'negative') {
    keySignals.push('TGA in accumulo (liquidità in calo)');
  }

  if (indicators.rrp_acceleration === 'accelerating' && indicators.rrp_velocity < 0) {
    keySignals.push('RRP drenaggio accelera (bullish liquidità)');
  }

  if (credit_stress_index > 70) {
    keySignals.push('Credit stress elevato (rischio sistemico)');
  } else if (credit_stress_index < 30) {
    keySignals.push('Credit conditions favorevoli');
  }

  if (indicators.repo_spike_risk > 60) {
    keySignals.push('Alto rischio tensioni repo market');
  }

  if (qt_pivot_probability > 60) {
    keySignals.push('Alta probabilità pivot Fed policy');
    timeframe = '2-4 settimane';
  }

  // Aggiusta confidence
  if (confidence < 60) {
    summary += ' (bassa confidence - dati limitati)';
  }

  return { summary, keySignals, timeframe, actionable };
}
