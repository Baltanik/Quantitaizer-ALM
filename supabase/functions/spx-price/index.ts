// Supabase Edge Function: SPX Price + VVIX Proxy
// Bypasses CORS by fetching Yahoo Finance server-side
// Returns: SPX price, VIX, VVIX (volatility of volatility)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to fetch a single Yahoo Finance ticker
async function fetchYahooTicker(symbol: string): Promise<{
  price: number | null;
  previousClose: number | null;
  changePct: number | null;
}> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!response.ok) {
      console.warn(`Yahoo API error for ${symbol}: ${response.status}`);
      return { price: null, previousClose: null, changePct: null };
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result) {
      return { price: null, previousClose: null, changePct: null };
    }

    const meta = result.meta;
    const price = meta?.regularMarketPrice;
    const previousClose = meta?.chartPreviousClose || meta?.previousClose;
    const changePct = previousClose ? ((price - previousClose) / previousClose) * 100 : 0;

    return { price, previousClose, changePct };
  } catch (error) {
    console.warn(`Error fetching ${symbol}:`, error);
    return { price: null, previousClose: null, changePct: null };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📊 Fetching SPX, VIX, VVIX from Yahoo Finance...');
    
    // Fetch all three in parallel for speed
    const [spxData, vixData, vvixData] = await Promise.all([
      fetchYahooTicker('^GSPC'),  // S&P 500
      fetchYahooTicker('^VIX'),   // VIX
      fetchYahooTicker('^VVIX'),  // VVIX (Volatility of VIX)
    ]);

    console.log(`✅ SPX: ${spxData.price}, VIX: ${vixData.price}, VVIX: ${vvixData.price}`);

    // Build response with all data
    const responseData: Record<string, any> = {
      // SPX (primary)
      symbol: '^GSPC',
      price: spxData.price,
      previous_close: spxData.previousClose,
      change_pct: spxData.changePct,
      
      // VIX
      vix: vixData.price,
      vix_previous_close: vixData.previousClose,
      vix_change_pct: vixData.changePct,
      
      // VVIX (Vol of Vol) - key for confidence assessment
      vvix: vvixData.price,
      vvix_previous_close: vvixData.previousClose,
      vvix_change_pct: vvixData.changePct,
      
      // Metadata
      timestamp: new Date().toISOString(),
      source: 'yahoo_finance',
    };

    // Fallback price if SPX failed - try SPY × 10
    if (!spxData.price) {
      console.warn('⚠️ SPX fetch failed, trying SPY fallback...');
      const spyData = await fetchYahooTicker('SPY');
      if (spyData.price) {
        responseData.price = spyData.price * 10;
        responseData.change_pct = spyData.changePct;
        responseData.source = 'spy_fallback';
        console.log(`✅ SPY fallback: ${spyData.price} × 10 = ${responseData.price}`);
      } else {
        responseData.error = 'All price sources failed';
        responseData.source = 'no_data';
        console.error('🚨 CRITICAL: Both SPX and SPY fetch failed!');
      }
    }

    return new Response(
      JSON.stringify(responseData),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('❌ Error fetching market data:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        fallback_price: 6050,
        vix: null,
        vvix: null,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

