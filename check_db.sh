#!/bin/bash

API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTI1MzksImV4cCI6MjA3NzU4ODUzOX0.8iJ8SHDG5Ffdu5X8ZF6-QSiyIz9iTXKm8uaLXQt_2OI"
URL="https://tolaojeqjcoskegelule.supabase.co"

echo "=== ULTIMO AGGIORNAMENTO ==="
curl -s "${URL}/rest/v1/fed_data?select=updated_at,date&order=updated_at.desc&limit=1" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}" | jq

echo -e "\n=== INFO ULTIMO REFRESH ==="
curl -s "${URL}/rest/v1/rpc/get_last_refresh_info" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" | jq

echo -e "\n=== LOG REFRESH (ultimi 5) ==="
curl -s "${URL}/rest/v1/fed_data_refresh_log?select=*&order=triggered_at.desc&limit=5" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}" | jq
