# 🔍 ANALISI SOGLIE SCENARI - Calibrazione

## 📊 **SOGLIE ATTUALI**

### QE (Quantitative Easing)
```typescript
d_walcl_4w > +50,000 M (+$50B)  AND  d_wresbal_4w > +50 B (+$50B)
```
**Entrambe le condizioni devono essere vere**

### Stealth QE (Rotazione Liquidità)
```typescript
OPTION 1: d_rrpontsyd_4w < -30 B (-$30B)  AND  d_wresbal_4w >= -20 B
OPTION 2: d_wresbal_4w > +20 B (+$20B)  AND  d_walcl_4w > -20,000 M (-$20B)
OPTION 3: d_walcl_4w > +30,000 M (+$30B)  AND  d_rrpontsyd_4w < -20 B (-$20B)
```
**Almeno una condizione deve essere vera**

### QT (Quantitative Tightening)
```typescript
d_walcl_4w < -50,000 M (-$50B)  OR  d_wresbal_4w < -80 B (-$80B)
```
**Almeno una condizione deve essere vera**

### Neutral
```
Tutto il resto (default)
```

---

## 🎯 **VERIFICA COERENZA CON DATI REALI**

### Caso Attuale (6 Nov 2025)
```
d_walcl_4w: -3,781 M (-$3.8B)
d_wresbal_4w: -150.45 B (-$150.5B) ← QT TRIGGER!
d_rrpontsyd_4w: +8.32 B

Scenario Assegnato: QT ✅
Trigger: d_wresbal_4w (-150.45) < -80 ✅
```

**Analisi**:
- ✅ CORRETTO: Riserve calate di $150B in 4 settimane è contrazione significativa
- ✅ Balance sheet stabile (-$3.8B è trascurabile rispetto a $6.6T)
- ✅ RRP lieve aumento (+$8B) non compensa calo riserve

---

## 📈 **CONTESTO STORICO PER CALIBRAZIONE**

### COVID QE (Mar-Giu 2020)
```
Balance Sheet: +$2,500B in 3 mesi = +$833B/mese = +$200B/4settimane
Riserve: +$1,800B in 3 mesi = +$600B/mese = +$145B/4settimane
```
**Nostra soglia QE**: +$50B in 4 settimane  
**Verdict**: ✅ CALIBRATA BENE - Cattura QE significativo ma non rumore

### QT Attuale (2022-2024)
```
Balance Sheet: -$100B/mese medio = -$25B/4settimane (runoff titoli)
Riserve: -$50-80B/mese medio = -$12-20B/4settimane
```
**Nostra soglia QT**: -$50B BS O -$80B Riserve  
**Verdict**: ⚠️ POTREBBE ESSERE TROPPO ALTA

**Problema**: QT normale della Fed (-$25B/4w BS, -$15B/4w riserve) NON triggera scenario "QT"

**Caso attuale**: Riserve -$150B/4w è **DOPPIO** del QT normale → Sicuramente QT ✅

### Stealth QE (2023 H1 - RRP Drainage)
```
RRP: Da $2,500B a $300B in 12 mesi = -$180B/mese = -$45B/4settimane
Riserve: +$200B in 12 mesi = +$16B/mese = +$4B/4settimane
```
**Nostra soglia Stealth QE**: RRP -$30B + Riserve >= -$20B  
**Verdict**: ✅ CALIBRATA BENE - Avrebbe catturato questo evento

---

## ⚠️ **PROBLEMI IDENTIFICATI**

### 1. Soglia QT Troppo Alta (CRITICO)

**Problema**:
```
QT Normale Fed: -$25B/4w BS, -$15B/4w Riserve
Nostra soglia: -$50B BS O -$80B Riserve
```

**Risultato**: QT "normale" della Fed NON viene rilevato, solo QT "aggressivo"

**Conseguenza**: 
- Sottostima QT in corso
- Utenti potrebbero non vedere QT quando è attivo ma moderato

**Fix Proposto**:
```typescript
// ATTUALE
const qtCondition = d_walcl_4w < -50000 || d_wresbal_4w < -80;

// PROPOSTO (più sensibile)
const qtCondition = d_walcl_4w < -25000 || d_wresbal_4w < -50;
```

**Razionale**:
- -$25B BS = pace normale QT Fed
- -$50B Riserve = contrazione significativa ma realistica

---

### 2. Soglia QE Appropriata ✅

**Analisi**:
```
QE COVID: +$200B/4w BS, +$145B/4w Riserve
Nostra soglia: +$50B BS AND +$50B Riserve
```

**Verdict**: ✅ BUONA
- Cattura QE significativo
- Evita falsi positivi da micro-movimenti
- Richiede **entrambe** BS e Riserve in espansione (corretto)

---

### 3. Soglia Stealth QE - Troppo Permissiva? ⚠️

**Opzione 2 Attuale**:
```typescript
d_wresbal_4w > +20 B  AND  d_walcl_4w > -20,000 M
```

**Problema**: Riserve +$20B con BS stabile triggera Stealth QE  
**Ma**: +$20B/4w = +$5B/settimana = fluctuation normale?

**Fix Proposto**:
```typescript
// Alza soglia da +20B a +30B per essere più conservativi
d_wresbal_4w > +30 B  AND  d_walcl_4w > -20,000 M
```

**Razionale**: +$30B/4w è crescita più significativa, evita rumore

---

## 🔧 **SOGLIE PROPOSTE (OTTIMIZZATE)**

### QE (NO CHANGE)
```typescript
d_walcl_4w > 50000  AND  d_wresbal_4w > 50
```
✅ MANTIENI - Ben calibrato

### Stealth QE (MINOR TWEAK)
```typescript
Option 1: d_rrpontsyd_4w < -30  AND  d_wresbal_4w >= -20  // OK
Option 2: d_wresbal_4w > 30  AND  d_walcl_4w > -20000     // ALZA da 20 a 30
Option 3: d_walcl_4w > 30000  AND  d_rrpontsyd_4w < -20  // OK
```
⚡ TWEAK - Riduci falsi positivi

### QT (IMPORTANT FIX)
```typescript
d_walcl_4w < -25000  OR  d_wresbal_4w < -50
```
🔴 FIX - Cattura QT normale Fed, non solo aggressivo

### Neutral
```
Default (tutto il resto)
```

---

## 📊 **TESTING RETROATTIVO**

### Con Soglie Attuali
```
6 Nov: QT (-150B riserve) → ✅ Corretto
5 Nov: QT (-150B riserve) → ✅ Corretto
2-4 Nov: Neutral (delta 0) → ✅ Corretto (primi giorni)
```

### Con Soglie Proposte (simulazione)
```
Se ci fosse stato QT normale (-$30B/4w riserve):
  Attuale: NEUTRAL ❌ (non triggera, -30 > -80)
  Proposto: QT ✅ (triggera, -30 < -50)

Se ci fosse stato Stealth QE (+$25B/4w riserve):
  Attuale: STEALTH_QE ✅ (triggera, 25 > 20)
  Proposto: NEUTRAL ✅ (non triggera, 25 < 30) - Evita rumore
```

---

## 🎯 **RACCOMANDAZIONI FINALI**

### PRIORITÀ ALTA
1. **Fix Soglia QT**: -50B → -25B BS, -80B → -50B Riserve
   - **Perché**: Cattura QT normale Fed, non solo eventi estremi
   - **Rischio**: LOW (migliora accuracy)
   - **Impact**: MEDIUM-HIGH (scenario più accurato)

### PRIORITÀ MEDIA
2. **Tweak Stealth QE Option 2**: +20B → +30B Riserve
   - **Perché**: Riduce falsi positivi da fluctuations normali
   - **Rischio**: LOW (più conservativo)
   - **Impact**: LOW-MEDIUM (più preciso)

### PRIORITÀ BASSA
3. **Monitorare QE Threshold**: OK per ora
   - **Quando**: Se Fed inizia QE graduale (non emergenza)
   - **Azione**: Considera abbassare a +$40B se necessario

---

## 📝 **IMPLEMENTAZIONE**

### Codice Fix QT Threshold
```typescript
// File: supabase/functions/fetch-fed-data/index.ts
// Linea: 586

// PRIMA (attuale)
const qtCondition = d_walcl_4w < -50000 || d_wresbal_4w < -80;

// DOPO (fix)
const qtCondition = d_walcl_4w < -25000 || d_wresbal_4w < -50;
```

### Codice Fix Stealth QE Option 2
```typescript
// File: supabase/functions/fetch-fed-data/index.ts
// Linea: 566

// PRIMA (attuale)
const reservesGrowthModerate = d_wresbal_4w > 20 && d_walcl_4w > -20000;

// DOPO (fix)
const reservesGrowthModerate = d_wresbal_4w > 30 && d_walcl_4w > -20000;
```

---

## ✅ **CONCLUSIONI**

### Soglie Attuali
```
QE: ✅ BUONE
Stealth QE: ⚠️ OK ma leggermente permissive
QT: 🔴 TROPPO ALTE - Miss QT normale
Neutral: ✅ OK (default)
```

### Con Fix Proposti
```
QE: ✅ OTTIME
Stealth QE: ✅ OTTIME
QT: ✅ OTTIME - Cattura anche QT normale
Neutral: ✅ OTTIMO (default)
```

### Caso Corrente (6 Nov)
```
PRIMA FIX: QT (-150B riserve) → ✅ Corretto (era già sotto -80)
DOPO FIX: QT (-150B riserve) → ✅ Ancora corretto (ancora sotto -50)
```

**Nessun impatto sul caso attuale** (riserve -150B triggera QT in entrambi i casi)  
**Ma catturerà QT moderati futuri** (-$30-50B/4w che prima erano "neutral")

---

## 🚀 **AZIONE CONSIGLIATA**

**APPLICA FIX PRIORITÀ ALTA SUBITO**:
1. ✅ QT Threshold: -80B → -50B Riserve, -50B → -25B BS
2. ⏸️ Stealth QE Tweak: +20B → +30B (opzionale, bassa priorità)

**Tempo**: 5 minuti  
**Rischio**: Minimo  
**Beneficio**: Scenario più accurato per QT moderati futuri

---

**Vuoi che applico i fix ora?**

