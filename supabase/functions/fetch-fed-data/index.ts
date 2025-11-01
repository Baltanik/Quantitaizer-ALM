import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      'DGS10' // 10-Year Treasury (us10y)
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
          const key = seriesId.toLowerCase().replace('dgs10', 'us10y');
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
    console.log(`Missing series:`, series.filter(s => !seriesData[s.toLowerCase().replace('dgs10', 'us10y')]));

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
    const recordsToInsert = [];
    const scenarioCounts = { stealth_qe: 0, qe: 0, qt: 0, neutral: 0 };
    
    for (const date of allDates) {
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

      // Determine scenario
      data.scenario = determineScenario(data);
      scenarioCounts[data.scenario as keyof typeof scenarioCounts]++;
      
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
        
        console.log('\n📈 HUMAN READABLE:');
        console.log(`   SOFR: ${data.sofr}%`);
        console.log(`   IORB: ${data.iorb}%`);
        console.log(`   Spread: ${data.sofr_iorb_spread ? (data.sofr_iorb_spread * 100).toFixed(2) : 'NULL'}bps`);
        console.log(`   Balance Sheet: ${data.walcl ? `$${(data.walcl/1000000).toFixed(2)}T` : 'NULL'}`);
        console.log(`   Reserves: ${data.wresbal ? `$${(data.wresbal/1000).toFixed(2)}T` : 'NULL'}`);
        
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

function determineScenario(data: any): string {
  const { walcl, sofr_iorb_spread, wresbal } = data;

  // UNITÀ DI MISURA:
  // - walcl: millions ($M) → divide by 1,000,000 for trillions
  // - wresbal: billions ($B) → divide by 1,000 for trillions  
  // - sofr_iorb_spread: decimal (0.01 = 1 basis point)

  // Data validation
  const isValidData = 
    walcl !== null && walcl > 0 &&
    wresbal !== null && wresbal > 0 &&
    sofr_iorb_spread !== null;

  if (!isValidData) {
    console.error('❌ INVALID DATA for scenario calculation:', {
      walcl, wresbal, sofr_iorb_spread
    });
    console.error('⚠️ Returning NEUTRAL due to missing data');
    return 'neutral';
  }

  // Conversioni per readability
  const walclTrillion = walcl / 1000000;  // $T
  const wresbalTrillion = wresbal / 1000;  // $T
  const spreadBps = sofr_iorb_spread * 100;  // basis points

  // Debug logging dettagliato
  console.log('🔍 Scenario Calculation - Raw Values:', {
    walcl_millions: walcl,
    wresbal_billions: wresbal,
    spread_decimal: sofr_iorb_spread
  });

  console.log('🔍 Scenario Calculation - Readable:', {
    walcl: `$${walclTrillion.toFixed(2)}T`,
    wresbal: `$${wresbalTrillion.toFixed(2)}T`,
    spread: `${spreadBps.toFixed(2)}bps`
  });

  // Range validation (sanity checks)
  if (walcl < 5000000 || walcl > 10000000) {
    console.warn(`⚠️ WALCL out of expected range: $${walclTrillion.toFixed(2)}T (expected $5T-$10T)`);
  }
  if (wresbal < 1000 || wresbal > 5000) {
    console.warn(`⚠️ WRESBAL out of expected range: $${wresbalTrillion.toFixed(2)}T (expected $1T-$5T)`);
  }
  if (Math.abs(sofr_iorb_spread) > 1.0) {
    console.warn(`⚠️ SPREAD out of expected range: ${spreadBps.toFixed(2)}bps (expected -100bps to +100bps)`);
  }

  // Updated thresholds based on current market conditions (Nov 2024)
  // Current levels: WALCL ~$7.0T, WRESBAL ~$3.2T, SPREAD ~8bps

  console.log('🎯 Checking Scenario Conditions...');

  // Full QE: Very large balance sheet and reserves (CHECK FIRST)
  const qeCondition = walcl > 8000000 && wresbal > 4000;
  console.log(`   QE: WALCL > $8.0T (${walcl > 8000000}) && WRESBAL > $4.0T (${wresbal > 4000}) = ${qeCondition}`);
  
  if (qeCondition) {
    console.log('✅ Scenario: QE detected');
    return 'qe';
  }

  // Stealth QE: Balance sheet expansion with tight spread
  // SOGLIA ABBASSATA: WALCL > $6.5T (era $6.8T) per matchare dati attuali
  const stealthQeCondition = 
    walcl > 6500000 && 
    sofr_iorb_spread < 0.20 && 
    wresbal > 2500;
  
  console.log(`   STEALTH_QE: WALCL > $6.5T (${walcl > 6500000}) && SPREAD < 20bps (${sofr_iorb_spread < 0.20}) && WRESBAL > $2.5T (${wresbal > 2500}) = ${stealthQeCondition}`);
  
  if (stealthQeCondition) {
    console.log('✅ Scenario: STEALTH_QE detected');
    return 'stealth_qe';
  }

  // QT: Shrinking balance sheet with wide spread
  const qtCondition = walcl < 6500000 && sofr_iorb_spread > 0.25;
  console.log(`   QT: WALCL < $6.5T (${walcl < 6500000}) && SPREAD > 25bps (${sofr_iorb_spread > 0.25}) = ${qtCondition}`);
  
  if (qtCondition) {
    console.log('✅ Scenario: QT detected');
    return 'qt';
  }

  console.log('✅ Scenario: NEUTRAL (no conditions met)');
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