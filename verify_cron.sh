#!/bin/bash

SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjUzOSwiZXhwIjoyMDc3NTg4NTM5fQ.Y0xWNiSR3mTDxhN566I-cgloiQazBwg0HoFpDJT0_HE"
PROJECT_URL="https://tolaojeqjcoskegelule.supabase.co"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              VERIFICA CRON JOB CONFIGURATO                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

echo "📝 Verifico stato cron job 'quantitaizer-fed-data-refresh'..."
echo ""

# Query per ottenere info sul cron job
curl -s "${PROJECT_URL}/rest/v1/rpc/get_cron_job_info" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1 | jq || echo "Funzione RPC non disponibile, uso metodo alternativo"

echo ""
echo "📊 Dettagli ultimo aggiornamento dati:"
./check_db.sh

echo ""
echo "✅ Verifica completata!"
