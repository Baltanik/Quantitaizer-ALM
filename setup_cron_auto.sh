#!/bin/bash
set -e

PROJECT_URL="https://tolaojeqjcoskegelule.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjUzOSwiZXhwIjoyMDc3NTg4NTM5fQ.Y0xWNiSR3mTDxhN566I-cgloiQazBwg0HoFpDJT0_HE"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          SETUP AUTOMATICO CRON JOB VIA API                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Nota: Supabase non espone pg_cron tramite REST API
# Dobbiamo usare la console web SQL Editor

echo "⚠️  IMPORTANTE: pg_cron richiede accesso SQL diretto"
echo ""
echo "Il cron job DEVE essere creato tramite Supabase Dashboard SQL Editor."
echo "Non posso crearlo tramite API REST per limitazioni di sicurezza."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 ESEGUI QUESTI PASSAGGI:"
echo ""
echo "1. Apri: https://supabase.com/dashboard/project/tolaojeqjcoskegelule/sql/new"
echo ""
echo "2. Copia questo SQL nel editor:"

cat > /tmp/cron_setup.sql <<'EOSQL'
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
EOSQL

cat /tmp/cron_setup.sql

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "3. Clicca il pulsante 'RUN' (o Ctrl+Enter)"
echo ""
echo "4. Verifica che l'output mostri:"
echo "   ✅ status='CRON JOB CREATO'"
echo "   ✅ jobname='quantitaizer-fed-data-refresh'"
echo "   ✅ active=true"
echo ""
echo "5. (Opzionale) Per testare subito, esegui anche questo:"
echo "   SELECT cron.schedule_in_database('quantitaizer-fed-data-refresh', 'now', 'postgres');"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 SCHEDULE INFO:"
echo "   - Frequenza: Ogni 4 ore"
echo "   - Orari: 08:00, 12:00, 16:00, 20:00 UTC"
echo "   - In CET/CEST: 09:00/10:00, 13:00/14:00, 17:00/18:00, 21:00/22:00"
echo "   - Giorni: Solo Lun-Ven"
echo ""
echo "🔗 SQL file salvato in: /tmp/cron_setup.sql"
echo ""
echo "✅ Dopo l'esecuzione, verifica con: ./verify_cron.sh"
echo ""

