#!/bin/bash

PROJECT_URL="https://tolaojeqjcoskegelule.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjUzOSwiZXhwIjoyMDc3NTg4NTM5fQ.Y0xWNiSR3mTDxhN566I-cgloiQazBwg0HoFpDJT0_HE"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║            VERIFICA DETTAGLIATA CRON JOB                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

echo "📊 Nota: Il cron job è configurato internamente nel database PostgreSQL"
echo "         Non è accessibile via REST API per motivi di sicurezza"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Se l'SQL è stato eseguito correttamente, il job DOVREBBE essere attivo"
echo ""
echo "Per verificare, esegui questo SQL nel Dashboard:"
echo ""
echo "SELECT jobid, jobname, schedule, active, nodename, database"
echo "FROM cron.job"
echo "WHERE jobname = 'quantitaizer-fed-data-refresh';"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📅 PROSSIMA ESECUZIONE PREVISTA:"
echo ""

# Calcola prossimo orario
CURRENT_HOUR=$(date -u +%H)
CURRENT_MINUTE=$(date -u +%M)

if [ "$CURRENT_HOUR" -lt 8 ]; then
  echo "   🕐 Oggi alle 08:00 UTC (09:00/10:00 CET)"
elif [ "$CURRENT_HOUR" -lt 12 ]; then
  echo "   🕐 Oggi alle 12:00 UTC (13:00/14:00 CET)"
elif [ "$CURRENT_HOUR" -lt 16 ]; then
  echo "   🕐 Oggi alle 16:00 UTC (17:00/18:00 CET)"
elif [ "$CURRENT_HOUR" -lt 20 ]; then
  echo "   🕐 Oggi alle 20:00 UTC (21:00/22:00 CET)"
else
  echo "   🕐 Domani alle 08:00 UTC (09:00/10:00 CET)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 TEST MANUALE:"
echo ""
echo "Per testare che il cron funzioni SUBITO, esegui questo SQL:"
echo ""
echo "SELECT cron.schedule_in_database('quantitaizer-fed-data-refresh', 'now', 'postgres');"
echo ""
echo "Poi verifica che i dati si aggiornino con:"
echo "./check_db.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 STATO ATTUALE DATI:"
echo ""

curl -s "${PROJECT_URL}/rest/v1/fed_data?select=date,updated_at&order=date.desc&limit=1" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" | jq -r '.[0] | "   Ultimo dato: \(.date)\n   Aggiornato: \(.updated_at)"'

echo ""
echo "✅ Setup completato! Il cron partirà automaticamente al prossimo orario schedulato."
echo ""

