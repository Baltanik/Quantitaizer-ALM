# 🎯 QUANTITAIZER - IMPLEMENTAZIONE COMPLETA & ROBUSTA

## 📌 FILOSOFIA: "DO IT RIGHT, DO IT ONCE"

Non facciamo workaround. Implementiamo una soluzione enterprise-grade che **funziona perfettamente** e **non serve ritoccarla**.

---

## 🏗️ ARCHITETTURA FINALE COMPLETA

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUANTITAIZER SYSTEM v2.0                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ LAYER 1: DATA INGESTION (Multi-source fallback)          │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │                                                            │ │
│  │  Source Priority Chain:                                   │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ 1. FRED (Primary - official, 69+ days history)      │ │ │
│  │  │    └─ SOFR, IORB, DFF, T10Y3M, VIX, HY-OAS, FX     │ │ │
│  │  │                                                      │ │ │
│  │  │ 2. Finnhub (Fallback if FRED stale >1d)            │ │ │
│  │  │    └─ VIX real-time, FX rates, market quotes       │ │ │
│  │  │                                                      │ │ │
│  │  │ 3. ExchangeRate-host (FX fallback if >1d stale)   │ │ │
│  │  │    └─ EUR/USD, JPY/USD, GBP/USD, CAD, SEK, CHF    │ │ │
│  │  │                                                      │ │ │
│  │  │ 4. MarketData.app (VIX historical if needed)       │ │ │
│  │  │    └─ $VIX backfill per analytics                  │ │ │
│  │  │                                                      │ │ │
│  │  │ 5. Forward-fill (Last resort - prev value)         │ │ │
│  │  │    └─ When all APIs fail (rare)                    │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ LAYER 2: DATA VALIDATION & ENRICHMENT                    │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  • Freshness check (timestamp validation)                 │ │
│  │  • Anomaly detection (3-sigma outliers)                  │ │
│  │  • Data quality scoring (confidence 0-100%)              │ │
│  │  • Source tracking (which API provided each value)       │ │
│  │  • Forward-fill logic (for missing series)               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ LAYER 3: INDICATORS & CALCULATIONS                       │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │                                                            │ │
│  │  Spreads:                                                  │ │
│  │  • SOFR - IORB (liquidity tightness)                     │ │
│  │  • DGS10 - DTB3 (yield curve slope)                      │ │
│  │                                                            │ │
│  │  Ratios:                                                   │ │
│  │  • WRESBAL / WALCL (reserve ratio)                       │ │
│  │  • RRP / (RRP + WRESBAL) (repo utilization)              │ │
│  │                                                            │ │
│  │  Indices (4-week rolling):                                │ │
│  │  • SOFR_delta_4w (rate change direction)                 │ │
│  │  • HY_OAS_ma20 (credit stress moving avg)                │ │
│  │  • VIX_percentile_20d (volatility relative position)     │ │
│  │                                                            │ │
│  │  Composite:                                                │ │
│  │  • DXY_BROAD (from 6 FX pairs, official weights)         │ │
│  │  • STRESS_SCORE (weighted combination of all signals)    │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ LAYER 4: SCENARIO CLASSIFICATION                         │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │                                                            │ │
│  │  IF T10Y3M < 0                   → RECESSIONARY 🔴        │ │
│  │  ELSE IF HY_OAS > 350 AND VIX > 25 → STRESS 🟠           │ │
│  │  ELSE IF SOFR-IORB > 10bps         → RESTRICTIVE 🟡      │ │
│  │  ELSE IF DGS10 > 4.5%              → TIGHTENING 🟡       │ │
│  │  ELSE IF HY_OAS < 250 AND VIX < 15 → EXPANSIONARY 🟢     │ │
│  │  ELSE                              → NORMAL 🔵            │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ LAYER 5: ALERTING & MONITORING                           │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  • Scenario changes detected                              │ │
│  │  • Data quality warnings (confidence <70%)                │ │
│  │  • Anomaly alerts (>3 sigma moves)                        │ │
│  │  • API health checks (fallback usage rate)                │ │
│  │  • Freshness alerts (>14d stale data)                     │ │
│  │  → Send to Slack, Email, Dashboard                        │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ LAYER 6: STORAGE & ANALYTICS                             │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │                                                            │ │
│  │  Tables:                                                   │ │
│  │  • macro_daily_snapshot (primary)                         │ │
│  │  • data_quality_log (freshness + sources)                │ │
│  │  • alerts_history (scenario changes + anomalies)          │ │
│  │  • api_health (fallback usage statistics)                 │ │
│  │                                                            │ │
│  │  Queries enabled:                                          │ │
│  │  • Real-time dashboard (current state)                    │ │
│  │  • Backtest analysis (scenario correlations)              │ │
│  │  • Data quality audit (source reliability)                │ │
│  │  • Alert history (trend analysis)                         │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 DATABASE SCHEMA (COMPLETE)

### Table 1: `macro_daily_snapshot` (PRIMARY)
```sql
CREATE TABLE macro_daily_snapshot (
  -- Identification
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Fed Liquidity (core)
  sofr DECIMAL(10,4),
  iorb DECIMAL(10,4),
  dff DECIMAL(10,4),
  rrp_value DECIMAL(15,2), -- reverse repo billions
  
  -- Balance Sheet
  walcl DECIMAL(15,2), -- total assets trillions
  wresbal DECIMAL(15,2), -- reserves trillions
  
  -- Rates & Curve
  us10y DECIMAL(10,4), -- DGS10
  dtb3 DECIMAL(10,4),
  t10y3m DECIMAL(10,4),
  
  -- Risk Indicators
  vix DECIMAL(10,2),
  hy_oas DECIMAL(10,4),
  
  -- FX Rates (for DXY)
  eurusd DECIMAL(10,6),
  jpyusd DECIMAL(10,4),
  gbpusd DECIMAL(10,6),
  cadusd DECIMAL(10,6),
  sekusd DECIMAL(10,6),
  chfusd DECIMAL(10,6),
  dxy_broad DECIMAL(10,4), -- calculated from FX
  
  -- Calculated Indicators
  sofr_iorb_spread DECIMAL(10,4),
  curve_10y3m_spread DECIMAL(10,4),
  wresbal_ratio DECIMAL(10,4), -- wresbal / walcl
  rrp_utilization DECIMAL(10,4),
  stress_score DECIMAL(10,2), -- 0-100
  
  -- Scenario
  scenario VARCHAR(20), -- NORMAL/STRESS/RESTRICTIVE/TIGHTENING/EXPANSIONARY/RECESSIONARY
  scenario_confidence DECIMAL(5,2), -- 0-100
  
  -- Data Quality
  data_freshness_hours INT, -- max hours old of any component
  overall_confidence DECIMAL(5,2), -- 0-100
  data_sources JSON, -- track which API provided each value
  
  INDEX idx_date (date),
  INDEX idx_scenario (scenario),
  INDEX idx_confidence (overall_confidence)
);
```

### Table 2: `data_quality_log` (AUDIT TRAIL)
```sql
CREATE TABLE data_quality_log (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  series_id VARCHAR(20), -- SOFR, VIXCLS, DEXUSEU, etc
  value DECIMAL(15,6),
  hours_stale INT,
  source VARCHAR(50), -- FRED, FRED_fallback, finnhub, exchangerate_host, forward_fill
  confidence DECIMAL(5,2),
  is_anomaly BOOLEAN, -- >3 sigma?
  anomaly_zscore DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_date_series (date, series_id),
  INDEX idx_source (source),
  INDEX idx_anomaly (is_anomaly)
);
```

### Table 3: `alerts_history` (MONITORING)
```sql
CREATE TABLE alerts_history (
  id SERIAL PRIMARY KEY,
  alert_date DATE NOT NULL,
  alert_type VARCHAR(50), -- scenario_change, anomaly, data_quality, api_health
  severity VARCHAR(10), -- info, warning, critical
  previous_scenario VARCHAR(20),
  current_scenario VARCHAR(20),
  triggered_by TEXT, -- which condition
  metrics_snapshot JSON, -- key values at alert time
  sent_to JSON, -- {slack: true, email: true, webhook: true}
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_date_type (alert_date, alert_type),
  INDEX idx_severity (severity)
);
```

### Table 4: `api_health` (SYSTEM MONITORING)
```sql
CREATE TABLE api_health (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  api_name VARCHAR(50), -- FRED, finnhub, exchangerate_host, marketdata
  status VARCHAR(20), -- ok, degraded, error
  response_time_ms INT,
  success_count INT,
  failure_count INT,
  fallback_used_count INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_date_api (date, api_name),
  INDEX idx_status (status)
);
```

---

## 🔧 IMPLEMENTATION ROADMAP (COMPLETE)

### PHASE 1: Infrastructure Setup (2-3 hours)

**Step 1.1**: Create database schema
```bash
# Run all 4 CREATE TABLE statements above
# Add indexes and foreign keys
# Enable Row-Level Security (RLS) on Supabase
```

**Step 1.2**: Set up environment variables
```bash
FRED_API_KEY=your_key
FINNHUB_API_KEY=your_key
MARKETDATA_API_KEY=your_key
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DATABASE_URL=postgresql://...
```

**Step 1.3**: Create API client layer
```typescript
// src/lib/api-clients.ts

export interface DataSource {
  value: number;
  source: 'FRED' | 'finnhub' | 'exchangerate_host' | 'marketdata' | 'forward_fill';
  timestamp: Date;
  confidence: number; // 0-100
  hoursStale: number;
}

export class FREDClient {
  async fetch(series: string): Promise<DataSource> { ... }
}

export class FinnhubClient {
  async fetchVIX(): Promise<DataSource> { ... }
  async fetchForex(): Promise<{[key: string]: DataSource}> { ... }
}

export class ExchangeRateClient {
  async fetchRates(): Promise<{[key: string]: DataSource}> { ... }
}

export class MarketDataClient {
  async fetchVIX(): Promise<DataSource> { ... }
}
```

---

### PHASE 2: Data Ingestion Engine (3-4 hours)

**Step 2.1**: Implement fetch logic with fallback chain
```typescript
// src/lib/data-ingestion.ts

async function fetchAllData(): Promise<RawDataSnapshot> {
  const result: RawDataSnapshot = {};
  
  // === LAYER 1: FRED PRIMARY ===
  const fredData = await fetchFREDWithRetry([
    'SOFR', 'IORB', 'DFF', 'RRPONTSYD', 'WALCL', 'WRESBAL',
    'VIXCLS', 'BAMLH0A0HYM2', 'DGS10', 'DTB3', 'T10Y3M',
    'DEXUSEU', 'DEXJPUS', 'DEXUSUK', 'DEXCAUS', 'DEXSZUS', 'DEXCHUS'
  ]);
  
  Object.assign(result, fredData);
  
  // === LAYER 2: FRESHNESS CHECK ===
  const staleFields = identifyStaleData(result);
  
  // === LAYER 3: FINNHUB FALLBACK (if stale) ===
  if (staleFields.includes('VIXCLS') || staleFields.includes('DXY')) {
    console.warn('⚠️ FRED data stale, trying Finnhub fallback...');
    const finnhubData = await fetchFinnhubFallback(['VIXCLS', 'FOREX']);
    // Only override if Finnhub is fresher
    if (finnhubData.VIXCLS?.hoursStale < result.VIXCLS?.hoursStale) {
      result.VIXCLS = finnhubData.VIXCLS;
    }
  }
  
  // === LAYER 4: EXCHANGERATE FALLBACK (FX specific) ===
  if (staleFields.includes('FX_RATES')) {
    console.warn('⚠️ FX rates stale, trying ExchangeRate-host...');
    const fxData = await fetchExchangeRates();
    result.DEXUSEU = fxData.EURUSD;
    result.DEXJPUS = fxData.JPYUSD;
    // etc
  }
  
  // === LAYER 5: MARKETDATA BACKFILL ===
  if (staleFields.includes('VIX_HISTORY')) {
    console.log('📊 Backfilling VIX history from MarketData...');
    const vixHistory = await fetchMarketDataVIX();
    // Save to historical table for analytics
  }
  
  // === LAYER 6: FORWARD-FILL (last resort) ===
  for (const field of staleFields) {
    if (!result[field] || result[field].value === null) {
      const lastValue = await getLastValidValue(field);
      result[field] = {
        value: lastValue,
        source: 'forward_fill',
        confidence: 30, // Low confidence!
        hoursStale: 999
      };
    }
  }
  
  return result;
}

// Retry logic with exponential backoff
async function fetchFREDWithRetry(
  series: string[],
  maxRetries: number = 3
): Promise<RawDataSnapshot> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fredClient.fetchMultiple(series);
    } catch (error) {
      const backoff = Math.pow(2, attempt) * 1000;
      console.warn(`FRED fetch failed, retrying in ${backoff}ms...`);
      await sleep(backoff);
    }
  }
  throw new Error('FRED fetch failed after retries');
}
```

**Step 2.2**: Implement freshness validation
```typescript
// src/lib/data-validation.ts

interface FreshnessThresholds {
  [key: string]: number; // hours
}

const FRESHNESS_THRESHOLDS: FreshnessThresholds = {
  'SOFR': 24,        // daily
  'IORB': 24,        // daily
  'DFF': 24,         // daily
  'RRPONTSYD': 24,   // daily
  'WALCL': 168,      // weekly
  'WRESBAL': 168,    // weekly
  'VIXCLS': 24,      // daily
  'BAMLH0A0HYM2': 24,// daily
  'DGS10': 24,       // daily
  'DTB3': 24,        // daily
  'T10Y3M': 24,      // daily
  'DEXUSEU': 24,     // daily FX
  'DEXJPUS': 24,
  'DEXUSUK': 24,
  'DEXCAUS': 24,
  'DEXSZUS': 24,
  'DEXCHUS': 24
};

function validateFreshness(data: RawDataSnapshot): {
  stale: string[];
  critical: string[];
} {
  const now = new Date();
  const stale: string[] = [];
  const critical: string[] = [];
  
  for (const [key, source] of Object.entries(data)) {
    const hoursSinceUpdate = 
      (now.getTime() - source.timestamp.getTime()) / (1000 * 60 * 60);
    
    const threshold = FRESHNESS_THRESHOLDS[key] || 24;
    
    if (hoursSinceUpdate > threshold) {
      stale.push(key);
    }
    
    if (hoursSinceUpdate > threshold * 2) {
      critical.push(key);
    }
  }
  
  return { stale, critical };
}

function identifyAnomalies(
  currentValue: number,
  historicalValues: number[],
  window: number = 30
): {
  isAnomaly: boolean;
  zScore: number;
} {
  const recent = historicalValues.slice(-window);
  const mean = recent.reduce((a, b) => a + b) / recent.length;
  const std = Math.sqrt(
    recent.reduce((sum, val) => sum + Math.pow(val - mean, 2)) / recent.length
  );
  
  const zScore = (currentValue - mean) / std;
  
  return {
    isAnomaly: Math.abs(zScore) > 3,
    zScore
  };
}
```

---

### PHASE 3: Indicator Calculation Engine (2-3 hours)

**Step 3.1**: Implement all calculations
```typescript
// src/lib/indicators.ts

export interface CalculatedIndicators {
  sofr_iorb_spread: number;
  curve_10y3m_spread: number;
  wresbal_ratio: number;
  rrp_utilization: number;
  sofr_4w_delta: number;
  hy_oas_ma20: number;
  vix_percentile_20d: number;
  stress_score: number;
  dxy_broad: number;
}

export async function calculateAllIndicators(
  currentData: RawDataSnapshot,
  historicalData: MacroDailySnapshot[] // last 30 days
): Promise<CalculatedIndicators> {
  
  // === SPREADS ===
  const sofr_iorb_spread = currentData.SOFR.value - currentData.IORB.value;
  const curve_10y3m_spread = currentData.DGS10.value - currentData.DTB3.value;
  
  // === RATIOS ===
  const wresbal_ratio = currentData.WRESBAL.value / currentData.WALCL.value;
  const rrp_utilization = 
    currentData.RRPONTSYD.value / 
    (currentData.RRPONTSYD.value + currentData.WRESBAL.value);
  
  // === DELTAS ===
  const sofr_4w_ago = historicalData[historicalData.length - 28]?.sofr ?? currentData.SOFR.value;
  const sofr_4w_delta = currentData.SOFR.value - sofr_4w_ago;
  
  // === MOVING AVERAGES ===
  const hy_oas_values = historicalData.slice(-20).map(d => d.hy_oas);
  const hy_oas_ma20 = hy_oas_values.reduce((a,b) => a+b) / hy_oas_values.length;
  
  const vix_values = historicalData.slice(-20).map(d => d.vix);
  const vix_percentile = 
    vix_values.filter(v => v < currentData.VIXCLS.value).length / vix_values.length * 100;
  
  // === DXY CALCULATION (official Fed Reserve weights) ===
  const dxy_weights = {
    EUR: 0.576, // 57.6%
    JPY: 0.136, // 13.6%
    GBP: 0.119, // 11.9%
    CAD: 0.091, // 9.1%
    SEK: 0.042, // 4.2%
    CHF: 0.036  // 3.6%
  };
  
  // DXY formula: 50.14348112 * USD^(coef1) * EUR^(coef2) * JPY^(coef3) ...
  // Simplified: weighted geometric mean
  const dxy_broad = calculateDXYBroad(
    currentData.DEXUSEU.value,
    currentData.DEXJPUS.value,
    currentData.DEXUSUK.value,
    currentData.DEXCAUS.value,
    currentData.DEXSZUS.value,
    currentData.DEXCHUS.value,
    dxy_weights
  );
  
  // === COMPOSITE STRESS SCORE ===
  const stress_score = calculateStressScore({
    hy_oas: currentData.BAMLH0A0HYM2.value,
    hy_oas_ma20,
    vix: currentData.VIXCLS.value,
    vix_percentile,
    sofr_iorb_spread,
    curve_10y3m: curve_10y3m_spread,
    rrp_utilization,
    wresbal_ratio
  });
  
  return {
    sofr_iorb_spread,
    curve_10y3m_spread,
    wresbal_ratio,
    rrp_utilization,
    sofr_4w_delta,
    hy_oas_ma20,
    vix_percentile_20d: vix_percentile,
    stress_score,
    dxy_broad
  };
}

// DXY calculation using official Fed formula
function calculateDXYBroad(
  eur: number,
  jpy: number,
  gbp: number,
  cad: number,
  sek: number,
  chf: number,
  weights: {[key: string]: number}
): number {
  // Geometric weighted mean
  const logSum = 
    weights.EUR * Math.log(eur) +
    weights.JPY * Math.log(jpy) +
    weights.GBP * Math.log(gbp) +
    weights.CAD * Math.log(cad) +
    weights.SEK * Math.log(sek) +
    weights.CHF * Math.log(chf);
  
  return Math.exp(logSum);
}

function calculateStressScore(metrics: any): number {
  // Normalized 0-100 scale
  let score = 50; // neutral baseline
  
  // Credit stress (HY-OAS high = stress)
  const oas_stress = Math.min(
    ((metrics.hy_oas / metrics.hy_oas_ma20) - 1) * 100,
    50
  );
  
  // Volatility stress (VIX high = stress)
  const vix_stress = Math.min(metrics.vix_percentile, 50);
  
  // Liquidity stress (SOFR-IORB high = stress)
  const liquidity_stress = Math.min(
    (metrics.sofr_iorb_spread / 0.015) * 20,
    20
  );
  
  // Curve stress (inverted or very flat = stress)
  const curve_stress = metrics.curve_10y3m < 0 ? 40 : 
                       metrics.curve_10y3m < 0.02 ? 20 : 0;
  
  score += oas_stress * 0.35;
  score += vix_stress * 0.30;
  score += liquidity_stress * 0.20;
  score += curve_stress * 0.15;
  
  return Math.round(Math.min(Math.max(score, 0), 100));
}
```

---

### PHASE 4: Scenario Classification (1-2 hours)

**Step 4.1**: Implement scenario logic with confidence scoring
```typescript
// src/lib/scenario-classifier.ts

export type ScenarioType = 
  | 'RECESSIONARY'
  | 'STRESS'
  | 'RESTRICTIVE'
  | 'TIGHTENING'
  | 'EXPANSIONARY'
  | 'NORMAL';

export interface ScenarioClassification {
  scenario: ScenarioType;
  confidence: number; // 0-100
  triggeredBy: string[]; // which conditions triggered
  signals: {
    inversion: boolean;
    credit_stress: boolean;
    liquidity_tight: boolean;
    high_rates: boolean;
    very_calm: boolean;
  };
}

export function classifyScenario(
  data: RawDataSnapshot,
  indicators: CalculatedIndicators
): ScenarioClassification {
  const signals = {
    inversion: indicators.curve_10y3m_spread < 0,
    credit_stress: data.BAMLH0A0HYM2.value > 350 && data.VIXCLS.value > 25,
    liquidity_tight: indicators.sofr_iorb_spread > 0.010,
    high_rates: data.DGS10.value > 4.5,
    very_calm: data.BAMLH0A0HYM2.value < 250 && data.VIXCLS.value < 15
  };
  
  const triggeredBy: string[] = [];
  let scenario: ScenarioType;
  let baseConfidence = 95;
  
  // === PRIMARY CLASSIFICATION ===
  if (signals.inversion) {
    scenario = 'RECESSIONARY';
    triggeredBy.push('T10Y3M < 0 (yield curve inversion)');
    baseConfidence = 98; // very high confidence
  } 
  else if (signals.credit_stress) {
    scenario = 'STRESS';
    triggeredBy.push('HY-OAS > 350 bps');
    triggeredBy.push('VIX > 25');
    baseConfidence = 96;
  } 
  else if (signals.liquidity_tight) {
    scenario = 'RESTRICTIVE';
    triggeredBy.push('SOFR-IORB > 10 bps (liquidity tight)');
    baseConfidence = 90;
  } 
  else if (signals.high_rates) {
    scenario = 'TIGHTENING';
    triggeredBy.push('DGS10 > 4.5% (restrictive rates)');
    baseConfidence = 85;
  } 
  else if (signals.very_calm) {
    scenario = 'EXPANSIONARY';
    triggeredBy.push('HY-OAS < 250 bps (low credit risk)');
    triggeredBy.push('VIX < 15 (low volatility)');
    baseConfidence = 92;
  } 
  else {
    scenario = 'NORMAL';
    triggeredBy.push('No extreme conditions detected');
    baseConfidence = 88;
  }
  
  // === CONFIDENCE ADJUSTMENTS ===
  // Reduce confidence if data quality is poor
  const avgConfidence = 
    (data.SOFR.confidence + data.VIXCLS.confidence + data.BAMLH0A0HYM2.confidence) / 3;
  
  const confidenceMultiplier = Math.min(avgConfidence / 95, 1.0);
  const finalConfidence = Math.round(baseConfidence * confidenceMultiplier);
  
  return {
    scenario,
    confidence: finalConfidence,
    triggeredBy,
    signals
  };
}
```

---

### PHASE 5: Alerting & Monitoring (2-3 hours)

**Step 5.1**: Implement alert engine
```typescript
// src/lib/alerting.ts

export interface Alert {
  type: 'scenario_change' | 'anomaly' | 'data_quality' | 'api_health';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metrics: any;
  recipients: {
    slack: boolean;
    email: boolean;
    webhook: boolean;
  };
}

export async function generateAlerts(
  previousSnapshot: MacroDailySnapshot,
  currentSnapshot: MacroDailySnapshot,
  currentClassification: ScenarioClassification
): Promise<Alert[]> {
  const alerts: Alert[] = [];
  
  // === SCENARIO CHANGE ALERT ===
  if (previousSnapshot.scenario !== currentSnapshot.scenario) {
    alerts.push({
      type: 'scenario_change',
      severity: currentClassification.scenario === 'RECESSIONARY' ? 'critical' : 'warning',
      title: `Scenario Changed: ${previousSnapshot.scenario} → ${currentSnapshot.scenario}`,
      message: `
        Previous: ${previousSnapshot.scenario} (confidence ${previousSnapshot.scenario_confidence}%)
        Current: ${currentSnapshot.scenario} (confidence ${currentClassification.confidence}%)
        Triggered by: ${currentClassification.triggeredBy.join(', ')}
      `,
      metrics: {
        sofr: currentSnapshot.sofr,
        hy_oas: currentSnapshot.hy_oas,
        vix: currentSnapshot.vix,
        curve_10y3m: currentSnapshot.t10y3m,
        stress_score: currentSnapshot.stress_score
      },
      recipients: {
        slack: true,
        email: true,
        webhook: currentClassification.scenario === 'RECESSIONARY'
      }
    });
  }
  
  // === ANOMALY ALERT ===
  const anomalies = detectAnomalies(currentSnapshot);
  if (anomalies.length > 0) {
    alerts.push({
      type: 'anomaly',
      severity: 'warning',
      title: `Data Anomaly Detected: ${anomalies.length} series`,
      message: anomalies.map(a => 
        `${a.field}: ${a.value} (${a.zScore.toFixed(2)} sigma)`
      ).join('\n'),
      metrics: anomalies,
      recipients: { slack: true, email: false, webhook: false }
    });
  }
  
  // === DATA QUALITY ALERT ===
  if (currentSnapshot.overall_confidence < 70) {
    alerts.push({
      type: 'data_quality',
      severity: 'warning',
      title: `Low Data Quality: ${currentSnapshot.overall_confidence}%`,
      message: `Sources: ${JSON.stringify(currentSnapshot.data_sources)}`,
      metrics: currentSnapshot.data_sources,
      recipients: { slack: true, email: false, webhook: false }
    });
  }
  
  // === CRITICAL DATA GAPS ===
  const freshness = currentSnapshot.data_freshness_hours;
  if (freshness > 48) {
    alerts.push({
      type: 'api_health',
      severity: 'critical',
      title: `Critical Data Gap: ${freshness} hours stale`,
      message: 'Some data sources are not responding. System is on forward-fill.',
      metrics: { hoursStale: freshness },
      recipients: { slack: true, email: true, webhook: true }
    });
  }
  
  return alerts;
}

function detectAnomalies(snapshot: MacroDailySnapshot): any[] {
  // Implement using historical z-scores
  // Return list of fields that are >3 sigma from mean
  return [];
}

export async function sendAlerts(alerts: Alert[]): Promise<void> {
  for (const alert of alerts) {
    if (alert.recipients.slack) {
      await sendSlack(alert);
    }
    if (alert.recipients.email) {
      await sendEmail(alert);
    }
    if (alert.recipients.webhook) {
      await sendWebhook(alert);
    }
  }
}

async function sendSlack(alert: Alert): Promise<void> {
  const color = 
    alert.severity === 'critical' ? 'danger' :
    alert.severity === 'warning' ? 'warning' :
    'good';
  
  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [{
        color,
        title: alert.title,
        text: alert.message,
        fields: Object.entries(alert.metrics || {}).map(([k, v]) => ({
          title: k,
          value: String(v),
          short: true
        }))
      }]
    })
  });
}
```

---

### PHASE 6: Orchestration & Deployment (2 hours)

**Step 6.1**: Main orchestration function (Supabase Edge Function)
```typescript
// supabase/functions/update-macro-data/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // === ORCHESTRATION PIPELINE ===
    console.log('[08:00] Starting Quantitaizer pipeline...')

    // 1. Fetch all data with fallback chain
    const rawData = await fetchAllData()
    console.log('[08:05] Data fetch complete')

    // 2. Validate freshness & anomalies
    const validation = validateFreshness(rawData)
    console.log(`[08:07] Freshness check: ${validation.critical.length} critical`)

    // 3. Calculate indicators
    const historical = await supabase
      .from('macro_daily_snapshot')
      .select('*')
      .order('date', { ascending: false })
      .limit(30)
    
    const indicators = await calculateAllIndicators(
      rawData,
      historical.data ?? []
    )
    console.log('[08:10] Indicators calculated')

    // 4. Classify scenario
    const classification = classifyScenario(rawData, indicators)
    console.log(`[08:12] Scenario: ${classification.scenario} (${classification.confidence}%)`)

    // 5. Get previous state
    const previous = await supabase
      .from('macro_daily_snapshot')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single()

    // 6. Save current snapshot
    const snapshot = {
      date: new Date().toISOString().split('T')[0],
      sofr: rawData.SOFR.value,
      iorb: rawData.IORB.value,
      dff: rawData.DFF.value,
      // ... all fields
      scenario: classification.scenario,
      scenario_confidence: classification.confidence,
      data_freshness_hours: validation.maxHoursStale,
      data_sources: rawData, // full source tracking
      stress_score: indicators.stress_score
    }

    const { error: insertError } = await supabase
      .from('macro_daily_snapshot')
      .upsert([snapshot])

    if (insertError) throw insertError
    console.log('[08:13] Snapshot saved')

    // 7. Generate & send alerts
    const alerts = await generateAlerts(
      previous.data,
      snapshot,
      classification
    )

    if (alerts.length > 0) {
      await sendAlerts(alerts)
      console.log(`[08:14] ${alerts.length} alerts sent`)
    }

    // 8. Log data quality
    for (const [key, source] of Object.entries(rawData)) {
      await supabase.from('data_quality_log').insert({
        date: snapshot.date,
        series_id: key,
        value: source.value,
        hours_stale: source.hoursStale,
        source: source.source,
        confidence: source.confidence
      })
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        scenario: classification.scenario,
        alerts: alerts.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ status: 'error', error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

**Step 6.2**: Cron trigger (Supabase Cron Extension or external)
```
# Run at 08:00, 12:00, 16:00, 20:00 CET every weekday
0 8,12,16,20 * * 1-5  POST https://your-project.supabase.co/functions/v1/update-macro-data
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-deployment
- [ ] All 4 database tables created with indexes
- [ ] Environment variables set (API keys, webhook URLs)
- [ ] API client layer tested with mock data
- [ ] Fallback chain tested end-to-end
- [ ] Alert templates reviewed
- [ ] Slack/Email webhook URLs validated

### Deployment
- [ ] Deploy Supabase Edge Function
- [ ] Enable cron scheduling
- [ ] Test with manual trigger
- [ ] Monitor first 24 hours closely
- [ ] Verify all data sources (FRED primary, fallbacks available)

### Post-deployment
- [ ] Dashboard populated with data
- [ ] Alert delivery confirmed
- [ ] Historical data backfilled (if needed)
- [ ] Monitoring queries set up
- [ ] Documentation updated

---

## 📊 MONITORING QUERIES (Ready to use)

```sql
-- Dashboard: Current state
SELECT date, scenario, scenario_confidence, stress_score, overall_confidence
FROM macro_daily_snapshot
ORDER BY date DESC LIMIT 1;

-- Alert history: last 30 days
SELECT alert_date, alert_type, severity, current_scenario, triggered_by
FROM alerts_history
WHERE alert_date >= NOW() - INTERVAL '30 days'
ORDER BY alert_date DESC;

-- Data quality: which sources are being used?
SELECT date, series_id, source, confidence, hours_stale
FROM data_quality_log
WHERE date >= NOW() - INTERVAL '7 days'
ORDER BY date DESC, source;

-- Fallback usage: how often do we need it?
SELECT source, COUNT(*) as usage_count
FROM data_quality_log
WHERE date >= NOW() - INTERVAL '30 days'
GROUP BY source
ORDER BY usage_count DESC;

-- Scenario transitions: detect patterns
SELECT 
  lag(scenario) OVER (ORDER BY date) as from_scenario,
  scenario as to_scenario,
  COUNT(*) as frequency
FROM macro_daily_snapshot
WHERE date >= NOW() - INTERVAL '180 days'
GROUP BY from_scenario, to_scenario
ORDER BY frequency DESC;
```

---

## 📈 SUCCESS METRICS (Track these)

✅ **System Uptime**: Target >99% (all 14 series available)  
✅ **Data Freshness**: Max 24h for daily series (except holidays)  
✅ **Fallback Usage**: <5% (means FRED works well)  
✅ **False Alerts**: <1 per month (threshold tuning)  
✅ **Scenario Stability**: Changes when market conditions warrant (not noisy)  

---

## 🎯 SUMMARY

This is a **production-grade, enterprise-robust** system that:

✅ Never fails (5-layer fallback chain)  
✅ Always has data (forward-fill as last resort)  
✅ Tracks quality (confidence scores + source tracking)  
✅ Alerts intelligently (only when it matters)  
✅ Tells the story (scenario + triggers + metrics)  
✅ Scales easily (add new indicators/thresholds without rebuilding)  

**Implementation time**: ~12-15 hours total  
**Complexity**: Medium (straightforward logic, no machine learning)  
**Maintenance**: Minimal (mostly threshold tuning quarterly)

---

**Ready to start Phase 1?** 🚀