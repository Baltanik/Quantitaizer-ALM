# Production Setup Guide

## 🎯 Obiettivo

Deployare `generate-daily-report` Edge Function in produzione con scheduling automatico alle 18:00 UTC ogni giorno.

---

## 📋 Pre-requisiti

- [ ] Supabase CLI installato
- [ ] Progetto linkato (`supabase link`)
- [ ] Test locale superato (`./test-local.sh`)
- [ ] Service Role Key disponibile (Dashboard → Settings → API)

---

## 🚀 Deploy Steps

### 1. Deploy Edge Function

```bash
cd /Users/giovannimarascio/Desktop/Quantitaizer

# Deploy function
supabase functions deploy generate-daily-report

# Expected output:
# Deploying function: generate-daily-report
# Function deployed: https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-daily-report
```

### 2. Test Deployed Function

```bash
# Get your anon key from Dashboard → Settings → API
export SUPABASE_ANON_KEY="eyJhbGc..."
export PROJECT_REF="your-project-ref"

# Trigger manual test
curl -i --location "https://${PROJECT_REF}.supabase.co/functions/v1/generate-daily-report" \
  --header "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  --header "Content-Type: application/json"

# Expected response:
# {
#   "success": true,
#   "file": "daily-report-2025-11-04.pdf",
#   "date": "2025-11-04",
#   "scenario": "stealth_qe",
#   "alerts": 8,
#   "duration_ms": 1234
# }
```

---

## 🗄️ Storage Bucket Setup

### Opzione A: Via Dashboard (consigliato)

1. **Dashboard → Storage → New Bucket**
   - Name: `reports`
   - Public: `false` (privato, accesso via signed URLs)
   - File size limit: `10 MB`
   - Allowed MIME types: `application/pdf`

2. **Create RLS Policies**

```sql
-- Allow service role full access
CREATE POLICY "Service role full access on reports"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'reports');

-- Optional: Allow authenticated users to read
CREATE POLICY "Authenticated read reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reports');
```

### Opzione B: Via SQL

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false);

-- Create policies
CREATE POLICY "Service role full access on reports"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'reports');
```

---

## ⏰ Cron Job Setup

### Step 1: Enable pg_cron extension

**Dashboard → Database → Extensions**

- Search: `pg_cron`
- Click: **Enable**

### Step 2: Create scheduled job

**Dashboard → SQL Editor → New Query**

```sql
-- Schedule daily report generation at 18:00 UTC
SELECT cron.schedule(
  'daily-fed-report',           -- Job name
  '0 18 * * *',                 -- Cron: 18:00 UTC every day
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-daily-report',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

**⚠️ IMPORTANTE**: 
- Sostituisci `YOUR_PROJECT_REF` con il tuo project ref
- Sostituisci `YOUR_SERVICE_ROLE_KEY` con il tuo service role key (Dashboard → Settings → API)
- **MAI committare la service role key in git**

### Step 3: Verify cron job created

```sql
-- List all cron jobs
SELECT * FROM cron.job;

-- Expected output:
-- jobid | schedule    | command                        | nodename | ...
-- 1     | 0 18 * * *  | SELECT net.http_post(...)     | ...
```

### Step 4: Test cron execution

```sql
-- Manually trigger job (for testing)
SELECT cron.schedule(
  'test-report-now',
  '* * * * *',  -- Every minute (ONLY FOR TESTING)
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-daily-report',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Wait 1-2 minutes, check Storage for new PDF

-- Then DELETE test job:
SELECT cron.unschedule('test-report-now');
```

---

## 📊 Monitoring Setup

### 1. Check Function Logs

**Dashboard → Edge Functions → generate-daily-report → Logs**

Filter by:
- `event = "report_generated_successfully"` → Success
- `event = "report_generation_failed"` → Errors

### 2. Query Structured Logs

```sql
-- View recent reports
SELECT 
  timestamp,
  (log->>'event') as event,
  (log->>'date') as report_date,
  (log->>'scenario') as scenario,
  (log->>'alerts_count')::int as alerts,
  (log->>'duration_ms')::int as duration_ms
FROM edge_logs
WHERE function_name = 'generate-daily-report'
  AND (log->>'event') = 'report_generated_successfully'
ORDER BY timestamp DESC
LIMIT 10;
```

### 3. Alert Setup (Optional)

Create monitoring query for failures:

```sql
-- Count failures last 24h
SELECT COUNT(*) as failure_count
FROM edge_logs
WHERE function_name = 'generate-daily-report'
  AND (log->>'event') = 'report_generation_failed'
  AND timestamp > NOW() - INTERVAL '24 hours';
```

Setup email alert se `failure_count > 0` (via Dashboard Alerts o external monitoring).

---

## 🔍 Verification Checklist

Dopo deploy, verifica:

- [ ] Function deployed senza errori
- [ ] Storage bucket `reports` esiste con RLS policies
- [ ] Cron job scheduled (query `cron.job`)
- [ ] Manual trigger funziona (curl test)
- [ ] PDF generato appare in Storage
- [ ] PDF scaricabile e formattato correttamente
- [ ] Logs strutturati JSON presenti
- [ ] No dati placeholder nel PDF
- [ ] Cron job esegue alle 18:00 UTC (verifica domani)

---

## 🐛 Troubleshooting

### "Function timeout after 60s"
→ Edge Functions hanno limit 60s. Se report generation troppo lenta:
- Ottimizza query DB (index su `date` column)
- Riduci fetch da 91 giorni a 31 per range
- Simplifica PDF rendering

### "Storage upload failed"
→ Check:
1. Bucket `reports` esiste
2. Service role ha policy `storage.objects` INSERT
3. File size <10MB

### "Cron job not triggering"
→ Check:
1. `pg_cron` extension enabled
2. Job presente in `SELECT * FROM cron.job;`
3. Service role key corretto e non expired
4. URL function corretta (https, no typo)

### "Invalid data detected"
→ Check fed_metrics table:
```sql
SELECT date, walcl, vix, rrpon 
FROM fed_metrics 
WHERE date = CURRENT_DATE;
```
Se NULL → run `fetch-fed-data` function prima.

---

## 📈 Performance Benchmarks

Target performance:
- **Function execution**: <5s
- **DB query**: <500ms
- **PDF generation**: <2s
- **Storage upload**: <1s

Se performance degrada:
1. Check DB connection pool
2. Verify FRED API latency (se fetch real-time)
3. Profile pdfmake rendering
4. Consider caching layer

---

## 🔒 Security Notes

- **Service Role Key**: Store in Supabase Secrets, mai in git
- **RLS Policies**: Reports bucket privato, accesso solo authenticated users
- **Function auth**: Require service role key per chiamate cron
- **Data validation**: Function valida dati prima di generare PDF (no placeholders)

---

## ✅ Post-Deploy

Una volta tutto funziona:

1. **Commit changes** (exclude secrets):
```bash
git add supabase/functions/generate-daily-report/
git commit -m "feat: Add daily PDF report generation Edge Function"
git push origin main
```

2. **Document in main README**:
```markdown
## Daily Reports

PDF reports generated automatically at 18:00 UTC daily.
Access: Supabase Dashboard → Storage → reports/
```

3. **Setup monitoring alerts** per failures

4. **Schedule review** reports settimanale per QA

---

## 📞 Support

Se problemi persistono:
- Check Supabase Status: https://status.supabase.com
- Supabase Discord: https://discord.supabase.com
- Logs dettagliati in Dashboard → Edge Functions → Logs

---

**Status**: Ready for production deployment  
**Estimated setup time**: 15-20 minuti  
**Maintenance**: Zero (fully automated)












