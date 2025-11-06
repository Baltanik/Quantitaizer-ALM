# 🔧 FIX CRON JOB AUTOMATICO - 6 Novembre 2025

## 🚨 **PROBLEMA IDENTIFICATO**

**Data**: Giovedì 6 novembre 2025, ore 16:30 CET  
**Severità**: MEDIUM - Dati non si aggiornano automaticamente

### Sintomi
```bash
last_refresh_at: null
trigger_source: null  
fed_data_refresh_log: [] (empty)
```

**Significato**: Il cron job automatico **NON si è mai eseguito**.

### Root Cause
1. **Cron job mai attivato** o **disabilitato**
2. Possibile problema con **Vault secrets** (la migration li richiede)
3. `pg_cron` extension potrebbe non essere abilitata

---

## ✅ **SOLUZIONE**

### Approccio Scelto: SQL Diretto via Dashboard

**Perché non posso automatizzare**:
- `pg_cron` richiede privilegi PostgreSQL elevati
- Non esposto via REST API per sicurezza
- Necessita accesso SQL diretto

### Script SQL Preparato

Ho creato uno script SQL completo che:
1. ✅ Abilita `pg_cron` e `pg_net` extensions
2. ✅ Rimuove job esistente (se presente)
3. ✅ Crea nuovo job con valori **hardcoded** (no Vault dependency)
4. ✅ Verifica creazione con query di check

**File**: `/tmp/cron_setup.sql`

---

## 📋 **ISTRUZIONI ESECUZIONE**

### Step 1: Apri SQL Editor
```
URL: https://supabase.com/dashboard/project/tolaojeqjcoskegelule/sql/new
```

### Step 2: Copia questo SQL

```sql
-- Fix Cron Job Automatico - 6 Novembre 2025

-- Step 1: Abilita estensioni necessarie
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Step 2: Rimuovi job esistente se presente
DO $$
BEGIN
  PERFORM cron.unschedule('quantitaizer-fed-data-refresh');
  RAISE NOTICE 'Removed existing job (if any)';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'No existing job to remove';
END $$;

-- Step 3: Crea il nuovo cron job
SELECT cron.schedule(
  'quantitaizer-fed-data-refresh',
  '0 8,12,16,20 * * 1-5',  -- 08:00, 12:00, 16:00, 20:00 UTC, Lun-Ven
  $$
  SELECT net.http_post(
    url := 'https://tolaojeqjcoskegelule.supabase.co/functions/v1/fetch-fed-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjUzOSwiZXhwIjoyMDc3NTg4NTM5fQ.Y0xWNiSR3mTDxhN566I-cgloiQazBwg0HoFpDJT0_HE"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);

-- Step 4: Verifica che il job sia stato creato
SELECT 
  '✅ CRON JOB CREATO' as status,
  jobid,
  jobname,
  schedule,
  active
FROM cron.job 
WHERE jobname = 'quantitaizer-fed-data-refresh';
```

### Step 3: Esegui
- Clicca il pulsante **"RUN"** (o `Ctrl+Enter`)

### Step 4: Verifica Output
Dovresti vedere:
```
status: ✅ CRON JOB CREATO
jobid: [numero]
jobname: quantitaizer-fed-data-refresh
schedule: 0 8,12,16,20 * * 1-5
active: true
```

### Step 5: Test Immediato (Opzionale)
Per testare subito che funzioni, esegui anche questo nel SQL Editor:
```sql
SELECT cron.schedule_in_database('quantitaizer-fed-data-refresh', 'now', 'postgres');
```

Poi controlla che i dati si aggiornino:
```bash
cd /Users/giovannimarascio/Desktop/Quantitaizer
./check_db.sh
```

---

## 📊 **SCHEDULE DETTAGLI**

### Cron Expression: `0 8,12,16,20 * * 1-5`

| Campo | Valore | Significato |
|-------|--------|-------------|
| Minuto | 0 | All'inizio dell'ora |
| Ora | 8,12,16,20 | 4 volte al giorno |
| Giorno mese | * | Ogni giorno |
| Mese | * | Ogni mese |
| Giorno settimana | 1-5 | Solo Lun-Ven |

### Orari Esecuzione (in vari timezone)

| Timezone | Esecuzioni |
|----------|-----------|
| **UTC** | 08:00, 12:00, 16:00, 20:00 |
| **CET (inverno)** | 09:00, 13:00, 17:00, 21:00 |
| **CEST (estate)** | 10:00, 14:00, 18:00, 22:00 |
| **EST** | 03:00, 07:00, 11:00, 15:00 |

### Frequenza
- **4 volte al giorno** nei giorni lavorativi
- **20 volte a settimana** (4 x 5 giorni)
- **~80 volte al mese** (esclusi festivi)

---

## 🔧 **ALTERNATIVE (se il cron non funziona)**

### Opzione A: GitHub Actions
Se pg_cron non è disponibile sul tuo piano Supabase:

```yaml
# .github/workflows/update-fed-data.yml
name: Update Fed Data
on:
  schedule:
    - cron: '0 8,12,16,20 * * 1-5'
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Edge Function
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/fetch-fed-data" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}"
```

### Opzione B: Vercel Cron (se usi Vercel)
```javascript
// vercel.json
{
  "crons": [{
    "path": "/api/update-fed-data",
    "schedule": "0 8,12,16,20 * * 1-5"
  }]
}
```

### Opzione C: External Service (Easycron, cron-job.org)
- URL: `https://tolaojeqjcoskegelule.supabase.co/functions/v1/fetch-fed-data`
- Method: POST
- Headers: `Authorization: Bearer [service-key]`
- Schedule: `0 8,12,16,20 * * 1-5`

---

## 🧪 **VERIFICA & TESTING**

### Verifica Job Creato
```bash
cd /Users/giovannimarascio/Desktop/Quantitaizer
./verify_cron.sh
```

**Output atteso**:
```json
{
  "jobname": "quantitaizer-fed-data-refresh",
  "active": true,
  "schedule": "0 8,12,16,20 * * 1-5"
}
```

### Verifica Esecuzioni
```sql
-- Via SQL Editor
SELECT * FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'quantitaizer-fed-data-refresh')
ORDER BY start_time DESC 
LIMIT 10;
```

### Verifica Log Refresh
```bash
curl -s "https://tolaojeqjcoskegelule.supabase.co/rest/v1/fed_data_refresh_log?select=*&order=triggered_at.desc&limit=5" \
  -H "apikey: [anon-key]" | jq
```

---

## 📝 **TROUBLESHOOTING**

### Problema: "relation cron.job does not exist"
**Causa**: `pg_cron` extension non installata  
**Soluzione**:
```sql
CREATE EXTENSION pg_cron WITH SCHEMA extensions;
```

### Problema: "permission denied for schema cron"
**Causa**: User non ha privilegi su cron schema  
**Soluzione**: Esegui come `postgres` user tramite Dashboard SQL Editor

### Problema: Job non si esegue
**Debug**:
```sql
-- Verifica job attivo
SELECT * FROM cron.job WHERE jobname = 'quantitaizer-fed-data-refresh';

-- Verifica ultime esecuzioni
SELECT * FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'quantitaizer-fed-data-refresh')
ORDER BY start_time DESC LIMIT 5;

-- Forza esecuzione manuale
SELECT cron.schedule_in_database('quantitaizer-fed-data-refresh', 'now', 'postgres');
```

### Problema: HTTP request fails
**Possibili cause**:
1. Service key scaduto → Rigenera in Dashboard
2. Edge Function non deployata → Verifica in Functions tab
3. Timeout (>120s) → Aumenta `timeout_milliseconds`

---

## 📊 **MONITORING CONTINUO**

### Query Utili

**1. Status cron job**:
```sql
SELECT 
  jobname,
  schedule,
  active,
  database,
  nodename
FROM cron.job 
WHERE jobname = 'quantitaizer-fed-data-refresh';
```

**2. Ultime 10 esecuzioni**:
```sql
SELECT 
  start_time,
  end_time,
  status,
  return_message,
  EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds
FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'quantitaizer-fed-data-refresh')
ORDER BY start_time DESC 
LIMIT 10;
```

**3. Success rate (ultimi 7 giorni)**:
```sql
SELECT 
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE status = 'succeeded') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'succeeded') / COUNT(*), 2) as success_rate
FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'quantitaizer-fed-data-refresh')
  AND start_time >= NOW() - INTERVAL '7 days';
```

**4. Prossima esecuzione prevista**:
```sql
SELECT 
  jobname,
  CASE 
    WHEN EXTRACT(hour FROM NOW()) < 8 THEN date_trunc('day', NOW()) + INTERVAL '8 hours'
    WHEN EXTRACT(hour FROM NOW()) < 12 THEN date_trunc('day', NOW()) + INTERVAL '12 hours'
    WHEN EXTRACT(hour FROM NOW()) < 16 THEN date_trunc('day', NOW()) + INTERVAL '16 hours'
    WHEN EXTRACT(hour FROM NOW()) < 20 THEN date_trunc('day', NOW()) + INTERVAL '20 hours'
    ELSE date_trunc('day', NOW()) + INTERVAL '1 day' + INTERVAL '8 hours'
  END as next_run_estimate
FROM cron.job 
WHERE jobname = 'quantitaizer-fed-data-refresh';
```

---

## ✅ **CHECKLIST COMPLETAMENTO**

- [ ] SQL eseguito in Supabase Dashboard
- [ ] Job creato e active=true verificato
- [ ] Test manuale eseguito (schedule_in_database)
- [ ] Dati aggiornati correttamente (check_db.sh)
- [ ] Monitoring query salvate
- [ ] Alert configurati (se necessario)

---

## 🎯 **PROSSIMI PASSI**

1. **Dopo esecuzione SQL** (utente):
   - Esegui il SQL nel Dashboard
   - Verifica output positivo
   - Test manuale con `schedule_in_database`

2. **Monitoring 24h** (automatico):
   - Il cron eseguirà alle 20:00 UTC oggi (21:00/22:00 CET)
   - Poi domani alle 08:00, 12:00, 16:00, 20:00 UTC
   - Verifica log dopo ogni esecuzione

3. **Alerting** (opzionale, futuro):
   - Webhook se job fail per 2+ volte consecutive
   - Email se dati non si aggiornano per >12 ore

---

## 📁 **FILES CREATI**

1. `/tmp/cron_setup.sql` - SQL da eseguire nel Dashboard
2. `fix_cron_complete.sql` - Script SQL completo con diagnostic
3. `setup_cron_auto.sh` - Script bash con istruzioni
4. `docs/FIX_CRON_JOB_2025-11-06.md` - Questa documentazione

---

**Autore**: AI Assistant  
**Data**: 6 Novembre 2025, 16:30 CET  
**Status**: ⏳ PENDING USER ACTION  
**Next**: Utente deve eseguire SQL nel Dashboard  
**Follow-up**: Verificare esecuzione dopo 20:00 UTC (21:00/22:00 CET)

