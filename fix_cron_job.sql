-- ========================================
-- FIX CRON JOB - 6 novembre 2025
-- ========================================

-- Step 1: Verifica se pg_cron è abilitato
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Step 2: Verifica cron job esistente
SELECT * FROM cron.job WHERE jobname = 'quantitaizer-fed-data-refresh';

-- Step 3: Verifica ultime esecuzioni (se esistono)
SELECT * FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'quantitaizer-fed-data-refresh')
ORDER BY start_time DESC LIMIT 10;

-- Step 4: Rimuovi cron job esistente (se presente)
SELECT cron.unschedule('quantitaizer-fed-data-refresh');

-- Step 5: Re-crea il cron job
-- Esegue ogni 4 ore (08:00, 12:00, 16:00, 20:00) nei giorni lavorativi (1-5 = Lun-Ven)
SELECT cron.schedule(
  'quantitaizer-fed-data-refresh',
  '0 8,12,16,20 * * 1-5',  -- Cron syntax: minute hour day month weekday
  $$
  SELECT
    net.http_post(
      url:='https://tolaojeqjcoskegelule.supabase.co/functions/v1/fetch-fed-data',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjUzOSwiZXhwIjoyMDc3NTg4NTM5fQ.Y0xWNiSR3mTDxhN566I-cgloiQazBwg0HoFpDJT0_HE"}'::jsonb,
      body:='{}'::jsonb
    ) AS request_id;
  $$
);

-- Step 6: Verifica che il job sia stato creato
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job 
WHERE jobname = 'quantitaizer-fed-data-refresh';

-- Step 7: Trigger manuale per testare (esegui solo dopo aver verificato che il job esiste)
-- Uncommenta la riga sotto per eseguire immediatamente il job
-- SELECT cron.schedule_in_database('quantitaizer-fed-data-refresh', 'now', 'postgres');

-- ========================================
-- NOTES:
-- ========================================
-- 1. Il cron job usa net.http_post per chiamare la Edge Function
-- 2. Schedule: '0 8,12,16,20 * * 1-5' = 08:00, 12:00, 16:00, 20:00 solo Lun-Ven
-- 3. Il Bearer token è il service_role key per autenticazione
-- 4. Se vedi errori "relation cron.job does not exist" → pg_cron non è installato
-- 5. Per disabilitare: UPDATE cron.job SET active = false WHERE jobname = 'quantitaizer-fed-data-refresh';

