// Supabase Edge Function: Polygon Options Proxy
// Bypasses CORS by fetching Polygon.io server-side
//
// Endpoints:
// - GET /polygon-options?type=monthly  → Monthly options chain (3rd Friday)
// - GET /polygon-options?type=daily    → 0DTE options chain (today)
// - GET /polygon-options?type=full     → Both monthly + 0DTE
//
// Caches results for 60 seconds to respect Polygon rate limits

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const POLYGON_API_KEY = 'D6oi9QYUgc8MjJlYnNcRvMz0A2djLf03';
const BASE_URL = 'https://api.polygon.io';

// Simple in-memory cache (per instance)
const cache: Map<string, { data: any; timestamp: number }> = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get next monthly expiration (3rd Friday)
function getNextMonthlyExpiry(): string {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  
  // Find 3rd Friday of current month
  let firstDay = new Date(year, month, 1);
  let dayOfWeek = firstDay.getDay();
  let thirdFriday = 1 + ((5 - dayOfWeek + 7) % 7) + 14;
  let expiryDate = new Date(year, month, thirdFriday);
  
  // If already passed, get next month
  if (expiryDate <= now) {
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
    firstDay = new Date(year, month, 1);
    dayOfWeek = firstDay.getDay();
    thirdFriday = 1 + ((5 - dayOfWeek + 7) % 7) + 14;
    expiryDate = new Date(year, month, thirdFriday);
  }
  
  const y = expiryDate.getFullYear();
  const m = String(expiryDate.getMonth() + 1).padStart(2, '0');
  const d = String(expiryDate.getDate()).padStart(2, '0');
  
  return `${y}-${m}-${d}`;
}

// Get today's date for 0DTE
function getTodayExpiry(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Fetch from Polygon with retry logic
async function fetchPolygon(endpoint: string, retries = 3): Promise<any> {
  const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apiKey=${POLYGON_API_KEY}`;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);
      
      // Handle rate limit
      if (response.status === 429) {
        console.warn(`⚠️ Rate limit hit, waiting ${(attempt + 1) * 2}s...`);
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
        continue;
      }
      
      const data = await response.json();
      
      if (data.status === 'NOT_AUTHORIZED' || data.status === 'ERROR') {
        console.error('Polygon API Error:', data.message);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error(`Polygon fetch error (attempt ${attempt + 1}):`, error);
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  return null;
}

// Fetch options chain for a specific expiry
async function fetchOptionsChain(expiry: string, spotPrice: number): Promise<any[]> {
  const strikeMin = Math.floor(spotPrice / 5) * 5 - 300;
  const strikeMax = Math.ceil(spotPrice / 5) * 5 + 300;
  
  console.log(`📊 Fetching I:SPX options for ${expiry}, strikes ${strikeMin}-${strikeMax}`);
  
  let allOptions: any[] = [];
  let nextUrl = `/v3/snapshot/options/I:SPX?expiration_date=${expiry}&strike_price.gte=${strikeMin}&strike_price.lte=${strikeMax}&limit=250`;
  let pageCount = 0;
  
  while (nextUrl && allOptions.length < 5000) {
    pageCount++;
    const data = await fetchPolygon(nextUrl);
    
    if (!data?.results) {
      console.warn(`📊 Page ${pageCount}: No results`);
      break;
    }
    
    console.log(`📊 Page ${pageCount}: Got ${data.results.length} contracts`);
    allOptions = allOptions.concat(data.results);
    
    if (data.next_url) {
      nextUrl = data.next_url.replace(BASE_URL, '');
    } else {
      break;
    }
    
    // Small delay between pages
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`📊 Total: ${allOptions.length} contracts for ${expiry}`);
  return allOptions;
}

// Get approximate SPX price from Yahoo (for strike filtering)
async function getApproxSPXPrice(): Promise<number> {
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/ES=F?interval=1d&range=1d',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price && price > 5000 && price < 10000) {
        return price;
      }
    }
  } catch (e) {
    console.warn('Yahoo price fetch failed:', e);
  }
  
  return 6000; // Fallback
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'full';
    
    console.log(`📊 Polygon Options Proxy - type: ${type}`);
    
    // Check cache
    const cacheKey = `options_${type}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✅ Returning cached data');
      return new Response(
        JSON.stringify({ ...cached.data, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get approximate price for filtering
    const spotPrice = await getApproxSPXPrice();
    console.log(`📈 Spot price estimate: ${spotPrice}`);
    
    const result: any = {
      spot_price: spotPrice,
      timestamp: Date.now(),
    };
    
    // Fetch monthly chain
    if (type === 'monthly' || type === 'full') {
      const monthlyExpiry = getNextMonthlyExpiry();
      result.monthly_expiry = monthlyExpiry;
      result.monthly_options = await fetchOptionsChain(monthlyExpiry, spotPrice);
      console.log(`✅ Monthly: ${result.monthly_options.length} contracts`);
    }
    
    // Fetch 0DTE chain
    if (type === 'daily' || type === 'full') {
      const dailyExpiry = getTodayExpiry();
      result.daily_expiry = dailyExpiry;
      
      // For 0DTE, use tighter strike range (±150)
      const strikeMin = Math.floor(spotPrice / 5) * 5 - 150;
      const strikeMax = Math.ceil(spotPrice / 5) * 5 + 150;
      
      const dailyUrl = `/v3/snapshot/options/I:SPX?expiration_date=${dailyExpiry}&strike_price.gte=${strikeMin}&strike_price.lte=${strikeMax}&limit=250`;
      const dailyData = await fetchPolygon(dailyUrl);
      
      result.daily_options = dailyData?.results || [];
      console.log(`✅ Daily (0DTE): ${result.daily_options.length} contracts`);
    }
    
    // Cache the result
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('❌ Error in polygon-options:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: Date.now(),
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

