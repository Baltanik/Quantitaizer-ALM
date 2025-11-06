#!/bin/bash
# Deploy Real-Time Integration - Step by Step
# Data: 6 Novembre 2025

echo "🚀 DEPLOY REAL-TIME DATA INTEGRATION"
echo ""
echo "STEP 1: Ottieni Access Token"
echo "  → Apri: https://supabase.com/dashboard/account/tokens"
echo "  → Copia il token che vedi (inizia con 'sbp_')"
echo ""
read -p "Incolla qui il token: " TOKEN

if [ -z "$TOKEN" ]; then
  echo "❌ Token vuoto! Riprova."
  exit 1
fi

echo ""
echo "STEP 2: Deploy Edge Function..."
export SUPABASE_ACCESS_TOKEN="$TOKEN"

cd /Users/giovannimarascio/Desktop/Quantitaizer

npx supabase functions deploy fetch-fed-data \
  --project-ref tolaojeqjcoskegelule \
  --no-verify-jwt

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ DEPLOY COMPLETATO!"
  echo ""
  echo "STEP 3: Test Immediato"
  echo "Trigghero aggiornamento dati..."
  
  curl -X POST "https://tolaojeqjcoskegelule.supabase.co/functions/v1/fetch-fed-data" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjUzOSwiZXhwIjoyMDc3NTg4NTM5fQ.Y0xWNiSR3mTDxhN566I-cgloiQazBwg0HoFpDJT0_HE" \
    -d '{"triggered_by": "test_realtime_integration"}'
  
  echo ""
  echo ""
  echo "✅ TUTTO FATTO!"
  echo ""
  echo "Controlla i log:"
  echo "  npx supabase functions logs fetch-fed-data --project-ref tolaojeqjcoskegelule"
  echo ""
  echo "Cerca queste righe nei log:"
  echo "  ✅ VIX real-time: XX.XX (Marketdata)"
  echo "  ✅ DXY real-time: XXX.XX (Marketdata)"
  echo "  🔥 VIX OVERRIDE: ..."
  echo "  🔥 DXY OVERRIDE: ..."
else
  echo "❌ Deploy fallito. Verifica il token e riprova."
  exit 1
fi

