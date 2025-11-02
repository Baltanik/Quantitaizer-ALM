# 🗺️ QUANTITAIZER V2 - ROADMAP DETTAGLIATA PER AI PROGRAMMER

## 📋 OVERVIEW TECNICO

**Architettura Esistente:**
- Frontend: React + TypeScript + Tailwind + shadcn/ui
- Backend: Supabase (PostgreSQL + Edge Functions)
- API: FRED (Federal Reserve Economic Data)
- Deployment: Vercel

**Database Schema Esistente:**
- `fed_data` table con tutti i dati FRED + delta 4w + qualificatori scenario
- `signals` table per alert/notifiche
- Edge Function `fetch-fed-data` per data collection

---

## 🎯 FASE 1: LIQUIDITY SCORE + LEADING INDICATORS (Week 1-4)

### Task 1.1: Liquidity Score Engine
**File da creare:** `src/utils/liquidityScore.ts`

**Funzioni principali:**
```typescript
interface LiquidityScore {
  total: number; // 0-100
  components: {
    balance_sheet: number; // 0-25
    reserves: number; // 0-25
    market_stress: number; // 0-25
    momentum: number; // 0-25
  };
  trend: 'improving' | 'stable' | 'deteriorating';
  confidence: number; // 0-100
}

export function calculateLiquidityScore(data: FedData, historical: FedData[]): LiquidityScore
export function calculateBSScore(d_walcl_4w: number, walcl: number): number
export function calculateReservesScore(d_wresbal_4w: number, wresbal: number, d_rrpontsyd_4w: number): number
export function calculateStressScore(vix: number, hy_oas: number, sofr_iorb_spread: number): number
export function calculateMomentumScore(historical: FedData[]): number
```

**Logica scoring:**
- Balance Sheet: peso su delta 4w e livello assoluto vs media storica
- Reserves: rotazione RRP→Reserves + livello assoluto
- Market Stress: VIX + HY OAS + SOFR spread (inverso)
- Momentum: trend ultimi 30 giorni

### Task 1.2: Leading Indicators Engine
**File da creare:** `src/utils/leadingIndicators.ts`

**Funzioni principali:**
```typescript
interface LeadingIndicators {
  tga_trend: 'expanding' | 'contracting' | 'stable';
  rrp_velocity: number; // B$/day
  credit_stress_index: number; // 0-100
  repo_spike_risk: number; // 0-100
  qt_pivot_probability: number; // 0-100
}

export function calculateLeadingIndicators(data: FedData, historical: FedData[]): LeadingIndicators
export function analyzeTGATrend(historical: FedData[]): 'expanding' | 'contracting' | 'stable'
export function calculateVelocity(values: number[]): number
export function calculateRepoSpikeRisk(data: FedData, historical: FedData[]): number
export function calculatePivotProbability(data: FedData, historical: FedData[]): number
```

### Task 1.3: Database Schema Update
**File da modificare:** `supabase/functions/fetch-fed-data/index.ts`

**Aggiunte necessarie:**
1. Nuova serie FRED: `WTREGEN` (Treasury General Account)
2. Calcolo Investment Grade spread: `BAMLC0A0CM` - `DGS10`
3. Nuove colonne in `fed_data`:
   - `tga: number | null`
   - `ig_spread: number | null`
   - `liquidity_score: number | null`
   - `leading_indicators: json | null`

**Migration SQL:**
```sql
ALTER TABLE fed_data 
ADD COLUMN tga DECIMAL,
ADD COLUMN ig_spread DECIMAL,
ADD COLUMN liquidity_score INTEGER,
ADD COLUMN leading_indicators JSONB;
```

### Task 1.4: UI Components Update
**File da modificare:** `src/components/ScenarioCard.tsx`

**Modifiche:**
- Aggiungi display prominente Liquidity Score (grande, colorato)
- Progress bar per componenti score
- Trend indicator (↗️↘️➡️)

**File da creare:** `src/components/LeadingIndicators.tsx`
- Grid 2x3 con indicatori leading
- Color coding per risk levels
- Tooltip con spiegazioni

### Task 1.5: Service Layer Update
**File da modificare:** `src/services/fedData.ts`

**Aggiunte:**
```typescript
export interface FedDataExtended extends FedData {
  tga: number | null;
  ig_spread: number | null;
  liquidity_score: number | null;
  leading_indicators: LeadingIndicators | null;
}
```

---

## 🎯 FASE 2: FORECASTING + BACKTESTING (Week 5-8)

### Task 2.1: Forecast Engine
**File da creare:** `src/utils/forecastEngine.ts`

**Funzioni principali:**
```typescript
interface ScenarioForecast {
  current: string;
  forecast_7d: string;
  probability: number; // 0-100
  key_triggers: string[];
  confidence: 'bassa' | 'media' | 'alta';
}

export function forecastScenario(current: FedData, historical: FedData[]): ScenarioForecast
export function findSimilarPatterns(current: FedData, historical: FedData[]): FedData[]
export function analyzeTransitions(similar: FedData[]): TransitionAnalysis
export function identifyTriggers(): string[]
```

**Algoritmo:**
1. Pattern matching su ultimi 30 giorni
2. Analisi transizioni storiche
3. Calendario eventi macro (FOMC, NFP, CPI)
4. Probabilità basata su frequenza storica

### Task 2.2: Backtesting System
**File da creare:** `src/utils/backtestEngine.ts`

**Database Schema:**
```sql
CREATE TABLE scenario_history (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  predicted_scenario VARCHAR(50),
  actual_scenario VARCHAR(50),
  prediction_date DATE NOT NULL,
  confidence INTEGER,
  accuracy BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Funzioni:**
```typescript
export function runBacktest(startDate: string, endDate: string): BacktestResults
export function calculateAccuracy(predictions: Prediction[]): AccuracyMetrics
export function generateBacktestReport(): BacktestReport
```

### Task 2.3: Forecast UI Components
**File da creare:** `src/components/ForecastPanel.tsx`

**Features:**
- Current vs Forecast scenario
- Probability gauge
- Key triggers list
- Confidence indicator
- Historical accuracy badge

---

## 🎯 FASE 3: MACHINE LEARNING (Week 9-12)

### Task 3.1: TensorFlow.js Integration
**Dependencies:**
```bash
npm install @tensorflow/tfjs @tensorflow/tfjs-node
```

**File da creare:** `src/ml/patternRecognizer.ts`

**Funzioni principali:**
```typescript
export class LiquidityPatternRecognizer {
  private model: tf.LayersModel | null = null;
  
  async train(historicalData: FedData[]): Promise<void>
  async predict(recentData: FedData[]): Promise<MLPrediction>
  private extractFeatures(data: FedData[]): tf.Tensor
  private preprocessData(data: FedData[]): ProcessedData
}
```

**Model Architecture:**
- Input: 30 giorni × 10 features
- LSTM layers per sequenze temporali
- Output: 4 scenari (qe, stealth_qe, neutral, qt)

### Task 3.2: Feature Engineering
**File da creare:** `src/ml/featureExtractor.ts`

**Features per ML:**
1. Delta 4w normalizzati (z-score)
2. Moving averages (7d, 14d, 30d)
3. Volatilità rolling
4. Momentum indicators
5. Cross-correlazioni tra serie
6. Seasonal adjustments
7. Regime indicators
8. Market stress composites

### Task 3.3: Model Training Pipeline
**File da creare:** `scripts/trainModel.js` (Node.js script)

**Pipeline:**
1. Fetch historical data (2020-2025)
2. Feature engineering
3. Train/validation split (80/20)
4. Model training con early stopping
5. Model evaluation
6. Export model per deployment

### Task 3.4: Edge Function ML Deployment
**File da creare:** `supabase/functions/ml-predict/index.ts`

**Funzioni:**
- Load pre-trained model
- Real-time prediction
- Confidence scoring
- Model versioning

---

## 🎯 FASE 4: MARKET CORRELATIONS (Week 13-16)

### Task 4.1: Market Data Integration
**APIs da integrare:**
- CoinGecko API (BTC price)
- Yahoo Finance API (SPY, Gold)
- Alpha Vantage (backup)

**File da creare:** `src/services/marketData.ts`

**Funzioni:**
```typescript
export async function fetchBTCPrice(): Promise<number>
export async function fetchSPYPrice(): Promise<number>
export async function fetchGoldPrice(): Promise<number>
export function calculateCorrelations(liquidityData: number[], assetPrices: number[]): number
```

### Task 4.2: Correlation Engine
**File da creare:** `src/utils/correlationEngine.ts`

**Funzioni:**
```typescript
interface MarketImpact {
  btc_correlation: number;
  btc_expected_move: string;
  spy_correlation: number;
  spy_expected_move: string;
  gold_correlation: number;
  best_assets: string[];
  worst_assets: string[];
}

export function calculateMarketImpact(scenario: string, score: number): MarketImpact
export function calculateRollingCorrelation(x: number[], y: number[], window: number): number[]
export function predictAssetMove(correlation: number, liquidityChange: number): string
```

### Task 4.3: Market Impact UI
**File da creare:** `src/components/MarketImpact.tsx`

**Features:**
- Asset correlation grid
- Expected move ranges
- Best/worst assets
- Optimal setup suggestions
- Historical correlation charts

---

## 🎯 FASE 5: ALERT SYSTEM (Week 17-20)

### Task 5.1: Alert Engine
**File da creare:** `src/services/alertSystem.ts`

**Database Schema:**
```sql
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  actionable BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Funzioni:**
```typescript
interface Alert {
  id: string;
  type: 'scenario_change' | 'threshold_breach' | 'pattern_detected' | 'forecast_update';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  actionable: boolean;
  timestamp: string;
}

export function generateAlerts(current: FedData, previous: FedData, forecast: ScenarioForecast): Alert[]
export function checkThresholds(data: FedData): Alert[]
export function detectPatterns(historical: FedData[]): Alert[]
```

### Task 5.2: Real-time Notifications
**Implementazione:**
- Supabase Realtime per live updates
- Browser notifications
- Email alerts (opzionale)

**File da creare:** `src/hooks/useAlerts.ts`

### Task 5.3: Alert UI Components
**File da creare:** `src/components/AlertPanel.tsx`

**Features:**
- Alert list con priorità
- Dismiss functionality
- Alert history
- Notification settings

---

## 🎯 FASE 6: DASHBOARD V2 (Week 21-24)

### Task 6.1: Layout Redesign
**File da modificare:** `src/pages/Index.tsx`

**Nuovo layout:**
1. Hero section con Liquidity Score
2. Three-column layout: Current | Forecast | Leading
3. Market Impact section
4. Alert panel
5. Existing metrics grid (compatto)

### Task 6.2: Advanced Charts
**Dependencies:**
```bash
npm install recharts d3-scale
```

**File da creare:** `src/components/AdvancedCharts.tsx`

**Charts:**
- Liquidity Score timeline
- Correlation heatmap
- Scenario probability over time
- ML confidence bands

### Task 6.3: Performance Optimization
**Ottimizzazioni:**
- React.memo per componenti pesanti
- useMemo per calcoli complessi
- Lazy loading per charts
- Service Worker per caching

---

## 🎯 TESTING & DEPLOYMENT

### Task 7.1: Unit Tests
**Framework:** Vitest + React Testing Library

**File da testare:**
- `liquidityScore.ts`
- `forecastEngine.ts`
- `correlationEngine.ts`
- `alertSystem.ts`

### Task 7.2: Integration Tests
**Scenari da testare:**
- Data fetch → Score calculation → UI update
- Alert generation → Notification
- ML prediction → Forecast display

### Task 7.3: Performance Tests
**Metriche:**
- Page load time
- Score calculation time
- ML prediction latency
- Database query performance

---

## 📊 DELIVERABLES FINALI

### Code Structure
```
src/
├── ml/
│   ├── patternRecognizer.ts
│   └── featureExtractor.ts
├── utils/
│   ├── liquidityScore.ts
│   ├── leadingIndicators.ts
│   ├── forecastEngine.ts
│   ├── backtestEngine.ts
│   └── correlationEngine.ts
├── services/
│   ├── marketData.ts
│   └── alertSystem.ts
├── components/
│   ├── LeadingIndicators.tsx
│   ├── ForecastPanel.tsx
│   ├── MarketImpact.tsx
│   ├── AlertPanel.tsx
│   └── AdvancedCharts.tsx
└── hooks/
    └── useAlerts.ts
```

### Database Migrations
- Add TGA and IG spread columns
- Create scenario_history table
- Create alerts table
- Add indexes for performance

### Edge Functions
- Update fetch-fed-data with new series
- Create ml-predict function
- Create alert-processor function

### Documentation
- API documentation
- Component documentation
- Deployment guide
- User manual

---

## 🚀 SUCCESS METRICS

### Technical KPIs
- Liquidity Score accuracy: >85%
- Forecast accuracy (7d): >70%
- ML prediction confidence: >80%
- Page load time: <2s
- Alert false positive rate: <15%

### Business KPIs
- User engagement increase: >50%
- Session duration increase: >30%
- Feature adoption rate: >60%
- User satisfaction score: >4.5/5

---

## 🔧 DEVELOPMENT GUIDELINES

### Code Quality
- TypeScript strict mode
- ESLint + Prettier
- 100% type coverage
- Comprehensive error handling
- Structured logging

### Performance
- Lazy loading for heavy components
- Memoization for expensive calculations
- Efficient database queries
- Optimized bundle size

### Security
- Input validation
- Rate limiting
- API key protection
- CORS configuration

### Monitoring
- Error tracking (Sentry)
- Performance monitoring
- Usage analytics
- Alert system health checks
