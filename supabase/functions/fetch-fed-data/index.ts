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
      'DGS10', // 10-Year Treasury (us10y)
      'VIXCLS', // VIX Volatility Index
      'BAMLH0A0HYM2', // High Yield Option Adjusted Spread
      'T10Y3M' // 10-Year Treasury Constant Maturity Minus 3-Month Treasury
      // DXY rimosso - verrà preso da Yahoo Finance
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
    
    // === FETCH DXY PROXY FROM FRED ===
    // DXY reale non disponibile su FRED, uso DEXUSEU (USD/EUR) come proxy
    // DEXUSEU range tipico: 0.85-1.25 (inverso del DXY trend)
    console.log('\n🔄 Fetching DXY proxy (DEXUSEU) from FRED...');
    try {
      const dxyUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=DEXUSEU&api_key=${fredApiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`;
      
      const dxyResponse = await fetch(dxyUrl);
      
      if (dxyResponse.ok) {
        const json: SeriesResponse = await dxyResponse.json();
        
        if (json.observations && json.observations.length > 0) {
          // Convertiamo USD/EUR in un indice che si muove come il DXY
          // DXY tipico: 90-110, USD/EUR tipico: 0.85-1.25
          // Approssimiamo: DXY ≈ 100 / USD/EUR
          const dxyData: FedDataPoint[] = json.observations.map(obs => ({
            date: obs.date,
            value: obs.value === '.' ? '.' : (100 / parseFloat(obs.value)).toFixed(5)
          }));
          
          seriesData['dxy_broad'] = dxyData;
          console.log(`✅ DXY (proxy DEXUSEU): ${dxyData.length} observations fetched`);
          console.log(`   Last 5 values:`);
          dxyData.slice(-5).forEach(obs => {
            console.log(`     ${obs.date}: ${obs.value}`);
          });
        } else {
          console.error(`❌ No observations for DEXUSEU`);
          seriesData['dxy_broad'] = [];
        }
      } else {
        console.error(`❌ Failed to fetch DEXUSEU: ${dxyResponse.status}`);
        seriesData['dxy_broad'] = [];
      }
    } catch (error) {
      console.error(`❌ Error fetching DXY proxy:`, error);
      seriesData['dxy_broad'] = [];
    }

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
  const { d_walcl_4w, d_wresbal_4w, d_rrpontsyd_4w } = data;

  // UNITÀ DI MISURA:
  // - d_walcl_4w: millions ($M) → delta a 4 settimane
  // - d_wresbal_4w: billions ($B) → delta a 4 settimane
  // - d_rrpontsyd_4w: billions ($B) → delta a 4 settimane

  // Data validation
  const isValidData = 
    d_walcl_4w !== null &&
    d_wresbal_4w !== null &&
    d_rrpontsyd_4w !== null;

  if (!isValidData) {
    console.error('❌ INVALID DATA for scenario calculation:', {
      d_walcl_4w, d_wresbal_4w, d_rrpontsyd_4w
    });
    console.error('⚠️ Returning NEUTRAL due to missing data');
    return 'neutral';
  }

  // Debug logging dettagliato
  console.log('🔍 Scenario Calculation (DELTA-BASED) - Raw Values:', {
    d_walcl_4w_millions: d_walcl_4w,
    d_wresbal_4w_billions: d_wresbal_4w,
    d_rrpontsyd_4w_billions: d_rrpontsyd_4w
  });

  console.log('🔍 Scenario Calculation - Readable:', {
    balance_sheet_change: `${d_walcl_4w > 0 ? '+' : ''}$${(d_walcl_4w / 1000).toFixed(1)}B`,
    reserves_change: `${d_wresbal_4w > 0 ? '+' : ''}$${d_wresbal_4w.toFixed(1)}B`,
    rrp_change: `${d_rrpontsyd_4w > 0 ? '+' : ''}$${d_rrpontsyd_4w.toFixed(1)}B`
  });

  console.log('🎯 Checking Scenario Conditions (Soglie Macro Validate)...');

  // === QE AGGRESSIVO ===
  // Soglia: Bilancio +$20B E Riserve +$100B (4 settimane)
  // Fonte: Ricerca Fed - indica intervento significativo
  const qeCondition = d_walcl_4w > 20000 && d_wresbal_4w > 100;
  console.log(`   QE: ΔBS > $20B (${d_walcl_4w > 20000}) && ΔRiserve > $100B (${d_wresbal_4w > 100}) = ${qeCondition}`);
  
  if (qeCondition) {
    console.log('✅ Scenario: QE - Espansione aggressiva rilevata');
    return 'qe';
  }

  // === STEALTH QE ===
  // Soglia: Riserve in aumento OPPURE RRP in drenaggio >$20B
  // Fonte: Letteratura Fed - rotazione liquidità da RRP a riserve è stimolativa
  const stealthQeCondition = d_wresbal_4w > 0 || d_rrpontsyd_4w < -20;
  console.log(`   STEALTH_QE: ΔRiserve > 0 (${d_wresbal_4w > 0}) || ΔRRP < -$20B (${d_rrpontsyd_4w < -20}) = ${stealthQeCondition}`);
  
  if (stealthQeCondition) {
    console.log('✅ Scenario: STEALTH_QE - Rotazione liquidità o espansione graduale');
    return 'stealth_qe';
  }

  // === QT (QUANTITATIVE TIGHTENING) ===
  // Soglia: Bilancio -$20B O Riserve -$100B (4 settimane)
  // Fonte: Thresholds standard per contrazione Fed
  const qtCondition = d_walcl_4w < -20000 || d_wresbal_4w < -100;
  console.log(`   QT: ΔBS < -$20B (${d_walcl_4w < -20000}) || ΔRiserve < -$100B (${d_wresbal_4w < -100}) = ${qtCondition}`);
  
  if (qtCondition) {
    console.log('✅ Scenario: QT - Contrazione attiva rilevata');
    return 'qt';
  }

  console.log('✅ Scenario: NEUTRAL - Nessun movimento significativo');
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