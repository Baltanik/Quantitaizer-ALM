/**
 * POLYGON/MASSIVE OPTIONS SERVICE
 * 
 * Servizio per fetch dati options SPX da Polygon.io
 * Piano: Options Starter ($29/month)
 */

const POLYGON_API_KEY = 'D6oi9QYUgc8MjJlYnNcRvMz0A2djLf03';
const BASE_URL = 'https://api.polygon.io';

// ============================================================
// TYPES
// ============================================================

export interface OptionContract {
  ticker: string;
  strike_price: number;
  expiration_date: string;
  contract_type: 'call' | 'put';
  open_interest: number;
  volume: number;
  close: number;
  vwap: number;
  // Greeks (calcolati se non forniti)
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  implied_volatility?: number;
}

export interface OptionsChainData {
  underlying_price: number;
  underlying_change_pct: number;
  calls: OptionContract[];
  puts: OptionContract[];
  expiration_date: string;
  timestamp: number;
}

// GEX Level entry
export interface GEXLevel {
  strike: number;
  gex: number;
  type: 'positive' | 'negative';
  callGex: number;
  putGex: number;
}

// Key MM Levels
export interface KeyLevel {
  strike: number;
  type: 'support' | 'resistance' | 'gex_support' | 'gex_resistance' | 'high_volume';
  value: number;  // OI, GEX or Volume value
  label: string;
}

export interface SPXAnalysis {
  // Underlying
  spx_price: number;
  spx_change_pct: number;
  
  // Options Metrics
  put_call_ratio_oi: number;      // OI-based
  put_call_ratio_volume: number;  // Volume-based
  total_call_oi: number;
  total_put_oi: number;
  total_call_volume: number;
  total_put_volume: number;
  
  // Max Pain
  max_pain_strike: number;
  max_pain_value: number;
  
  // Straddle ATM (monthly expiry)
  atm_strike: number;
  straddle_price: number;
  implied_move_pct: number;
  implied_move_points: number;
  
  // Straddle 0DTE
  straddle_0dte_price: number | null;
  straddle_0dte_strike: number | null;
  straddle_0dte_implied_move_pct: number | null;
  straddle_0dte_expiry: string | null;
  
  // Daily Levels (0DTE based)
  daily_put_wall: number | null;
  daily_call_wall: number | null;
  daily_put_wall_oi: number | null;
  daily_call_wall_oi: number | null;
  daily_max_pain: number | null;
  daily_zero_gamma: number | null;
  
  // 0DTE GEX (separate from monthly GEX)
  daily_gex: number | null;
  daily_gex_positioning: 'long_gamma' | 'short_gamma' | 'neutral' | null;
  daily_gex_levels: GEXLevel[] | null; // Top GEX strikes for 0DTE
  
  // 0DTE Volume & OI totals
  daily_total_call_oi: number | null;
  daily_total_put_oi: number | null;
  daily_total_call_volume: number | null;
  daily_total_put_volume: number | null;
  daily_put_call_ratio: number | null;
  
  // Real-time price (from Yahoo)
  realtime_price: number;
  realtime_change_pct: number;
  previous_close: number;
  price_source: string;
  
  // VIX & VVIX (Vol of Vol) for confidence assessment
  vix: number | null;
  vix_change_pct: number | null;
  vvix: number | null;
  vvix_change_pct: number | null;
  
  // 0DTE Reference price
  daily_reference_price: number | null;
  
  // GEX (Gamma Exposure)
  total_gex: number;
  gex_flip_point: number;
  dealer_positioning: 'long_gamma' | 'short_gamma' | 'neutral';
  
  // Key Strikes (legacy)
  highest_call_oi_strike: number;
  highest_put_oi_strike: number;
  
  // === NEW: MM Key Levels ===
  put_wall: number;                    // Supporto MM (max put OI)
  call_wall: number;                   // Resistenza MM (max call OI)
  put_wall_oi: number;                 // OI al put wall
  call_wall_oi: number;                // OI al call wall
  
  // GEX Levels
  gex_levels: GEXLevel[];              // Top 5 GEX strikes (sorted by magnitude)
  max_positive_gex_strike: number;     // Zona di massima stabilità
  max_negative_gex_strike: number;     // Zona di massima volatilità
  zero_gamma_level: number;            // Flip point dettagliato
  
  // High Volume Strikes
  high_volume_strikes: { strike: number; volume: number; type: 'call' | 'put' }[];
  
  // Consolidated Key Levels for display
  key_levels: KeyLevel[];
  
  // Metadata
  expiration_date: string;
  data_timestamp: number;
  contracts_analyzed: number;
}

// ============================================================
// BLACK-SCHOLES GREEKS CALCULATOR
// ============================================================

// Standard normal CDF approximation
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// Standard normal PDF
function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Calculate implied volatility using Newton-Raphson
function calculateIV(
  optionPrice: number,
  spotPrice: number,
  strikePrice: number,
  timeToExpiry: number, // in years
  riskFreeRate: number,
  isCall: boolean
): number {
  if (optionPrice <= 0 || timeToExpiry <= 0) return 0.3; // Default 30% IV
  
  let sigma = 0.3; // Initial guess
  const tolerance = 0.0001;
  const maxIterations = 100;
  
  for (let i = 0; i < maxIterations; i++) {
    const price = blackScholesPrice(spotPrice, strikePrice, timeToExpiry, riskFreeRate, sigma, isCall);
    const vega = blackScholesVega(spotPrice, strikePrice, timeToExpiry, riskFreeRate, sigma);
    
    if (Math.abs(vega) < 0.0001) break;
    
    const diff = price - optionPrice;
    if (Math.abs(diff) < tolerance) break;
    
    sigma = sigma - diff / vega;
    if (sigma <= 0) sigma = 0.01;
    if (sigma > 5) sigma = 5;
  }
  
  return sigma;
}

function blackScholesPrice(
  S: number, K: number, T: number, r: number, sigma: number, isCall: boolean
): number {
  if (T <= 0) return isCall ? Math.max(0, S - K) : Math.max(0, K - S);
  
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  if (isCall) {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  }
}

function blackScholesVega(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0) return 0;
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  return S * normalPDF(d1) * Math.sqrt(T);
}

function blackScholesDelta(S: number, K: number, T: number, r: number, sigma: number, isCall: boolean): number {
  if (T <= 0) return isCall ? (S > K ? 1 : 0) : (S < K ? -1 : 0);
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  return isCall ? normalCDF(d1) : normalCDF(d1) - 1;
}

function blackScholesGamma(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0 || S <= 0) return 0;
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  return normalPDF(d1) / (S * sigma * Math.sqrt(T));
}

// ============================================================
// API FUNCTIONS
// ============================================================

// Rate limiter - evita 429 errors
let lastCallTime = 0;
const MIN_CALL_INTERVAL = 250; // 250ms tra chiamate (4 calls/sec max)

async function fetchPolygon(endpoint: string, retries = 3): Promise<any> {
  // Rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < MIN_CALL_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_CALL_INTERVAL - timeSinceLastCall));
  }
  lastCallTime = Date.now();
  
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

// Get SPX price - tries multiple sources
export async function getSPXPrice(): Promise<{ price: number; change_pct: number } | null> {
  // Try SPY first (SPX ≈ SPY × 10)
  const spyData = await fetchPolygon('/v2/aggs/ticker/SPY/prev');
  
  if (spyData?.results?.[0]) {
    const spy = spyData.results[0];
    const spyPrice = spy.c; // close
    const spxPrice = spyPrice * 10;
    const changePct = ((spy.c - spy.o) / spy.o) * 100;
    
    console.log(`📈 SPX price from SPY: ${spxPrice.toFixed(2)}`);
    
    return {
      price: spxPrice,
      change_pct: changePct
    };
  }
  
  // Fallback: estimate from recent known values
  console.warn('⚠️ Could not fetch SPY, using fallback SPX estimate');
  return {
    price: 6050, // Approximate current SPX level
    change_pct: 0
  };
}

// Get SPX price via Supabase Edge Function (bypasses CORS)
const SUPABASE_URL = "https://tolaojeqjcoskegelule.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTI1MzksImV4cCI6MjA3NzU4ODUzOX0.8iJ8SHDG5Ffdu5X8ZF6-QSiyIz9iTXKm8uaLXQt_2OI";

// Extended return type for Yahoo proxy including VIX and VVIX
interface YahooProxyResult {
  price: number;
  change_pct: number;
  vix: number | null;
  vix_change_pct: number | null;
  vvix: number | null;
  vvix_change_pct: number | null;
}

async function fetchSPXFromYahoo(): Promise<YahooProxyResult | null> {
  try {
    // Use Supabase Edge Function to bypass CORS
    const response = await fetch(`${SUPABASE_URL}/functions/v1/spx-price`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn('SPX price proxy failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.price) {
      console.log(`📈 SPX from proxy: ${data.price.toFixed(2)} (${data.change_pct >= 0 ? '+' : ''}${data.change_pct.toFixed(2)}%)`);
      if (data.vvix) {
        console.log(`📊 VVIX: ${data.vvix.toFixed(2)} (Vol of Vol)`);
      }
      return { 
        price: data.price, 
        change_pct: data.change_pct,
        vix: data.vix || null,
        vix_change_pct: data.vix_change_pct || null,
        vvix: data.vvix || null,
        vvix_change_pct: data.vvix_change_pct || null
      };
    }
    
    // Use fallback from edge function if main price failed
    if (data.fallback_price) {
      console.warn('Using edge function fallback price:', data.fallback_price);
      return { 
        price: data.fallback_price, 
        change_pct: 0,
        vix: data.vix || null,
        vix_change_pct: null,
        vvix: data.vvix || null,
        vvix_change_pct: null
      };
    }
    
    return null;
  } catch (error) {
    console.warn('SPX price proxy error:', error);
    return null;
  }
}

// Extract SPX price from options underlying asset data
function extractUnderlyingPrice(options: any[]): number | null {
  for (const opt of options) {
    // Try underlying_asset.price first
    if (opt.underlying_asset?.price) {
      console.log(`📈 Found underlying price in options: ${opt.underlying_asset.price}`);
      return opt.underlying_asset.price;
    }
  }
  return null;
}

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
  
  return expiryDate.toISOString().split('T')[0];
}

// Get today's date for 0DTE
function getTodayExpiry(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Daily levels result
interface DailyLevels {
  straddle_price: number | null;
  straddle_strike: number | null;
  implied_move_pct: number | null;
  put_wall: number | null;
  call_wall: number | null;
  put_wall_oi: number | null;
  call_wall_oi: number | null;
  max_pain: number | null;
  zero_gamma: number | null;
  reference_price: number; // Previous close used as reference
  expiry: string;
  // 0DTE GEX (separate from monthly)
  daily_gex: number | null;
  daily_gex_positioning: 'long_gamma' | 'short_gamma' | 'neutral' | null;
  daily_gex_levels: GEXLevel[]; // Top GEX strikes for 0DTE
  // 0DTE Volume & OI totals
  daily_total_call_oi: number;
  daily_total_put_oi: number;
  daily_total_call_volume: number;
  daily_total_put_volume: number;
  daily_put_call_ratio: number | null;
}

// Fetch 0DTE / Daily levels (full analysis)
// LOGICA CORRETTA: usa previous close come reference per ATM
async function fetchDailyLevels(currentPrice: number, previousClose: number): Promise<DailyLevels | null> {
  const expiry = getTodayExpiry();
  
  // Reference price = previous close (come fanno i trader 0DTE)
  const refPrice = previousClose || currentPrice;
  console.log(`📊 Fetching 0DTE levels for ${expiry}, ref price (prev close): ${refPrice.toFixed(2)}`);
  
  try {
    // Fetch 0DTE options NEAR ATM (±150 points for best data)
    const strikeMin = Math.floor(refPrice / 5) * 5 - 150;
    const strikeMax = Math.ceil(refPrice / 5) * 5 + 150;
    
    const url = `/v3/snapshot/options/SPX?expiration_date=${expiry}&strike_price.gte=${strikeMin}&strike_price.lte=${strikeMax}&limit=250`;
    const data = await fetchPolygon(url);
    
    if (!data?.results || data.results.length === 0) {
      console.log('📊 No 0DTE options found (market closed or no expiry today)');
      return null;
    }
    
    const calls: any[] = [];
    const puts: any[] = [];
    
    for (const opt of data.results) {
      const type = opt.details?.contract_type;
      if (type === 'call') calls.push(opt);
      else if (type === 'put') puts.push(opt);
    }
    
    console.log(`📊 0DTE: Found ${calls.length} calls, ${puts.length} puts near ATM (${strikeMin}-${strikeMax})`);
    
    // Calculate 0DTE totals (Volume & OI)
    let dailyTotalCallOI = 0, dailyTotalPutOI = 0;
    let dailyTotalCallVol = 0, dailyTotalPutVol = 0;
    
    for (const c of calls) {
      dailyTotalCallOI += c.open_interest || 0;
      dailyTotalCallVol += c.day?.volume || 0;
    }
    for (const p of puts) {
      dailyTotalPutOI += p.open_interest || 0;
      dailyTotalPutVol += p.day?.volume || 0;
    }
    
    const dailyPCRatio = dailyTotalCallOI > 0 ? dailyTotalPutOI / dailyTotalCallOI : null;
    console.log(`📊 0DTE Totals: Call OI ${dailyTotalCallOI}, Put OI ${dailyTotalPutOI}, P/C ${dailyPCRatio?.toFixed(2) || 'N/A'}`);
    
    // ATM Strike = closest to previous close (reference)
    const atmStrike = Math.round(refPrice / 5) * 5;
    console.log(`📊 0DTE ATM Strike (ref based): ${atmStrike}`);
    
    // Calculate Walls - Use VOLUME for 0DTE (more relevant than OI for intraday)
    // Call Wall = highest call volume (resistance)
    // Put Wall = highest put volume (support)
    let maxCallVol = 0, callWallVol = 0, callWallOI = 0;
    let maxPutVol = 0, putWallVol = 0, putWallOI = 0;
    let maxCallOI = 0, callWallByOI = 0;
    let maxPutOI = 0, putWallByOI = 0;
    
    for (const c of calls) {
      const vol = c.day?.volume || 0;
      const oi = c.open_interest || 0;
      const strike = c.details?.strike_price || 0;
      
      // Above current price = potential resistance
      if (strike >= refPrice) {
        if (vol > maxCallVol) {
          maxCallVol = vol;
          callWallVol = strike;
          callWallOI = oi;
        }
        if (oi > maxCallOI) {
          maxCallOI = oi;
          callWallByOI = strike;
        }
      }
    }
    
    for (const p of puts) {
      const vol = p.day?.volume || 0;
      const oi = p.open_interest || 0;
      const strike = p.details?.strike_price || 0;
      
      // Below current price = potential support
      if (strike <= refPrice) {
        if (vol > maxPutVol) {
          maxPutVol = vol;
          putWallVol = strike;
          putWallOI = oi;
        }
        if (oi > maxPutOI) {
          maxPutOI = oi;
          putWallByOI = strike;
        }
      }
    }
    
    // Use volume-based walls (more relevant for 0DTE)
    const callWall = callWallVol || callWallByOI;
    const putWall = putWallVol || putWallByOI;
    
    console.log(`📊 0DTE Walls by Volume: Put ${putWallVol} (vol: ${maxPutVol}), Call ${callWallVol} (vol: ${maxCallVol})`);
    console.log(`📊 0DTE Walls by OI: Put ${putWallByOI} (oi: ${maxPutOI}), Call ${callWallByOI} (oi: ${maxCallOI})`);
    
    // Find ATM straddle (closest to reference price)
    let atmCall: any = null;
    let atmPut: any = null;
    let minDiff = Infinity;
    
    for (const c of calls) {
      const strike = c.details?.strike_price;
      const diff = Math.abs(strike - refPrice);
      if (diff < minDiff) {
        minDiff = diff;
        atmCall = c;
        atmPut = puts.find((p: any) => p.details?.strike_price === strike);
      }
    }
    
    let straddlePrice = null;
    let straddleStrike = null;
    let impliedMove = null;
    
    if (atmCall && atmPut) {
      straddleStrike = atmCall.details.strike_price;
      const callPrice = atmCall.day?.close || atmCall.day?.vwap || 0;
      const putPrice = atmPut.day?.close || atmPut.day?.vwap || 0;
      straddlePrice = callPrice + putPrice;
      impliedMove = refPrice > 0 ? (straddlePrice / refPrice) * 100 : 0;
      console.log(`📊 0DTE Straddle @ ${straddleStrike}: $${straddlePrice.toFixed(2)} (±${impliedMove.toFixed(2)}%)`);
    }
    
    // Calculate Max Pain
    let maxPain = refPrice;
    let minPainValue = Infinity;
    const strikes = new Set<number>();
    calls.forEach((c: any) => strikes.add(c.details?.strike_price));
    puts.forEach((p: any) => strikes.add(p.details?.strike_price));
    
    for (const strike of strikes) {
      let pain = 0;
      for (const c of calls) {
        const s = c.details?.strike_price;
        const oi = c.open_interest || 0;
        if (strike > s) pain += (strike - s) * oi * 100;
      }
      for (const p of puts) {
        const s = p.details?.strike_price;
        const oi = p.open_interest || 0;
        if (strike < s) pain += (s - strike) * oi * 100;
      }
      if (pain < minPainValue) {
        minPainValue = pain;
        maxPain = strike;
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // CALCULATE 0DTE GEX (Gamma Exposure for intraday)
    // 
    // Per 0DTE, il gamma è MOLTO alto vicino ad ATM e decay rapidamente.
    // Usiamo un approccio semplificato basato su:
    // 1. IV implicita dallo straddle (se disponibile)
    // 2. Gamma approssimato con formula standard
    // 3. Scaling per evitare numeri assurdi
    // ═══════════════════════════════════════════════════════════════
    let dailyGex = 0;
    const dailyGexByStrike: Map<number, { total: number; call: number; put: number }> = new Map();
    
    // Risk-free rate (Fed Funds Target midpoint as of Nov 2025)
    const riskFreeRate = 0.04625; // (4.50% + 4.75%) / 2
    
    // Calculate time to expiry in years (minimum 1 hour to avoid division issues)
    const now = new Date();
    const marketCloseToday = new Date(now);
    marketCloseToday.setHours(16, 0, 0, 0);
    const hoursToExpiry = Math.max(1, (marketCloseToday.getTime() - now.getTime()) / (1000 * 60 * 60));
    const timeToExpiry = hoursToExpiry / (365 * 24); // In years, minimum ~0.0001
    
    // Use IV from straddle if available, otherwise estimate
    // IV = straddle_price / spot / sqrt(T * 365) (annualized)
    const straddleIV = straddlePrice && straddlePrice > 0 
      ? Math.min(2, Math.max(0.1, straddlePrice / refPrice / Math.sqrt(timeToExpiry)))
      : 0.25; // Default 25% IV
    
    console.log(`📊 0DTE IV estimate: ${(straddleIV * 100).toFixed(1)}%, T=${(timeToExpiry * 365 * 24).toFixed(1)}h`);
    
    for (const c of calls) {
      const strike = c.details?.strike_price || 0;
      const oi = c.open_interest || 0;
      
      if (strike > 0 && oi > 0) {
        // Moneyness adjustment for IV skew
        const moneyness = strike / refPrice;
        const iv = straddleIV * (1 + 0.1 * Math.abs(1 - moneyness)); // Simple skew
        
        // Black-Scholes gamma
        const sqrtT = Math.sqrt(timeToExpiry);
        const d1 = (Math.log(refPrice / strike) + (riskFreeRate + iv * iv / 2) * timeToExpiry) / (iv * sqrtT);
        const gamma = Math.exp(-0.5 * d1 * d1) / (Math.sqrt(2 * Math.PI) * refPrice * iv * sqrtT);
        
        // Cap gamma to avoid crazy values for very short expiry
        const cappedGamma = Math.min(gamma, 0.01); // Max gamma = 0.01
        
        // Dealer is SHORT calls → negative GEX contribution
        const callGex = -cappedGamma * oi * 100 * refPrice * refPrice / 1e9;
        dailyGex += callGex;
        
        // Track by strike
        const existing = dailyGexByStrike.get(strike) || { total: 0, call: 0, put: 0 };
        dailyGexByStrike.set(strike, {
          total: existing.total + callGex,
          call: existing.call + callGex,
          put: existing.put
        });
      }
    }
    
    for (const p of puts) {
      const strike = p.details?.strike_price || 0;
      const oi = p.open_interest || 0;
      
      if (strike > 0 && oi > 0) {
        // Moneyness adjustment for IV skew
        const moneyness = strike / refPrice;
        const iv = straddleIV * (1 + 0.1 * Math.abs(1 - moneyness)); // Simple skew
        
        // Black-Scholes gamma
        const sqrtT = Math.sqrt(timeToExpiry);
        const d1 = (Math.log(refPrice / strike) + (riskFreeRate + iv * iv / 2) * timeToExpiry) / (iv * sqrtT);
        const gamma = Math.exp(-0.5 * d1 * d1) / (Math.sqrt(2 * Math.PI) * refPrice * iv * sqrtT);
        
        // Cap gamma to avoid crazy values
        const cappedGamma = Math.min(gamma, 0.01);
        
        // Dealer is LONG puts → positive GEX contribution
        const putGex = cappedGamma * oi * 100 * refPrice * refPrice / 1e9;
        dailyGex += putGex;
        
        // Track by strike
        const existing = dailyGexByStrike.get(strike) || { total: 0, call: 0, put: 0 };
        dailyGexByStrike.set(strike, {
          total: existing.total + putGex,
          call: existing.call,
          put: existing.put + putGex
        });
      }
    }
    
    // Build 0DTE GEX levels array sorted by absolute magnitude
    const dailyGexLevels: GEXLevel[] = Array.from(dailyGexByStrike.entries())
      .map(([strike, data]) => ({
        strike,
        gex: data.total,
        type: data.total >= 0 ? 'positive' as const : 'negative' as const,
        callGex: data.call,
        putGex: data.put
      }))
      .sort((a, b) => Math.abs(b.gex) - Math.abs(a.gex))
      .slice(0, 10);  // Top 10 GEX strikes
    
    // Determine 0DTE positioning
    const dailyPositioning: 'long_gamma' | 'short_gamma' | 'neutral' = 
      dailyGex > 0.5 ? 'long_gamma' : 
      dailyGex < -0.5 ? 'short_gamma' : 
      'neutral';
    
    console.log(`📊 0DTE GEX: ${dailyGex.toFixed(2)}B (${dailyPositioning}), ${dailyGexLevels.length} strike levels`);
    console.log(`✅ 0DTE Levels: Put Wall ${putWall}, Call Wall ${callWall}, Max Pain ${maxPain}, Straddle ${straddleStrike}`);
    
    return {
      straddle_price: straddlePrice,
      straddle_strike: straddleStrike,
      implied_move_pct: impliedMove,
      put_wall: putWall || null,
      call_wall: callWall || null,
      put_wall_oi: putWallOI || maxPutOI || null,
      call_wall_oi: callWallOI || maxCallOI || null,
      max_pain: maxPain,
      zero_gamma: straddleStrike || refPrice,
      reference_price: refPrice,
      expiry,
      daily_gex: dailyGex,
      daily_gex_positioning: dailyPositioning,
      daily_gex_levels: dailyGexLevels, // Top GEX strikes for 0DTE
      // 0DTE Volume & OI totals
      daily_total_call_oi: dailyTotalCallOI,
      daily_total_put_oi: dailyTotalPutOI,
      daily_total_call_volume: dailyTotalCallVol,
      daily_total_put_volume: dailyTotalPutVol,
      daily_put_call_ratio: dailyPCRatio
    };
  } catch (error) {
    console.warn('Error fetching 0DTE levels:', error);
    return null;
  }
}

// Fetch SPX options chain
export async function fetchSPXOptionsChain(expirationDate?: string): Promise<OptionsChainData | null> {
  const expiry = expirationDate || getNextMonthlyExpiry();
  
  console.log(`📊 Fetching SPX options chain for expiry: ${expiry}`);
  
  // Fetch all options for this expiry (paginated)
  let allOptions: any[] = [];
  let nextUrl = `/v3/snapshot/options/SPX?expiration_date=${expiry}&limit=250`;
  
  while (nextUrl && allOptions.length < 2000) {
    const data = await fetchPolygon(nextUrl);
    if (!data?.results) break;
    
    allOptions = allOptions.concat(data.results);
    
    // Check for pagination
    if (data.next_url) {
      nextUrl = data.next_url.replace(BASE_URL, '');
    } else {
      break;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`📊 Fetched ${allOptions.length} option contracts`);
  
  if (allOptions.length === 0) return null;
  
  // Try multiple sources for SPX price
  let underlyingPrice: number | null = null;
  let priceChangePct = 0;
  let priceSource = '';
  
  // 1. Try extracting from options data
  underlyingPrice = extractUnderlyingPrice(allOptions);
  if (underlyingPrice) {
    priceSource = 'polygon_underlying';
  }
  
  // 2. Fallback to Yahoo Finance (free, accurate)
  if (!underlyingPrice) {
    const yahooData = await fetchSPXFromYahoo();
    if (yahooData) {
      underlyingPrice = yahooData.price;
      priceChangePct = yahooData.change_pct;
      priceSource = 'yahoo_finance';
    }
  }
  
  // 3. Last resort: use SPY × 10 from Polygon  
  if (!underlyingPrice) {
    const spyFallback = await getSPXPrice();
    if (spyFallback) {
      underlyingPrice = spyFallback.price;
      priceChangePct = spyFallback.change_pct;
      priceSource = 'spy_fallback';
      console.warn('⚠️ Using SPY×10 fallback for SPX price');
    } else {
      // Absolute last resort - this should NEVER happen in production
      underlyingPrice = 6000; // Conservative estimate
      priceSource = 'emergency_fallback';
      console.error('🚨 CRITICAL: All price sources failed! Using emergency fallback');
    }
  }
  
  console.log(`📈 Using SPX price: ${underlyingPrice.toFixed(2)} (source: ${priceSource})`);
  
  // Parse options
  const calls: OptionContract[] = [];
  const puts: OptionContract[] = [];
  
  // Risk-free rate approximation (Fed Funds Target Rate as of late 2025)
  // TODO: In production, fetch from FRED API: https://fred.stlouisfed.org/series/DFF
  // For now using current Fed target midpoint. Update if Fed changes rates significantly.
  const CURRENT_FED_TARGET_UPPER = 0.0475; // 4.75% as of Nov 2025
  const CURRENT_FED_TARGET_LOWER = 0.0450; // 4.50% as of Nov 2025
  const riskFreeRate = (CURRENT_FED_TARGET_UPPER + CURRENT_FED_TARGET_LOWER) / 2;
  const now = new Date();
  const expiryDate = new Date(expiry);
  const timeToExpiry = Math.max(0.001, (expiryDate.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000));
  
  let greeksFromApi = 0;
  let greeksCalculated = 0;
  
  for (const opt of allOptions) {
    const details = opt.details;
    const day = opt.day || {};
    const apiGreeks = opt.greeks || {};
    
    const contract: OptionContract = {
      ticker: details.ticker,
      strike_price: details.strike_price,
      expiration_date: details.expiration_date,
      contract_type: details.contract_type,
      open_interest: opt.open_interest || 0,
      volume: day.volume || 0,
      close: day.close || 0,
      vwap: day.vwap || day.close || 0
    };
    
    // Use Greeks from API if available
    if (apiGreeks.delta !== undefined && apiGreeks.gamma !== undefined) {
      contract.delta = apiGreeks.delta;
      contract.gamma = apiGreeks.gamma;
      contract.theta = apiGreeks.theta;
      contract.vega = apiGreeks.vega;
      contract.implied_volatility = opt.implied_volatility || 0.3;
      greeksFromApi++;
    } 
    // Calculate Greeks with Black-Scholes as fallback
    else if (contract.close > 0 && contract.strike_price > 0) {
      const isCall = contract.contract_type === 'call';
      
      // Calculate IV from price
      const iv = calculateIV(
        contract.close,
        underlyingPrice,
        contract.strike_price,
        timeToExpiry,
        riskFreeRate,
        isCall
      );
      
      contract.implied_volatility = iv;
      contract.delta = blackScholesDelta(underlyingPrice, contract.strike_price, timeToExpiry, riskFreeRate, iv, isCall);
      contract.gamma = blackScholesGamma(underlyingPrice, contract.strike_price, timeToExpiry, riskFreeRate, iv);
      greeksCalculated++;
    }
    
    if (contract.contract_type === 'call') {
      calls.push(contract);
    } else {
      puts.push(contract);
    }
  }
  
  console.log(`📊 Greeks: ${greeksFromApi} from API, ${greeksCalculated} calculated`);
  
  // Sort by strike
  calls.sort((a, b) => a.strike_price - b.strike_price);
  puts.sort((a, b) => a.strike_price - b.strike_price);
  
  return {
    underlying_price: underlyingPrice,
    underlying_change_pct: priceChangePct,
    calls,
    puts,
    expiration_date: expiry,
    timestamp: Date.now()
  };
}

// ============================================================
// ANALYSIS FUNCTIONS
// ============================================================

// Calculate Max Pain
function calculateMaxPain(calls: OptionContract[], puts: OptionContract[]): { strike: number; value: number } {
  // Get all unique strikes
  const strikes = new Set<number>();
  calls.forEach(c => strikes.add(c.strike_price));
  puts.forEach(p => strikes.add(p.strike_price));
  
  let minPain = Infinity;
  let maxPainStrike = 0;
  
  for (const strike of strikes) {
    let totalPain = 0;
    
    // Pain for call holders (they lose if price < strike)
    for (const call of calls) {
      if (strike > call.strike_price) {
        totalPain += (strike - call.strike_price) * call.open_interest * 100;
      }
    }
    
    // Pain for put holders (they lose if price > strike)
    for (const put of puts) {
      if (strike < put.strike_price) {
        totalPain += (put.strike_price - strike) * put.open_interest * 100;
      }
    }
    
    if (totalPain < minPain) {
      minPain = totalPain;
      maxPainStrike = strike;
    }
  }
  
  return { strike: maxPainStrike, value: minPain };
}

// Calculate GEX (Gamma Exposure) with detailed levels
interface GEXResult {
  totalGEX: number;
  flipPoint: number;
  positioning: 'long_gamma' | 'short_gamma' | 'neutral';
  levels: GEXLevel[];
  maxPositiveStrike: number;
  maxNegativeStrike: number;
}

function calculateGEX(
  calls: OptionContract[], 
  puts: OptionContract[], 
  spotPrice: number
): GEXResult {
  let totalGEX = 0;
  const gexByStrike: Map<number, { total: number; call: number; put: number }> = new Map();
  
  // GEX = Gamma × OI × 100 × Spot²
  // Calls: dealers are short, so positive gamma = negative GEX for dealers
  // Puts: dealers are long, so negative gamma = negative GEX for dealers
  
  for (const call of calls) {
    if (call.gamma && call.open_interest > 0) {
      const gex = -call.gamma * call.open_interest * 100 * spotPrice * spotPrice / 1e9;
      totalGEX += gex;
      
      const existing = gexByStrike.get(call.strike_price) || { total: 0, call: 0, put: 0 };
      gexByStrike.set(call.strike_price, {
        total: existing.total + gex,
        call: existing.call + gex,
        put: existing.put
      });
    }
  }
  
  for (const put of puts) {
    if (put.gamma && put.open_interest > 0) {
      const gex = put.gamma * put.open_interest * 100 * spotPrice * spotPrice / 1e9;
      totalGEX += gex;
      
      const existing = gexByStrike.get(put.strike_price) || { total: 0, call: 0, put: 0 };
      gexByStrike.set(put.strike_price, {
        total: existing.total + gex,
        call: existing.call,
        put: existing.put + gex
      });
    }
  }
  
  // Find flip point (where cumulative GEX changes sign)
  let flipPoint = spotPrice;
  let cumulativeGEX = 0;
  const sortedStrikes = Array.from(gexByStrike.keys()).sort((a, b) => a - b);
  
  for (const strike of sortedStrikes) {
    const prevCumulative = cumulativeGEX;
    cumulativeGEX += gexByStrike.get(strike)?.total || 0;
    
    if ((prevCumulative <= 0 && cumulativeGEX > 0) || (prevCumulative >= 0 && cumulativeGEX < 0)) {
      flipPoint = strike;
    }
  }
  
  // Build GEX levels array sorted by absolute magnitude
  const gexLevels: GEXLevel[] = Array.from(gexByStrike.entries())
    .map(([strike, data]) => ({
      strike,
      gex: data.total,
      type: data.total >= 0 ? 'positive' as const : 'negative' as const,
      callGex: data.call,
      putGex: data.put
    }))
    .sort((a, b) => Math.abs(b.gex) - Math.abs(a.gex))
    .slice(0, 10);  // Top 10 GEX strikes
  
  // Find max positive and negative GEX strikes
  let maxPositiveGex = 0, maxPositiveStrike = spotPrice;
  let maxNegativeGex = 0, maxNegativeStrike = spotPrice;
  
  for (const [strike, data] of gexByStrike.entries()) {
    if (data.total > maxPositiveGex) {
      maxPositiveGex = data.total;
      maxPositiveStrike = strike;
    }
    if (data.total < maxNegativeGex) {
      maxNegativeGex = data.total;
      maxNegativeStrike = strike;
    }
  }
  
  const positioning = totalGEX > 0.5 ? 'long_gamma' : totalGEX < -0.5 ? 'short_gamma' : 'neutral';
  
  return { 
    totalGEX, 
    flipPoint, 
    positioning,
    levels: gexLevels,
    maxPositiveStrike,
    maxNegativeStrike
  };
}

// Calculate Put Wall and Call Wall (MM Support/Resistance)
function calculateWalls(calls: OptionContract[], puts: OptionContract[]): {
  putWall: number;
  putWallOI: number;
  callWall: number;
  callWallOI: number;
} {
  let maxPutOI = 0, putWall = 0;
  let maxCallOI = 0, callWall = 0;
  
  for (const put of puts) {
    if (put.open_interest > maxPutOI) {
      maxPutOI = put.open_interest;
      putWall = put.strike_price;
    }
  }
  
  for (const call of calls) {
    if (call.open_interest > maxCallOI) {
      maxCallOI = call.open_interest;
      callWall = call.strike_price;
    }
  }
  
  return { putWall, putWallOI: maxPutOI, callWall, callWallOI: maxCallOI };
}

// Calculate High Volume Strikes
function calculateHighVolumeStrikes(
  calls: OptionContract[], 
  puts: OptionContract[], 
  topN: number = 5
): { strike: number; volume: number; type: 'call' | 'put' }[] {
  const allStrikes: { strike: number; volume: number; type: 'call' | 'put' }[] = [];
  
  for (const call of calls) {
    if (call.volume > 0) {
      allStrikes.push({ strike: call.strike_price, volume: call.volume, type: 'call' });
    }
  }
  
  for (const put of puts) {
    if (put.volume > 0) {
      allStrikes.push({ strike: put.strike_price, volume: put.volume, type: 'put' });
    }
  }
  
  return allStrikes
    .sort((a, b) => b.volume - a.volume)
    .slice(0, topN);
}

// Build consolidated Key Levels array for display
function buildKeyLevels(
  spotPrice: number,
  putWall: number,
  putWallOI: number,
  callWall: number,
  callWallOI: number,
  gexLevels: GEXLevel[],
  flipPoint: number
): KeyLevel[] {
  const levels: KeyLevel[] = [];
  
  // Add Put Wall (Support)
  levels.push({
    strike: putWall,
    type: 'support',
    value: putWallOI,
    label: 'Put Wall (Support)'
  });
  
  // Add Call Wall (Resistance)
  levels.push({
    strike: callWall,
    type: 'resistance',
    value: callWallOI,
    label: 'Call Wall (Resistance)'
  });
  
  // Add top GEX levels
  const topPositive = gexLevels.filter(g => g.type === 'positive').slice(0, 2);
  const topNegative = gexLevels.filter(g => g.type === 'negative').slice(0, 2);
  
  for (const g of topPositive) {
    levels.push({
      strike: g.strike,
      type: 'gex_support',
      value: g.gex,
      label: `GEX+ (Stabilità)`
    });
  }
  
  for (const g of topNegative) {
    levels.push({
      strike: g.strike,
      type: 'gex_resistance',
      value: Math.abs(g.gex),
      label: `GEX- (Volatilità)`
    });
  }
  
  // Sort by distance from spot
  return levels.sort((a, b) => a.strike - b.strike);
}

// Find ATM strike and calculate straddle
function calculateStraddleATM(
  calls: OptionContract[], 
  puts: OptionContract[], 
  spotPrice: number
): { strike: number; price: number; impliedMove: number } {
  // Find ATM strike (closest to spot)
  let atmStrike = 0;
  let minDiff = Infinity;
  
  for (const call of calls) {
    const diff = Math.abs(call.strike_price - spotPrice);
    if (diff < minDiff) {
      minDiff = diff;
      atmStrike = call.strike_price;
    }
  }
  
  // Get ATM call and put prices
  const atmCall = calls.find(c => c.strike_price === atmStrike);
  const atmPut = puts.find(p => p.strike_price === atmStrike);
  
  const callPrice = atmCall?.close || 0;
  const putPrice = atmPut?.close || 0;
  const straddlePrice = callPrice + putPrice;
  
  const impliedMove = spotPrice > 0 ? (straddlePrice / spotPrice) * 100 : 0;
  
  return { strike: atmStrike, price: straddlePrice, impliedMove };
}

// ============================================================
// MAIN ANALYSIS FUNCTION
// ============================================================

export async function analyzeSPXOptions(expirationDate?: string): Promise<SPXAnalysis | null> {
  console.log('🔍 Starting SPX Options Analysis...');
  
  // Fetch chain
  const chain = await fetchSPXOptionsChain(expirationDate);
  if (!chain) {
    console.error('❌ Failed to fetch options chain');
    return null;
  }
  
  const { calls, puts, underlying_price: spotPrice, underlying_change_pct: changePct, expiration_date } = chain;
  
  console.log(`📊 Analyzing ${calls.length} calls and ${puts.length} puts at SPX ${spotPrice.toFixed(2)} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`);
  
  // Calculate Put/Call ratios
  const totalCallOI = calls.reduce((sum, c) => sum + c.open_interest, 0);
  const totalPutOI = puts.reduce((sum, p) => sum + p.open_interest, 0);
  const totalCallVolume = calls.reduce((sum, c) => sum + c.volume, 0);
  const totalPutVolume = puts.reduce((sum, p) => sum + p.volume, 0);
  
  const putCallRatioOI = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;
  const putCallRatioVolume = totalCallVolume > 0 ? totalPutVolume / totalCallVolume : 0;
  
  // Max Pain
  const maxPain = calculateMaxPain(calls, puts);
  
  // GEX (now returns detailed levels)
  const gex = calculateGEX(calls, puts, spotPrice);
  
  // Get real-time price from Yahoo (more accurate than Polygon EOD)
  // Now also includes VIX and VVIX for confidence assessment
  const realtimeData = await fetchSPXFromYahoo();
  const realtimePrice = realtimeData?.price || spotPrice;
  const realtimeChangePct = realtimeData?.change_pct || changePct;
  const previousClose = realtimeData ? (realtimePrice / (1 + realtimeChangePct / 100)) : spotPrice;
  const priceSource = realtimeData ? 'yahoo_realtime' : 'polygon_eod';
  
  // VIX and VVIX for confidence assessment
  const vix = realtimeData?.vix || null;
  const vixChangePct = realtimeData?.vix_change_pct || null;
  const vvix = realtimeData?.vvix || null;
  const vvixChangePct = realtimeData?.vvix_change_pct || null;
  
  console.log(`📈 Real-time: ${realtimePrice.toFixed(2)}, Prev Close: ${previousClose.toFixed(2)} (${priceSource})`);
  if (vvix) {
    console.log(`📊 VVIX: ${vvix.toFixed(2)} - Confidence: ${vvix > 25 ? 'LOW' : vvix > 18 ? 'MEDIUM' : 'HIGH'}`);
  }
  
  // Straddle ATM (monthly)
  const straddle = calculateStraddleATM(calls, puts, realtimePrice);
  
  // Daily levels (0DTE) - uses previous close as reference (correct 0DTE logic)
  const dailyLevels = await fetchDailyLevels(realtimePrice, previousClose);
  
  // Calculate Walls (MM Support/Resistance)
  const walls = calculateWalls(calls, puts);
  
  // High Volume Strikes
  const highVolStrikes = calculateHighVolumeStrikes(calls, puts, 5);
  
  // Build Key Levels
  const keyLevels = buildKeyLevels(
    spotPrice,
    walls.putWall,
    walls.putWallOI,
    walls.callWall,
    walls.callWallOI,
    gex.levels,
    gex.flipPoint
  );
  
  // Find highest OI strikes (legacy compatibility)
  const highestCallOI = calls.reduce((max, c) => c.open_interest > max.open_interest ? c : max, calls[0]);
  const highestPutOI = puts.reduce((max, p) => p.open_interest > max.open_interest ? p : max, puts[0]);
  
  const analysis: SPXAnalysis = {
    spx_price: realtimePrice,
    spx_change_pct: realtimeChangePct,
    
    put_call_ratio_oi: putCallRatioOI,
    put_call_ratio_volume: putCallRatioVolume,
    total_call_oi: totalCallOI,
    total_put_oi: totalPutOI,
    total_call_volume: totalCallVolume,
    total_put_volume: totalPutVolume,
    
    max_pain_strike: maxPain.strike,
    max_pain_value: maxPain.value,
    
    atm_strike: straddle.strike,
    straddle_price: straddle.price,
    implied_move_pct: straddle.impliedMove,
    implied_move_points: straddle.price,
    
    // 0DTE Straddle
    straddle_0dte_price: dailyLevels?.straddle_price || null,
    straddle_0dte_strike: dailyLevels?.straddle_strike || null,
    straddle_0dte_implied_move_pct: dailyLevels?.implied_move_pct || null,
    straddle_0dte_expiry: dailyLevels?.expiry || null,
    
    // Daily Levels (0DTE)
    daily_put_wall: dailyLevels?.put_wall || null,
    daily_call_wall: dailyLevels?.call_wall || null,
    daily_put_wall_oi: dailyLevels?.put_wall_oi || null,
    daily_call_wall_oi: dailyLevels?.call_wall_oi || null,
    daily_max_pain: dailyLevels?.max_pain || null,
    daily_zero_gamma: dailyLevels?.zero_gamma || null,
    
    // 0DTE GEX (separate from monthly)
    daily_gex: dailyLevels?.daily_gex || null,
    daily_gex_positioning: dailyLevels?.daily_gex_positioning || null,
    daily_gex_levels: dailyLevels?.daily_gex_levels || null,
    
    // 0DTE Volume & OI totals
    daily_total_call_oi: dailyLevels?.daily_total_call_oi || null,
    daily_total_put_oi: dailyLevels?.daily_total_put_oi || null,
    daily_total_call_volume: dailyLevels?.daily_total_call_volume || null,
    daily_total_put_volume: dailyLevels?.daily_total_put_volume || null,
    daily_put_call_ratio: dailyLevels?.daily_put_call_ratio || null,
    
    // Real-time price
    realtime_price: realtimePrice,
    realtime_change_pct: realtimeChangePct,
    previous_close: previousClose,
    price_source: priceSource,
    
    // VIX & VVIX (Vol of Vol) for confidence assessment
    vix: vix,
    vix_change_pct: vixChangePct,
    vvix: vvix,
    vvix_change_pct: vvixChangePct,
    
    // 0DTE Reference
    daily_reference_price: dailyLevels?.reference_price || null,
    
    total_gex: gex.totalGEX,
    gex_flip_point: gex.flipPoint,
    dealer_positioning: gex.positioning,
    
    // Legacy
    highest_call_oi_strike: highestCallOI?.strike_price || 0,
    highest_put_oi_strike: highestPutOI?.strike_price || 0,
    
    // NEW: MM Key Levels
    put_wall: walls.putWall,
    call_wall: walls.callWall,
    put_wall_oi: walls.putWallOI,
    call_wall_oi: walls.callWallOI,
    
    // GEX Levels
    gex_levels: gex.levels,
    max_positive_gex_strike: gex.maxPositiveStrike,
    max_negative_gex_strike: gex.maxNegativeStrike,
    zero_gamma_level: gex.flipPoint,
    
    // High Volume
    high_volume_strikes: highVolStrikes,
    
    // Consolidated Key Levels
    key_levels: keyLevels,
    
    expiration_date,
    data_timestamp: Date.now(),
    contracts_analyzed: calls.length + puts.length
  };
  
  console.log('✅ SPX Analysis complete:', analysis);
  console.log('📍 Key Levels:', keyLevels.map(l => `${l.label}: ${l.strike}`).join(', '));
  
  return analysis;
}

// Export for testing
export { calculateMaxPain, calculateGEX, calculateStraddleATM };

