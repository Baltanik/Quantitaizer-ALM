#!/bin/bash
set -e

PROJECT_URL="https://tolaojeqjcoskegelule.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjUzOSwiZXhwIjoyMDc3NTg4NTM5fQ.Y0xWNiSR3mTDxhN566I-cgloiQazBwg0HoFpDJT0_HE"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              FIX CRON JOB AUTOMATICO                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Il cron job deve essere creato tramite la console di Supabase o SQL Editor
# perché richiede privilegi speciali (GRANT cron)

echo "📝 ISTRUZIONI PER FIXARE IL CRON JOB:"
echo ""
echo "1. Vai a: https://supabase.com/dashboard/project/tolaojeqjcoskegelule/sql/new"
echo ""
echo "2. Copia e incolla questo SQL:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat <<'SQL'
-- Step 1: Abilita estensioni
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Step 2: Rimuovi job esistente (se presente)
SELECT cron.unschedule('quantitaizer-fed-data-refresh');

-- Step 3: Crea nuovo cron job
SELECT cron.schedule(
  'quantitaizer-fed-data-refresh',
  '0 8,12,16,20 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://tolaojeqjcoskegelule.supabase.co/functions/v1/fetch-fed-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjUzOSwiZXhwIjoyMDc3NTg4NTM5fQ.Y0xWNiSR3mTDxhN566I-cgloiQazBwg0HoFpDJT0_HE"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);

-- Step 4: Verifica creazione
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'quantitaizer-fed-data-refresh';

-- Step 5: Test immediato (opzionale)
-- SELECT cron.schedule_in_database('quantitaizer-fed-data-refresh', 'now', 'postgres');
SQL
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "3. Clicca 'Run' per eseguire"
echo ""
echo "4. Verifica che l'output mostri: jobid, jobname='quantitaizer-fed-data-refresh', active=true"
echo ""
echo "5. (Opzionale) Uncommenta l'ultima riga per testare l'esecuzione immediata"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 SCHEDULE CRON:"
echo "   - 08:00 UTC (09:00/10:00 CET) = Mattina"
echo "   - 12:00 UTC (13:00/14:00 CET) = Pranzo"  
echo "   - 16:00 UTC (17:00/18:00 CET) = Pomeriggio"
echo "   - 20:00 UTC (21:00/22:00 CET) = Sera"
echo "   - Solo giorni lavorativi (Lun-Ven)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Una volta eseguito il SQL, verifica con:"
echo "   ./verify_cron.sh"
echo ""

