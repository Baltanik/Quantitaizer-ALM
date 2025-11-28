/**
 * SOGLIE CENTRALIZZATE PER ANALISI FED LIQUIDITY
 * ===============================================
 * 
 * Tutte le soglie usate nel sistema sono definite qui.
 * MODIFICARE SOLO QUESTO FILE per aggiornare le soglie!
 * 
 * CONVENZIONE UNITÀ (vedi src/types/units.ts):
 *   - Balance Sheet / Reserves: MILIONI ($M)
 *   - RRP: MILIARDI ($B)
 *   - Spread: DECIMALE (0.10 = 10bps)
 */

// ============================================================================
// SCENARIO DETECTION (usato in edge function e frontend)
// ============================================================================

/**
 * Soglie per determinare lo scenario Fed
 * Coerenti con fetch-fed-data/index.ts
 */
export const SCENARIO_THRESHOLDS = {
  /**
   * QE - Quantitative Easing (espansione aggressiva)
   * Condizione: BS +$50B E Reserves +$50B
   */
  QE: {
    bs_delta_min: 50000,      // +$50B in milioni
    reserves_delta_min: 50000, // +$50B in milioni
  },
  
  /**
   * QT - Quantitative Tightening (contrazione)
   * Condizione: BS -$25B O Reserves -$50B
   */
  QT: {
    bs_delta_max: -25000,      // -$25B in milioni
    reserves_delta_max: -50000, // -$50B in milioni
  },
  
  /**
   * STEALTH_QE - Rotazione liquidità nascosta
   * Condizioni (OR):
   *   1. RRP drena >$30B + Reserves stabili + BS non contrae
   *   2. Reserves +$30B + BS stabile
   *   3. BS +$30B + RRP drena
   */
  STEALTH_QE: {
    rrp_drain_significant: -30,   // -$30B in miliardi
    reserves_stable_min: -20000,  // >-$20B in milioni (non sta crollando)
    reserves_growth_min: 30000,   // +$30B in milioni
    bs_growth_min: 30000,         // +$30B in milioni
    bs_not_contracting: -25000,   // >-$25B in milioni
    rrp_drain_moderate: -20,      // -$20B in miliardi
    spread_max: 0.05,             // <5bps (mercato tranquillo)
  },
} as const;

// ============================================================================
// LIQUIDITY ASSESSMENT
// ============================================================================

/**
 * Soglie per valutazione liquidità sistema
 */
export const LIQUIDITY_THRESHOLDS = {
  /**
   * Riserve bancarie (wresbal in milioni)
   */
  RESERVES: {
    critical_low: 2000000,  // $2T - sotto = stress
    optimal_min: 2500000,   // $2.5T - target minimo sano
    optimal_max: 4000000,   // $4T - sopra = abbondante
    abundant: 4500000,      // $4.5T - molto abbondante
  },
  
  /**
   * Reverse Repo (rrpontsyd in miliardi)
   */
  RRP: {
    depleted: 100,     // $100B - quasi esaurito
    low: 500,          // $500B - basso
    moderate: 1000,    // $1T - moderato
    high: 2000,        // $2T - alto (liquidità parcheggiata)
  },
  
  /**
   * Spread SOFR-EFFR (decimale)
   */
  SPREAD: {
    optimal: 0.03,     // <3bps - perfetto
    normal: 0.10,      // <10bps - normale
    elevated: 0.15,    // <15bps - elevato
    stress: 0.20,      // <20bps - stress
    crisis: 0.30,      // >30bps - crisi
  },
  
  /**
   * Punteggi per calcolo liquidity level (0-100)
   */
  SCORE: {
    reserves_weight: 50,      // Max 50 punti da riserve
    spread_weight: 50,        // Max 50 punti da spread
    qt_penalty: 15,           // -15 punti se scenario QT
  },
} as const;

// ============================================================================
// MARKET RISK INDICATORS
// ============================================================================

/**
 * Soglie VIX (indice volatilità)
 */
export const VIX_THRESHOLDS = {
  very_low: 12,      // Complacenza
  low: 16,           // Calmo
  normal: 20,        // Normale
  elevated: 22,      // Elevato
  high: 30,          // Alto stress
  extreme: 40,       // Panico
} as const;

/**
 * Soglie HY OAS (High Yield spread - percentuale)
 */
export const HY_OAS_THRESHOLDS = {
  very_tight: 3.0,   // Risk-on aggressivo
  tight: 3.5,        // Fiducia alta
  normal: 4.5,       // Normale
  wide: 5.5,         // Cautela
  stress: 7.0,       // Stress credito
  crisis: 10.0,      // Crisi
} as const;

/**
 * Soglie T10Y3M (curva rendimenti - percentuale)
 */
export const YIELD_CURVE_THRESHOLDS = {
  deeply_inverted: -1.0,  // Recessione probabile
  inverted: -0.25,        // Warning
  flat: 0.25,             // Transizione
  normal: 0.50,           // Sano
  steep: 1.50,            // Espansione
} as const;

/**
 * Soglie DXY delta 4w
 */
export const DXY_THRESHOLDS = {
  weakening: -0.5,    // Dollaro debole (risk-on)
  stable_low: -0.2,
  stable_high: 0.2,
  strengthening: 0.5, // Dollaro forte (flight to safety)
  strong_rally: 1.5,  // Rally significativo
} as const;

// ============================================================================
// DISPLAY THRESHOLDS (per UI)
// ============================================================================

/**
 * Soglie per determinare icone/colori nel display
 */
export const DISPLAY_THRESHOLDS = {
  /**
   * Balance Sheet delta (in milioni) per icona trend
   */
  BS_DELTA: {
    strong_expansion: 50000,   // +$50B → TrendingUp verde
    expansion: 5000,           // +$5B → TrendingUp
    stable_range: 5000,        // ±$5B → Minus/stable
    contraction: -5000,        // -$5B → TrendingDown
    strong_contraction: -25000, // -$25B → TrendingDown rosso
  },
  
  /**
   * Reserves delta (in milioni) per icona trend
   */
  RESERVES_DELTA: {
    strong_growth: 50000,     // +$50B
    growth: 20000,            // +$20B
    stable_range: 10000,      // ±$10B
    decline: -20000,          // -$20B
    strong_decline: -50000,   // -$50B
  },
  
  /**
   * RRP delta (in miliardi) per icona trend
   */
  RRP_DELTA: {
    strong_accumulation: 50,  // +$50B
    accumulation: 20,         // +$20B
    stable_range: 10,         // ±$10B
    drain: -20,               // -$20B
    strong_drain: -50,        // -$50B
  },
} as const;

// ============================================================================
// RISK SENTIMENT
// ============================================================================

/**
 * Soglie per determinare Risk-On vs Risk-Off
 */
export const RISK_SENTIMENT_THRESHOLDS = {
  RISK_ON: {
    vix_max: 18,
    spread_max: 0.05,
    hy_oas_max: 4.0,
    scenarios: ['qe', 'stealth_qe'],
  },
  RISK_OFF: {
    vix_min: 22,
    spread_min: 0.10,
    hy_oas_min: 5.5,
    scenarios: ['qt', 'contraction'],
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determina se siamo in scenario espansivo
 */
export function isExpansiveScenario(scenario: string): boolean {
  return ['qe', 'stealth_qe'].includes(scenario.toLowerCase());
}

/**
 * Determina se siamo in scenario restrittivo
 */
export function isRestrictiveScenario(scenario: string): boolean {
  return ['qt', 'contraction'].includes(scenario.toLowerCase());
}

/**
 * Valuta livello VIX
 */
export function getVixLevel(vix: number): 'very_low' | 'low' | 'normal' | 'elevated' | 'high' | 'extreme' {
  if (vix < VIX_THRESHOLDS.very_low) return 'very_low';
  if (vix < VIX_THRESHOLDS.low) return 'low';
  if (vix < VIX_THRESHOLDS.elevated) return 'normal';
  if (vix < VIX_THRESHOLDS.high) return 'elevated';
  if (vix < VIX_THRESHOLDS.extreme) return 'high';
  return 'extreme';
}

/**
 * Valuta livello spread
 */
export function getSpreadLevel(spread: number): 'optimal' | 'normal' | 'elevated' | 'stress' | 'crisis' {
  if (spread < LIQUIDITY_THRESHOLDS.SPREAD.optimal) return 'optimal';
  if (spread < LIQUIDITY_THRESHOLDS.SPREAD.normal) return 'normal';
  if (spread < LIQUIDITY_THRESHOLDS.SPREAD.elevated) return 'elevated';
  if (spread < LIQUIDITY_THRESHOLDS.SPREAD.stress) return 'stress';
  return 'crisis';
}

/**
 * Valuta stato riserve
 */
export function getReservesStatus(reserves: number): 'critical' | 'low' | 'optimal' | 'abundant' {
  if (reserves < LIQUIDITY_THRESHOLDS.RESERVES.critical_low) return 'critical';
  if (reserves < LIQUIDITY_THRESHOLDS.RESERVES.optimal_min) return 'low';
  if (reserves < LIQUIDITY_THRESHOLDS.RESERVES.abundant) return 'optimal';
  return 'abundant';
}

// ============================================================================
// EXPORT TUTTO
// ============================================================================

export const THRESHOLDS = {
  SCENARIO: SCENARIO_THRESHOLDS,
  LIQUIDITY: LIQUIDITY_THRESHOLDS,
  VIX: VIX_THRESHOLDS,
  HY_OAS: HY_OAS_THRESHOLDS,
  YIELD_CURVE: YIELD_CURVE_THRESHOLDS,
  DXY: DXY_THRESHOLDS,
  DISPLAY: DISPLAY_THRESHOLDS,
  RISK_SENTIMENT: RISK_SENTIMENT_THRESHOLDS,
} as const;

export default THRESHOLDS;

