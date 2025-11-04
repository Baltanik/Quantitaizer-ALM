# ⚡ ACTION ITEMS IMMEDIATE - QUANTITAIZER
**Data:** 4 Novembre 2025  
**Status:** 🔴 **CRITICAL FIXES REQUIRED**

---

## 🎯 PRIORITÀ P0 - DA FARE SUBITO

### 1. 🔴 **FIX SOGLIE STEALTH QE** (30 minuti)

**Problema:** Soglie troppo sensibili causano falsi positivi.

**File da modificare:** `supabase/functions/fetch-fed-data/index.ts`

**Righe:** 522-537 (funzione `determineScenario`)

**MODIFICHE:**

```typescript
// ===== PRIMA (SBAGLIATO) =====
const rrpDrainageSignificant = d_rrpontsyd_4w < -30 && d_wresbal_4w >= -20;
const reservesGrowthModerate = d_wresbal_4w > 20 && d_walcl_4w > -20000;
const balanceSheetGrowthWithRrpDrain = d_walcl_4w > 30000 && d_rrpontsyd_4w < -20;

// ===== DOPO (CORRETTO) =====
const rrpDrainageSignificant = d_rrpontsyd_4w < -80 && d_wresbal_4w >= -30;
const reservesGrowthModerate = d_wresbal_4w > 50 && d_walcl_4w > -30000;
const balanceSheetGrowthWithRrpDrain = d_walcl_4w > 80000 && d_rrpontsyd_4w < -40;
```

**Deploy:**
```bash
cd supabase/functions/fetch-fed-data
supabase functions deploy fetch-fed-data
```

---

### 2. 🟡 **BACKTEST NUOVE SOGLIE** (20 minuti)

**Obiettivo:** Verificare che le nuove soglie funzionino correttamente sullo storico.

**Query SQL da eseguire su Supabase:**

```sql
-- Analisi distribuzione scenari ultimi 90 giorni
SELECT 
  scenario,
  COUNT(*) as days,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM fed_data
WHERE date >= CURRENT_DATE - INTERVAL '90 days'
  AND scenario IS NOT NULL
GROUP BY scenario
ORDER BY days DESC;

-- Dettaglio ultimi 30 giorni con delta
SELECT 
  date,
  scenario,
  ROUND(d_walcl_4w / 1000, 1) as delta_bs_billions,
  ROUND(d_wresbal_4w, 1) as delta_reserves,
  ROUND(d_rrpontsyd_4w, 1) as delta_rrp,
  context,
  risk_level
FROM fed_data
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

**Output atteso:**
- **Neutral:** ~60-70% giorni (normale)
- **Stealth QE:** ~15-20% giorni (eventi significativi)
- **QT:** ~5-10% giorni (contrazione)
- **QE:** 0-5% giorni (raro, solo eventi Fed grandi)

**❌ Se vedi:**
- Stealth QE > 40% → soglie ancora troppo basse
- Neutral > 85% → soglie troppo alte

---

### 3. 📝 **AGGIORNA DOCUMENTAZIONE** (15 minuti)

**File:** `README.md`

**Sezione da aggiornare:** "🎯 Scenari Rilevati"

**Contenuto nuovo:**

```markdown
## 🎯 Scenari Rilevati

Il sistema utilizza **analisi delta-based (4 settimane)** per identificare cambiamenti significativi:

### 🟢 **QE (Quantitative Easing)**
**Soglie:** `Δ Bilancio Fed > +$50B` AND `Δ Riserve > +$50B` (in 4 settimane)
- Espansione aggressiva coordinata
- Fed pompa liquidità massivamente
- Storicamente molto bullish per asset rischiosi

### 🟡 **Stealth QE (Espansione Nascosta)**
**Soglie:** Una delle seguenti:
- `Δ RRP < -$80B` AND `Δ Riserve ≥ -$30B` (rotazione liquidità)
- `Δ Riserve > +$50B` AND `Δ Bilancio > -$30B` (crescita riserve)
- `Δ Bilancio > +$80B` AND `Δ RRP < -$40B` (espansione con drain)

La Fed inietta liquidità senza annunci ufficiali. Tipicamente positivo per mercati.

### 🔴 **QT (Quantitative Tightening)**
**Soglie:** `Δ Bilancio Fed < -$50B` OR `Δ Riserve < -$80B` (in 4 settimane)
- Contrazione liquidità significativa
- Fed drena soldi dal sistema
- Storicamente negativo per asset rischiosi

### ⚪ **Neutral (Equilibrio)**
Nessuna delle condizioni sopra si verifica. Fed in modalità mantenimento.

---

**⚠️ NOTE IMPORTANTI:**
- **I primi 28 giorni** dello storico sono sempre "Neutral" (mancano dati per delta)
- **Dollar Index (DXY):** Calcolato da tassi FX FRED, non è il DXY ICE ufficiale (correlazione ~0.90)
- **Soglie:** Calibrate su dati 2021-2025, possono richiedere aggiustamenti in regimi Fed diversi
```

---

## 🎯 PRIORITÀ P1 - DA FARE QUESTA SETTIMANA

### 4. 🟡 **DISCLAIMER DXY NELLA UI** (10 minuti)

**File:** `src/lib/metricDescriptions.ts`

**Modifica riga 33:**

```typescript
// PRIMA
"Dollar Index": "Indice forza dollaro USA vs basket valute. >105 = dollaro forte..."

// DOPO
"DXY Proxy (FRED)": "Approssimazione DXY ICE calcolata da tassi FX FRED. Correlazione ~0.90 con DXY futures ufficiale. Range tipico: 90-110. Per trading professionale usare DXY futures ICE (ticker: DXY)."
```

---

### 5. ⚙️ **CENTRALIZZA COSTANTI** (10 minuti)

**Obiettivo:** Evitare soglie duplicate nel codice.

**Nuovo file:** `src/lib/constants.ts`

```typescript
/**
 * Soglie scenari Fed - Calibrate su data 2021-2025
 * Fonte: Analisi empirica dati FRED + Fed papers
 */
export const SCENARIO_THRESHOLDS = {
  // QE Aggressivo (coordinato)
  QE_BALANCE_SHEET_4W: 50000,    // $50B in millions
  QE_RESERVES_4W: 50,             // $50B
  
  // Stealth QE (rotazione liquidità)
  STEALTH_RRP_DRAIN_4W: -80,      // -$80B
  STEALTH_RESERVES_MIN_4W: -30,   // -$30B
  STEALTH_RESERVES_GROWTH_4W: 50, // +$50B
  STEALTH_BS_MIN_4W: -30000,      // -$30B in millions
  STEALTH_BS_GROWTH_4W: 80000,    // +$80B in millions
  STEALTH_RRP_DRAIN_ALT_4W: -40,  // -$40B
  
  // QT (contrazione)
  QT_BALANCE_SHEET_4W: -50000,    // -$50B in millions
  QT_RESERVES_4W: -80,            // -$80B
  
  // Qualificatori scenario
  VIX_STRESS: 22,
  HY_OAS_STRESS: 5.5,
  DXY_DELTA_STRESS_4W: 0.5,
  SOFR_IORB_STRESS_BPS: 0.15,
} as const;

/**
 * Descrizioni soglie per audit trail
 */
export const THRESHOLD_RATIONALE = {
  QE_BALANCE_SHEET_4W: 
    "Espansione $50B in 4w = ~$650B annualizzato, soglia Fed intervention significativo",
  STEALTH_RRP_DRAIN_4W: 
    "RRP drain -$80B in 4w filtra rumore normale (2024-2025 avg ~-$30B/month)",
  // ...
} as const;
```

**Poi aggiorna:**
- `supabase/functions/fetch-fed-data/index.ts` → importa costanti
- `src/utils/scenarioEngine.ts` → importa costanti

---

## 🎯 CHECKLIST DEPLOYMENT

Dopo aver completato i fix sopra:

```bash
# 1. Test locale Edge Function
cd /Users/giovannimarascio/Desktop/Quantitaizer
supabase functions serve fetch-fed-data

# 2. Test manuale
curl -X POST http://localhost:54321/functions/v1/fetch-fed-data \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# 3. Verifica log
# Cerca "🎯 Checking Scenario Conditions" nei log
# Verifica che le soglie nuove siano usate

# 4. Deploy su Supabase
supabase functions deploy fetch-fed-data

# 5. Trigger refresh su UI
# Vai su https://www.quantitaizeralm.com/
# Clicca "Aggiorna"
# Verifica scenario rilevato

# 6. Query verifica DB
psql "YOUR_DB_URL" -c "
  SELECT scenario, COUNT(*) 
  FROM fed_data 
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY scenario;
"
```

---

## 📊 EXPECTED RESULTS

**PRIMA del fix:**
```
Scenario Distribution (ultimi 30 giorni):
- stealth_qe: 28 giorni (93%)  ← PROBLEMA
- neutral: 2 giorni (7%)
```

**DOPO il fix:**
```
Scenario Distribution (ultimi 30 giorni):
- neutral: 20 giorni (67%)     ← OK
- stealth_qe: 6 giorni (20%)   ← OK
- qt: 4 giorni (13%)           ← OK
```

---

## 🆘 TROUBLESHOOTING

### **Scenario ancora non cambia dopo deploy**

1. **Ricalcola scenari storici:**
```sql
-- Force recalculation ultimi 90 giorni
UPDATE fed_data 
SET scenario = NULL, 
    context = NULL, 
    risk_level = NULL
WHERE date >= CURRENT_DATE - INTERVAL '90 days';
```

2. **Trigger refresh:**
```bash
# Via Supabase Dashboard > Functions > fetch-fed-data
# Invoke function manualmente
```

### **Edge function timeout**

Aumenta timeout in `supabase/config.toml`:
```toml
[functions.fetch-fed-data]
verify_jwt = false
timeout = 120  # da 60 a 120 secondi
```

### **Delta 4w ancora null**

Verifica che ci siano almeno 28 giorni di storico:
```sql
SELECT COUNT(*) FROM fed_data WHERE date >= CURRENT_DATE - INTERVAL '28 days';
-- Deve essere >= 28
```

---

## ✅ DEFINITION OF DONE

Questi fix sono COMPLETATI quando:

1. ✅ Edge Function deployata con nuove soglie
2. ✅ Backtest SQL mostra distribuzione scenari ragionevole (Neutral ~60-70%)
3. ✅ README aggiornato con soglie documentate
4. ✅ UI mostra disclaimer DXY corretto
5. ✅ Scenario "stealth_qe" presente solo in giorni con eventi reali Fed

---

**⏱️ TEMPO TOTALE STIMATO:** ~1.5 ore

**🎯 IMPATTO:** Sistema passa da "scenari inutili" a "actionable per trading reale"

**🔥 START NOW!**

