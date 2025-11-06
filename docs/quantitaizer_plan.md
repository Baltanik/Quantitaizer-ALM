# 📊 QUANTITAIZER - PIANO COMPLETO ELABORAZIONE DATI

---

## 🔍 ANALISI SITUAZIONE ATTUALE

### ✅ **STATO SALUTE SISTEMA (6 NOV 2025)**

**Verdetto**: Sistema è **11/14 PERFETTO** ✅

#### Dati Eccellenti (0 problemi)
- **SOFR** (69g, upd 5nov) → Tasso overnight, fondamentale
- **IORB** (98g, upd 6nov) → Tasso su riserve, aggiornato oggi!
- **RRP** (69g, upd 5nov) → Liquidità repo, critico
- **T10Y3M** (69g, upd 5nov) → Indicatore curva/recessione, perfetto
- **HY-OAS** (70g, upd 5nov) → Credit spread, stress signal
- **DFF** (96g, upd 4nov) → Fed Funds effettivo, storico lungo

#### Dati Normali (frequenza attesa)
- **VIX** (68g, upd 4nov) → Ritardo weekend OK
- **DGS10** (68g, upd 4nov) → Treasury 10Y, frequenza normale
- **DTB3** (68g, upd 4nov) → Treasury 3M, frequenza normale
- **WALCL** (13w, upd 29ott) → Bilancio Fed, esce solo mercoledì OK
- **WRESBAL** (13w, upd 29ott) → Riserve, esce solo mercoledì OK

#### ⚠️ Problemi (dati vecchi da festivi)
- **EUR/USD** (66g, upd 31ott) → 6 giorni di ritardo (Ognissanti 1nov?)
- **JPY/USD** (66g, upd 31ott) → 6 giorni di ritardo
- **GBP/USD** (66g, upd 31ott) → 6 giorni di ritardo

---

## 📋 ANATOMIA DEI TUOI DATI

### Categoria 1: Liquidità Fed (CORE)
```
SOFR (3.91%)      ← Tasso overnight garantito (fondamento mercati)
DFF (3.87%)       ← Tasso effettivo (policy target)
IORB (3.90%)      ← Tasso su riserve (bank behavior)

Spread critico: SOFR - IORB = 0.01% (molto stretto = mercato tight)
```

**Interpretazione**: Fed sta controllando bene la liquidità, spread stretto segnala efficienza

---

### Categoria 2: Bilancio Fed (STRUCTURAL)
```
WALCL = $6.587T   ← Totale attivi della Fed (balance sheet size)
WRESBAL = $2.848T ← Riserve bancarie (money multiplier base)
RRP = $12.8B      ← Reverse repo (collateral usage)

Ratio: WRESBAL / WALCL = 43.2% (riserve vs totale)
```

**Interpretazione**: Balance sheet normale, riserve adeguate, RRP basso = liquidità diffusa

---

### Categoria 3: Curve e Tassi (EXPECTATIONS)
```
DTB3 = 3.80%      ← Tasso 3 mesi (breve termine)
DGS10 = 4.10%     ← Tasso 10 anni (lungo termine)
T10Y3M = 0.21%    ← Spread curva (inversion signal)

Curva: Positiva di +30bps (DTB3 a DGS10) = NO inversion yet ✅
```

**Interpretazione**: Curva normale, aspettative economiche non pessime, ma spread basso = stress latente

---

### Categoria 4: Risk & Stress (MARKET SENTIMENT)
```
VIX = 19.0        ← Volatilità implicita S&P500 (media ~15-20)
HY-OAS = 3.05%    ← Credit spread (media storica ~4%)

Status: VIX normale, credit spread COMPRESSO = rischio mercato contenuto ma prezzi alti
```

**Interpretazione**: Mercati calmi ma sottovalutati (spread basso = prezzi gonfiati)

---

### Categoria 5: Tassi di Cambio (DXY CONSTRUCTION)
```
EUR/USD = 1.1541  (peso 57.6%) ← Dominante nel DXY
JPY/USD = 154.05  (peso 13.6%)
GBP/USD = ?       (peso 11.9%)
CAD/USD = ?       (peso 9.1%)
SEK/USD = ?       (peso 4.2%)
CHF/USD = ?       (peso 3.6%)

DXY Calcolato = MEDIA PONDERATA
```

**Problema**: FX rates 6 giorni vecchi = DXY potrebbe essere stale

---

## 🎯 PIANO OTTIMALE PER ELABORARE I DATI

### FASE 1: DATA INGESTION & VALIDATION (Daily 08:00 CET = 14:00 EST)

**Input**: Fetch da FRED API

```
Step 1: Scarica tutte le 14 serie FRED
  ├─ Tolleranza: max 1 giorno di ritardo per daily, 7 giorni per weekly
  ├─ Se ritardo > tolleranza → LOG WARNING
  └─ Forward-fill se mancante (usa ultimo valore)

Step 2: Validation
  ├─ Controlla valori invalidi (NaN, negativi dove non attesi)
  ├─ Controlla valori anomali (>3 std dev dal rolling mean 30D)
  └─ Se anomalo → Flag con +0.5 penalità di confidenza

Step 3: Salva in DB con timestamp e metadata
  └─ Colonne: date, value, source, freshness_hours, confidence_score
```

**Output**: Clean dataset in DB, ready for calc

---

### FASE 2: CALCULATIONS & INDICATORS (Daily 08:15 CET)

**Trasforma i dati raw in metriche actionable:**

#### 2A. Spread & Differenziali
```
SOFR_IORB_SPREAD = SOFR - IORB
  → Normal: 0-5bps (Fed controlling liquidity well)
  → High: >10bps (tight conditions, banks pulling away)
  → Action: If >10bps → increase monitoring

DGS10_DTB3_SPREAD = DGS10 - DTB3
  → Normal: +20 to +100bps (positive curve)
  → Flat: 0-20bps (stress signal, recession risk rising)
  → Inverted: <0bps (MAJOR red flag - recession coming 6-12mo)
  → Action: If <20bps → increase cautela

SOFR_4W_DELTA = SOFR_today - SOFR_4weeks_ago
  → Rising: Tightening by Fed or market stress
  → Falling: Easing conditions
  → Action: Track direction, not absolute value
```

#### 2B. Ratios & Percentages
```
RESERVES_RATIO = WRESBAL / WALCL
  → Target: 40-50%
  → High >60%: Excess reserves, banks not lending
  → Low <30%: Tight conditions, RRP surges
  → Action: If >60% → banks cautious; if <30% → stress!

RRP_UTILIZATION = RRP / (RRP + WRESBAL)
  → Normal: <10%
  → Elevated: 10-20% (banks prefer Fed RRP vs bank deposits)
  → Stress: >20% (major liquidity issues)
  → Action: If >15% → system stressed
```

#### 2C. Risk Indicators (Combined)
```
CREDIT_STRESS_INDEX = (HY_OAS / HY_OAS_MA20) * 100
  → Normal: 90-110 (near average)
  → Stress: >130 (spreads widening, credit fears)
  → Action: If >120 → portfolio risk rising

VOLATILITY_STRESS = (VIX / VIX_MA20) * 100
  → Normal: 90-110
  → Stress: >150 (fear rising)
  → Action: If >140 → market jitters
```

---

### FASE 3: SCENARIO CLASSIFICATION (Daily 08:30 CET)

**Assegna uno scenario basato su soglie ottimizzate:**

```
┌─────────────────────────────────────────────────────────────┐
│ SCENARIO LOGIC - IF/ELSE CASCADE                             │
└─────────────────────────────────────────────────────────────┘

IF (T10Y3M < 0) THEN
  → INVERSION = RECESSION SIGNAL
  → Scenario = "RECESSIONARY" 🔴
  
ELSE IF (HY_OAS > 350 bps) AND (VIX > 25) THEN
  → Both credit AND volatility high
  → Scenario = "STRESS" 🟠
  
ELSE IF (SOFR_IORB_SPREAD > 10bps) OR (RRP_Util > 15%) THEN
  → Liquidity tightening
  → Scenario = "RESTRICTIVE" 🟡
  
ELSE IF (DGS10 > 4.5%) OR (SOFR > 4.75%) THEN
  → High rate environment
  → Scenario = "TIGHTENING" 🟡
  
ELSE IF (HY_OAS < 250bps) AND (VIX < 15) THEN
  → Both very calm
  → Scenario = "EXPANSIONARY" 🟢
  
ELSE
  → Scenario = "NORMAL" 🔵 (default)
```

**Output**: Single scenario classification updated daily

---

### FASE 4: DATA GAPS - FALLBACK STRATEGY (When needed)

**Se dati FRED sono STALE (>1 giorno), usa fallback:**

```
┌──────────────────────────────────────────────────────────┐
│ FALLBACK LOGIC - When to use Finnhub/MarketData          │
└──────────────────────────────────────────────────────────┘

IF freshness(VIX) > 1 day THEN
  ├─ Call: GET https://api.marketdata.app/v1/indices/quotes/$VIX/
  ├─ Extract: last price
  ├─ Store: WITH source='marketdata_fallback'
  └─ Confidence: -10% (not FRED official)

IF freshness(EUR_JPY_GBP_USD) > 1 day THEN
  ├─ Call: GET https://finnhub.io/api/v1/forex/rates?base=USD
  ├─ Convert: 1/USD_EUR to get EUR_USD format
  ├─ Store: WITH source='finnhub_fallback'
  └─ Confidence: -5% (reliable but real-time, not official)

ALWAYS PREFER FRED IF AVAILABLE (official Fed source, highest confidence)
```

---

### FASE 5: DASHBOARD & ALERTS (Daily 09:00 CET)

**User-facing output:**

#### 5A. Dashboard Tiles
```
[Scenario Card]
Current: NORMAL 🔵
Updated: 6 Nov 2025 08:45 CET
Confidence: 95%

[Key Metrics Card]
SOFR: 3.91% (+2bps from 4W ago)
Curve 10Y-3M: +30bps (normal)
Credit: HY-OAS 305bps (+5bps from yesterday)

[Alerts Card]
🟢 All systems green
✅ SOFR updated (5 nov)
✅ VIX updated (4 nov, 1 day old but normal)
⚠️ FX rates 6 days old → using forward-fill
```

#### 5B. Automated Alerts (Email/Webhook)
```
CRITICAL: If T10Y3M < 0 (inversion detected)
  → Subject: "YIELD CURVE INVERTED - Recession Risk!"
  → Action: Check recession probability models

WARNING: If HY_OAS > 350 bps
  → Subject: "Credit Stress Detected"
  → Action: Monitor bank stocks, CDS spreads

INFO: Daily digest
  → Subject: "Quantitaizer Daily Report"
  → Include: Scenario, key changes, anomalies
```

---

### FASE 6: PERSISTENCE & HISTORY (Continuous)

**Salva TUTTO in DB per backtest/analysis:**

```
TABLE: macro_daily_snapshot

Columns:
├─ date (DATE) PRIMARY KEY
├─ sofr (REAL)
├─ iorb (REAL)
├─ dff (REAL)
├─ rp (REAL) [reverse repo]
├─ walcl (REAL)
├─ wresbal (REAL)
├─ vix (REAL)
├─ hy_oas (REAL)
├─ us10y (REAL) [DGS10]
├─ dtb3 (REAL)
├─ t10y3m (REAL)
├─ eurusd (REAL)
├─ jpyusd (REAL)
├─ gbpusd (REAL)
├─ cadusd (REAL)
├─ sekusd (REAL)
├─ chfusd (REAL)
├─ scenario (VARCHAR) [NORMAL/STRESS/etc]
├─ confidence_score (REAL 0-100)
├─ data_sources (VARCHAR) [which APIs used]
└─ timestamp_updated (DATETIME)

Indexes: date, scenario, confidence_score (for fast queries)
```

---

## 🔧 IMPLEMENTAZIONE TECNICA

### Architettura (Python/Node recommended)

```
┌─────────────────────────────────────────┐
│         CRON: Every 4 hours              │
│     (08:00, 12:00, 16:00, 20:00 CET)    │
└────────────┬────────────────────────────┘
             │
    ┌────────▼────────┐
    │ fetch_fred()    │
    │ (Phase 1)       │
    └────────┬────────┘
             │
    ┌────────▼──────────────┐
    │ validate_data()       │
    │ check_freshness()     │
    └────────┬──────────────┘
             │
    ┌────────▼──────────────┐
    │ calculate_spreads()   │
    │ calculate_ratios()    │
    │ (Phase 2)             │
    └────────┬──────────────┘
             │
    ┌────────▼──────────────┐
    │ classify_scenario()   │
    │ (Phase 3)             │
    └────────┬──────────────┘
             │
    ┌────────▼──────────────┐
    │ handle_gaps()         │
    │ (Phase 4 if needed)   │
    └────────┬──────────────┘
             │
    ┌────────▼──────────────┐
    │ save_to_db()          │
    │ generate_alerts()     │
    │ (Phase 5-6)           │
    └────────┬──────────────┘
             │
    ┌────────▼──────────────┐
    │ Webhook to Dashboard  │
    │ Email Alert if needed │
    └───────────────────────┘
```

### Pseudo-code (Python)

```python
import requests
import pandas as pd
from datetime import datetime, timedelta
import psycopg2

# Configuration
FRED_API_KEY = "your_key"
FINNHUB_API_KEY = "your_key"
MARKETDATA_API_KEY = "your_key"

# ===== PHASE 1: FETCH & VALIDATE =====
def fetch_all_data():
    data = {}
    
    # FRED series
    fred_series = ['SOFR', 'IORB', 'DFF', 'RRPONTSYD', 'WALCL', 'WRESBAL', 
                   'VIXCLS', 'BAMLH0A0HYM2', 'DGS10', 'DTB3', 'T10Y3M',
                   'DEXUSEU', 'DEXJPUS', 'DEXUSUK', 'DEXCAUS', 'DEXSZUS', 'DEXCHUS']
    
    for series in fred_series:
        try:
            url = f"https://api.stlouisfed.org/fred/series/data?series_id={series}&api_key={FRED_API_KEY}&file_type=json"
            resp = requests.get(url, timeout=10)
            
            if resp.status_code == 200:
                latest = resp.json()['observations'][-1]
                data[series] = {
                    'value': float(latest['value']),
                    'date': latest['date'],
                    'source': 'FRED'
                }
            else:
                print(f"ERROR: {series} returned {resp.status_code}")
                data[series] = None
                
        except Exception as e:
            print(f"ERROR fetching {series}: {e}")
            data[series] = None
    
    return data

# ===== PHASE 2: CALCULATE SPREADS & INDICATORS =====
def calculate_indicators(data):
    indicators = {}
    
    # Spreads
    indicators['sofr_iorb_spread'] = data['SOFR']['value'] - data['IORB']['value']
    indicators['curve_10y3m'] = data['DGS10']['value'] - data['DTB3']['value']
    
    # Ratios
    indicators['reserves_ratio'] = data['WRESBAL']['value'] / data['WALCL']['value']
    
    # 4-week deltas (need to fetch from DB historical)
    sofr_4w_ago = db_get_value('SOFR', date_4w_ago)
    indicators['sofr_delta_4w'] = data['SOFR']['value'] - sofr_4w_ago
    
    return indicators

# ===== PHASE 3: SCENARIO CLASSIFICATION =====
def classify_scenario(data, indicators):
    curve = indicators['curve_10y3m']
    oas = data['BAMLH0A0HYM2']['value']
    vix = data['VIXCLS']['value']
    
    if curve < 0:
        return "RECESSIONARY"
    elif oas > 350 and vix > 25:
        return "STRESS"
    elif indicators['sofr_iorb_spread'] > 0.10 or indicators['reserves_ratio'] > 0.60:
        return "RESTRICTIVE"
    elif data['DGS10']['value'] > 4.5:
        return "TIGHTENING"
    elif oas < 250 and vix < 15:
        return "EXPANSIONARY"
    else:
        return "NORMAL"

# ===== PHASE 4: FALLBACK IF STALE =====
def handle_data_gaps(data):
    today = datetime.now()
    
    # Check VIX freshness
    vix_date = datetime.strptime(data['VIXCLS']['date'], '%Y-%m-%d')
    vix_age = (today - vix_date).days
    
    if vix_age > 1:
        print(f"⚠️ VIX is {vix_age} days old, fetching from MarketData...")
        vix_fresh = fetch_marketdata_vix()
        data['VIXCLS'] = {'value': vix_fresh, 'source': 'marketdata_fallback', 'date': str(today.date())}
    
    # Check FX freshness
    fx_date = datetime.strptime(data['DEXUSEU']['date'], '%Y-%m-%d')
    fx_age = (today - fx_date).days
    
    if fx_age > 1:
        print(f"⚠️ FX rates are {fx_age} days old, fetching from Finnhub...")
        fx_fresh = fetch_finnhub_forex()
        data['DEXUSEU'] = {'value': fx_fresh['EUR'], 'source': 'finnhub_fallback', 'date': str(today.date())}
        # ... etc for other pairs
    
    return data

# ===== PHASE 5-6: SAVE & ALERT =====
def save_to_db_and_alert(data, indicators, scenario):
    # Connect to DB
    conn = psycopg2.connect("dbname=quantitaizer user=postgres")
    cur = conn.cursor()
    
    # Insert snapshot
    cur.execute("""
        INSERT INTO macro_daily_snapshot 
        (date, sofr, iorb, dff, rp, walcl, wresbal, vix, hy_oas, us10y, dtb3, t10y3m, 
         eurusd, jpyusd, scenario, confidence_score, timestamp_updated)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        today, data['SOFR']['value'], data['IORB']['value'], data['DFF']['value'],
        data['RRPONTSYD']['value'], data['WALCL']['value'], data['WRESBAL']['value'],
        data['VIXCLS']['value'], data['BAMLH0A0HYM2']['value'], data['DGS10']['value'],
        data['DTB3']['value'], data['T10Y3M']['value'], data['DEXUSEU']['value'],
        data['DEXJPUS']['value'], scenario, 95, datetime.now()
    ))
    
    conn.commit()
    cur.close()
    conn.close()
    
    # Send alerts
    if scenario == "RECESSIONARY":
        send_alert("CRITICAL", "Yield curve inverted - recession risk!")
    elif scenario == "STRESS":
        send_alert("WARNING", "Credit stress detected")
    
    print(f"✅ Data saved. Scenario: {scenario}")

# ===== MAIN EXECUTION =====
if __name__ == "__main__":
    print("[08:00 CET] Starting Quantitaizer...")
    
    data = fetch_all_data()
    data = handle_data_gaps(data)
    indicators = calculate_indicators(data)
    scenario = classify_scenario(data, indicators)
    save_to_db_and_alert(data, indicators, scenario)
    
    print("[08:15 CET] Complete!")
```

---

## 📊 QUERY ANALYTICS POST-LOAD

**Dopo aver salvato in DB, puoi fare queries come:**

```sql
-- Trend analysis: ha il scenario peggiorato negli ultimi 7 giorni?
SELECT date, scenario, hy_oas, vix, curve_10y3m
FROM macro_daily_snapshot
WHERE date >= NOW() - INTERVAL '7 days'
ORDER BY date DESC;

-- Stress detection: quanti giorni "stressati" negli ultimi 30?
SELECT COUNT(*) as stress_days, 
       AVG(hy_oas) as avg_oas,
       MAX(vix) as max_vix
FROM macro_daily_snapshot
WHERE date >= NOW() - INTERVAL '30 days'
  AND scenario IN ('STRESS', 'RECESSIONARY');

-- Anomaly detection: è successo qualcosa strano oggi?
SELECT date, sofr, sofr - LAG(sofr) OVER (ORDER BY date) as delta
FROM macro_daily_snapshot
WHERE date >= NOW() - INTERVAL '30 days'
ORDER BY ABS(delta) DESC
LIMIT 5;
```

---

## 🚨 MONITORING CHECKLIST

Daily (08:15 CET):
- [ ] All 14 FRED series fetched successfully?
- [ ] Freshness within tolerances?
- [ ] Any data gaps filled with fallback?
- [ ] Scenario changed vs yesterday?
- [ ] Any anomalies detected (>3 std dev)?
- [ ] Alerts sent correctly?

Weekly (Monday):
- [ ] WALCL & WRESBAL updated (Wednesday data)?
- [ ] Historical correlations stable?
- [ ] Database query performance OK?

Monthly:
- [ ] Review alert thresholds → are they still optimal?
- [ ] Check Finnhub/MarketData fallback usage → how often?
- [ ] Update scenario classification logic based on market changes?

---

## 📈 NEXT STEPS

1. **Deploy Phase 1-2** first (fetch + calculate spreads)
2. **Add Phase 3** (scenario logic) once comfortable
3. **Add Phase 4** (fallback) only when FRED gaps happen
4. **Build dashboard** (Phase 5) using data from DB
5. **Iterate** on alert thresholds based on real market moves

**Estimated dev time:**
- Phase 1-2: 4 hours
- Phase 3: 2 hours  
- Phase 4: 1 hour
- Phase 5-6: 3 hours
- **Total: ~10 hours** for full pipeline

---

**Version**: 1.0  
**Last updated**: 6 Nov 2025  
**Status**: Ready for implementation