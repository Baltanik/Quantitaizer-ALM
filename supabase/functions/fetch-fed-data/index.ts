import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchRealtimeHybrid, validateRealtimeData } from './realtime-integrations.ts';

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
    // Try environment variables first, fallback to hardcoded values
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://tolaojeqjcoskegelule.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjUzOSwiZXhwIjoyMDc3NTg4NTM5fQ.Y0xWNiSR3mTDxhN566I-cgloiQazBwg0HoFpDJT0_HE';
    const fredApiKey = Deno.env.get('FRED_API_KEY') || 'fae844cfb2f3f5bbaf82549a5656910d';
    const marketdataKey = Deno.env.get('MARKETDATA_API_KEY') || '';

    console.log('🔧 Using credentials:', {
      supabaseUrl: supabaseUrl.substring(0, 30) + '...',
      hasServiceKey: !!supabaseKey,
      hasFredKey: !!fredApiKey
    });

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting Fed data fetch...');

    // Series to fetch from FRED API
    const series = [
      'SOFR',
      'IORB', 
      'DFF',        // HOTFIX 2025-11-04: Effective Federal Funds Rate (EFFR)
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
      // FX rates for DXY calculation
      'DEXUSEU', // USD/EUR
      'DEXJPUS', // JPY/USD
      'DEXUSUK', // USD/GBP
      'DEXCAUS', // CAD/USD
      'DEXSZUS', // SEK/USD
      'DEXCHUS'  // CHF/USD
    ];

    // Fetch data from last 35 days to ensure we have data for 4-week delta calculations
    // This handles: forward-fill (14d) + delta 4w (28d) + buffer (7d)
    const today = new Date();
    const startDateObj = new Date(today);
    startDateObj.setDate(startDateObj.getDate() - 35); // Changed from -14 to -35 for delta 4w
    const startDate = startDateObj.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    console.log(`📅 Date range: ${startDate} to ${endDate}`);

    // === FETCH REAL-TIME MARKET DATA ===
    console.log('\n🌐 Fetching real-time market data (VIX, DXY)...');
    const realtimeMarket = await fetchRealtimeHybrid(marketdataKey);
    console.log(`   Source: ${realtimeMarket.source}`);
    console.log(`   VIX: ${realtimeMarket.vix !== null ? realtimeMarket.vix.toFixed(2) : 'N/A'}`);
    console.log(`   DXY: ${realtimeMarket.dxy !== null ? realtimeMarket.dxy.toFixed(2) : 'N/A'}`);

    console.log(`Fetching data from ${startDate} to ${endDate}`);

    // Fetch historical data for each series (last 90 days)
    const seriesData: { [key: string]: FedDataPoint[] } = {};
    
    for (const seriesId of series) {
      try {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredApiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`;
        console.log(`\n🔄 Fetching ${seriesId}...`);

        // Map FRED series names to database field names (do this first for error handling)
        let key = seriesId.toLowerCase();
        if (seriesId === 'DGS10') key = 'us10y';
        if (seriesId === 'VIXCLS') key = 'vix';
        if (seriesId === 'BAMLH0A0HYM2') key = 'hy_oas';
        if (seriesId === 'T10Y3M') key = 't10y3m';
        if (seriesId === 'DFF') key = 'dff';

        const response = await fetch(url);

        if (!response.ok) {
          console.error(`❌ HTTP Error ${response.status} for ${seriesId}`);
          seriesData[key] = [];
          continue;
        }

        const json: SeriesResponse = await response.json();

        if (json.observations && json.observations.length > 0) {
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
          seriesData[key] = [];
        }
      } catch (error) {
        console.error(`❌ Exception fetching ${seriesId}:`, error);
        // Apply same mapping logic for error case
        let key = seriesId.toLowerCase();
        if (seriesId === 'DGS10') key = 'us10y';
        if (seriesId === 'VIXCLS') key = 'vix';
        if (seriesId === 'BAMLH0A0HYM2') key = 'hy_oas';
        if (seriesId === 'T10Y3M') key = 't10y3m';
        if (seriesId === 'DFF') key = 'dff';
        seriesData[key] = [];
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
    
    // Initialize with last known values from database (for better forward-fill)
    console.log('📊 Fetching last known values from database for forward-fill...');
    const { data: lastDbRecord, error: lastRecordError } = await supabase
      .from('fed_data')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single();
    
    if (lastDbRecord && !lastRecordError) {
      console.log(`✅ Last DB record from: ${lastDbRecord.date}`);
      // Initialize lastValues with database values
      Object.keys(seriesData).forEach(key => {
        lastValues[key] = lastDbRecord[key] ?? null;
      });
    } else {
      console.warn('⚠️ Could not fetch last DB record, initializing with null');
      Object.keys(seriesData).forEach(key => {
        lastValues[key] = null;
      });
    }

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
        } else if (lastValues[key] !== null) {
          // Using forward-fill for this series on this date
          if (date === allDates[allDates.length - 1]) {
            console.log(`🔄 Forward-fill: ${key} = ${lastValues[key]} (FRED data not available for ${date})`);
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

      // HOTFIX 2025-11-04: Calculate money market spreads
      // SOFR-EFFR spread (secured vs unsecured - MONEY MARKET STRESS INDICATOR)
      if (data.sofr !== null && data.dff !== null) {
        data.sofr_effr_spread = Number((data.sofr - data.dff).toFixed(4));
      } else {
        data.sofr_effr_spread = null;
      }

      // EFFR-IORB spread (fed funds vs Fed floor - FED CONTROL EFFECTIVENESS)
      if (data.dff !== null && data.iorb !== null) {
        data.effr_iorb_spread = Number((data.dff - data.iorb).toFixed(4));
      } else {
        data.effr_iorb_spread = null;
      }

      // Map DFF to effr for consistency with frontend
      data.effr = data.dff;

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

      // === REAL-TIME DATA OVERRIDE (solo per ultimo giorno) ===
      if (date === endDate) {
        // Verifica freshness (dati <30 min)
        const isRealtimeFresh = (Date.now() - realtimeMarket.timestamp) < 30 * 60 * 1000;
        
        // Override VIX se disponibile e fresco
        if (realtimeMarket.vix !== null && isRealtimeFresh) {
          const fredVix = data.vix;
          data.vix = realtimeMarket.vix;
          console.log(`🔥 VIX OVERRIDE: ${realtimeMarket.vix.toFixed(2)} (real-time) vs ${fredVix !== null ? fredVix.toFixed(2) : 'null'} (FRED)`);
          
          // Validation: alert se delta >5%
          validateRealtimeData(realtimeMarket.vix, fredVix, 'VIX', 5);
        }
        
        // Override DXY se disponibile e fresco
        if (realtimeMarket.dxy !== null && isRealtimeFresh) {
          const fredDxy = data.dxy_broad;
          data.dxy_broad = realtimeMarket.dxy;
          console.log(`🔥 DXY OVERRIDE: ${realtimeMarket.dxy.toFixed(2)} (real-time) vs ${fredDxy !== null ? fredDxy.toFixed(2) : 'null'} (FRED)`);
          
          // Validation: alert se delta >2%
          validateRealtimeData(realtimeMarket.dxy, fredDxy, 'DXY', 2);
        }
        
        if (!isRealtimeFresh) {
          console.warn(`⚠️ Real-time data stale (age: ${Math.floor((Date.now() - realtimeMarket.timestamp) / 60000)} min), using FRED fallback`);
        }
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
        console.log(`   EFFR: ${data.effr}%`);  // HOTFIX 2025-11-04
        console.log(`   SOFR-IORB Spread: ${data.sofr_iorb_spread ? (data.sofr_iorb_spread * 100).toFixed(2) : 'NULL'}bps`);
        console.log(`   SOFR-EFFR Spread: ${data.sofr_effr_spread ? (data.sofr_effr_spread * 100).toFixed(2) : 'NULL'}bps`);  // HOTFIX 2025-11-04
        console.log(`   EFFR-IORB Spread: ${data.effr_iorb_spread ? (data.effr_iorb_spread * 100).toFixed(2) : 'NULL'}bps`);  // HOTFIX 2025-11-04
        console.log(`   Balance Sheet: ${data.walcl ? `$${(data.walcl/1000000).toFixed(2)}T` : 'NULL'}`);
        console.log(`   Reserves: ${data.wresbal ? `$${(data.wresbal/1000).toFixed(2)}T` : 'NULL'}`);
        console.log(`   DXY Index: ${data.dxy_broad !== null && data.dxy_broad !== undefined ? data.dxy_broad.toFixed(2) : 'NULL'}`);
        
        console.log('\n📊 DELTA 4W (CRITICAL FOR SCENARIO):');
        console.log(`   Δ Balance Sheet: ${data.d_walcl_4w !== null ? `${data.d_walcl_4w > 0 ? '+' : ''}$${(data.d_walcl_4w/1000).toFixed(1)}B` : 'NULL'} (raw: ${data.d_walcl_4w}M)`);
        console.log(`   Δ Reserves: ${data.d_wresbal_4w !== null ? `${data.d_wresbal_4w > 0 ? '+' : ''}$${(data.d_wresbal_4w/1000).toFixed(1)}B` : 'NULL'} (raw: ${data.d_wresbal_4w}M)`);
        console.log(`   Δ RRP: ${data.d_rrpontsyd_4w !== null ? `${data.d_rrpontsyd_4w > 0 ? '+' : ''}$${data.d_rrpontsyd_4w.toFixed(1)}B` : 'NULL'} (already in B)`);
        console.log(`   Δ T10Y3M: ${data.d_t10y3m_4w !== null ? `${data.d_t10y3m_4w > 0 ? '+' : ''}${data.d_t10y3m_4w.toFixed(2)}%` : 'NULL'}`);
        console.log(`   Δ DXY: ${data.d_dxy_4w !== null ? `${data.d_dxy_4w > 0 ? '+' : ''}${data.d_dxy_4w.toFixed(2)}` : 'NULL'}`);
        
        console.log('\n🎯 SCENARIO DETECTED: ' + data.scenario.toUpperCase());
        
        console.log('\n✅ DATA QUALITY CHECKS:');
        console.log(`   WALCL not null: ${data.walcl !== null} ${data.walcl !== null ? '✓' : '✗'}`);
        console.log(`   WRESBAL not null: ${data.wresbal !== null} ${data.wresbal !== null ? '✓' : '✗'}`);
        console.log(`   SPREAD not null: ${data.sofr_iorb_spread !== null} ${data.sofr_iorb_spread !== null ? '✓' : '✗'}`);
        console.log(`   SOFR not null: ${data.sofr !== null} ${data.sofr !== null ? '✓' : '✗'}`);
        console.log(`   IORB not null: ${data.iorb !== null} ${data.iorb !== null ? '✓' : '✗'}`);
        console.log(`   EFFR not null: ${data.effr !== null} ${data.effr !== null ? '✓' : '✗'}`);  // HOTFIX 2025-11-04
        
        // HOTFIX 2025-11-04: Alert for elevated spreads
        if (data.sofr_effr_spread !== null) {
          const spreadBps = Math.abs(data.sofr_effr_spread * 100);
          if (spreadBps > 20) {
            console.warn(`🚨 CRITICAL: SOFR-EFFR spread elevated at ${spreadBps.toFixed(2)}bps - Money market stress detected`);
          } else if (spreadBps > 10) {
            console.warn(`⚠️ WARNING: SOFR-EFFR spread elevated at ${spreadBps.toFixed(2)}bps - Elevated money market risk`);
          }
        }
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('💰 MONEY MARKET RATES (HOTFIX V1):');  // HOTFIX 2025-11-04: Diagnostic signature
        console.log(`   SOFR: ${data.sofr ? data.sofr.toFixed(2) + '%' : 'N/A'}`);
        console.log(`   IORB: ${data.iorb ? data.iorb.toFixed(2) + '%' : 'N/A'}`);
        console.log(`   EFFR: ${data.effr ? data.effr.toFixed(2) + '%' : 'N/A'}`);
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

    // Note: Forward fill is already handled above (lines 194-203)
    // Missing values are automatically filled with the last known value

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

function determineScenario(data: any): string {
  // Estrai i delta calcolati correttamente (ora disponibili!)
  const d_walcl_4w = data.d_walcl_4w ?? null;
  const d_wresbal_4w = data.d_wresbal_4w ?? null;
  const d_rrpontsyd_4w = data.d_rrpontsyd_4w ?? null;

  // UNITÀ DI MISURA (VERIFIED 2025-11-28):
  // - d_walcl_4w: MILLIONS ($M) → divide by 1000 for $B
  // - d_wresbal_4w: MILLIONS ($M) → divide by 1000 for $B (NOT billions!)
  // - d_rrpontsyd_4w: BILLIONS ($B) → use directly, already in $B

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
    d_wresbal_4w_millions: d_wresbal_4w,
    d_rrpontsyd_4w_billions: d_rrpontsyd_4w
  });

  console.log('🔍 Scenario Calculation - Readable:', {
    balance_sheet_change: d_walcl_4w !== null ? `${d_walcl_4w > 0 ? '+' : ''}$${(d_walcl_4w / 1000).toFixed(1)}B` : 'NULL',
    reserves_change: d_wresbal_4w !== null ? `${d_wresbal_4w > 0 ? '+' : ''}$${(d_wresbal_4w / 1000).toFixed(1)}B` : 'NULL',
    rrp_change: d_rrpontsyd_4w !== null ? `${d_rrpontsyd_4w > 0 ? '+' : ''}$${d_rrpontsyd_4w.toFixed(1)}B` : 'NULL'
  });

  console.log('🎯 Checking Scenario Conditions (Soglie Ottimizzate Liquidity Analysis)...');

  // === QE AGGRESSIVO ===
  // Soglia: Bilancio +$50B E Riserve +$50B (4 settimane)
  // UNITÀ: d_walcl_4w e d_wresbal_4w sono in MILIONI
  const qeCondition = d_walcl_4w > 50000 && d_wresbal_4w > 50000; // 50000M = $50B
  console.log(`   QE: ΔBS > +$50B (${d_walcl_4w > 50000 ? '✓' : '✗'} actual: ${(d_walcl_4w/1000).toFixed(1)}B) && ΔRiserve > +$50B (${d_wresbal_4w > 50000 ? '✓' : '✗'} actual: ${(d_wresbal_4w/1000).toFixed(1)}B) = ${qeCondition}`);
  
  if (qeCondition) {
    console.log('✅ Scenario: QE - Espansione aggressiva Fed rilevata');
    return 'qe';
  }

  // === QT (QUANTITATIVE TIGHTENING) === [CHECKED FIRST - Priority over stealth signals]
  // Soglia: Bilancio -$25B O Riserve -$50B (4 settimane)
  // UNITÀ: d_walcl_4w e d_wresbal_4w sono in MILIONI, d_rrpontsyd_4w è in MILIARDI
  const qtCondition = d_walcl_4w < -25000 || d_wresbal_4w < -50000; // -25000M = -$25B, -50000M = -$50B
  console.log(`   QT: ΔBS < -$25B (${d_walcl_4w < -25000 ? '✓' : '✗'} actual: ${(d_walcl_4w/1000).toFixed(1)}B) || ΔRiserve < -$50B (${d_wresbal_4w < -50000 ? '✓' : '✗'} actual: ${(d_wresbal_4w/1000).toFixed(1)}B) = ${qtCondition}`);
  
  if (qtCondition) {
    console.log('✅ Scenario: QT - Contrazione liquidità significativa rilevata');
    return 'qt';
  }

  // === STEALTH QE (Rotazione Liquidità) === [Only if NOT QT]
  // UNITÀ: d_walcl_4w e d_wresbal_4w in MILIONI, d_rrpontsyd_4w in MILIARDI
  // Opzione 1: RRP drena >$30B mentre riserve stabili/crescono E BS non contrae
  // Opzione 2: Riserve crescono >$30B con bilancio stabile/crescita moderata
  // Opzione 3: Bilancio cresce >$30B con contrazione RRP
  const bsNotContracting = d_walcl_4w > -25000; // BS non contrae più di -$25B
  const rrpDrainageSignificant = d_rrpontsyd_4w < -30 && d_wresbal_4w >= -20000 && bsNotContracting; // RRP drena >$30B, riserve >= -$20B
  const reservesGrowthModerate = d_wresbal_4w > 30000 && d_walcl_4w > -20000; // Riserve +$30B, BS >= -$20B
  const balanceSheetGrowthWithRrpDrain = d_walcl_4w > 30000 && d_rrpontsyd_4w < -20; // BS +$30B, RRP drena >$20B
  
  const stealthQeCondition = rrpDrainageSignificant || reservesGrowthModerate || balanceSheetGrowthWithRrpDrain;
  
  console.log(`   STEALTH_QE conditions (BS not contracting: ${bsNotContracting}):`);
  console.log(`     → RRP drain >$30B + Res stable + BS ok: ${rrpDrainageSignificant} (ΔRRP: ${d_rrpontsyd_4w.toFixed(1)}B, ΔRes: ${(d_wresbal_4w/1000).toFixed(1)}B, ΔBS: ${(d_walcl_4w/1000).toFixed(1)}B)`);
  console.log(`     → Reserves +$30B + BS stable: ${reservesGrowthModerate} (ΔRes: ${(d_wresbal_4w/1000).toFixed(1)}B, ΔBS: ${(d_walcl_4w/1000).toFixed(1)}B)`);
  console.log(`     → BS +$30B + RRP drain: ${balanceSheetGrowthWithRrpDrain} (ΔBS: ${(d_walcl_4w/1000).toFixed(1)}B, ΔRRP: ${d_rrpontsyd_4w.toFixed(1)}B)`);
  console.log(`     = FINAL: ${stealthQeCondition}`);
  
  if (stealthQeCondition) {
    console.log('✅ Scenario: STEALTH_QE - Rotazione liquidità stimolativa rilevata');
    return 'stealth_qe';
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
  
  // Positive drivers (show when things are good)
  if ((inputs.sofr_iorb_spread || 0) < 0.05 && (inputs.sofr_iorb_spread || 0) >= 0 && inputs.wresbal > 2500) {
    drivers.push('Liquidità Fed ottimale');
  }
  if ((inputs.vix || 100) < 16) {
    drivers.push('Volatilità molto bassa');
  }
  if ((inputs.hy_oas || 100) < 3.5) {
    drivers.push('Credit spread stretto');
  }
  if ((inputs.t10y3m || 0) > 0.3) {
    drivers.push('Curva dei tassi normale');
  }
  
  // Growth/positive changes
  if ((inputs.d_wresbal_4w || 0) > 0) drivers.push('Riserve in aumento');
  if ((inputs.d_rrpontsyd_4w || 0) < 0) drivers.push('RRP in drenaggio');
  
  // Stress/negative drivers
  if ((inputs.vix || 0) > 22) drivers.push('VIX elevato');
  if ((inputs.hy_oas || 0) > 5.5) drivers.push('HY OAS in widening');
  if ((inputs.d_dxy_4w || 0) > 0.5) drivers.push('USD in rafforzamento');
  if ((inputs.t10y3m || 0) < 0) drivers.push('Curva invertita');
  if ((inputs.sofr_iorb_spread || 0) > 0.10) drivers.push('SOFR-IORB spread elevato'); // Changed from > 0 to > 0.10
  
  return { context, sustainability, risk_level, confidence, drivers };
}