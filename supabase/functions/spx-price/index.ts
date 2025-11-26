// Supabase Edge Function: ES/SPX Price + VIX/VVIX Proxy
// Bypasses CORS by fetching Yahoo Finance server-side
// 
// PRIORITÀ FONTI PREZZO:
// 1. ES=F (E-mini S&P 500 futures) - trada quasi 24h!
// 2. ^GSPC (SPX index) - solo durante market hours
// 3. SPY × 10 - fallback
//
// Returns: price (ES or SPX), VIX, VVIX

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
  marketState: string | null;
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
      return { price: null, previousClose: null, changePct: null, marketState: null };
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result) {
      return { price: null, previousClose: null, changePct: null, marketState: null };
    }

    const meta = result.meta;
    const price = meta?.regularMarketPrice;
    const previousClose = meta?.chartPreviousClose || meta?.previousClose;
    const changePct = previousClose ? ((price - previousClose) / previousClose) * 100 : 0;
    const marketState = meta?.marketState || null; // "REGULAR", "PRE", "POST", "CLOSED"

    return { price, previousClose, changePct, marketState };
  } catch (error) {
    console.warn(`Error fetching ${symbol}:`, error);
    return { price: null, previousClose: null, changePct: null, marketState: null };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📊 Fetching ES, SPX, VIX, VVIX from Yahoo Finance...');
    
    // Fetch all in parallel for speed
    // ES=F is PRIMARY because it trades almost 24h!
    const [esData, spxData, vixData, vvixData] = await Promise.all([
      fetchYahooTicker('ES=F'),   // E-mini S&P 500 Futures (trades ~24h!)
      fetchYahooTicker('^GSPC'),  // S&P 500 Index (closes 4pm ET)
      fetchYahooTicker('^VIX'),   // VIX
      fetchYahooTicker('^VVIX'),  // VVIX (Volatility of VIX)
    ]);

    console.log(`📈 ES: ${esData.price} (${esData.marketState}), SPX: ${spxData.price}, VIX: ${vixData.price}, VVIX: ${vvixData.price}`);

    // Determine best price source
    // Priority: ES (24h) > SPX (market hours) > SPY×10 (fallback)
    let bestPrice: number | null = null;
    let bestChangePct: number | null = null;
    let priceSource = 'unknown';
    let marketState = 'unknown';

    // 1. Try ES futures first (trades almost 24h)
    if (esData.price && esData.price > 5000 && esData.price < 10000) {
      bestPrice = esData.price;
      bestChangePct = esData.changePct;
      priceSource = 'es_futures';
      marketState = esData.marketState || 'unknown';
      console.log(`✅ Using ES futures: ${bestPrice} (${marketState})`);
    }
    // 2. Fallback to SPX index
    else if (spxData.price && spxData.price > 5000 && spxData.price < 10000) {
      bestPrice = spxData.price;
      bestChangePct = spxData.changePct;
      priceSource = 'spx_index';
      marketState = spxData.marketState || 'unknown';
      console.log(`✅ Using SPX index: ${bestPrice} (${marketState})`);
    }
    // 3. Last resort: SPY × 10
    else {
      console.warn('⚠️ ES and SPX failed, trying SPY fallback...');
      const spyData = await fetchYahooTicker('SPY');
      if (spyData.price) {
        bestPrice = spyData.price * 10;
        bestChangePct = spyData.changePct;
        priceSource = 'spy_fallback';
        marketState = spyData.marketState || 'unknown';
        console.log(`✅ SPY fallback: ${spyData.price} × 10 = ${bestPrice}`);
      }
    }

    // Build response
    const responseData: Record<string, any> = {
      // Best price (ES or SPX)
      price: bestPrice,
      change_pct: bestChangePct,
      source: priceSource,
      market_state: marketState,
      
      // ES futures data (separate for reference)
      es_price: esData.price,
      es_change_pct: esData.changePct,
      es_market_state: esData.marketState,
      
      // SPX index data (separate for reference)  
      spx_price: spxData.price,
      spx_change_pct: spxData.changePct,
      spx_market_state: spxData.marketState,
      
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
    };

    if (!bestPrice) {
      responseData.error = 'All price sources failed';
      responseData.fallback_price = 6000;
      console.error('🚨 CRITICAL: All price sources failed!');
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
        fallback_price: 6000,
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

