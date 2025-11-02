import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// V2 IMPORTS - Liquidity Score and Leading Indicators
// Note: In production, these would be imported from shared modules
// For now, we'll implement simplified versions inline

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FedDataPoint {
  date: string;
  value: string;
}

interface SeriesResponse {
  observations: FedDataPoint[];
}

interface FXRates {
  EUR: number; // DEXUSEU
  JPY: number; // DEXJPUS
  GBP: number; // DEXUSUK
  CAD: number; // DEXCAUS
  SEK: number; // DEXSZUS
  CHF: number; // DEXCHUS
}

// Pesi ufficiali del DXY
const DXY_WEIGHTS = {
  EUR: 0.576,
  JPY: 0.136,
  GBP: 0.119,
  CAD: 0.091,
  SEK: 0.042,
  CHF: 0.036,
};

/**
 * Calcola l'indice DXY usando i pesi ufficiali
 * @param rates Oggetto con tassi FX
 * @returns Valore indice DXY
 */
/**
 * Calcola il DXY corretto usando le serie FRED.
 * Si considerano le inversioni corrette per ogni coppia.
 */
function calculateDXY(rates: FXRates): number {
  // I dati FRED sono già nel formato corretto per la formula DXY!
  // Non servono inversioni
  
  // Formula ufficiale DXY con base 50.14348112
  const dxy =
    50.14348112 *
    Math.pow(rates.EUR, -DXY_WEIGHTS.EUR) *
    Math.pow(rates.JPY, DXY_WEIGHTS.JPY) *
    Math.pow(rates.GBP, -DXY_WEIGHTS.GBP) *
    Math.pow(rates.CAD, DXY_WEIGHTS.CAD) *
    Math.pow(rates.SEK, DXY_WEIGHTS.SEK) *
    Math.pow(rates.CHF, DXY_WEIGHTS.CHF);

  return dxy;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fredApiKey = Deno.env.get('FRED_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting Fed data fetch...');

    // Series to fetch from FRED API
    const series = [
      'SOFR',
      'IORB', 
      'WALCL',
      'WRESBAL',
      'RRPONTSYD',
      'RPONTSYD',
      'RPONTTLD',
      'DTB3',
      'DTB1YR',
      'DGS10', // 10-Year Treasury (us10y)
      'VIXCLS', // VIX Volatility Index
      'BAMLH0A0HYM2', // High Yield Option Adjusted Spread
      'T10Y3M', // 10-Year Treasury Constant Maturity Minus 3-Month Treasury
      // V2 NEW SERIES
      'WTREGEN', // Treasury General Account
      'BAMLC0A0CM', // Investment Grade Corporate Bond Yield
      // FX rates for DXY calculation
      'DEXUSEU', // USD/EUR
      'DEXJPUS', // JPY/USD
      'DEXUSUK', // USD/GBP
      'DEXCAUS', // CAD/USD
      'DEXSZUS', // SEK/USD
      'DEXCHUS'  // CHF/USD
    ];

    // Fetch data from 2021 to today
    const today = new Date();
    const startDate = '2021-01-01';
    const endDate = today.toISOString().split('T')[0];
    
    console.log(`📅 Date range: ${startDate} to ${endDate}`);

    console.log(`Fetching data from ${startDate} to ${endDate}`);

    // Fetch historical data for each series (last 90 days)
    const seriesData: { [key: string]: FedDataPoint[] } = {};
    
    for (const seriesId of series) {
      try {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredApiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`;
        console.log(`\n🔄 Fetching ${seriesId}...`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`❌ HTTP Error ${response.status} for ${seriesId}`);
          seriesData[seriesId.toLowerCase()] = [];
          continue;
        }
        
        const json: SeriesResponse = await response.json();
        
        if (json.observations && json.observations.length > 0) {
          // Map FRED series names to database field names
          let key = seriesId.toLowerCase();
          if (seriesId === 'DGS10') key = 'us10y';
          if (seriesId === 'VIXCLS') key = 'vix';
          if (seriesId === 'BAMLH0A0HYM2') key = 'hy_oas';
          if (seriesId === 'T10Y3M') key = 't10y3m';
          // V2 NEW MAPPINGS
          if (seriesId === 'WTREGEN') key = 'tga';
          if (seriesId === 'BAMLC0A0CM') key = 'ig_yield';
          
          seriesData[key] = json.observations;
          
          // Get last 5 values for debugging
          const last5 = json.observations.slice(-5);
          console.log(`✅ ${seriesId}: ${json.observations.length} observations fetched`);
          console.log(`   Last 5 values:`);
          last5.forEach(obs => {
            console.log(`     ${obs.date}: ${obs.value}`);
          });
        } else {
          console.error(`❌ ${seriesId}: No observations in response`);
          console.error(`   Response:`, JSON.stringify(json).substring(0, 200));
          seriesData[seriesId.toLowerCase()] = [];
        }
      } catch (error) {
        console.error(`❌ Exception fetching ${seriesId}:`, error);
        seriesData[seriesId.toLowerCase()] = [];
      }
    }
    
    console.log(`\n📊 Fetch Summary: ${Object.keys(seriesData).length} series fetched successfully`);
    

    // Generate complete date range (all days from 2021 to today)
    const allDates: string[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= today) {
      allDates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`Processing ${allDates.length} dates with forward fill`);

    // Forward fill helper - keeps track of last valid value for each series
    const lastValues: { [key: string]: number | null } = {};
    
    // Initialize with first available values
    Object.keys(seriesData).forEach(key => {
      lastValues[key] = null;
    });

    // Process each date with forward fill
    const recordsToInsert: any[] = [];
    const scenarioCounts = { stealth_qe: 0, qe: 0, qt: 0, neutral: 0 };
    
    // Helper per ottenere il valore di N giorni fa
    const getValueNDaysAgo = (records: any[], currentIndex: number, key: string, daysAgo: number): number | null => {
      const targetIndex = currentIndex - daysAgo;
      if (targetIndex >= 0 && targetIndex < records.length) {
        return records[targetIndex][key] ?? null;
      }
      return null;
    };
    
    for (let i = 0; i < allDates.length; i++) {
      const date = allDates[i];
      const data: any = { date };
      
      // Get value for each series on this date, or use last known value (forward fill)
      Object.entries(seriesData).forEach(([key, observations]) => {
        const obs = observations.find(o => o.date === date);
        if (obs) {
          const value = parseFloat(obs.value);
          if (!isNaN(value)) {
            lastValues[key] = value;
          }
        }
        data[key] = lastValues[key];
      });

      // Calculate SOFR-IORB spread in decimal (e.g., 0.15 = 15 basis points)
      // SOFR and IORB from FRED are in percentage (e.g., 4.80%)
      if (data.sofr !== null && data.iorb !== null) {
        data.sofr_iorb_spread = Number((data.sofr - data.iorb).toFixed(4));
      } else {
        data.sofr_iorb_spread = null;
      }

      // Calculate DXY using official weights
      const fxValues = [data.dexuseu, data.dexjpus, data.dexusuk, data.dexcaus, data.dexszus, data.dexchus];
      const allFxValid = fxValues.every(val => val !== null && val !== undefined && !isNaN(val) && val > 0);
      
      if (allFxValid) {
        const fxRates: FXRates = {
          EUR: data.dexuseu,
          JPY: data.dexjpus,
          GBP: data.dexusuk,
          CAD: data.dexcaus,
          SEK: data.dexszus,
          CHF: data.dexchus
        };
        
        try {
          data.dxy_broad = Number(calculateDXY(fxRates).toFixed(4));
        } catch (error) {
          console.error(`❌ Error calculating DXY for ${date}:`, error);
          console.error(`   FX rates:`, fxRates);
          data.dxy_broad = null;
        }
      } else {
        // Debug: mostra quali valori mancano
        if (date === allDates[allDates.length - 1]) {
          console.log(`❌ DXY calculation failed - missing FX data:`);
          console.log(`   DEXUSEU: ${data.dexuseu}`);
          console.log(`   DEXJPUS: ${data.dexjpus}`);
          console.log(`   DEXUSUK: ${data.dexusuk}`);
          console.log(`   DEXCAUS: ${data.dexcaus}`);
          console.log(`   DEXSZUS: ${data.dexszus}`);
          console.log(`   DEXCHUS: ${data.dexchus}`);
        }
        data.dxy_broad = null;
      }

      // === CALCOLO DELTA A 4 SETTIMANE (28 giorni) ===
      // I delta sono fondamentali per determinare lo scenario correttamente
      const daysBack = 28; // 4 settimane
      
      // WALCL: Balance Sheet (in millions)
      const walcl_4w_ago = getValueNDaysAgo(recordsToInsert, i, 'walcl', daysBack);
      data.d_walcl_4w = (data.walcl !== null && walcl_4w_ago !== null) 
        ? Number((data.walcl - walcl_4w_ago).toFixed(2))
        : null;
      
      // WRESBAL: Reserves (in billions)
      const wresbal_4w_ago = getValueNDaysAgo(recordsToInsert, i, 'wresbal', daysBack);
      data.d_wresbal_4w = (data.wresbal !== null && wresbal_4w_ago !== null) 
        ? Number((data.wresbal - wresbal_4w_ago).toFixed(2))
        : null;
      
      // RRPONTSYD: Reverse Repo (in billions)
      const rrpontsyd_4w_ago = getValueNDaysAgo(recordsToInsert, i, 'rrpontsyd', daysBack);
      data.d_rrpontsyd_4w = (data.rrpontsyd !== null && rrpontsyd_4w_ago !== null) 
        ? Number((data.rrpontsyd - rrpontsyd_4w_ago).toFixed(2))
        : null;
      
      // T10Y3M: Yield Curve
      const t10y3m_4w_ago = getValueNDaysAgo(recordsToInsert, i, 't10y3m', daysBack);
      data.d_t10y3m_4w = (data.t10y3m !== null && t10y3m_4w_ago !== null) 
        ? Number((data.t10y3m - t10y3m_4w_ago).toFixed(5))
        : null;
      
      // DXY: Dollar Index
      const dxy_4w_ago = getValueNDaysAgo(recordsToInsert, i, 'dxy_broad', daysBack);
      data.d_dxy_4w = (data.dxy_broad !== null && dxy_4w_ago !== null) 
        ? Number((data.dxy_broad - dxy_4w_ago).toFixed(5))
        : null;

      // === V2 CALCULATIONS ===
      
      // Calculate Investment Grade Spread (IG Yield - 10Y Treasury)
      if (data.ig_yield !== null && data.us10y !== null) {
        data.ig_spread = Number((data.ig_yield - data.us10y).toFixed(4));
      } else {
        data.ig_spread = null;
      }

      // Determine scenario (ORA con delta reali!)
      data.scenario = determineScenario(data);
      scenarioCounts[data.scenario as keyof typeof scenarioCounts]++;
      
      // Derive scenario qualifiers
      const scenarioState = deriveScenarioQualifiers(data);
      data.context = scenarioState.context;
      data.sustainability = scenarioState.sustainability;
      data.risk_level = scenarioState.risk_level;
      data.confidence = scenarioState.confidence;
      data.drivers = scenarioState.drivers;
      
      // === V2 CALCULATIONS ===
      // Calculate Liquidity Score and Leading Indicators
      if (recordsToInsert.length >= 30) { // Need historical data
        const historical = recordsToInsert.slice(Math.max(0, recordsToInsert.length - 90)); // Last 90 days
        
        try {
          const liquidityScore = calculateLiquidityScoreSimplified(data, historical);
          data.liquidity_score = liquidityScore.total;
          data.liquidity_grade = liquidityScore.grade;
          data.liquidity_trend = liquidityScore.trend;
          data.liquidity_confidence = liquidityScore.confidence;
          
          const leadingIndicators = calculateLeadingIndicatorsSimplified(data, historical);
          data.leading_indicators = leadingIndicators;
          
          console.log(`📊 V2 Calculated - Score: ${liquidityScore.total}/100 (${liquidityScore.grade}), Signal: ${leadingIndicators.overall_signal}`);
        } catch (error) {
          console.error('❌ Error calculating V2 indicators:', error);
          data.liquidity_score = null;
          data.liquidity_grade = null;
          data.liquidity_trend = null;
          data.liquidity_confidence = null;
          data.leading_indicators = null;
        }
      } else {
        // Not enough historical data yet
        data.liquidity_score = null;
        data.liquidity_grade = null;
        data.liquidity_trend = null;
        data.liquidity_confidence = null;
        data.leading_indicators = null;
      }
      
      // Debug dettagliato per l'ultimo giorno
      if (date === allDates[allDates.length - 1]) {
        const daysSinceData = (today.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
        
        console.log('\n\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 LATEST DATA - COMPLETE DIAGNOSTIC');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`📅 Date: ${date}`);
        console.log(`⏰ Data Age: ${Math.floor(daysSinceData)} days old`);
        
        if (daysSinceData > 7) {
          console.warn(`⚠️  WARNING: Data is ${Math.floor(daysSinceData)} days old (>7 days)`);
        }
        
        console.log('\n💰 RAW VALUES FROM DATABASE:');
        console.log(`   sofr: ${data.sofr} (type: ${typeof data.sofr})`);
        console.log(`   iorb: ${data.iorb} (type: ${typeof data.iorb})`);
        console.log(`   sofr_iorb_spread: ${data.sofr_iorb_spread} (type: ${typeof data.sofr_iorb_spread})`);
        console.log(`   walcl: ${data.walcl} (type: ${typeof data.walcl})`);
        console.log(`   wresbal: ${data.wresbal} (type: ${typeof data.wresbal})`);
        console.log(`   rrpontsyd: ${data.rrpontsyd}`);
        console.log(`   dxy_broad: ${data.dxy_broad} (calculated from FX rates)`);
        
        console.log('\n💱 FX RATES FOR DXY:');
        console.log(`   USD/EUR: ${data.dexuseu}`);
        console.log(`   JPY/USD: ${data.dexjpus}`);
        console.log(`   USD/GBP: ${data.dexusuk}`);
        console.log(`   CAD/USD: ${data.dexcaus}`);
        console.log(`   SEK/USD: ${data.dexszus}`);
        console.log(`   CHF/USD: ${data.dexchus}`);
        
        console.log('\n📈 HUMAN READABLE:');
        console.log(`   SOFR: ${data.sofr}%`);
        console.log(`   IORB: ${data.iorb}%`);
        console.log(`   Spread: ${data.sofr_iorb_spread ? (data.sofr_iorb_spread * 100).toFixed(2) : 'NULL'}bps`);
        console.log(`   Balance Sheet: ${data.walcl ? `$${(data.walcl/1000000).toFixed(2)}T` : 'NULL'}`);
        console.log(`   Reserves: ${data.wresbal ? `$${(data.wresbal/1000).toFixed(2)}T` : 'NULL'}`);
        console.log(`   DXY Index: ${data.dxy_broad !== null && data.dxy_broad !== undefined ? data.dxy_broad.toFixed(2) : 'NULL'}`);
        
        console.log('\n📊 DELTA 4W (CRITICAL FOR SCENARIO):');
        console.log(`   Δ Balance Sheet: ${data.d_walcl_4w !== null ? `${data.d_walcl_4w > 0 ? '+' : ''}$${(data.d_walcl_4w/1000).toFixed(1)}B` : 'NULL'}`);
        console.log(`   Δ Reserves: ${data.d_wresbal_4w !== null ? `${data.d_wresbal_4w > 0 ? '+' : ''}$${data.d_wresbal_4w.toFixed(1)}B` : 'NULL'}`);
        console.log(`   Δ RRP: ${data.d_rrpontsyd_4w !== null ? `${data.d_rrpontsyd_4w > 0 ? '+' : ''}$${data.d_rrpontsyd_4w.toFixed(1)}B` : 'NULL'}`);
        console.log(`   Δ T10Y3M: ${data.d_t10y3m_4w !== null ? `${data.d_t10y3m_4w > 0 ? '+' : ''}${data.d_t10y3m_4w.toFixed(2)}%` : 'NULL'}`);
        console.log(`   Δ DXY: ${data.d_dxy_4w !== null ? `${data.d_dxy_4w > 0 ? '+' : ''}${data.d_dxy_4w.toFixed(2)}` : 'NULL'}`);
        
        console.log('\n🎯 SCENARIO DETECTED: ' + data.scenario.toUpperCase());
        
        console.log('\n✅ DATA QUALITY CHECKS:');
        console.log(`   WALCL not null: ${data.walcl !== null} ${data.walcl !== null ? '✓' : '✗'}`);
        console.log(`   WRESBAL not null: ${data.wresbal !== null} ${data.wresbal !== null ? '✓' : '✗'}`);
        console.log(`   SPREAD not null: ${data.sofr_iorb_spread !== null} ${data.sofr_iorb_spread !== null ? '✓' : '✗'}`);
        console.log(`   SOFR not null: ${data.sofr !== null} ${data.sofr !== null ? '✓' : '✗'}`);
        console.log(`   IORB not null: ${data.iorb !== null} ${data.iorb !== null ? '✓' : '✗'}`);
        
        console.log('═══════════════════════════════════════════════════════════\n\n');
      }
      
      recordsToInsert.push(data);
    }
    
    // Summary statistics
    console.log('📊 ========== DATA PROCESSING SUMMARY ==========');
    console.log('📅 Date Range:', { start: startDate, end: endDate });
    console.log('📈 Total Records:', recordsToInsert.length);
    console.log('📊 Series Fetched:', Object.keys(seriesData).length, '/', series.length);
    console.log('🎯 Scenario Distribution:', scenarioCounts);
    console.log('===============================================');

    console.log(`Inserting ${recordsToInsert.length} records into database in batches`);

    // Insert records in smaller batches to avoid timeout
    const batchSize = 100;
    for (let i = 0; i < recordsToInsert.length; i += batchSize) {
      const batch = recordsToInsert.slice(i, i + batchSize);
      const { error: upsertError } = await supabase
        .from('fed_data')
        .upsert(batch, { onConflict: 'date' });

      if (upsertError) {
        console.error(`Database error in batch ${i}-${i + batch.length}:`, upsertError);
        throw upsertError;
      }
      console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(recordsToInsert.length / batchSize)}`);
    }

    // Generate signal for latest data
    const latestData = recordsToInsert[recordsToInsert.length - 1];
    const signal = generateSignal(latestData);
    if (signal) {
      console.log('Generated signal:', signal);
      const { error: signalError } = await supabase
        .from('signals')
        .insert([{ ...signal, date: latestData.date }]);
      
      if (signalError) {
        console.error('Signal insert error:', signalError);
      }
    }

    console.log('Fed data saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        recordsInserted: recordsToInsert.length,
        latestData,
        signal 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in fetch-fed-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// === V2 SIMPLIFIED CALCULATION FUNCTIONS ===

/**
 * Simplified Liquidity Score calculation for Edge Function
 */
function calculateLiquidityScoreSimplified(data: any, historical: any[]): {
  total: number;
  grade: string;
  trend: string;
  confidence: number;
} {
  let score = 50; // Start neutral
  
  // Balance Sheet Component (0-25)
  if (data.d_walcl_4w !== null) {
    if (data.d_walcl_4w > 50000) score += 15; // Strong expansion
    else if (data.d_walcl_4w > 20000) score += 10; // Moderate expansion
    else if (data.d_walcl_4w > 0) score += 5; // Mild expansion
    else if (data.d_walcl_4w < -50000) score -= 15; // Strong contraction
    else if (data.d_walcl_4w < -20000) score -= 10; // Moderate contraction
    else if (data.d_walcl_4w < 0) score -= 5; // Mild contraction
  }
  
  // Reserves Component (0-25)
  if (data.d_wresbal_4w !== null && data.d_rrpontsyd_4w !== null) {
    // Positive rotation: RRP drains while reserves grow
    if (data.d_rrpontsyd_4w < 0 && data.d_wresbal_4w > 0) {
      score += 15; // Excellent liquidity rotation
    } else if (data.d_wresbal_4w > 20) {
      score += 10; // Strong reserve growth
    } else if (data.d_wresbal_4w < -50) {
      score -= 10; // Reserve drainage
    }
  }
  
  // Market Stress Component (inverse: less stress = higher score)
  if (data.vix !== null) {
    if (data.vix < 16) score += 8;
    else if (data.vix < 20) score += 4;
    else if (data.vix > 30) score -= 10;
    else if (data.vix > 25) score -= 6;
  }
  
  if (data.hy_oas !== null) {
    if (data.hy_oas < 3.5) score += 7;
    else if (data.hy_oas < 4.5) score += 3;
    else if (data.hy_oas > 6) score -= 8;
    else if (data.hy_oas > 5) score -= 4;
  }
  
  if (data.sofr_iorb_spread !== null) {
    const spreadBps = data.sofr_iorb_spread * 100;
    if (spreadBps < 5) score += 3;
    else if (spreadBps > 25) score -= 8;
    else if (spreadBps > 15) score -= 4;
  }
  
  // Momentum (simplified trend)
  if (historical.length >= 7) {
    const recent7 = historical.slice(-7);
    const recentAvgBS = recent7.reduce((sum, d) => sum + (d.d_walcl_4w || 0), 0) / 7;
    const recentAvgRes = recent7.reduce((sum, d) => sum + (d.d_wresbal_4w || 0), 0) / 7;
    
    if (recentAvgBS > 10000 && recentAvgRes > 5) score += 5; // Positive momentum
    else if (recentAvgBS < -10000 || recentAvgRes < -20) score -= 5; // Negative momentum
  }
  
  // Clamp score
  const total = Math.max(0, Math.min(100, Math.round(score)));
  
  // Assign grade
  let grade = 'C';
  if (total >= 90) grade = 'A+';
  else if (total >= 85) grade = 'A';
  else if (total >= 80) grade = 'B+';
  else if (total >= 70) grade = 'B';
  else if (total >= 60) grade = 'C+';
  else if (total >= 50) grade = 'C';
  else grade = 'D';
  
  // Determine trend
  let trend = 'stable';
  if (historical.length >= 14) {
    const recent7avg = historical.slice(-7).reduce((sum, d) => {
      let dayScore = 50;
      if (d.d_walcl_4w > 0) dayScore += 10;
      if (d.d_wresbal_4w > 0) dayScore += 10;
      if (d.vix && d.vix < 20) dayScore += 10;
      return sum + dayScore;
    }, 0) / 7;
    
    const previous7avg = historical.slice(-14, -7).reduce((sum, d) => {
      let dayScore = 50;
      if (d.d_walcl_4w > 0) dayScore += 10;
      if (d.d_wresbal_4w > 0) dayScore += 10;
      if (d.vix && d.vix < 20) dayScore += 10;
      return sum + dayScore;
    }, 0) / 7;
    
    const change = recent7avg - previous7avg;
    if (change > 5) trend = 'improving';
    else if (change < -5) trend = 'deteriorating';
  }
  
  // Calculate confidence
  let confidence = 100;
  const criticalFields = [data.walcl, data.wresbal, data.vix, data.hy_oas, data.sofr_iorb_spread];
  const missingFields = criticalFields.filter(f => f === null).length;
  confidence -= missingFields * 15;
  
  const dataAge = (new Date().getTime() - new Date(data.date).getTime()) / (1000 * 60 * 60 * 24);
  if (dataAge > 7) confidence -= Math.min(30, (dataAge - 7) * 3);
  
  confidence = Math.max(0, Math.min(100, confidence));
  
  return { total, grade, trend, confidence };
}

/**
 * Simplified Leading Indicators calculation for Edge Function
 */
function calculateLeadingIndicatorsSimplified(data: any, historical: any[]): any {
  // RRP Velocity (B$/day)
  let rrpVelocity = 0;
  if (historical.length >= 7) {
    const recent7 = historical.slice(-7);
    const totalChange = recent7.reduce((sum, d) => sum + (d.d_rrpontsyd_4w || 0), 0);
    rrpVelocity = Number((totalChange / 7).toFixed(1));
  }
  
  // Credit Stress Index (0-100)
  let creditStressIndex = 50;
  if (data.hy_oas !== null) {
    if (data.hy_oas > 8) creditStressIndex = 100;
    else if (data.hy_oas > 6) creditStressIndex = 80;
    else if (data.hy_oas > 5) creditStressIndex = 60;
    else if (data.hy_oas > 4) creditStressIndex = 40;
    else if (data.hy_oas > 3) creditStressIndex = 20;
    else creditStressIndex = 0;
  }
  
  // Repo Spike Risk (0-100)
  let repoSpikeRisk = 25;
  if (data.sofr_iorb_spread !== null) {
    const spreadBps = data.sofr_iorb_spread * 100;
    if (spreadBps > 25) repoSpikeRisk = 80;
    else if (spreadBps > 15) repoSpikeRisk = 60;
    else if (spreadBps > 10) repoSpikeRisk = 40;
    else if (spreadBps < 5) repoSpikeRisk = 10;
  }
  
  // QT Pivot Probability (0-100)
  let qtPivotProbability = 15;
  let stressSignals = 0;
  if (data.vix && data.vix > 25) stressSignals++;
  if (data.hy_oas && data.hy_oas > 6) stressSignals++;
  if (data.sofr_iorb_spread && data.sofr_iorb_spread * 100 > 20) stressSignals++;
  if (data.wresbal && data.wresbal < 3000) stressSignals++;
  
  qtPivotProbability = Math.min(100, 15 + (stressSignals * 20));
  
  // Overall Signal
  let bullishSignals = 0;
  let bearishSignals = 0;
  
  if (rrpVelocity < -10) bullishSignals++; // RRP draining
  if (creditStressIndex < 30) bullishSignals++;
  if (repoSpikeRisk < 25) bullishSignals++;
  if (qtPivotProbability > 70) bullishSignals++; // Pivot = bullish
  
  if (creditStressIndex > 60) bearishSignals++;
  if (repoSpikeRisk > 60) bearishSignals++;
  if (rrpVelocity > 10) bearishSignals++; // RRP accumulating
  
  let overallSignal = 'neutral';
  if (bullishSignals > bearishSignals + 1) overallSignal = 'bullish';
  else if (bearishSignals > bullishSignals + 1) overallSignal = 'bearish';
  
  return {
    tga_trend: 'stable', // Placeholder until TGA data available
    tga_impact: 'neutral',
    rrp_velocity: rrpVelocity,
    rrp_acceleration: 'stable', // Simplified
    credit_stress_index: creditStressIndex,
    credit_trend: creditStressIndex < 40 ? 'improving' : creditStressIndex > 60 ? 'deteriorating' : 'stable',
    repo_spike_risk: repoSpikeRisk,
    qt_pivot_probability: qtPivotProbability,
    overall_signal: overallSignal,
    confidence: Math.max(50, 100 - (data.vix === null ? 20 : 0) - (data.hy_oas === null ? 20 : 0))
  };
}

function determineScenario(data: any): string {
  // Estrai i delta calcolati correttamente (ora disponibili!)
  const d_walcl_4w = data.d_walcl_4w ?? null;
  const d_wresbal_4w = data.d_wresbal_4w ?? null;
  const d_rrpontsyd_4w = data.d_rrpontsyd_4w ?? null;

  // UNITÀ DI MISURA:
  // - d_walcl_4w: millions ($M) → delta a 4 settimane
  // - d_wresbal_4w: billions ($B) → delta a 4 settimane
  // - d_rrpontsyd_4w: billions ($B) → delta a 4 settimane

  // Data validation - se manca anche solo un delta, non possiamo calcolare lo scenario
  const isValidData = 
    d_walcl_4w !== null &&
    d_wresbal_4w !== null &&
    d_rrpontsyd_4w !== null;

  if (!isValidData) {
    console.warn('⚠️ MISSING DELTA DATA for scenario calculation:', {
      d_walcl_4w, d_wresbal_4w, d_rrpontsyd_4w
    });
    console.warn('⚠️ Returning NEUTRAL (primi 28 giorni non hanno delta)');
    return 'neutral';
  }

  // Debug logging dettagliato
  console.log('🔍 Scenario Calculation (DELTA-BASED) - Raw Values:', {
    d_walcl_4w_millions: d_walcl_4w,
    d_wresbal_4w_billions: d_wresbal_4w,
    d_rrpontsyd_4w_billions: d_rrpontsyd_4w
  });

  console.log('🔍 Scenario Calculation - Readable:', {
    balance_sheet_change: d_walcl_4w !== null ? `${d_walcl_4w > 0 ? '+' : ''}$${(d_walcl_4w / 1000).toFixed(1)}B` : 'NULL',
    reserves_change: d_wresbal_4w !== null ? `${d_wresbal_4w > 0 ? '+' : ''}$${d_wresbal_4w.toFixed(1)}B` : 'NULL',
    rrp_change: d_rrpontsyd_4w !== null ? `${d_rrpontsyd_4w > 0 ? '+' : ''}$${d_rrpontsyd_4w.toFixed(1)}B` : 'NULL'
  });

  console.log('🎯 Checking Scenario Conditions (Soglie Ottimizzate Liquidity Analysis)...');

  // === QE AGGRESSIVO ===
  // Soglia: Bilancio +$50B E Riserve +$50B (4 settimane)
  // Fonte: Intervento Fed significativo e coordinato
  // Razionale: Espansione simultanea su entrambi i fronti = QE vero
  const qeCondition = d_walcl_4w > 50000 && d_wresbal_4w > 50;
  console.log(`   QE: ΔBS > +$50B (${d_walcl_4w > 50000 ? '✓' : '✗'} actual: ${(d_walcl_4w/1000).toFixed(1)}B) && ΔRiserve > +$50B (${d_wresbal_4w > 50 ? '✓' : '✗'} actual: ${d_wresbal_4w.toFixed(1)}B) = ${qeCondition}`);
  
  if (qeCondition) {
    console.log('✅ Scenario: QE - Espansione aggressiva Fed rilevata');
    return 'qe';
  }

  // === STEALTH QE (Rotazione Liquidità) ===
  // Soglia RIVISTA: Rotazione significativa (non micro-movimenti)
  // Opzione 1: RRP drena >$30B mentre riserve stabili/crescono
  // Opzione 2: Riserve crescono >$20B con bilancio stabile/crescita moderata
  // Opzione 3: Bilancio cresce >$30B con contrazione RRP
  // Razionale: Liquidità netta in aumento attraverso meccanismi "nascosti"
  const rrpDrainageSignificant = d_rrpontsyd_4w < -30 && d_wresbal_4w >= -20; // RRP drena, riserve non collassano
  const reservesGrowthModerate = d_wresbal_4w > 20 && d_walcl_4w > -20000; // Riserve crescono, BS non crolla
  const balanceSheetGrowthWithRrpDrain = d_walcl_4w > 30000 && d_rrpontsyd_4w < -20; // BS cresce con RRP in drenaggio
  
  const stealthQeCondition = rrpDrainageSignificant || reservesGrowthModerate || balanceSheetGrowthWithRrpDrain;
  
  console.log(`   STEALTH_QE conditions:`);
  console.log(`     → RRP drainage >$30B + Reserves stable: ${rrpDrainageSignificant} (ΔRRP: ${d_rrpontsyd_4w.toFixed(1)}B, ΔRes: ${d_wresbal_4w.toFixed(1)}B)`);
  console.log(`     → Reserves growth >$20B + BS stable: ${reservesGrowthModerate} (ΔRes: ${d_wresbal_4w.toFixed(1)}B, ΔBS: ${(d_walcl_4w/1000).toFixed(1)}B)`);
  console.log(`     → BS growth >$30B + RRP drain: ${balanceSheetGrowthWithRrpDrain} (ΔBS: ${(d_walcl_4w/1000).toFixed(1)}B, ΔRRP: ${d_rrpontsyd_4w.toFixed(1)}B)`);
  console.log(`     = FINAL: ${stealthQeCondition}`);
  
  if (stealthQeCondition) {
    console.log('✅ Scenario: STEALTH_QE - Rotazione liquidità stimolativa rilevata');
    return 'stealth_qe';
  }

  // === QT (QUANTITATIVE TIGHTENING) ===
  // Soglia: Bilancio -$50B O Riserve -$80B (4 settimane)
  // Fonte: Contrazione Fed significativa che impatta liquidità
  // Razionale: Drenaggio abbastanza forte da creare stress
  const qtCondition = d_walcl_4w < -50000 || d_wresbal_4w < -80;
  console.log(`   QT: ΔBS < -$50B (${d_walcl_4w < -50000 ? '✓' : '✗'} actual: ${(d_walcl_4w/1000).toFixed(1)}B) || ΔRiserve < -$80B (${d_wresbal_4w < -80 ? '✓' : '✗'} actual: ${d_wresbal_4w.toFixed(1)}B) = ${qtCondition}`);
  
  if (qtCondition) {
    console.log('✅ Scenario: QT - Contrazione liquidità significativa rilevata');
    return 'qt';
  }

  console.log('✅ Scenario: NEUTRAL - Movimenti contenuti, nessuna direzione netta chiara');
  return 'neutral';
}

function generateSignal(data: any): any {
  const { sofr_iorb_spread, wresbal, scenario, walcl } = data;

  console.log('🔍 Signal generation:', { scenario, sofr_iorb_spread, wresbal, walcl });

  // High stress signal (spread > 0.25 percentage points = 25 bps)
  if (sofr_iorb_spread !== null && sofr_iorb_spread > 0.25) {
    console.log('🚨 High stress signal generated');
    return {
      signal_type: 'high_stress',
      description: `SOFR-IORB spread elevated at ${sofr_iorb_spread.toFixed(2)}bps - potential liquidity stress`,
      confidence: 85
    };
  }

  // Stealth QE signal (aggiornato con nuove soglie)
  if (scenario === 'stealth_qe') {
    console.log('🟡 Stealth QE signal generated');
    return {
      signal_type: 'stealth_qe',
      description: `Stealth QE detected - Balance sheet: $${(walcl/1000000).toFixed(2)}T, Reserves: $${(wresbal/1000).toFixed(2)}T`,
      confidence: 80
    };
  }

  // Full QE signal
  if (scenario === 'qe') {
    console.log('🟢 Full QE signal generated');
    return {
      signal_type: 'qe_active',
      description: `Full QE mode - Massive liquidity injection detected`,
      confidence: 90
    };
  }

  // QT signal
  if (scenario === 'qt') {
    console.log('🔴 QT signal generated');
    return {
      signal_type: 'qt_active',
      description: `Quantitative Tightening - Balance sheet contraction with wide spreads`,
      confidence: 85
    };
  }

  // Low stress / optimal conditions
  if (sofr_iorb_spread !== null && sofr_iorb_spread < 0.10 && wresbal > 3000) {
    console.log('🟢 Optimal liquidity signal generated');
    return {
      signal_type: 'optimal_liquidity',
      description: `Optimal liquidity conditions - Tight spreads (${sofr_iorb_spread.toFixed(2)}bps) with ample reserves`,
      confidence: 70
    };
  }

  console.log('ℹ️ No specific signal generated');
  return null;
}

function deriveScenarioQualifiers(inputs: any): {
  context: string;
  sustainability: string;
  risk_level: string;
  confidence: string;
  drivers: string[];
} {
  // === CONTEGGIO SEGNALI STRESS vs GROWTH ===
  // Usiamo indicatori macro validate
  
  const stressSignals = [
    (inputs.vix || 0) > 22, // VIX elevato (>22 = incertezza elevata)
    (inputs.hy_oas || 0) > 5.5, // High Yield spread widening (>5.5% = stress credito)
    (inputs.d_dxy_4w || 0) > 0.5, // Dollar in rafforzamento (flight to safety)
    (inputs.t10y3m || 0) < 0 && (inputs.d_t10y3m_4w || 0) < 0, // Curva invertita e in peggioramento
    (inputs.sofr_iorb_spread || 0) > 0 // SOFR > IORB (tensione liquidità)
  ].filter(Boolean).length;
  
  const growthSignals = [
    (inputs.vix || 100) < 16, // VIX basso (<16 = bassa volatilità)
    (inputs.hy_oas || 100) < 4.0, // High Yield spread stretto (<4% = fiducia credito)
    (inputs.d_dxy_4w || 0) < -0.5, // Dollar in indebolimento (risk-on)
    (inputs.t10y3m || 0) > 0 || (inputs.d_t10y3m_4w || 0) > 0, // Curva normale o in miglioramento
    (inputs.d_wresbal_4w || 0) > 0 && (inputs.d_rrpontsyd_4w || 0) < 0 // Rotazione liquidità positiva
  ].filter(Boolean).length;
  
  // === 1) CONTEXT ===
  let context = 'ambiguo';
  if (stressSignals >= 2 && stressSignals > growthSignals) {
    context = 'stress_guidato';
  } else if (growthSignals >= 2 && growthSignals > stressSignals) {
    context = 'crescita_guidata';
  }
  
  // === 2) SUSTAINABILITY ===
  // Rotazione liquidità sana: riserve in aumento + RRP in drenaggio
  const rotationOk = (inputs.d_wresbal_4w || 0) > 0 && (inputs.d_rrpontsyd_4w || 0) < 0;
  let sustainability = 'media';
  
  if (rotationOk && growthSignals >= 2) {
    sustainability = 'alta';
  } else if (context === 'stress_guidato' || (!rotationOk && (inputs.d_walcl_4w || 0) > 0)) {
    sustainability = 'bassa';
  }
  
  // === 3) RISK LEVEL ===
  let risk_level = 'elevato';
  
  if (context === 'crescita_guidata' && sustainability !== 'bassa') {
    risk_level = 'normale';
  } else if (context === 'stress_guidato' && ((inputs.vix || 0) > 24 || (inputs.hy_oas || 0) > 6.0)) {
    risk_level = 'alto';
  }
  
  // === 4) CONFIDENCE ===
  // Basato sul numero di segnali concordi
  const votes = Math.max(stressSignals, growthSignals);
  const confidence = votes >= 3 ? 'alta' : votes === 2 ? 'media' : 'bassa';
  
  // === 5) DRIVERS ===
  // Lista dei fattori chiave che influenzano lo scenario
  const drivers: string[] = [];
  if ((inputs.d_wresbal_4w || 0) > 0) drivers.push('Riserve in aumento');
  if ((inputs.d_rrpontsyd_4w || 0) < 0) drivers.push('RRP in drenaggio');
  if ((inputs.vix || 0) > 22) drivers.push('VIX elevato');
  if ((inputs.hy_oas || 0) > 5.5) drivers.push('HY OAS in widening');
  if ((inputs.d_dxy_4w || 0) > 0.5) drivers.push('USD in rafforzamento');
  if ((inputs.t10y3m || 0) < 0) drivers.push('Curva invertita');
  if ((inputs.sofr_iorb_spread || 0) > 0) drivers.push('SOFR > IORB (tensione)');
  
  return { context, sustainability, risk_level, confidence, drivers };
}