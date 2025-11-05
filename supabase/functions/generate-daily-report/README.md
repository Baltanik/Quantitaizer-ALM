# Generate Daily Report - Edge Function

## 📋 Overview

Scheduled Edge Function che genera automaticamente un PDF report giornaliero delle metriche Fed Liquidity.

**Trigger**: Ogni giorno alle 18:00 UTC (dopo refresh dati)  
**Output**: PDF in Supabase Storage (`reports/` bucket)  
**Stile**: Professional finance report (Bloomberg/Goldman Sachs-like)

---

## 🏗️ Architecture

```
generate-daily-report/
├── index.ts              # Main entry point + orchestration
├── alertEngine.ts        # Soglie alert + delta calculator
├── scenarioEngine.ts     # Scenario derivation logic
├── pdfGenerator.ts       # PDF rendering (pdfmake)
└── README.md            # Questo file
```

---

## 📊 Report Content

### Sezioni PDF:
1. **Executive Summary**: Scenario, context, risk level, sustainability, confidence
2. **Alerts & Monitoring**: Sistema 3-level (🔴 critical, 🟡 warning, ✅ ok)
3. **Key Metrics Table**: Current + Δ 1d/4w/3m + 90d range per ogni metrica
4. **Active Drivers**: Fattori chiave che guidano scenario corrente
5. **Watch List**: Cosa monitorare domani (soglie approaching)
6. **Context**: Spiegazione scenario attuale (stealth_qe, qt, neutral, qe)
7. **Footer**: Timestamp + disclaimer

### Metriche monitorate:
- Balance Sheet (WALCL)
- RRP (RRPON)
- Reserves (WRESBAL)
- VIX
- SOFR-EFFR Spread
- HY OAS
- T10Y3M (yield curve)
- DXY Broad (dollar index)

---

## ⚙️ Setup Locale

### 1. Install Supabase CLI
```bash
brew install supabase/tap/supabase
```

### 2. Link progetto
```bash
cd /Users/giovannimarascio/Desktop/Quantitaizer
supabase link --project-ref <YOUR_PROJECT_ID>
```

### 3. Test function locale
```bash
supabase functions serve generate-daily-report --no-verify-jwt
```

### 4. Trigger manuale test
```bash
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/generate-daily-report' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json'
```

---

## 🚀 Deploy

### 1. Deploy function
```bash
supabase functions deploy generate-daily-report
```

### 2. Setup cron trigger (Supabase Dashboard)

**Path**: Dashboard → Database → Cron Jobs

**SQL:**
```sql
-- Create pg_cron extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily report generation at 18:00 UTC
SELECT cron.schedule(
  'daily-report-generation',
  '0 18 * * *',  -- Every day at 18:00 UTC
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-daily-report',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

### 3. Setup Storage Bucket

**Dashboard → Storage → Create Bucket**

- Name: `reports`
- Public: `true` (se vuoi link pubblici) o `false` (privati)
- File size limit: 10MB
- Allowed MIME types: `application/pdf`

**Policy RLS (se pubblico):**
```sql
-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'reports');

-- Allow service role full access
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'reports');
```

---

## 🧪 Testing

### Test completo manuale:

```bash
# 1. Check che dati siano presenti
supabase db query "SELECT date, walcl, vix FROM fed_metrics ORDER BY date DESC LIMIT 5;"

# 2. Serve function
supabase functions serve generate-daily-report --no-verify-jwt

# 3. Trigger in altro terminale
curl -i --location 'http://localhost:54321/functions/v1/generate-daily-report' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

# 4. Check output logs per errori
# 5. Verifica PDF generato in Storage
```

### Validation checklist:
- [ ] Function compila senza errori
- [ ] Fetch dati da DB funziona
- [ ] Deltas calcolati correttamente (1d, 4w, 3m)
- [ ] Scenario derivato (stealth_qe, qt, etc.)
- [ ] Alerts generati con livelli corretti
- [ ] PDF creato (no errori pdfmake)
- [ ] PDF uploaded a Storage
- [ ] Log JSON strutturati presenti
- [ ] No dati placeholder/fake

---

## 🔍 Monitoring

### Log queries (Supabase Dashboard → Logs):

```sql
-- Success reports
SELECT * FROM edge_logs 
WHERE event = 'report_generated_successfully' 
ORDER BY timestamp DESC LIMIT 10;

-- Failures
SELECT * FROM edge_logs 
WHERE event = 'report_generation_failed' 
ORDER BY timestamp DESC LIMIT 10;

-- Performance
SELECT 
  date,
  duration_ms,
  alerts_count
FROM edge_logs 
WHERE event = 'report_generated_successfully'
ORDER BY timestamp DESC;
```

---

## 🚨 Alert Thresholds

### CRITICAL (🔴):
- VIX ≥ 22
- SOFR-EFFR spread ≥ 10bps
- HY OAS ≥ 5.5%
- Reserves ≤ $3T
- Balance Sheet Δ 4w ≤ -$100B
- T10Y3M ≤ -0.5% (deep inversion)

### WARNING (🟡):
- VIX ≥ 18
- SOFR-EFFR spread ≥ 5bps
- HY OAS ≥ 4.5%
- Reserves ≤ $3.2T
- RRP ≤ $200B
- DXY Δ 4w ≥ +2.0
- Balance Sheet Δ 4w ≤ -$60B

---

## 📝 TODO/Future Enhancements

- [ ] Email notification quando PDF generato (SendGrid integration)
- [ ] Charts/graphs in PDF (trend 30d Balance Sheet, VIX)
- [ ] Multi-language support (Italian + English)
- [ ] Historical comparison vs same date previous year
- [ ] ML predictions integration (se disponibili)
- [ ] Webhook to Telegram/Discord for critical alerts

---

## 📚 References

- **pdfmake docs**: https://pdfmake.github.io/docs/
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **pg_cron**: https://github.com/citusdata/pg_cron

---

## 🐛 Troubleshooting

### "Failed to fetch metrics"
→ Check `fed_metrics` table ha dati recenti: `SELECT MAX(date) FROM fed_metrics;`

### "Failed to upload PDF"
→ Verifica Storage bucket `reports` esiste e service role ha permessi

### "Invalid or incomplete data"
→ Check metriche non sono NULL/placeholder nel DB

### pdfmake errors
→ Verifica fonts CDN reachable, altrimenti passa a font system default

---

**Status**: ✅ Ready for local testing  
**Next**: Deploy dopo validazione locale


