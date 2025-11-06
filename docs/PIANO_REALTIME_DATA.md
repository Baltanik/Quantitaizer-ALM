# 📡 PIANO INTEGRAZIONE DATI REAL-TIME

**Data:** 6 Novembre 2025  
**Problema:** FRED API troppo lenta per metriche di mercato (VIX, DXY, FX rates)  
**Stato Attuale:** VIX DB = 18.01, VIX reale ≈ 20 (ritardo ~1-2 giorni)

---

## 🎯 OBIETTIVO

Sostituire **dati market real-time** (VIX, DXY, FX) con API specializzate mantenendo **dati Fed policy** (SOFR, WALCL, RRPONTSYD) su FRED.

---

## 📊 ANALISI STATO ATTUALE

### **Dove Sono Gestiti i Dati Ora**

**File:** `supabase/functions/fetch-fed-data/index.ts`

**Architettura Attuale:**
```
FRED API (tutto) → Edge Function → Supabase DB → Frontend
   ↓
Series: SOFR, WALCL, VIXCLS, DEXUSEU, DEXJPUS, etc.
```

**Righe Chiave:**
- **Line 84-106**: Lista serie FRED
  ```typescript
  'VIXCLS',        // VIX (PROBLEMA: lento)
  'DEXUSEU',       // EUR/USD per DXY (PROBLEMA: lento)
  'DEXJPUS',       // JPY/USD per DXY
  // ...altre 4 FX pairs
  ```

- **Line 123-165**: Loop fetch FRED per ogni serie
- **Line 45-60**: `calculateDXY()` - calcolo geometrico con 6 FX pairs
- **Line 214-297**: Processamento date e forward-fill

**Database:**
- Tabella: `fed_data`
- Campi VIX/DXY: `vix`, `dxy_broad`
- Update: 4 ore via `pg_cron` → trigger Edge Function

---

## 🚀 API PROPOSTE

### **1. Marketdata.app** 
✅ **Raccomandato per VIX e DXY**

**Pro:**
- DXY index diretto (no calcolo)
- VIX real-time intraday
- Latency <500ms
- Free tier: 100 req/day
- Pricing: $10/mo = 5000 req/day

**Endpoint:**
```bash
# VIX
GET https://api.marketdata.app/v1/indices/quotes/VIX/
# Response: {"s":"ok","symbol":["VIX"],"last":[19.85],"updated":[1730908800]}

# DXY
GET https://api.marketdata.app/v1/indices/quotes/DXY/
# Response: {"s":"ok","symbol":["DXY"],"last":[104.25],"updated":[1730908800]}
```

**Rate Limits:**
- Free: 100 req/day = 1 req ogni 15min OK per uso (4 update/day)
- Paid: 5000 req/day = abbondante

**Docs:** https://www.marketdata.app/docs/api/indices/quotes

---

### **2. Finnhub** 
✅ **Alternativa per FX pairs (opzionale)**

**Pro:**
- FX real-time
- Free tier: 60 req/min
- Pricing: Free OK per nostro uso

**Endpoint:**
```bash
# FX Rates (singole)
GET https://finnhub.io/api/v1/quote?symbol=OANDA:EUR_USD&token=YOUR_KEY
# Response: {"c":1.0875,"h":1.0890,"l":1.0850,"o":1.0870,"pc":1.0865,"t":1730908800}
```

**Rate Limits:**
- Free: 60 calls/min = perfetto per 6 FX pairs ogni 15min

**Docs:** https://finnhub.io/docs/api/forex-rates

---

### **3. Alpha Vantage** 
⚠️ **NON raccomandato**

**Contro:**
- Solo 25 req/day free (troppo poco)
- 5 calls/min throttle
- Premium $50/mo per real-time

---

## 🏗️ ARCHITETTURA PROPOSTA

### **Schema Dati Ibrido**

```
┌─────────────────────┐
│   FRED API          │  ← SOLO Policy Data (SOFR, WALCL, RRPONTSYD, etc.)
│  (Economic Policy)  │
└──────────┬──────────┘
           │
           ├─────────────────────────┐
           │                         │
┌──────────▼──────────┐   ┌─────────▼────────────┐
│  Marketdata.app     │   │   Finnhub (opt.)     │
│  (Market Real-Time) │   │   (FX Backup)        │
│  - VIX              │   │   - EUR/USD          │
│  - DXY              │   │   - JPY/USD etc.     │
└──────────┬──────────┘   └─────────┬────────────┘
           │                         │
           └─────────┬───────────────┘
                     │
           ┌─────────▼──────────┐
           │   Edge Function    │
           │   (aggregator)     │
           └─────────┬──────────┘
                     │
           ┌─────────▼──────────┐
           │   Supabase DB      │
           │   (fed_data table) │
           └─────────┬──────────┘
                     │
           ┌─────────▼──────────┐
           │    Frontend        │
           └────────────────────┘
```

---

## 🛠️ IMPLEMENTAZIONE

### **FASE 1: Setup API Keys (5 min)**

1. **Marketdata.app**
   - Registrati: https://www.marketdata.app/pricing/
   - Piano: Free (test) → Paid $10/mo (production)
   - Copia API Token

2. **Finnhub (opzionale)**
   - Registrati: https://finnhub.io/register
   - Piano: Free OK
   - Copia API Key

3. **Supabase Vault Secrets**
   ```sql
   -- Esegui in SQL Editor
   SELECT vault.create_secret('MARKETDATA_API_KEY', 'tuo_token_qui');
   SELECT vault.create_secret('FINNHUB_API_KEY', 'tuo_token_qui');
   ```

---

### **FASE 2: Modifica Edge Function (30 min)**

**File:** `supabase/functions/fetch-fed-data/index.ts`

#### **Step 2.1: Aggiungi fetch real-time (dopo line 71)**

```typescript
const marketdataKey = Deno.env.get('MARKETDATA_API_KEY') || '';
const finnhubKey = Deno.env.get('FINNHUB_API_KEY') || '';

/**
 * Fetch VIX e DXY da Marketdata.app (real-time)
 */
async function fetchMarketDataRealtime(): Promise<{vix: number | null, dxy: number | null}> {
  const results = { vix: null as number | null, dxy: null as number | null };
  
  try {
    // VIX
    const vixUrl = `https://api.marketdata.app/v1/indices/quotes/VIX/?token=${marketdataKey}`;
    const vixRes = await fetch(vixUrl, { headers: { 'Accept': 'application/json' } });
    if (vixRes.ok) {
      const vixData = await vixRes.json();
      if (vixData.s === 'ok' && vixData.last?.[0]) {
        results.vix = parseFloat(vixData.last[0]);
        console.log(`✅ VIX real-time: ${results.vix}`);
      }
    }
    
    // DXY
    const dxyUrl = `https://api.marketdata.app/v1/indices/quotes/DXY/?token=${marketdataKey}`;
    const dxyRes = await fetch(dxyUrl, { headers: { 'Accept': 'application/json' } });
    if (dxyRes.ok) {
      const dxyData = await dxyRes.json();
      if (dxyData.s === 'ok' && dxyData.last?.[0]) {
        results.dxy = parseFloat(dxyData.last[0]);
        console.log(`✅ DXY real-time: ${results.dxy}`);
      }
    }
  } catch (error) {
    console.error('⚠️ Marketdata fetch error (using FRED fallback):', error.message);
  }
  
  return results;
}

/**
 * Fetch FX rates da Finnhub (opzionale, fallback se Marketdata non ha DXY)
 */
async function fetchFinnhubFX(): Promise<Partial<FXRates>> {
  const rates: Partial<FXRates> = {};
  
  try {
    const pairs = [
      { symbol: 'OANDA:EUR_USD', key: 'EUR' },
      { symbol: 'OANDA:USD_JPY', key: 'JPY' },
      { symbol: 'OANDA:GBP_USD', key: 'GBP' },
      { symbol: 'OANDA:USD_CAD', key: 'CAD' },
      { symbol: 'OANDA:USD_SEK', key: 'SEK' },
      { symbol: 'OANDA:USD_CHF', key: 'CHF' }
    ];
    
    for (const pair of pairs) {
      const url = `https://finnhub.io/api/v1/quote?symbol=${pair.symbol}&token=${finnhubKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.c) { // current price
          // Converti in formato corretto per calculateDXY
          if (pair.key === 'EUR' || pair.key === 'GBP') {
            rates[pair.key] = data.c; // USD/EUR, USD/GBP
          } else if (pair.key === 'JPY') {
            rates[pair.key] = data.c; // USD/JPY (già corretto)
          } else {
            rates[pair.key] = data.c; // USD/CAD, USD/SEK, USD/CHF
          }
        }
      }
      // Rate limit courtesy: 100ms delay
      await new Promise(r => setTimeout(r, 100));
    }
  } catch (error) {
    console.error('⚠️ Finnhub fetch error:', error.message);
  }
  
  return rates;
}
```

#### **Step 2.2: Modifica Loop Principale (line ~210)**

**PRIMA (line 210-297):**
```typescript
// Initialize lastValues per forward-fill
console.log('📊 Fetching last known values from database for forward-fill...');
// ... existing code ...
```

**DOPO:**
```typescript
// 1. FETCH REAL-TIME DATA (market)
console.log('\n🌐 === FETCHING REAL-TIME MARKET DATA ===');
const realtimeMarket = await fetchMarketDataRealtime();
// Optional: Fetch Finnhub FX se serve DXY da calcolo
// const realtimeFX = await fetchFinnhubFX();

// 2. FETCH FRED DATA (policy)
console.log('\n🏛️ === FETCHING FRED POLICY DATA ===');
// Initialize lastValues per forward-fill
console.log('📊 Fetching last known values from database for forward-fill...');
// ... existing code (immutato) ...
```

#### **Step 2.3: Override VIX/DXY (line ~400, dentro loop date)**

**CERCA (circa line 400, dentro `for (const date of allDates)`):**
```typescript
const input = {
  date,
  sofr: transformedData[date]?.sofr ?? null,
  // ...
  vix: transformedData[date]?.vix ?? null,
  dxy_broad: transformedData[date]?.dxy_broad ?? null,
  // ...
};
```

**SOSTITUISCI CON:**
```typescript
const input = {
  date,
  sofr: transformedData[date]?.sofr ?? null,
  // ...
  
  // OVERRIDE: Real-time market data se disponibile
  vix: (date === endDate && realtimeMarket.vix !== null) 
       ? realtimeMarket.vix 
       : (transformedData[date]?.vix ?? null),
       
  dxy_broad: (date === endDate && realtimeMarket.dxy !== null) 
             ? realtimeMarket.dxy 
             : (transformedData[date]?.dxy_broad ?? null),
  // ...
};

// Log override se usato
if (date === endDate) {
  if (realtimeMarket.vix !== null) {
    console.log(`🔥 VIX OVERRIDE: ${realtimeMarket.vix} (real-time) vs ${transformedData[date]?.vix ?? 'null'} (FRED)`);
  }
  if (realtimeMarket.dxy !== null) {
    console.log(`🔥 DXY OVERRIDE: ${realtimeMarket.dxy} (real-time) vs ${transformedData[date]?.dxy_broad ?? 'null'} (FRED)`);
  }
}
```

---

### **FASE 3: Testing (15 min)**

#### **Test 3.1: Local Test**

```bash
# 1. Export API keys locali
export MARKETDATA_API_KEY="tuo_token"
export FINNHUB_API_KEY="tuo_token"

# 2. Deploy edge function
cd /Users/giovannimarascio/Desktop/Quantitaizer
npx supabase functions deploy fetch-fed-data --project-ref tolaojeqjcoskegelule --no-verify-jwt

# 3. Trigger manuale
curl -X POST "https://tolaojeqjcoskegelule.supabase.co/functions/v1/fetch-fed-data" \
  -H "Authorization: Bearer SERVICE_KEY" \
  -d '{"triggered_by": "test_realtime"}'

# 4. Check logs
npx supabase functions logs fetch-fed-data --project-ref tolaojeqjcoskegelule

# 5. Verifica DB
curl -s "https://tolaojeqjcoskegelule.supabase.co/rest/v1/fed_data?select=date,vix,dxy_broad&order=date.desc&limit=1" \
  -H "apikey: ANON_KEY" | jq '.'
```

#### **Test 3.2: Verifica Override**

Nel log cercare:
```
✅ VIX real-time: 19.85
✅ DXY real-time: 104.25
🔥 VIX OVERRIDE: 19.85 (real-time) vs 18.01 (FRED)
🔥 DXY OVERRIDE: 104.25 (real-time) vs 97.22 (FRED)
```

#### **Test 3.3: Verifica Fallback**

Disattiva Marketdata key e verifica che usi FRED:
```
⚠️ Marketdata fetch error (using FRED fallback): ...
```

---

### **FASE 4: Production Deploy (5 min)**

```bash
# 1. Vault secrets in production (SQL Editor)
SELECT vault.create_secret('MARKETDATA_API_KEY', 'prod_token_qui');
SELECT vault.create_secret('FINNHUB_API_KEY', 'prod_token_qui');

# 2. Deploy final
npx supabase functions deploy fetch-fed-data --project-ref tolaojeqjcoskegelule --no-verify-jwt

# 3. Trigger immediato
curl -X POST "https://tolaojeqjcoskegelule.supabase.co/functions/v1/fetch-fed-data" \
  -H "Authorization: Bearer SERVICE_KEY" \
  -d '{"triggered_by": "production_realtime_activation"}'

# 4. Monitor cron (next 4h)
# Cron job continua a funzionare normalmente, ora con dati real-time
```

---

## 📈 PERFORMANCE & COSTI

### **Latency Improvement**

| Metrica | FRED | Marketdata | Guadagno |
|---------|------|------------|----------|
| VIX | 1-2 giorni | <5 min | **~2000x** |
| DXY | 1-2 giorni | <5 min | **~2000x** |
| SOFR | ~1 giorno | ~1 giorno | unchanged |

### **Costi Mensili**

| Service | Piano | Costo | Uso Attuale |
|---------|-------|-------|-------------|
| FRED | Free | $0 | 4 calls/day = 120/mo |
| Marketdata.app | Free | $0 | 8 calls/day = 240/mo (sotto limite 100/day ❌) |
| Marketdata.app | Paid | **$10/mo** | 8 calls/day = 240/mo (OK ✅) |
| Finnhub | Free | $0 | 24 calls/day = 720/mo (OK ✅) |

**Raccomandazione:** 
- **Marketdata Paid ($10/mo)** per VIX/DXY real-time
- **Finnhub Free** come backup FX (opzionale)
- **Totale: $10/mo** per dati real-time affidabili

---

## 🎯 VANTAGGI

✅ **Latency:** VIX/DXY aggiornati in ~5min vs ~48h  
✅ **Accuratezza:** Dati market-accurate per scenario engine  
✅ **Affidabilità:** Fallback FRED se API down  
✅ **Costo:** $10/mo = $0.33/day per 1000x improvement  
✅ **Manutenibilità:** Architettura modulare, facile switchare provider  
✅ **Zero Breaking Changes:** Frontend/DB invariati  

---

## 🔴 RISCHI & MITIGAZIONI

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| API down | Bassa | Medio | Fallback FRED automatico |
| Rate limit hit | Media | Basso | Upgrade piano ($10→$29/mo) |
| Costo scala | Bassa | Basso | Monitor usage dashboard |
| Data quality | Molto bassa | Alto | Validation + alert se delta >5% |

---

## 📋 CHECKLIST DEPLOYMENT

- [ ] **Setup**
  - [ ] Account Marketdata.app creato
  - [ ] Account Finnhub creato (opzionale)
  - [ ] API keys salvati in Vault Supabase
  
- [ ] **Sviluppo**
  - [ ] Funzione `fetchMarketDataRealtime()` aggiunta
  - [ ] Funzione `fetchFinnhubFX()` aggiunta (opzionale)
  - [ ] Override logic VIX/DXY implementato
  - [ ] Logging override aggiunto
  
- [ ] **Testing**
  - [ ] Test locale con API keys
  - [ ] Log verification (override visible)
  - [ ] DB verification (valori corretti)
  - [ ] Fallback test (API keys errati)
  
- [ ] **Production**
  - [ ] Vault secrets configurati
  - [ ] Edge function deployed
  - [ ] Trigger manuale eseguito
  - [ ] Cron job verificato (next 4h)
  - [ ] Frontend verificato (valori aggiornati)
  
- [ ] **Monitoring**
  - [ ] Dashboard Marketdata.app usage
  - [ ] Alert se VIX delta >10% FRED vs real-time
  - [ ] Log check giornaliero (primi 3 giorni)

---

## 🚀 ALTERNATIVE & FUTURE

### **Opzione B: Solo Finnhub (se budget $0)**

Finnhub Free ha FX real-time ma **NO VIX/DXY diretto**. Dovremmo:
- Calcolare DXY da 6 FX pairs (già fatto)
- VIX rimane su FRED (lento)

**Pro:** $0/mo  
**Contro:** VIX ancora lento (problema principale non risolto)

### **Opzione C: Polygon.io (future)**

Se servono anche **opzioni/futures** per ML:
- Pricing: $29/mo (Starter)
- Include: Stocks, Options, Forex, Crypto
- Real-time + historical

**Quando:** Fase ML con options data (Q2 2026)

---

## 📞 SUPPORTO

- **Marketdata.app:** https://www.marketdata.app/support/
- **Finnhub:** https://finnhub.io/dashboard (Support tab)
- **FRED API:** https://fred.stlouisfed.org/docs/api/

---

**STIMA TEMPO TOTALE:** ~1 ora  
**COSTO RICORRENTE:** $10/mo  
**BENEFICIO:** Dati real-time affidabili per decisioni utenti

**RACCOMANDAZIONE:** ✅ PROCEDERE - ROI eccellente per utenti che dipendono da VIX real-time

