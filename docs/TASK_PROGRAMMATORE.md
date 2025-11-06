# 🎯 TASK: Integrare Dati Real-Time per VIX e DXY

**Priorità:** ALTA  
**Tempo stimato:** 1 ora  
**Costo:** $10/mese  
**Difficoltà:** ⭐⭐ Media

---

## 🔴 PROBLEMA

Il VIX e DXY sono lenti (ritardo 1-2 giorni) perché prendiamo da FRED API che aggiorna lentamente i dati di mercato.

**Esempio oggi (6 novembre):**
```
Database:  VIX = 18.01 (dato del 4 novembre)
Realtà:    VIX ≈ 20    (dato live)
Gap:       ~2 giorni di ritardo
```

Questo rende gli scenari e i segnali imprecisi per gli utenti.

---

## ✅ SOLUZIONE

Usare **Marketdata.app** per VIX e DXY in tempo reale (aggiornamento <5 minuti).

**Cosa succede:**
- FRED continua a dare dati Fed (SOFR, WALCL, etc.) → OK lento
- Marketdata.app da VIX e DXY → VELOCE
- Edge Function combina i due e salva in database

---

## 📋 COSA FARE

### **STEP 1: Crea Account Marketdata (5 min)**

1. Vai su: https://www.marketdata.app/pricing/
2. Registrati
3. Scegli piano: **Paid ($10/mese)** ← necessario per production
4. Copia il **token API** che ti danno

---

### **STEP 2: Salva Token in Supabase (2 min)**

1. Apri Supabase Dashboard → SQL Editor
2. Esegui questo comando:

```sql
SELECT vault.create_secret('MARKETDATA_API_KEY', 'IL_TUO_TOKEN_QUI');
```

*Sostituisci `IL_TUO_TOKEN_QUI` con il token di Marketdata*

---

### **STEP 3: Modifica Edge Function (20 min)**

**File da modificare:** `supabase/functions/fetch-fed-data/index.ts`

#### **3A) Aggiungi import in cima al file (dopo line 1)**

```typescript
import { fetchRealtimeHybrid, validateRealtimeData } from './realtime-integrations.ts';
```

#### **3B) Aggiungi API key (dopo line 71, dove ci sono le altre keys)**

```typescript
const marketdataKey = Deno.env.get('MARKETDATA_API_KEY') || '';
```

#### **3C) Fetch real-time data (dopo line 119, prima del loop FRED)**

```typescript
// === FETCH REAL-TIME MARKET DATA ===
console.log('\n🌐 Fetching real-time market data...');
const realtimeMarket = await fetchRealtimeHybrid(marketdataKey);
```

#### **3D) Override VIX e DXY (circa line 400, dentro il loop delle date)**

**CERCA questo blocco:**
```typescript
const input = {
  date,
  sofr: transformedData[date]?.sofr ?? null,
  iorb: transformedData[date]?.iorb ?? null,
  // ... altre righe ...
  vix: transformedData[date]?.vix ?? null,
  // ...
  dxy_broad: transformedData[date]?.dxy_broad ?? null,
  // ...
};
```

**SOSTITUISCI le righe vix e dxy_broad con:**
```typescript
const input = {
  date,
  sofr: transformedData[date]?.sofr ?? null,
  iorb: transformedData[date]?.iorb ?? null,
  // ... altre righe immutate ...
  
  // VIX: usa real-time se disponibile per oggi, altrimenti FRED
  vix: (date === endDate && realtimeMarket.vix !== null) 
       ? realtimeMarket.vix 
       : (transformedData[date]?.vix ?? null),
  
  // ... altre righe immutate ...
  
  // DXY: usa real-time se disponibile per oggi, altrimenti FRED
  dxy_broad: (date === endDate && realtimeMarket.dxy !== null) 
             ? realtimeMarket.dxy 
             : (transformedData[date]?.dxy_broad ?? null),
  
  // ... altre righe immutate ...
};

// Log per debug (opzionale ma utile)
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

### **STEP 4: Deploy (5 min)**

```bash
cd /Users/giovannimarascio/Desktop/Quantitaizer

npx supabase functions deploy fetch-fed-data \
  --project-ref tolaojeqjcoskegelule \
  --no-verify-jwt
```

---

### **STEP 5: Test Immediato (5 min)**

**5A) Triggera aggiornamento manuale:**

```bash
curl -X POST "https://tolaojeqjcoskegelule.supabase.co/functions/v1/fetch-fed-data" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjUzOSwiZXhwIjoyMDc3NTg4NTM5fQ.Y0xWNiSR3mTDxhN566I-cgloiQazBwg0HoFpDJT0_HE" \
  -d '{"triggered_by": "test_realtime_integration"}'
```

**5B) Controlla database:**

```bash
curl -s "https://tolaojeqjcoskegelule.supabase.co/rest/v1/fed_data?select=date,vix,dxy_broad&order=date.desc&limit=1" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTI1MzksImV4cCI6MjA3NzU4ODUzOX0.8iJ8SHDG5Ffdu5X8ZF6-QSiyIz9iTXKm8uaLXQt_2OI" | jq '.'
```

**Risultato atteso:**
```json
[
  {
    "date": "2025-11-06",
    "vix": 19.85,        ← Aggiornato! (era 18.01)
    "dxy_broad": 104.25  ← Aggiornato! (era 97.22)
  }
]
```

**5C) Controlla i log:**

```bash
npx supabase functions logs fetch-fed-data --project-ref tolaojeqjcoskegelule
```

**Cerca queste righe:**
```
✅ VIX real-time: 19.85 (Marketdata)
✅ DXY real-time: 104.25 (Marketdata)
🔥 VIX OVERRIDE: 19.85 (real-time) vs 18.01 (FRED)
🔥 DXY OVERRIDE: 104.25 (real-time) vs 97.22 (FRED)
```

Se vedi questi log → **tutto OK!** ✅

---

## 📊 RISULTATO FINALE

### **Prima:**
- VIX aggiornato ogni 1-2 giorni (lento)
- DXY aggiornato ogni 1-2 giorni (lento)
- Scenari basati su dati vecchi

### **Dopo:**
- VIX aggiornato ogni 5 minuti (veloce)
- DXY aggiornato ogni 5 minuti (veloce)
- Scenari precisi e real-time
- Costo: $10/mese
- Zero cambiamenti su frontend/database

---

## 🆘 SE QUALCOSA NON FUNZIONA

### **Problema: "Cannot find module realtime-integrations"**
**Soluzione:** Copia il file `realtime-integrations.ts` nella stessa cartella di `index.ts`:
```bash
cp realtime-integrations.ts supabase/functions/fetch-fed-data/
```

### **Problema: VIX/DXY rimangono vecchi dopo deploy**
**Checklist:**
1. Token Marketdata salvato correttamente in Vault? → Ri-esegui SQL
2. Deployed? → Ri-esegui deploy command
3. Triggato fetch manuale? → Ri-esegui curl POST

### **Problema: Log dice "Marketdata API key missing"**
**Soluzione:** Il vault secret non è accessibile. Verifica:
```sql
SELECT * FROM vault.secrets WHERE name = 'MARKETDATA_API_KEY';
```
Se vuoto, ri-esegui il `vault.create_secret()`.

---

## 📁 FILE DA USARE

**Hai già tutto in:**
```
docs/PIANO_REALTIME_DATA.md                        ← Documentazione completa
supabase/functions/fetch-fed-data/
├── index.ts                                       ← DA MODIFICARE (step 3)
└── realtime-integrations.ts                       ← GIÀ PRONTO (non toccare)
```

---

## ✅ CHECKLIST FINALE

Prima di chiudere, verifica:

- [ ] Account Marketdata creato e piano Paid ($10/mo) attivo
- [ ] Token salvato in Supabase Vault
- [ ] File `realtime-integrations.ts` copiato nella dir corretta
- [ ] `index.ts` modificato (import + 3 punti)
- [ ] Deploy eseguito con successo
- [ ] Test manuale eseguito
- [ ] Database mostra VIX/DXY aggiornati
- [ ] Log mostrano "VIX OVERRIDE" e "DXY OVERRIDE"
- [ ] Frontend mostra dati corretti (controlla dashboard)

---

## 🎯 DOMANDE FREQUENTI

**Q: Posso usare il piano Free di Marketdata?**  
A: No, Free ha limite 100 req/day. Noi facciamo 8 req/day (VIX+DXY × 4 cron) ma serve margine. Usa Paid.

**Q: Cosa succede se Marketdata va down?**  
A: Usa automaticamente FRED come fallback. Sistema resiliente.

**Q: FRED smette di funzionare per gli altri dati?**  
A: No, FRED continua a dare SOFR, WALCL, ecc. Solo VIX/DXY passano a Marketdata.

**Q: Devo modificare il database o il frontend?**  
A: No, zero modifiche. Solo Edge Function cambia.

**Q: Il cron job deve essere riconfigurato?**  
A: No, continua a funzionare come prima. Eredita il fix automaticamente.

---

**Fine task. Buon lavoro! 🚀**

