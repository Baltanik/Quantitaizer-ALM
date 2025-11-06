import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
 * Calcola il DXY corretto usando le serie FRED.
 */
function calculateDXY(rates) {
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
    console.log('🚀 [START] Function execution started');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const fredApiKey = Deno.env.get('FRED_API_KEY');

    console.log('🔑 [ENV] Environment variables loaded:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasFredApiKey: !!fredApiKey
    });

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ [DB] Supabase client created');
    console.log('📡 [FETCH] Starting Fed data fetch...');

    const series = [
      'SOFR', 'IORB', 'DFF', 'WALCL', 'WRESBAL', 'RRPONTSYD',
      'RPONTSYD', 'RPONTTLD', 'DTB3', 'DTB1YR', 'DGS10',
      'VIXCLS', 'BAMLH0A0HYM2', 'T10Y3M',
      'DEXUSEU', 'DEXJPUS', 'DEXUSUK', 'DEXCAUS', 'DEXSZUS', 'DEXCHUS'
    ];

    const today = new Date();
    const startDateObj = new Date(today);
    startDateObj.setDate(startDateObj.getDate() - 3);
    const startDate = startDateObj.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    console.log(`📅 [DATES] Date range: ${startDate} to ${endDate}`);
    console.log(`📊 [SERIES] Total series to fetch: ${series.length}`);

    const seriesData = {};
    let fetchStartTime = Date.now();

    for (const seriesId of series) {
      try {
        const seriesStartTime = Date.now();
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredApiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`;
        console.log(`\n🔄 [API] Fetching ${seriesId}...`);

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

        const json = await response.json();

        const fetchTime = Date.now() - seriesStartTime;

        if (json.observations && json.observations.length > 0) {
          seriesData[key] = json.observations;
          console.log(`✅ [API] ${seriesId}: ${json.observations.length} obs in ${fetchTime}ms`);
        } else {
          console.error(`❌ [API] ${seriesId}: No observations in response`);
          seriesData[key] = [];
        }
      } catch (error) {
        console.error(`❌ Exception fetching ${seriesId}:`, error);
        let key = seriesId.toLowerCase();
        if (seriesId === 'DGS10') key = 'us10y';
        if (seriesId === 'VIXCLS') key = 'vix';
        if (seriesId === 'BAMLH0A0HYM2') key = 'hy_oas';
        if (seriesId === 'T10Y3M') key = 't10y3m';
        if (seriesId === 'DFF') key = 'dff';
        seriesData[key] = [];
      }
    }

    const totalFetchTime = Date.now() - fetchStartTime;
    console.log(`\n📊 [FETCH] Summary: ${Object.keys(seriesData).length}/${series.length} series in ${totalFetchTime}ms`);
    console.log(`⏱️  [TIMING] Average per series: ${(totalFetchTime / series.length).toFixed(0)}ms`);

    console.log(`\n🔄 [PROCESS] Building date range array...`);
    const allDates = [];
    const currentDate = new Date(startDate);
    while (currentDate <= today) {
      allDates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`✅ [PROCESS] ${allDates.length} dates to process`);
    console.log(`🔄 [PROCESS] Starting forward fill and calculations...`);

    const processStartTime = Date.now();
    const lastValues = {};
    Object.keys(seriesData).forEach(key => {
      lastValues[key] = null;
    });

    const recordsToInsert = [];
    const scenarioCounts = { stealth_qe: 0, qe: 0, qt: 0, neutral: 0 };

    const getValueNDaysAgo = (records, currentIndex, key, daysAgo) => {
      const targetIndex = currentIndex - daysAgo;
      if (targetIndex >= 0 && targetIndex < records.length) {
        return records[targetIndex][key] ?? null;
      }
      return null;
    };

    for (let i = 0; i < allDates.length; i++) {
      const date = allDates[i];
      const data = { date };

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

      if (data.sofr !== null && data.iorb !== null) {
        data.sofr_iorb_spread = Number((data.sofr - data.iorb).toFixed(4));
      } else {
        data.sofr_iorb_spread = null;
      }

      if (data.sofr !== null && data.dff !== null) {
        data.sofr_effr_spread = Number((data.sofr - data.dff).toFixed(4));
      } else {
        data.sofr_effr_spread = null;
      }

      if (data.dff !== null && data.iorb !== null) {
        data.effr_iorb_spread = Number((data.dff - data.iorb).toFixed(4));
      } else {
        data.effr_iorb_spread = null;
      }

      data.effr = data.dff;

      const fxValues = [data.dexuseu, data.dexjpus, data.dexusuk, data.dexcaus, data.dexszus, data.dexchus];
      const allFxValid = fxValues.every(val => val !== null && val !== undefined && !isNaN(val) && val > 0);

      if (allFxValid) {
        const fxRates = {
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
          data.dxy_broad = null;
        }
      } else {
        data.dxy_broad = null;
      }

      const daysBack = 28;

      const walcl_4w_ago = getValueNDaysAgo(recordsToInsert, i, 'walcl', daysBack);
      data.d_walcl_4w = (data.walcl !== null && walcl_4w_ago !== null)
        ? Number((data.walcl - walcl_4w_ago).toFixed(2))
        : null;

      const wresbal_4w_ago = getValueNDaysAgo(recordsToInsert, i, 'wresbal', daysBack);
      data.d_wresbal_4w = (data.wresbal !== null && wresbal_4w_ago !== null)
        ? Number((data.wresbal - wresbal_4w_ago).toFixed(2))
        : null;

      const rrpontsyd_4w_ago = getValueNDaysAgo(recordsToInsert, i, 'rrpontsyd', daysBack);
      data.d_rrpontsyd_4w = (data.rrpontsyd !== null && rrpontsyd_4w_ago !== null)
        ? Number((data.rrpontsyd - rrpontsyd_4w_ago).toFixed(2))
        : null;

      const t10y3m_4w_ago = getValueNDaysAgo(recordsToInsert, i, 't10y3m', daysBack);
      data.d_t10y3m_4w = (data.t10y3m !== null && t10y3m_4w_ago !== null)
        ? Number((data.t10y3m - t10y3m_4w_ago).toFixed(5))
        : null;

      const dxy_4w_ago = getValueNDaysAgo(recordsToInsert, i, 'dxy_broad', daysBack);
      data.d_dxy_4w = (data.dxy_broad !== null && dxy_4w_ago !== null)
        ? Number((data.dxy_broad - dxy_4w_ago).toFixed(5))
        : null;

      data.scenario = determineScenario(data);
      scenarioCounts[data.scenario]++;

      const scenarioState = deriveScenarioQualifiers(data);
      data.context = scenarioState.context;
      data.sustainability = scenarioState.sustainability;
      data.risk_level = scenarioState.risk_level;
      data.confidence = scenarioState.confidence;
      data.drivers = scenarioState.drivers;

      recordsToInsert.push(data);
    }

    const processTime = Date.now() - processStartTime;
    console.log(`✅ [PROCESS] Completed in ${processTime}ms`);

    console.log('\n📊 ========== DATA PROCESSING SUMMARY ==========');
    console.log('📅 Date Range:', { start: startDate, end: endDate });
    console.log('📈 Total Records:', recordsToInsert.length);
    console.log('📊 Series Fetched:', Object.keys(seriesData).length, '/', series.length);
    console.log('🎯 Scenario Distribution:', scenarioCounts);
    console.log('===============================================');

    console.log(`\n💾 [DB] Inserting ${recordsToInsert.length} records in batches of 100...`);

    const dbStartTime = Date.now();
    const batchSize = 100;
    for (let i = 0; i < recordsToInsert.length; i += batchSize) {
      const batch = recordsToInsert.slice(i, i + batchSize);
      const { error: upsertError } = await supabase
        .from('fed_data')
        .upsert(batch, { onConflict: 'date' });

      if (upsertError) {
        console.error(`❌ [DB] Error in batch ${i / batchSize + 1}:`, upsertError);
        throw upsertError;
      }
      console.log(`✅ [DB] Batch ${i / batchSize + 1}/${Math.ceil(recordsToInsert.length / batchSize)} inserted`);
    }

    const dbTime = Date.now() - dbStartTime;
    console.log(`✅ [DB] All records inserted in ${dbTime}ms`);

    console.log(`\n🔔 [SIGNAL] Generating signal from latest data...`);
    const latestData = recordsToInsert[recordsToInsert.length - 1];
    const signal = generateSignal(latestData);
    if (signal) {
      console.log('✅ [SIGNAL] Generated:', signal);
      const { error: signalError } = await supabase
        .from('signals')
        .insert([{ ...signal, date: latestData.date }]);

      if (signalError) {
        console.error('❌ [SIGNAL] Insert error:', signalError);
      } else {
        console.log('✅ [SIGNAL] Signal saved to database');
      }
    } else {
      console.log('ℹ️  [SIGNAL] No signal generated for current conditions');
    }

    console.log('\n🎉 [SUCCESS] Fed data saved successfully!');

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
    console.error('💥 [ERROR] Caught exception in fetch-fed-data:');
    console.error('   Type:', error?.constructor?.name);
    console.error('   Message:', error instanceof Error ? error.message : String(error));
    console.error('   Stack:', error instanceof Error ? error.stack : 'No stack trace');

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

function determineScenario(data) {
  const d_walcl_4w = data.d_walcl_4w ?? null;
  const d_wresbal_4w = data.d_wresbal_4w ?? null;
  const d_rrpontsyd_4w = data.d_rrpontsyd_4w ?? null;

  const isValidData =
    d_walcl_4w !== null &&
    d_wresbal_4w !== null &&
    d_rrpontsyd_4w !== null;

  if (!isValidData) {
    console.warn('⚠️ MISSING DELTA DATA for scenario calculation');
    return 'neutral';
  }

  const qeCondition = d_walcl_4w > 50000 && d_wresbal_4w > 50;
  if (qeCondition) {
    console.log('✅ Scenario: QE');
    return 'qe';
  }

  const rrpDrainageSignificant = d_rrpontsyd_4w < -30 && d_wresbal_4w >= -20;
  const reservesGrowthModerate = d_wresbal_4w > 20 && d_walcl_4w > -20000;
  const balanceSheetGrowthWithRrpDrain = d_walcl_4w > 30000 && d_rrpontsyd_4w < -20;

  const stealthQeCondition = rrpDrainageSignificant || reservesGrowthModerate || balanceSheetGrowthWithRrpDrain;

  if (stealthQeCondition) {
    console.log('✅ Scenario: STEALTH_QE');
    return 'stealth_qe';
  }

  const qtCondition = d_walcl_4w < -50000 || d_wresbal_4w < -80;
  if (qtCondition) {
    console.log('✅ Scenario: QT');
    return 'qt';
  }

  console.log('✅ Scenario: NEUTRAL');
  return 'neutral';
}

function generateSignal(data) {
  const { sofr_iorb_spread, wresbal, scenario, walcl } = data;

  if (sofr_iorb_spread !== null && sofr_iorb_spread > 0.25) {
    return {
      signal_type: 'high_stress',
      description: `SOFR-IORB spread elevated at ${sofr_iorb_spread.toFixed(2)}bps`,
      confidence: 85
    };
  }

  if (scenario === 'stealth_qe') {
    return {
      signal_type: 'stealth_qe',
      description: `Stealth QE detected`,
      confidence: 80
    };
  }

  if (scenario === 'qe') {
    return {
      signal_type: 'qe_active',
      description: `Full QE mode`,
      confidence: 90
    };
  }

  if (scenario === 'qt') {
    return {
      signal_type: 'qt_active',
      description: `Quantitative Tightening`,
      confidence: 85
    };
  }

  if (sofr_iorb_spread !== null && sofr_iorb_spread < 0.10 && wresbal > 3000) {
    return {
      signal_type: 'optimal_liquidity',
      description: `Optimal liquidity conditions`,
      confidence: 70
    };
  }

  return null;
}

function deriveScenarioQualifiers(inputs) {
  const stressSignals = [
    (inputs.vix || 0) > 22,
    (inputs.hy_oas || 0) > 5.5,
    (inputs.d_dxy_4w || 0) > 0.5,
    (inputs.t10y3m || 0) < 0 && (inputs.d_t10y3m_4w || 0) < 0,
    (inputs.sofr_iorb_spread || 0) > 0
  ].filter(Boolean).length;

  const growthSignals = [
    (inputs.vix || 100) < 16,
    (inputs.hy_oas || 100) < 4.0,
    (inputs.d_dxy_4w || 0) < -0.5,
    (inputs.t10y3m || 0) > 0 || (inputs.d_t10y3m_4w || 0) > 0,
    (inputs.d_wresbal_4w || 0) > 0 && (inputs.d_rrpontsyd_4w || 0) < 0
  ].filter(Boolean).length;

  let context = 'ambiguo';
  if (stressSignals >= 2 && stressSignals > growthSignals) {
    context = 'stress_guidato';
  } else if (growthSignals >= 2 && growthSignals > stressSignals) {
    context = 'crescita_guidata';
  }

  const rotationOk = (inputs.d_wresbal_4w || 0) > 0 && (inputs.d_rrpontsyd_4w || 0) < 0;
  let sustainability = 'media';

  if (rotationOk && growthSignals >= 2) {
    sustainability = 'alta';
  } else if (context === 'stress_guidato' || (!rotationOk && (inputs.d_walcl_4w || 0) > 0)) {
    sustainability = 'bassa';
  }

  let risk_level = 'elevato';

  if (context === 'crescita_guidata' && sustainability !== 'bassa') {
    risk_level = 'normale';
  } else if (context === 'stress_guidato' && ((inputs.vix || 0) > 24 || (inputs.hy_oas || 0) > 6.0)) {
    risk_level = 'alto';
  }

  const votes = Math.max(stressSignals, growthSignals);
  const confidence = votes >= 3 ? 'alta' : votes === 2 ? 'media' : 'bassa';

  const drivers = [];
  if ((inputs.d_wresbal_4w || 0) > 0) drivers.push('Riserve in aumento');
  if ((inputs.d_rrpontsyd_4w || 0) < 0) drivers.push('RRP in drenaggio');
  if ((inputs.vix || 0) > 22) drivers.push('VIX elevato');
  if ((inputs.hy_oas || 0) > 5.5) drivers.push('HY OAS in widening');
  if ((inputs.d_dxy_4w || 0) > 0.5) drivers.push('USD in rafforzamento');
  if ((inputs.t10y3m || 0) < 0) drivers.push('Curva invertita');
  if ((inputs.sofr_iorb_spread || 0) > 0) drivers.push('SOFR > IORB (tensione)');

  return { context, sustainability, risk_level, confidence, drivers };
}
