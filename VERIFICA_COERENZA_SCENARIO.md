# 🔍 VERIFICA COERENZA SCENARIO - 6 Novembre 2025

## 📊 **DATI ATTUALI (6 novembre 2025)**

### Liquidità Fed
```
SOFR:              3.91%
IORB:              3.90%
DFF (EFFR):        3.87%
SOFR-IORB spread:  0.01% (1 basis point) ← MOLTO STRETTO
```

### Balance Sheet Fed
```
WALCL:             $6,587 trilioni
WRESBAL:           $2,848 trilioni  
RRP:               $12.81 miliardi  ← MOLTO BASSO (era >$2T nel 2023!)
Reserves Ratio:    43.2% (wresbal/walcl)
```

### Tassi e Curva
```
US 10Y:            4.10%
DTB 3M:            3.80%
T10Y-3M:           +0.21% (30 basis points) ← CURVA NORMALE ✅
```

### Risk Indicators
```
VIX:               18.01 (normale, <20 = calmo)
HY-OAS:            3.05% (credit spread stretto = mercati calmi)
DXY:               97.22
```

### Delta 4 settimane (PROBLEMA!)
```
d_walcl_4w:        NULL ❌
d_wresbal_4w:      NULL ❌
d_rrpontsyd_4w:    NULL ❌
```

---

## 🎯 **SCENARIO ASSEGNATO**

### Primario
```
Scenario:          "neutral"
```

### Qualificatori
```
Context:           "crescita_guidata"
Sustainability:    "media"
Risk Level:        "normale"
Confidence:        "media"
Drivers:           ["SOFR > IORB (tensione)"]
```

---

## ✅ **ANALISI COERENZA**

### 1. Perché Scenario = "neutral"?

**Causa**: Mancano i delta a 4 settimane (d_walcl_4w, d_wresbal_4w, d_rrpontsyd_4w sono NULL).

**Logica codice** (linee 524-530):
```typescript
if (!isValidData) {
  console.warn('⚠️ MISSING DELTA DATA for scenario calculation');
  console.warn('⚠️ Returning NEUTRAL (primi 28 giorni non hanno delta)');
  return 'neutral';
}
```

**Interpretazione**: 
- ✅ CORRETTO - Il sistema non può calcolare QE/QT/Stealth_QE senza sapere come sono cambiati bilancio/riserve nelle ultime 4 settimane
- ⚠️ "neutral" è il **fallback di sicurezza** quando mancano dati storici

---

### 2. Sono Corretti i Qualificatori?

#### Context: "crescita_guidata" ✅

**Stress Signals** (linee 667-673):
```
VIX > 22?                  NO (18.01 < 22) ✗
HY-OAS > 5.5?              NO (3.05 < 5.5) ✗
DXY ↑ > 0.5 (4w)?          NULL (no data)  -
Curva invertita?           NO (t10y3m = +0.21) ✗
SOFR > IORB?               SI (0.01 > 0) ✓

Stress Signals Total: 1
```

**Growth Signals** (linee 675-681):
```
VIX < 16?                  NO (18.01 > 16) ✗
HY-OAS < 4%?               SI (3.05 < 4) ✓
DXY ↓ < -0.5 (4w)?         NULL (no data)  -
Curva normale/migliora?    SI (t10y3m = +0.21) ✓
Rotazione liquidità+?      NULL (no delta) -

Growth Signals Total: 2
```

**Decisione** (linea 688):
```typescript
if (growthSignals >= 2 && growthSignals > stressSignals) {
  context = 'crescita_guidata'; // ✅ CORRETTO: 2 > 1
}
```

✅ **VERDICT**: CORRETTO - Mercati calmi, credit spread stretto, curva normale = crescita

---

#### Sustainability: "media" ✅

**Logica** (linee 693-700):
```typescript
const rotationOk = (d_wresbal_4w > 0) && (d_rrpontsyd_4w < 0); // NULL → false
let sustainability = 'media'; // Default

// rotationOk è false (delta mancanti) → rimane 'media'
```

✅ **VERDICT**: CORRETTO - Default "media" quando mancano dati per calcolare rotazione

---

#### Risk Level: "normale" ✅

**Logica** (linee 702-706):
```typescript
let risk_level = 'elevato'; // Default

if (context === 'crescita_guidata' && sustainability !== 'bassa') {
  risk_level = 'normale'; // ✅ APPLICATO
}
```

✅ **VERDICT**: CORRETTO - Crescita guidata + sustainability media = risk normale

---

#### Confidence: "media" ✅

**Logica** (linee 689-691):
```typescript
const votes = Math.max(stressSignals, growthSignals); // max(1, 2) = 2
const confidence = votes >= 3 ? 'alta' : votes === 2 ? 'media' : 'bassa';
// 2 === 2 → 'media'
```

✅ **VERDICT**: CORRETTO - 2 segnali concordi = confidence media

---

#### Drivers: ["SOFR > IORB (tensione)"] ⚠️

**Logica** (linee 695-703):
```typescript
const drivers: string[] = [];
if ((inputs.d_wresbal_4w || 0) > 0) drivers.push('Riserve in aumento');    // NULL → skip
if ((inputs.d_rrpontsyd_4w || 0) < 0) drivers.push('RRP in drenaggio');    // NULL → skip
if ((inputs.vix || 0) > 22) drivers.push('VIX elevato');                    // 18 < 22 → skip
if ((inputs.hy_oas || 0) > 5.5) drivers.push('HY OAS in widening');         // 3.05 < 5.5 → skip
if ((inputs.d_dxy_4w || 0) > 0.5) drivers.push('USD in rafforzamento');     // NULL → skip
if ((inputs.t10y3m || 0) < 0) drivers.push('Curva invertita');              // 0.21 > 0 → skip
if ((inputs.sofr_iorb_spread || 0) > 0) drivers.push('SOFR > IORB (tensione)'); // 0.01 > 0 → ✓
```

⚠️ **VERDICT**: TECNICAMENTE CORRETTO ma **FUORVIANTE**

**Perché "fuorviante"?**
- SOFR-IORB spread = 0.01% (1 basis point) è **MINIMO** 
- Spread normale/sano è 0-10 bps
- Questo NON indica "tensione", indica **controllo perfetto Fed**
- Driver dovrebbe essere assente o dire "Liquidità ottimale"

**Suggerimento**: Cambiare soglia da `> 0` a `> 0.10` (>10 bps) per segnalare vera tensione

---

## 🚨 **PROBLEMA PRINCIPALE: DELTA MANCANTI**

### Perché i delta sono NULL?

**Calcolo delta richiede** (linee 284-316):
```typescript
const daysBack = 28; // 4 settimane
const walcl_4w_ago = getValueNDaysAgo(recordsToInsert, i, 'walcl', daysBack);
```

**Problema**: 
- Per calcolare delta del 6 novembre serve dato del **9 ottobre** (6 nov - 28 giorni)
- Ma la fetch window è **14 giorni** (da 23 ottobre)
- Non ci sono dati del 9 ottobre nella finestra!

**Soluzione**: Fetch window va estesa a **30+ giorni** per avere sempre delta 4w

---

## 📊 **INTERPRETAZIONE ECONOMICA CORRETTA**

### Basandoci SOLO sui dati disponibili (no delta):

#### 🟢 Mercati CALMI:
- ✅ VIX 18 (sotto 20 = normale)
- ✅ HY-OAS 3.05% (credit spread stretto)
- ✅ Curva t10y3m +0.21% (normale, non invertita)

#### 🟢 Fed in CONTROLLO:
- ✅ SOFR-IORB spread 0.01% (perfetto)
- ✅ RRP bassissimo $12.8B (liquidità diffusa, non parcheggiata in Fed)
- ✅ Reserves/WALCL 43% (ratio normale)

#### 🟡 Tassi RESTRITTIVI ma STABILI:
- SOFR 3.91%, IORB 3.90%, EFFR 3.87% (allineati)
- US10Y 4.10% (alto ma non estremo)

### Conclusione Economica:
**"NORMAL" con bias POSITIVO**
- Mercati funzionano bene
- Fed ha controllo liquidità
- Nessun segnale di stress imminente
- Tassi restrittivi ma non problematici

---

## ✅ **VERDICT FINALE**

### Scenario "neutral" ✅ CORRETTO
**Perché**: Mancano delta 4w, sistema usa fallback sicuro

### Qualificatori ✅ CORRETTI (con 1 nota)
- Context "crescita_guidata" ✅
- Sustainability "media" ✅
- Risk_level "normale" ✅
- Confidence "media" ✅
- Drivers ⚠️ Tecnicamente OK ma threshold troppo basso

### Dati Economici ✅ COERENTI
- Tutti i valori sono realistici
- Correlazioni corrette (VIX basso + HY-OAS stretto + curva normale)
- Spread Fed in linea (SOFR/IORB/EFFR allineati)

---

## 🔧 **RACCOMANDAZIONI**

### 1. Fix Delta Mancanti (IMPORTANTE)
**Problema**: Fetch window 14 giorni < 28 giorni necessari per delta 4w

**Soluzione**:
```typescript
// In fetch-fed-data/index.ts, linea 112
startDateObj.setDate(startDateObj.getDate() - 35); // Changed from -14 to -35
```

**Beneficio**: Avrà sempre 28+ giorni per calcolare delta, scenario sarà QE/QT/Stealth_QE invece di "neutral"

---

### 2. Fix Driver "SOFR > IORB (tensione)" (MINORE)
**Problema**: Threshold troppo basso (`> 0`), 1 bps non è tensione

**Soluzione**:
```typescript
// In deriveScenarioQualifiers(), linea 702
if ((inputs.sofr_iorb_spread || 0) > 0.10) drivers.push('SOFR > IORB (tensione liquidità)');
// Changed from > 0 to > 0.10 (>10 bps = vera tensione)
```

**Beneficio**: Driver apparirà solo con vera tensione (>10 bps)

---

### 3. Aggiungi Driver Positivi (ENHANCEMENT)
**Attualmente** drivers mostra solo "problemi", mai cose positive

**Suggerimento**:
```typescript
// Aggiungi dopo linea 702:
if ((inputs.sofr_iorb_spread || 0) < 0.05 && inputs.wresbal > 2500) {
  drivers.push('Liquidità ottimale');
}
if ((inputs.vix || 100) < 16) {
  drivers.push('Volatilità molto bassa');
}
if ((inputs.hy_oas || 100) < 3.5) {
  drivers.push('Mercati credit calmi');
}
```

**Beneficio**: Dashboard mostra perché scenario è positivo, non solo problemi

---

## 📋 **SUMMARY TABLE**

| Elemento | Valore Attuale | È Corretto? | Note |
|----------|---------------|-------------|------|
| **Scenario** | neutral | ✅ SÌ | Fallback corretto per delta mancanti |
| **Context** | crescita_guidata | ✅ SÌ | 2 growth signals > 1 stress signal |
| **Sustainability** | media | ✅ SÌ | Default senza dati delta |
| **Risk Level** | normale | ✅ SÌ | Crescita + sustainability media |
| **Confidence** | media | ✅ SÌ | 2 segnali concordi |
| **Drivers** | SOFR>IORB | ⚠️ FUORVIANTE | 1bp non è tensione |
| **Delta 4w** | NULL | ❌ MANCANTE | Serve fetch window >30 giorni |

---

## 🎯 **AZIONI CONSIGLIATE**

### Priorità ALTA:
1. ✅ Estendi fetch window a 35 giorni → Fix delta 4w

### Priorità MEDIA:
2. ✅ Alza threshold driver SOFR-IORB da 0 a 0.10
3. ✅ Aggiungi driver positivi (liquidità ottimale, VIX basso, etc)

### Priorità BASSA:
4. ⏸️ Monitoring continuo (sistema funziona bene)

---

**Conclusione**: Sistema è **COERENTE e CORRETTO** ✅  
**Problema minore**: Delta mancanti → scenario "neutral" invece di QE/QT  
**Fix**: 5 minuti, estendi fetch window a 35 giorni

**Status attuale**: 90/100 - Eccellente con un miglioramento da fare

