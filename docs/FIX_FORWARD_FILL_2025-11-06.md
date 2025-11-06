# 🔧 FIX FORWARD-FILL - 6 Novembre 2025

## 🚨 **PROBLEMA IDENTIFICATO**

**Data**: Giovedì 6 novembre 2025, ore 15:00 CET  
**Severità**: HIGH - Dashboard con dati mancanti

### Sintomi
- `us10y` (DGS10) = **NULL** da martedì 5 novembre
- `dxy_broad` = **NULL** da martedì 5 novembre
- Altri campi (walcl, wresbal, dtb3, dff, FX) = **NULL** 
- SOFR e VIX funzionavano correttamente

### Root Cause Analysis

1. **FRED non pubblica dati ogni giorno**:
   - DGS10 (us10y): ultimo dato 4 novembre (mancano 5-6 nov)
   - FX rates: ultimo dato 31 ottobre (mancano 1-6 nov per festivo)

2. **Edge Function con fetch window troppo piccola**:
   ```typescript
   // PRIMA (buggy):
   startDateObj.setDate(startDateObj.getDate() - 1); // Solo 1 giorno!
   ```
   - Se FRED non ha dati per quel giorno specifico → serie vuota
   - Forward-fill non ha dati storici da utilizzare

3. **Forward-fill inizializzato a NULL**:
   ```typescript
   // PRIMA (buggy):
   lastValues[key] = null; // Sempre null all'inizio!
   ```
   - Se non ci sono dati FRED nei primi giorni → lastValues rimane null
   - Nessun recupero dal database dei valori precedenti

---

## ✅ **SOLUZIONE IMPLEMENTATA**

### Fix 1: Aumentata fetch window (1 → 14 giorni)

**File**: `supabase/functions/fetch-fed-data/index.ts`  
**Linee**: 108-114

```typescript
// DOPO (fix):
// Fetch data from last 14 days to ensure we have data for forward-fill
// This handles weekends, holidays, and FRED publication delays
const today = new Date();
const startDateObj = new Date(today);
startDateObj.setDate(startDateObj.getDate() - 14); // Changed from -1 to -14
```

**Beneficio**: Anche se FRED non ha dati per 2-6 giorni, la funzione ha una finestra ampia per trovare l'ultimo valore valido.

---

### Fix 2: Inizializzazione forward-fill dal database

**File**: `supabase/functions/fetch-fed-data/index.ts`  
**Linee**: 187-210

```typescript
// DOPO (fix):
// Initialize with last known values from database (for better forward-fill)
console.log('📊 Fetching last known values from database for forward-fill...');
const { data: lastDbRecord, error: lastRecordError } = await supabase
  .from('fed_data')
  .select('*')
  .order('date', { ascending: false })
  .limit(1)
  .single();

if (lastDbRecord && !lastRecordError) {
  console.log(`✅ Last DB record from: ${lastDbRecord.date}`);
  // Initialize lastValues with database values
  Object.keys(seriesData).forEach(key => {
    lastValues[key] = lastDbRecord[key] ?? null;
  });
}
```

**Beneficio**: Se FRED non ha dati nei 14 giorni, usa l'ultimo valore dal database invece di NULL.

---

### Fix 3: Logging forward-fill

**File**: `supabase/functions/fetch-fed-data/index.ts`  
**Linee**: 237-242

```typescript
// DOPO (fix):
} else if (lastValues[key] !== null) {
  // Using forward-fill for this series on this date
  if (date === allDates[allDates.length - 1]) {
    console.log(`🔄 Forward-fill: ${key} = ${lastValues[key]} (FRED data not available for ${date})`);
  }
}
```

**Beneficio**: Diagnostica quando e quali serie usano forward-fill (per monitoring).

---

## 🧪 **TEST & VALIDAZIONE**

### Prima del fix (ore 15:17)
```json
{
  "date": "2025-11-06",
  "sofr": 3.91,
  "vix": 18.01,
  "us10y": null,
  "dxy_broad": null,
  "walcl": null,
  "wresbal": null,
  "recordsInserted": 2
}
```

### Dopo il fix (ore 15:21)
```json
{
  "date": "2025-11-06",
  "sofr": 3.91,
  "vix": 18.01,
  "us10y": 4.10,
  "dxy_broad": 97.2226,
  "walcl": 6587034,
  "wresbal": 2848.021,
  "recordsInserted": 15
}
```

### Database verification
```sql
SELECT date, us10y, dxy_broad, updated_at 
FROM fed_data 
WHERE date >= '2025-11-04'
ORDER BY date DESC;

-- 6 nov: us10y=4.10, dxy_broad=97.22 ✅
-- 5 nov: us10y=4.10, dxy_broad=97.22 ✅ (forward-filled)
-- 4 nov: us10y=4.10, dxy_broad=97.22 ✅
```

---

## 📊 **RISULTATI**

✅ **us10y (DGS10)**: Da NULL → 4.10 (forward-filled dal 4 nov)  
✅ **dxy_broad**: Da NULL → 97.2226 (calcolato con FX del 31 ott)  
✅ **walcl, wresbal, dtb3, dff**: Tutti popolati correttamente  
✅ **FX rates**: Popolati con dati del 31 ottobre (forward-fill)  
✅ **recordsInserted**: Da 2 → 15 (processa 14 giorni di storia)

---

## 🚀 **DEPLOY**

**Deployment time**: 6 novembre 2025, ore 15:20 CET  
**Command**:
```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."
supabase functions deploy fetch-fed-data --project-ref tolaojeqjcoskegelule
```

**Deploy status**: ✅ SUCCESS  
**First execution**: 15:21:28 (4 minuti dopo deploy)  
**Result**: Database popolato correttamente

---

## 📈 **MONITORING**

### Metriche da monitorare (prossime 24h)

1. **Data completeness**:
   ```sql
   SELECT 
     date,
     COUNT(*) FILTER (WHERE us10y IS NOT NULL) as us10y_count,
     COUNT(*) FILTER (WHERE dxy_broad IS NOT NULL) as dxy_count
   FROM fed_data 
   WHERE date >= CURRENT_DATE - 7
   GROUP BY date;
   ```

2. **Forward-fill usage**:
   - Controlla logs per "🔄 Forward-fill" entries
   - Se troppo frequente (>50% giorni) → problema upstream FRED

3. **Edge Function execution**:
   ```bash
   ./check_db.sh
   # Verifica last_refresh_at non sia null
   ```

---

## 🔄 **CRON JOB STATUS**

**Nota**: Durante la diagnostica abbiamo scoperto che il **cron job automatico NON è attivo**:

```
last_refresh_at: null
trigger_source: null
fed_data_refresh_log: []  (empty)
```

**Action required**:
- Verificare se `pg_cron` extension è attiva
- Controllare se il cron job è schedulato correttamente
- Test manuale di trigger cron

**Query diagnostic**:
```sql
-- Verifica cron job esistente
SELECT * FROM cron.job WHERE jobname = 'quantitaizer-fed-data-refresh';

-- Verifica esecuzioni
SELECT * FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'quantitaizer-fed-data-refresh')
ORDER BY start_time DESC LIMIT 10;
```

---

## 📝 **LESSONS LEARNED**

1. **Fetch windows devono essere >= 14 giorni**:
   - FRED ha ritardi (holidays, weekends)
   - FX rates possono essere vecchi di 6+ giorni per festivi

2. **Forward-fill deve usare database come fallback**:
   - Non basta forward-fill su dati FRED correnti
   - Serve recupero ultimo valore dal DB

3. **Monitoring del cron job è critico**:
   - Log table (`fed_data_refresh_log`) vuota = problema
   - Serve alert se cron non esegue per >8 ore

4. **Fetch window di 1 giorno è troppo fragile**:
   - Production systems devono tollerare gap di dati
   - 14 giorni è un buon compromesso (costo API vs robustezza)

---

## ✅ **CHECKLIST COMPLETAMENTO**

- [x] Problema identificato (NULL in us10y, dxy_broad)
- [x] Root cause analizzata (fetch window 1 giorno + forward-fill buggy)
- [x] Fix implementato (14 giorni + DB init + logging)
- [x] Codice deployato (15:20 CET)
- [x] Test eseguiti (us10y e dxy_broad popolati)
- [x] Database validato (dati salvati correttamente)
- [x] Documentazione creata (questo file)
- [ ] Monitoring 24h (in corso)
- [ ] Fix cron job automatico (todo separato)

---

**Autore**: AI Assistant  
**Reviewer**: @giovannimarascio  
**Status**: ✅ RESOLVED  
**Next steps**: Monitorare per 24h, fixare cron job automatico

