-- ========================================
-- FIX COMPLETO CRON JOB - 6 Novembre 2025
-- ========================================
-- Questo script sistema il cron job automatico che non funziona

-- ========================================
-- STEP 1: VERIFICA ESTENSIONI
-- ========================================
DO $$
BEGIN
  -- Abilita pg_cron se non presente
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
  RAISE NOTICE '✅ pg_cron extension verificata/abilitata';
  
  -- Abilita pg_net se non presente
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  RAISE NOTICE '✅ pg_net extension verificata/abilitata';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '⚠️ Errore abilitando estensioni: %', SQLERRM;
END $$;

-- ========================================
-- STEP 2: SETUP VAULT SECRETS
-- ========================================
-- Nota: Vault potrebbe non essere disponibile su tutti i progetti Supabase
-- Se fallisce, useremo hardcoded values nel cron job

DO $$
BEGIN
  -- Prova a creare i secrets nel Vault
  BEGIN
    PERFORM vault.create_secret(
      'https://tolaojeqjcoskegelule.supabase.co',
      'project_url',
      'Supabase project URL for cron job'
    );
    RAISE NOTICE '✅ Vault secret project_url creato';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'ℹ️ Vault secret project_url già esistente';
    WHEN OTHERS THEN
      RAISE WARNING '⚠️ Vault non disponibile per project_url, useremo hardcoded value';
  END;
  
  BEGIN
    PERFORM vault.create_secret(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjUzOSwiZXhwIjoyMDc3NTg4NTM5fQ.Y0xWNiSR3mTDxhN566I-cgloiQazBwg0HoFpDJT0_HE',
      'service_key',
      'Supabase service role key for cron job'
    );
    RAISE NOTICE '✅ Vault secret service_key creato';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'ℹ️ Vault secret service_key già esistente';
    WHEN OTHERS THEN
      RAISE WARNING '⚠️ Vault non disponibile per service_key, useremo hardcoded value';
  END;
END $$;

-- ========================================
-- STEP 3: RIMUOVI CRON JOB ESISTENTE
-- ========================================
DO $$
BEGIN
  PERFORM cron.unschedule('quantitaizer-fed-data-refresh');
  RAISE NOTICE '✅ Cron job esistente rimosso (se presente)';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ℹ️ Nessun cron job da rimuovere';
END $$;

-- ========================================
-- STEP 4: CREA NUOVO CRON JOB (VERSIONE HARDCODED)
-- ========================================
-- Questa versione usa valori hardcoded invece di Vault
-- È più affidabile e funziona sempre

SELECT cron.schedule(
  'quantitaizer-fed-data-refresh',
  '0 8,12,16,20 * * 1-5',  -- Ogni 4 ore, giorni lavorativi
  $$
  SELECT net.http_post(
    url := 'https://tolaojeqjcoskegelule.supabase.co/functions/v1/fetch-fed-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjUzOSwiZXhwIjoyMDc3NTg4NTM5fQ.Y0xWNiSR3mTDxhN566I-cgloiQazBwg0HoFpDJT0_HE"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);

-- ========================================
-- STEP 5: VERIFICA CHE IL JOB SIA STATO CREATO
-- ========================================
SELECT 
  '✅ CRON JOB VERIFICATO:' as status,
  jobid,
  jobname,
  schedule,
  active,
  database
FROM cron.job 
WHERE jobname = 'quantitaizer-fed-data-refresh';

-- ========================================
-- STEP 6: VERIFICA TABELLA LOG ESISTE
-- ========================================
CREATE TABLE IF NOT EXISTS public.fed_data_refresh_log (
  id BIGSERIAL PRIMARY KEY,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  trigger_source TEXT NOT NULL,
  status TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  records_updated INTEGER
);

-- ========================================
-- STEP 7: TEST MANUALE (OPZIONALE)
-- ========================================
-- Uncommenta per eseguire il job immediatamente come test:
-- SELECT cron.schedule_in_database('quantitaizer-fed-data-refresh', 'now', 'postgres');

-- ========================================
-- DIAGNOSTIC QUERIES
-- ========================================

-- Query 1: Verifica job attivo
SELECT 
  'Current Cron Job Status' as info,
  jobname,
  schedule,
  active,
  database
FROM cron.job 
WHERE jobname = 'quantitaizer-fed-data-refresh';

-- Query 2: Ultime esecuzioni
SELECT 
  'Recent Executions (last 10)' as info,
  runid,
  jobid,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'quantitaizer-fed-data-refresh')
ORDER BY start_time DESC 
LIMIT 10;

-- Query 3: Prossima esecuzione prevista
SELECT 
  'Next scheduled run' as info,
  jobname,
  schedule,
  CASE 
    WHEN EXTRACT(hour FROM NOW()) < 8 THEN date_trunc('day', NOW()) + INTERVAL '8 hours'
    WHEN EXTRACT(hour FROM NOW()) < 12 THEN date_trunc('day', NOW()) + INTERVAL '12 hours'
    WHEN EXTRACT(hour FROM NOW()) < 16 THEN date_trunc('day', NOW()) + INTERVAL '16 hours'
    WHEN EXTRACT(hour FROM NOW()) < 20 THEN date_trunc('day', NOW()) + INTERVAL '20 hours'
    ELSE date_trunc('day', NOW()) + INTERVAL '1 day' + INTERVAL '8 hours'
  END as estimated_next_run
FROM cron.job 
WHERE jobname = 'quantitaizer-fed-data-refresh';

-- ========================================
-- NOTES:
-- ========================================
-- 1. Schedule: '0 8,12,16,20 * * 1-5' = 08:00, 12:00, 16:00, 20:00 UTC (Lun-Ven)
-- 2. Per CET/CEST aggiungi 1-2 ore (es: 08:00 UTC = 09:00/10:00 CET)
-- 3. Per disabilitare: UPDATE cron.job SET active = false WHERE jobname = 'quantitaizer-fed-data-refresh';
-- 4. Per trigger manuale: SELECT cron.schedule_in_database('quantitaizer-fed-data-refresh', 'now', 'postgres');
-- 5. Log esecuzioni: SELECT * FROM cron.job_run_details WHERE jobid = <jobid> ORDER BY start_time DESC;

