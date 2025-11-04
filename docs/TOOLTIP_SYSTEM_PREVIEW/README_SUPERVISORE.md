# 🎯 SISTEMA SPIEGAZIONI METRICHE - BOZZA PER REVIEW

**Data:** 4 Novembre 2025  
**Obiettivo:** Rendere dashboard accessibile a principianti senza AI gratuita  
**Metodo:** Sistema tooltip data-driven educativo

---

## 📋 **PROBLEMA ATTUALE**

Dashboard mostra **"muro di dati tecnici"** incomprensibili per utente medio:

```
Balance Sheet: $6.59T ↘️ 0.1B (4w)
SOFR-EFFR Spread: 0.4 bps
VIX: 17.44
HY OAS: 4.2%
RRP: $324B
Reserves: $3.4T
```

**Utente pensa:** *"WTF significa tutto questo?"* 😵‍💫

---

## ✅ **SOLUZIONE PROPOSTA**

Sistema spiegazioni a **3 livelli** progressivi:

### **LIVELLO 1: Visual (già presente)**
Numero + icona + colore
```
VIX: 17.4 🟡
```

### **LIVELLO 2: Tooltip Hover (DA AGGIUNGERE)**
Passa mouse su icona `(?)` → popup spiegazione 1 frase
```
[Hover su (?)]
→ "Indice di volatilità S&P 500 - misura paura mercato"
```

### **LIVELLO 3: Dialog Completo (DA AGGIUNGERE)**
Click su `(?)` → finestra popup con:
- Spiegazione dettagliata (cosa è, come funziona)
- Range di riferimento (es. VIX <14 = calmo, >22 = stress)
- Esempi storici (es. COVID VIX 82, Bull 2021 VIX 12)
- Cosa monitorare (es. spike rapido = red flag)

---

## 🎨 **MOCKUP VISIVO**

### **PRIMA (senza spiegazioni):**
```
┌─────────────────────────────────────┐
│  VIX (Fear Index)                   │
│  17.44                              │
│  Normal                             │
└─────────────────────────────────────┘
```
❌ Utente non sa cosa sia VIX, cosa significhi "Normal" con valore 17.4

---

### **DOPO (con tooltip system):**
```
┌─────────────────────────────────────┐
│  VIX (Fear Index) [?]  ← HOVER QUI  │
│  17.44                              │
│  Slightly Elevated                  │
└─────────────────────────────────────┘

[HOVER su ?]
┌─────────────────────────────────────────────┐
│ ℹ️ Indice di volatilità S&P 500 -          │
│   misura paura e incertezza del mercato    │
│                                             │
│ 💡 Click per dettagli completi             │
└─────────────────────────────────────────────┘

[CLICK su ?]
┌────────────────────────────────────────────────────────┐
│  ℹ️ VIX (Fear Index)                                   │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  SPIEGAZIONE DETTAGLIATA:                              │
│  Il VIX misura la volatilità attesa del mercato        │
│  S&P 500 nei prossimi 30 giorni. Viene chiamato        │
│  "Fear Index" perché sale quando investitori           │
│  comprano protezione (put options) per paura crolli.   │
│                                                         │
│  VIX BASSO = investitori tranquilli                    │
│  VIX ALTO = investitori spaventati                     │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  RANGE DI RIFERIMENTO:                                 │
│  🟢 < 14        Calmo (greed mode)                     │
│  🔵 14-16       Normale                                │
│  🟡 16-18       Leggermente Elevato (ATTUALE: 17.4)    │
│  🟠 18-22       Stress moderato                        │
│  🔴 22-25       Alto stress                            │
│  ⛔ > 25        Panic Mode                             │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  CONTESTO STORICO:                                     │
│  • COVID Mar 2020: VIX 82 (panic record)              │
│  • Crisi Lehman 2008: VIX 80                          │
│  • Bull market 2021: VIX 12 (euforia)                 │
│  • Media 10-year: VIX 15-16                           │
│  • Ora Nov 2025: VIX 17.4 (cauto normale)             │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  ⚠️ COSA MONITORARE:                                   │
│  Spike rapido (VIX +5 punti in 1-2 giorni) indica     │
│  evento stress acuto. VIX persistente >20 per          │
│  settimane = regime volatilità cambiato.               │
│                                                         │
│  ⚠️ Spiegazione educativa, non consulenza finanziaria │
└────────────────────────────────────────────────────────┘
```

✅ **Ora utente capisce:**
- Cos'è VIX
- Perché 17.4 è "leggermente elevato"
- Come interpretare in contesto storico
- Cosa guardare per capire se situazione peggiora

---

## 📊 **METRICHE COPERTE**

Sistema include spiegazioni complete per:

### **Metriche Principali (15 totali):**
1. ✅ Balance Sheet Fed
2. ✅ VIX (Fear Index)
3. ✅ SOFR-EFFR Spread
4. ✅ RRP (Reverse Repo)
5. ✅ Riserve Bancarie
6. ✅ HY OAS (High Yield Spread)

### **Badge Interpretativi:**
7. ✅ Livello Rischio
8. ✅ Sostenibilità Scenario
9. ✅ Confidenza Lettura

### **Scenari:**
10. ✅ Stealth QE
11. ✅ Quantitative Easing (QE)
12. ✅ Quantitative Tightening (QT)
13. ✅ Neutrale
14. ✅ Contrazione Aggressiva

---

## 🚀 **IMPLEMENTAZIONE**

### **Files da Creare:**
1. ✅ `src/utils/explanationEngine.ts` (già scritto - vedi allegato)
2. ✅ `src/components/ui/ExplanationTooltip.tsx` (già scritto - vedi allegato)

### **Files da Modificare:**
3. `src/components/ScenarioCard.tsx` (aggiungi tooltip a 12 punti)
4. `src/components/MetricsGrid.tsx` (se esiste)
5. `src/components/LiquidityMonitor.tsx` (se esiste)

### **Esempio Modifica (MINIMA):**

**PRIMA:**
```tsx
<div className="text-xs text-slate-400 uppercase">
  Balance Sheet
</div>
```

**DOPO:**
```tsx
<div className="text-xs text-slate-400 uppercase flex items-center gap-2">
  Balance Sheet
  <ExplanationTooltip metricKey="balance_sheet" mode="full" size="sm" />
</div>
```

**Tempo stimato:** 45 minuti per integrare tutto

---

## 💡 **VANTAGGI vs AI GRATUITA**

| Aspetto | ❌ AI Gratuita (GPT-4o-mini) | ✅ Sistema Data-Driven |
|---------|------------------------------|------------------------|
| **Costo** | $0.03/1K tokens (~$20/mese con traffico) | $0 sempre |
| **Latency** | 2-5 secondi wait | <50ms istantaneo |
| **Affidabilità** | Può inventare (hallucination) | 100% accurato |
| **Compliance** | Risk dare financial advice | Solo fatti, mai advice |
| **Controllo** | Black box, non controllabile | Tu scrivi ogni parola |
| **Scalability** | Rate limits (10-100 req/min) | Infinito |
| **Privacy** | Dati mandati a OpenAI | Tutto client-side |
| **Manutenzione** | Dipendi da API esterna | Zero dipendenze |

---

## 📝 **TONO SPIEGAZIONI**

### **Caratteristiche:**
- ✅ **Educativo** (spiega cosa è)
- ✅ **Oggettivo** (solo fatti, zero opinioni)
- ✅ **Contestuale** (esempi storici reali)
- ✅ **Italiano puro** (zero inglese tecnico)
- ✅ **Compliance-safe** (no financial advice)

### **Esempio Tono:**

❌ **SBAGLIATO (prescrittivo):**
> "Con VIX 17.4 dovresti ridurre equity del 10% e comprare Treasury."

✅ **CORRETTO (educativo):**
> "VIX 17.4 si trova nel range 16-18 ('Leggermente Elevato'), che storicamente indica nervosismo moderato del mercato. Durante fasi simili nel passato (es. 2018-2019), il VIX oscillava in questo range prima di stabilizzarsi sotto 16 o salire sopra 20. Monitora se VIX supera 18: spike oltre questa soglia tendono ad accelerare."

---

## ⚙️ **MODALITÀ TOOLTIP**

Sistema supporta 2 modalità:

### **1. FULL Mode (metriche principali):**
- Tooltip hover con spiegazione breve
- Click apre dialog con spiegazione completa
- **Usare per:** Hero metrics (VIX, Balance Sheet, SOFR-EFFR)

### **2. MINIMAL Mode (metriche secondarie):**
- Solo tooltip hover con spiegazione breve
- No dialog cliccabile
- **Usare per:** Indicatori tecnici in lista (RRP, Reserves, HY OAS)

---

## 🎯 **USER FLOW PREVISTO**

### **Principiante:**
1. Vede dashboard piena di numeri tecnici
2. Nota icone `(?)` accanto a ogni metrica
3. Passa mouse → legge spiegazione breve
4. Click → legge spiegazione completa con esempi
5. **CAPISCE** cosa sta guardando e perché importa

### **Esperto:**
1. Vede dashboard
2. Ignora icone `(?)`
3. Legge solo dati tecnici come prima
4. **Zero friction** per utente avanzato

---

## 📱 **RESPONSIVE**

Sistema funziona su:
- ✅ Desktop (dialog full-size)
- ✅ Tablet (dialog scrollable)
- ✅ Mobile (dialog full-screen)

Tooltip si adattano automaticamente (Radix UI tooltip component).

---

## 🔒 **COMPLIANCE LEGALE**

**OGNI spiegazione include disclaimer:**
> ⚠️ Questa è una spiegazione educativa basata su dati storici e contesto macroeconomico. Non costituisce consulenza finanziaria o raccomandazione di investimento.

**Tutte le spiegazioni:**
- ❌ NO percentuali specifiche ("compra 20%")
- ❌ NO timing ("compra ora")
- ❌ NO raccomandazioni dirette ("dovresti")
- ✅ SÌ spiegazioni oggettive ("questo significa")
- ✅ SÌ contesto storico ("nel passato è accaduto")
- ✅ SÌ cosa monitorare ("osserva se X supera Y")

**Tool educativo puro, non sala segnali.**

---

## 📦 **DELIVERABLE**

Se approvi, procedo con:

### **FASE 1 (30 min):**
1. ✅ Crea `explanationEngine.ts` (già pronto)
2. ✅ Crea `ExplanationTooltip.tsx` (già pronto)
3. Integra nei 3 hero metrics di ScenarioCard

### **FASE 2 (20 min):**
4. Integra nei 6 indicatori tecnici
5. Integra nei 3 badge (Rischio/Sostenibilità/Confidenza)

### **FASE 3 (15 min - opzionale):**
6. Aggiungi toggle "Modalità Principiante" nel header
7. Deploy

**Tempo totale:** 45-65 minuti  
**Testing:** Build + visual check  
**Commit:** Singolo commit con feature completa

---

## ❓ **DECISIONI DA PRENDERE**

1. **Tono spiegazioni:** Va bene così? (casual ma professionale)
2. **Esempi storici:** Sempre includere COVID/2008? O solo quando rilevante?
3. **Toggle principiante:** Necessario o sempre-on?
4. **Mobile:** Dialog full-screen ok o preferisci bottom-sheet?

---

## 🚦 **PROSSIMO STEP**

**SE APPROVI:**
→ Rispondo "vai" e in 45 minuti hai sistema completo testato e committato

**SE MODIFICHE:**
→ Dimmi cosa cambiare e aggiusto bozza

**SE NON APPROVI:**
→ Propongo alternativa o discutiamo AI approach

---

## 📎 **FILES ALLEGATI**

1. `explanationEngine.ts` - Dictionary completo 15 metriche
2. `ExplanationTooltip.tsx` - Component riusabile
3. `ESEMPIO_INTEGRAZIONE.tsx` - Before/After comparison

**Codice è PRONTO.** Basta copia-incolla e integrazione.

---

**Attendo feedback supervisore.** 🚀

