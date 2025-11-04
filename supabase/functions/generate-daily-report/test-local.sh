#!/bin/bash
# ============================================================================
# TEST SCRIPT - Valida function localmente prima di deploy
# ============================================================================

set -e

echo "🧪 Testing generate-daily-report Edge Function locally..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check Supabase CLI installed
echo "1️⃣  Checking Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Install: brew install supabase/tap/supabase${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Supabase CLI installed${NC}"
echo ""

# 2. Check project linked
echo "2️⃣  Checking project link..."
if ! supabase status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Project not linked. Run: supabase link --project-ref YOUR_PROJECT_ID${NC}"
    echo "   Continuing anyway (will use local DB if available)..."
fi
echo ""

# 3. Start local Supabase (if not running)
echo "3️⃣  Starting local Supabase..."
supabase start || echo -e "${YELLOW}⚠️  Local Supabase already running or using remote${NC}"
echo ""

# 4. Check fed_metrics table has data
echo "4️⃣  Checking fed_metrics data..."
DATA_COUNT=$(supabase db query "SELECT COUNT(*) as count FROM fed_metrics;" 2>/dev/null | grep -oP '\d+' | head -1 || echo "0")

if [ "$DATA_COUNT" -lt 90 ]; then
    echo -e "${YELLOW}⚠️  Warning: Only $DATA_COUNT rows in fed_metrics (need 90+ for full report)${NC}"
else
    echo -e "${GREEN}✅ Found $DATA_COUNT rows in fed_metrics${NC}"
fi

LATEST_DATE=$(supabase db query "SELECT MAX(date) FROM fed_metrics;" 2>/dev/null || echo "N/A")
echo "   Latest data: $LATEST_DATE"
echo ""

# 5. Serve function locally
echo "5️⃣  Serving function locally..."
echo -e "${YELLOW}Starting function server (press Ctrl+C to stop after testing)${NC}"
echo ""

# Start function serve in background
supabase functions serve generate-daily-report --no-verify-jwt &
SERVE_PID=$!

# Wait for server to start
sleep 5

# 6. Trigger function
echo "6️⃣  Triggering function..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" --location 'http://localhost:54321/functions/v1/generate-daily-report' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json')

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP Status: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# 7. Validate response
if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ SUCCESS: Function executed successfully${NC}"
    
    # Extract details
    FILE=$(echo "$BODY" | jq -r '.file' 2>/dev/null || echo "N/A")
    SCENARIO=$(echo "$BODY" | jq -r '.scenario' 2>/dev/null || echo "N/A")
    ALERTS=$(echo "$BODY" | jq -r '.alerts' 2>/dev/null || echo "N/A")
    DURATION=$(echo "$BODY" | jq -r '.duration_ms' 2>/dev/null || echo "N/A")
    
    echo ""
    echo "📊 Report Details:"
    echo "   File: $FILE"
    echo "   Scenario: $SCENARIO"
    echo "   Alerts: $ALERTS"
    echo "   Duration: ${DURATION}ms"
    echo ""
    echo -e "${GREEN}✅ PDF should be in Supabase Storage (bucket: reports)${NC}"
else
    echo -e "${RED}❌ FAILED: HTTP $HTTP_CODE${NC}"
    echo "Check logs above for errors"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
kill $SERVE_PID 2>/dev/null || true

echo ""
echo "✅ Test complete!"
echo ""
echo "Next steps:"
echo "  1. If test passed → Deploy: supabase functions deploy generate-daily-report"
echo "  2. Setup cron trigger in Supabase Dashboard"
echo "  3. Create 'reports' Storage bucket if not exists"

