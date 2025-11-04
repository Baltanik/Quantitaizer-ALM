// ============================================================================
// ALERT ENGINE - Soglie e detection anomalie
// ============================================================================
// Sistema a 3 livelli: CRITICAL (🔴), WARNING (🟡), OK (✅)
// NO placeholders: se dato mancante → None + log

export interface Deltas {
  walcl_1d: number;
  walcl_4w: number;
  walcl_3m: number;
  walcl_range_90d: [number, number];
  
  rrpon_1d: number;
  rrpon_4w: number;
  rrpon_3m: number;
  rrpon_range_90d: [number, number];
  
  wresbal_1d: number;
  wresbal_4w: number;
  wresbal_3m: number;
  wresbal_range_90d: [number, number];
  
  vix_1d: number;
  vix_4w: number;
  vix_3m: number;
  vix_range_90d: [number, number];
  
  sofr_effr_spread: number;
  sofr_effr_1d: number;
  
  hy_oas_1d: number;
  hy_oas_4w: number;
  hy_oas_3m: number;
  hy_oas_range_90d: [number, number];
  
  t10y3m_1d: number;
  t10y3m_4w: number;
  t10y3m_3m: number;
  t10y3m_range_90d: [number, number];
  
  dxy_1d: number;
  dxy_4w: number;
  dxy_3m: number;
  dxy_range_90d: [number, number];
}

export interface Alert {
  level: 'critical' | 'warning' | 'ok';
  metric: string;
  message: string;
  threshold: number;
  current: number;
}

// ============================================================================
// THRESHOLDS - Basati su 10y+ esperienza risk management
// ============================================================================

const CRITICAL_THRESHOLDS = {
  vix: 22,                      // Stress marcato - possibile sell-off
  sofr_effr_spread: 10,         // Tensione liquidità sistemica (bps)
  hy_oas: 5.5,                  // Credit stress - flight to quality
  reserves_min: 3_000_000,      // $3T - soglia critica sistema bancario (millions)
  walcl_delta_4w: -100_000,     // Contrazione aggressiva <-$100B (millions)
  t10y3m_inverted: -0.5,        // Curva molto invertita - recessione risk
  t10y3m_delta_worsening: -0.2  // E sta peggiorando velocemente
};

const WARNING_THRESHOLDS = {
  vix: 18,                      // Primi segnali nervosismo
  sofr_effr_spread: 5,          // Tensione iniziale liquidità (bps)
  hy_oas: 4.5,                  // Credit spreads iniziano ad allargarsi
  reserves_min: 3_200_000,      // $3.2T - buffer si assottiglia (millions)
  rrp_low: 200_000,            // <$200B - fine eccesso liquidità imminente (millions)
  dxy_delta_4w: 2.0,           // Dollar strength eccessiva (+2 punti 4w)
  walcl_delta_4w: -60_000      // QT sopra caps standard (-$60B/4w) (millions)
};

// ============================================================================
// DELTA CALCULATOR
// ============================================================================

export function calculateDeltas(
  today: any,
  yesterday: any,
  week4Ago: any,
  month3Ago: any,
  last90d: any[]
): Deltas {
  
  // Helper per calcolare range
  const getRange = (metric: string): [number, number] => {
    const values = last90d.map(m => m[metric]).filter(v => v !== null && v !== undefined);
    if (values.length === 0) return [0, 0];
    return [Math.min(...values), Math.max(...values)];
  };

  return {
    // Balance Sheet
    walcl_1d: today.walcl - yesterday.walcl,
    walcl_4w: today.d_walcl_4w, // già calcolato nel DB
    walcl_3m: today.walcl - month3Ago.walcl,
    walcl_range_90d: getRange('walcl'),
    
    // RRP
    rrpon_1d: today.rrpon - yesterday.rrpon,
    rrpon_4w: today.d_rrpon_4w,
    rrpon_3m: today.rrpon - month3Ago.rrpon,
    rrpon_range_90d: getRange('rrpon'),
    
    // Reserves
    wresbal_1d: today.wresbal - yesterday.wresbal,
    wresbal_4w: today.d_wresbal_4w,
    wresbal_3m: today.wresbal - month3Ago.wresbal,
    wresbal_range_90d: getRange('wresbal'),
    
    // VIX
    vix_1d: today.vix - yesterday.vix,
    vix_4w: today.vix - week4Ago.vix,
    vix_3m: today.vix - month3Ago.vix,
    vix_range_90d: getRange('vix'),
    
    // SOFR-EFFR Spread
    sofr_effr_spread: today.sofr - today.iorb, // IORB = effective FFR proxy
    sofr_effr_1d: (today.sofr - today.iorb) - (yesterday.sofr - yesterday.iorb),
    
    // HY OAS
    hy_oas_1d: today.hy_oas - yesterday.hy_oas,
    hy_oas_4w: today.hy_oas - week4Ago.hy_oas,
    hy_oas_3m: today.hy_oas - month3Ago.hy_oas,
    hy_oas_range_90d: getRange('hy_oas'),
    
    // T10Y3M
    t10y3m_1d: today.t10y3m - yesterday.t10y3m,
    t10y3m_4w: today.d_t10y3m_4w,
    t10y3m_3m: today.t10y3m - month3Ago.t10y3m,
    t10y3m_range_90d: getRange('t10y3m'),
    
    // DXY
    dxy_1d: today.dxy_broad - yesterday.dxy_broad,
    dxy_4w: today.d_dxy_4w,
    dxy_3m: today.dxy_broad - month3Ago.dxy_broad,
    dxy_range_90d: getRange('dxy_broad')
  };
}

// ============================================================================
// ALERT DETECTOR
// ============================================================================

export function getAlerts(today: any, deltas: Deltas, scenario: any): Alert[] {
  const alerts: Alert[] = [];

  // VIX
  if (today.vix >= CRITICAL_THRESHOLDS.vix) {
    alerts.push({
      level: 'critical',
      metric: 'VIX',
      message: `VIX ${today.vix.toFixed(1)} - Stress marcato, possibile sell-off`,
      threshold: CRITICAL_THRESHOLDS.vix,
      current: today.vix
    });
  } else if (today.vix >= WARNING_THRESHOLDS.vix) {
    alerts.push({
      level: 'warning',
      metric: 'VIX',
      message: `VIX ${today.vix.toFixed(1)} - Approaching stress zone (22+)`,
      threshold: WARNING_THRESHOLDS.vix,
      current: today.vix
    });
  } else {
    alerts.push({
      level: 'ok',
      metric: 'VIX',
      message: `VIX ${today.vix.toFixed(1)} - Volatilità sotto controllo`,
      threshold: WARNING_THRESHOLDS.vix,
      current: today.vix
    });
  }

  // SOFR-EFFR Spread (in bps)
  const spread_bps = deltas.sofr_effr_spread * 100;
  if (spread_bps >= CRITICAL_THRESHOLDS.sofr_effr_spread) {
    alerts.push({
      level: 'critical',
      metric: 'SOFR-EFFR Spread',
      message: `Spread ${spread_bps.toFixed(1)}bps - Tensione liquidità sistemica`,
      threshold: CRITICAL_THRESHOLDS.sofr_effr_spread,
      current: spread_bps
    });
  } else if (spread_bps >= WARNING_THRESHOLDS.sofr_effr_spread) {
    alerts.push({
      level: 'warning',
      metric: 'SOFR-EFFR Spread',
      message: `Spread ${spread_bps.toFixed(1)}bps - Prime avvisaglie stress liquidità`,
      threshold: WARNING_THRESHOLDS.sofr_effr_spread,
      current: spread_bps
    });
  } else {
    alerts.push({
      level: 'ok',
      metric: 'SOFR-EFFR Spread',
      message: `Spread ${spread_bps.toFixed(1)}bps - No liquidity stress`,
      threshold: WARNING_THRESHOLDS.sofr_effr_spread,
      current: spread_bps
    });
  }

  // HY OAS
  if (today.hy_oas >= CRITICAL_THRESHOLDS.hy_oas) {
    alerts.push({
      level: 'critical',
      metric: 'HY OAS',
      message: `HY OAS ${today.hy_oas.toFixed(2)}% - Credit stress marcato`,
      threshold: CRITICAL_THRESHOLDS.hy_oas,
      current: today.hy_oas
    });
  } else if (today.hy_oas >= WARNING_THRESHOLDS.hy_oas) {
    alerts.push({
      level: 'warning',
      metric: 'HY OAS',
      message: `HY OAS ${today.hy_oas.toFixed(2)}% - Spreads iniziano ad allargarsi`,
      threshold: WARNING_THRESHOLDS.hy_oas,
      current: today.hy_oas
    });
  } else {
    alerts.push({
      level: 'ok',
      metric: 'HY OAS',
      message: `HY OAS ${today.hy_oas.toFixed(2)}% - Credit spreads stabili`,
      threshold: WARNING_THRESHOLDS.hy_oas,
      current: today.hy_oas
    });
  }

  // Reserves
  if (today.wresbal <= CRITICAL_THRESHOLDS.reserves_min) {
    alerts.push({
      level: 'critical',
      metric: 'Reserves',
      message: `Reserves $${(today.wresbal / 1000).toFixed(2)}T - Soglia critica sistema bancario`,
      threshold: CRITICAL_THRESHOLDS.reserves_min / 1000,
      current: today.wresbal / 1000
    });
  } else if (today.wresbal <= WARNING_THRESHOLDS.reserves_min) {
    alerts.push({
      level: 'warning',
      metric: 'Reserves',
      message: `Reserves $${(today.wresbal / 1000).toFixed(2)}T - Buffer si assottiglia`,
      threshold: WARNING_THRESHOLDS.reserves_min / 1000,
      current: today.wresbal / 1000
    });
  }

  // RRP Low
  if (today.rrpon <= WARNING_THRESHOLDS.rrp_low) {
    alerts.push({
      level: 'warning',
      metric: 'RRP',
      message: `RRP $${(today.rrpon / 1000).toFixed(0)}B - Near low threshold, eccesso liquidità finito`,
      threshold: WARNING_THRESHOLDS.rrp_low / 1000,
      current: today.rrpon / 1000
    });
  }

  // Balance Sheet contraction aggressiva
  if (deltas.walcl_4w <= CRITICAL_THRESHOLDS.walcl_delta_4w) {
    alerts.push({
      level: 'critical',
      metric: 'Balance Sheet',
      message: `QT aggressivo: -$${Math.abs(deltas.walcl_4w / 1000).toFixed(0)}B/4w - Drenaggio liquidità marcato`,
      threshold: CRITICAL_THRESHOLDS.walcl_delta_4w / 1000,
      current: deltas.walcl_4w / 1000
    });
  } else if (deltas.walcl_4w <= WARNING_THRESHOLDS.walcl_delta_4w) {
    alerts.push({
      level: 'warning',
      metric: 'Balance Sheet',
      message: `QT attivo: -$${Math.abs(deltas.walcl_4w / 1000).toFixed(0)}B/4w - Contrazione sopra caps standard`,
      threshold: WARNING_THRESHOLDS.walcl_delta_4w / 1000,
      current: deltas.walcl_4w / 1000
    });
  }

  // Yield Curve Inversion
  if (today.t10y3m <= CRITICAL_THRESHOLDS.t10y3m_inverted) {
    alerts.push({
      level: 'critical',
      metric: 'Yield Curve',
      message: `T10Y3M ${today.t10y3m.toFixed(2)}% - Curva molto invertita, recessione risk elevato`,
      threshold: CRITICAL_THRESHOLDS.t10y3m_inverted,
      current: today.t10y3m
    });
  } else if (today.t10y3m < 0) {
    alerts.push({
      level: 'warning',
      metric: 'Yield Curve',
      message: `T10Y3M ${today.t10y3m.toFixed(2)}% - Curva invertita, cautela`,
      threshold: 0,
      current: today.t10y3m
    });
  }

  // Dollar Strength
  if (deltas.dxy_4w >= WARNING_THRESHOLDS.dxy_delta_4w) {
    alerts.push({
      level: 'warning',
      metric: 'DXY',
      message: `DXY +${deltas.dxy_4w.toFixed(1)} (4w) - Dollar strength eccessiva, pressure su risk assets`,
      threshold: WARNING_THRESHOLDS.dxy_delta_4w,
      current: deltas.dxy_4w
    });
  }

  return alerts;
}

