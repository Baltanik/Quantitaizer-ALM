#!/bin/bash

API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTI1MzksImV4cCI6MjA3NzU4ODUzOX0.8iJ8SHDG5Ffdu5X8ZF6-QSiyIz9iTXKm8uaLXQt_2OI"
URL="https://tolaojeqjcoskegelule.supabase.co"

echo "🔄 Triggering manual fetch..."
curl -v -X POST "${URL}/functions/v1/fetch-fed-data" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"triggered_by":"manual","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
