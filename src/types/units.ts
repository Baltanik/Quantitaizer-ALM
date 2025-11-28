/**
 * UNITÀ DI MISURA FED DATA
 * ========================
 * 
 * Documentazione centralizzata delle unità di misura per tutti i dati Fed.
 * FONTE: FRED API + verifiche manuali 2025-11-28
 * 
 * REGOLA D'ORO: Quando in dubbio, controlla questo file!
 */

// ============================================================================
// VALORI ASSOLUTI (Stock)
// ============================================================================

/**
 * WALCL - Federal Reserve Total Assets (Balance Sheet)
 * Unità: MILIONI di dollari ($M)
 * Range tipico: 4,000,000 - 9,000,000 ($4T - $9T)
 * 
 * Conversioni:
 *   - Per miliardi ($B): walcl / 1000
 *   - Per trilioni ($T): walcl / 1000000
 * 
 * Esempio: walcl = 6555283 → $6.56T
 */
export type WALCL_Unit = 'millions';

/**
 * WRESBAL - Reserve Balances with Federal Reserve Banks
 * Unità: MILIONI di dollari ($M)
 * Range tipico: 2,000,000 - 4,500,000 ($2T - $4.5T)
 * 
 * Conversioni:
 *   - Per miliardi ($B): wresbal / 1000
 *   - Per trilioni ($T): wresbal / 1000000
 * 
 * Esempio: wresbal = 2888643 → $2.89T
 */
export type WRESBAL_Unit = 'millions';

/**
 * RRPONTSYD - Overnight Reverse Repurchase Agreements
 * Unità: MILIARDI di dollari ($B) ⚠️ DIVERSO DAGLI ALTRI!
 * Range tipico: 0 - 2500 ($0 - $2.5T)
 * 
 * Conversioni:
 *   - Per trilioni ($T): rrpontsyd / 1000
 *   - NON DIVIDERE PER 1000 per il display in $B!
 * 
 * Esempio: rrpontsyd = 2.22 → $2.22B (quasi esaurito!)
 */
export type RRPONTSYD_Unit = 'billions';

// ============================================================================
// DELTA (Variazioni 4 settimane)
// ============================================================================

/**
 * d_walcl_4w - Variazione Balance Sheet a 4 settimane
 * Unità: MILIONI di dollari ($M)
 * Range tipico: -100,000 a +100,000 (-$100B a +$100B)
 * 
 * Conversione per display: d_walcl_4w / 1000 → "$XB"
 * 
 * Esempio: d_walcl_4w = -31751 → -$31.8B (QT in corso)
 */
export type D_WALCL_4W_Unit = 'millions';

/**
 * d_wresbal_4w - Variazione Riserve a 4 settimane
 * Unità: MILIONI di dollari ($M)
 * Range tipico: -200,000 a +200,000 (-$200B a +$200B)
 * 
 * Conversione per display: d_wresbal_4w / 1000 → "$XB"
 * 
 * Esempio: d_wresbal_4w = 40622 → +$40.6B
 */
export type D_WRESBAL_4W_Unit = 'millions';

/**
 * d_rrpontsyd_4w - Variazione RRP a 4 settimane
 * Unità: MILIARDI di dollari ($B) ⚠️ GIÀ IN MILIARDI!
 * Range tipico: -500 a +500 (-$500B a +$500B)
 * 
 * NON DIVIDERE per il display! Usare direttamente.
 * 
 * Esempio: d_rrpontsyd_4w = -49.59 → -$49.6B (drenaggio RRP)
 */
export type D_RRPONTSYD_4W_Unit = 'billions';

// ============================================================================
// SPREAD E TASSI
// ============================================================================

/**
 * sofr_effr_spread, sofr_iorb_spread, effr_iorb_spread
 * Unità: DECIMALE (percentuale / 100)
 * Range tipico: -0.10 a +0.30 (-10bps a +30bps)
 * 
 * Conversione per display: spread * 100 → "Xbps"
 * 
 * Esempio: sofr_effr_spread = 0.17 → 17bps
 */
export type Spread_Unit = 'decimal_percent';

/**
 * sofr, iorb, effr (DFF), us10y, dtb3, dtb1yr
 * Unità: PERCENTUALE diretta
 * Range tipico: 0 a 10 (0% a 10%)
 * 
 * Usare direttamente per display: "X%"
 * 
 * Esempio: sofr = 4.05 → 4.05%
 */
export type Rate_Unit = 'percent';

// ============================================================================
// INDICI E ALTRI
// ============================================================================

/**
 * vix - CBOE Volatility Index
 * Unità: INDICE (adimensionale)
 * Range tipico: 10 - 80
 * 
 * Usare direttamente per display.
 * 
 * Livelli: <16 basso, 16-22 normale, 22-30 elevato, >30 panico
 */
export type VIX_Unit = 'index';

/**
 * hy_oas - High Yield Option Adjusted Spread
 * Unità: PERCENTUALE diretta
 * Range tipico: 2.5 - 10 (250bps - 1000bps)
 * 
 * Usare direttamente per display: "X%"
 * 
 * Livelli: <3.5% tight, 3.5-5.5% normale, >5.5% stress
 */
export type HY_OAS_Unit = 'percent';

/**
 * t10y3m - 10-Year minus 3-Month Treasury Spread
 * Unità: PERCENTUALE diretta
 * Range tipico: -1.5 a +3.0 (-150bps a +300bps)
 * 
 * Negativo = curva invertita (recessione warning)
 */
export type T10Y3M_Unit = 'percent';

/**
 * dxy_broad - Dollar Index (calcolato)
 * Unità: INDICE (base ~100)
 * Range tipico: 90 - 115
 */
export type DXY_Unit = 'index';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converte wresbal/walcl (milioni) in trilioni per display
 */
export function millionsToTrillions(value: number): string {
  return (value / 1000000).toFixed(2);
}

/**
 * Converte wresbal/walcl (milioni) in miliardi per display
 */
export function millionsToBillions(value: number): string {
  return (value / 1000).toFixed(1);
}

/**
 * Converte spread decimale in basis points per display
 */
export function decimalToBps(value: number): string {
  return (value * 100).toFixed(1);
}

/**
 * Formatta delta con segno e unità
 */
export function formatDelta(value: number, unit: 'millions' | 'billions'): string {
  const sign = value > 0 ? '+' : '';
  if (unit === 'millions') {
    return `${sign}$${(value / 1000).toFixed(1)}B`;
  }
  return `${sign}$${value.toFixed(1)}B`;
}

// ============================================================================
// RIEPILOGO RAPIDO
// ============================================================================
/**
 * CHEAT SHEET:
 * 
 * | Campo           | Unità    | Per $B      | Per $T        | Per bps     |
 * |-----------------|----------|-------------|---------------|-------------|
 * | walcl           | Milioni  | /1000       | /1000000      | -           |
 * | wresbal         | Milioni  | /1000       | /1000000      | -           |
 * | rrpontsyd       | Miliardi | diretto     | /1000         | -           |
 * | d_walcl_4w      | Milioni  | /1000       | -             | -           |
 * | d_wresbal_4w    | Milioni  | /1000       | -             | -           |
 * | d_rrpontsyd_4w  | Miliardi | diretto     | -             | -           |
 * | sofr_effr_spread| Decimale | -           | -             | *100        |
 * | vix, dxy        | Indice   | -           | -             | -           |
 * | hy_oas, t10y3m  | Percent  | -           | -             | -           |
 */

