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

function calculateDXY(rates: FXRates): number {
  const eurComponent = Math.pow(1 / rates.EUR, DXY_WEIGHTS.EUR);
  const jpyComponent = Math.pow(rates.JPY / 100, DXY_WEIGHTS.JPY);
  const gbpComponent = Math.pow(1 / rates.GBP, DXY_WEIGHTS.GBP);
  const cadComponent = Math.pow(1 / rates.CAD, DXY_WEIGHTS.CAD);
  const sekComponent = Math.pow(rates.SEK / 100, DXY_WEIGHTS.SEK);
  const chfComponent = Math.pow(1 / rates.CHF, DXY_WEIGHTS.CHF);

  const geometricMean = eurComponent * jpyComponent * gbpComponent * 
                       cadComponent * sekComponent * chfComponent;
  
  return geometricMean * 50.14348112;
}

// V2 CALCULATION FUNCTIONS
function calculateLiquidityScoreSimplified(data: any, historical: any[]): any {
  try {
    // Balance Sheet Component (40%)
    const balanceSheetScore = Math.min(100, Math.max(0, 
      50 + (data.walcl_delta_4w || 0) * 0.0001
    ));

    // Reserves Component (30%)
    const reservesScore = Math.min(100, Math.max(0,
      50 + (data.wresbal_delta_4w || 0) * 0.0001
    ));

    // Market Stress Component (20%)
    const stressScore = Math.min(100, Math.max(0,
      100 - Math.abs(data.us10y_delta_4w || 0) * 20
    ));

    // Momentum Component (10%)
    const momentumScore = Math.min(100, Math.max(0,
      50 + (data.rrpontsyd_delta_4w || 0) * 0.00001
    ));

    // Weighted Score
    const liquidityScore = Math.round(
      balanceSheetScore * 0.4 + 
      reservesScore * 0.3 + 
      stressScore * 0.2 + 
      momentumScore * 0.1
    );

    // Grade
    let grade = 'F';
    if (liquidityScore >= 80) grade = 'A';
    else if (liquidityScore >= 70) grade = 'B';
    else if (liquidityScore >= 60) grade = 'C';
    else if (liquidityScore >= 50) grade = 'D';

    // Trend
    const recentAvg = historical.slice(-5).reduce((sum, item) => 
      sum + (item.liquidity_score || 50), 0) / 5;
    const trend = liquidityScore > recentAvg + 2 ? 'up' : 
                  liquidityScore < recentAvg - 2 ? 'down' : 'stable';

    // Confidence
    const confidence = Math.min(100, Math.max(50, 
      80 - Math.abs(liquidityScore - recentAvg) * 2
    ));

    return {
      liquidity_score: liquidityScore,
      liquidity_grade: grade,
      liquidity_trend: trend,
      liquidity_confidence: Math.round(confidence)
    };
  } catch (error) {
    console.error('Error calculating liquidity score:', error);
    return {
      liquidity_score: 50,
      liquidity_grade: 'C',
      liquidity_trend: 'stable',
      liquidity_confidence: 50
    };
  }
}

function calculateLeadingIndicatorsSimplified(data: any, historical: any[]): any {
  try {
    // RRP Velocity
    const rrpVelocity = Math.abs(data.rrpontsyd_delta_4w || 0) / 1000000;

    // Credit Stress Index
    const creditStress = Math.min(100, Math.max(0, 
      (data.ig_spread || 1) * 20
    ));

    // Repo Spike Risk
    const repoRisk = Math.min(100, Math.max(0,
      Math.abs(data.rrpontsyd_delta_4w || 0) * 0.00001
    ));

    // QT Pivot Probability
    const qtPivot = Math.min(100, Math.max(0,
      50 + (data.walcl_delta_4w || 0) * 0.00001
    ));

    // TGA Trend
    const tgaTrend = data.tga_delta_4w || 0;

    // Overall Signal
    const bullishSignals = [
      (data.walcl_delta_4w || 0) > 0,
      (data.wresbal_delta_4w || 0) > 0,
      creditStress < 30,
      repoRisk < 20
    ].filter(Boolean).length;

    const signal = bullishSignals >= 3 ? 'bullish' : 
                   bullishSignals <= 1 ? 'bearish' : 'neutral';

    return {
      leading_indicators: {
        overall_signal: signal,
        rrp_velocity: Math.round(rrpVelocity * 100) / 100,
        credit_stress_index: Math.round(creditStress),
        repo_spike_risk: Math.round(repoRisk),
        qt_pivot_probability: Math.round(qtPivot),
        tga_trend: Math.round(tgaTrend * 100) / 100
      }
    };
  } catch (error) {
    console.error('Error calculating leading indicators:', error);
    return {
      leading_indicators: {
        overall_signal: 'neutral',
        rrp_velocity: 0,
        credit_stress_index: 50,
        repo_spike_risk: 50,
        qt_pivot_probability: 50,
        tga_trend: 0
      }
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fredApiKey = Deno.env.get('FRED_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get('forceRefresh') === 'true';

    // Serie FRED da recuperare (solo quelle che esistono nel DB)
    const fredSeries = {
      'WALCL': 'walcl',
      'TOTRESNS': 'wresbal',
      'RRPONTSYD': 'rrpontsyd',
      'DGS10': 'us10y',
      'DEXUSEU': 'dexuseu',
      'DEXJPUS': 'dexjpus',
      'DEXUSUK': 'dexusuk',
      'DEXCAUS': 'dexcaus',
      'DEXSZUS': 'dexszus',
      'DEXCHUS': 'dexchus',
      'WTREGEN': 'tga'           // V2: Treasury General Account
    };

    console.log('Fetching FRED data...');
    
    // Fetch dei dati FRED
    const fredData: { [key: string]: number } = {};
    const fetchPromises = Object.entries(fredSeries).map(async ([seriesId, fieldName]) => {
      try {
        const response = await fetch(
          `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredApiKey}&file_type=json&limit=1&sort_order=desc`
        );
        
        if (!response.ok) {
          console.error(`Failed to fetch ${seriesId}: ${response.status}`);
          return;
        }
        
        const data: SeriesResponse = await response.json();
        
        if (data.observations && data.observations.length > 0) {
          const latestValue = data.observations[0].value;
          if (latestValue !== '.' && !isNaN(parseFloat(latestValue))) {
            fredData[fieldName] = parseFloat(latestValue);
          }
        }
      } catch (error) {
        console.error(`Error fetching ${seriesId}:`, error);
      }
    });

    await Promise.all(fetchPromises);

    // Calcolo DXY
    if (fredData.eur_usd && fredData.usd_jpy && fredData.gbp_usd && 
        fredData.usd_cad && fredData.usd_sek && fredData.usd_chf) {
      const fxRates: FXRates = {
        EUR: fredData.eur_usd,
        JPY: fredData.usd_jpy,
        GBP: fredData.gbp_usd,
        CAD: fredData.usd_cad,
        SEK: fredData.usd_sek,
        CHF: fredData.usd_chf,
      };
      fredData.dxy = calculateDXY(fxRates);
    }

    // Per ora usiamo un valore fisso per ig_spread (da implementare in futuro)
    fredData.ig_spread = 1.5; // Placeholder

    // Recupera dati storici per calcoli delta
    const { data: historicalData } = await supabase
      .from('fed_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    // Calcola delta 4 settimane
    const fourWeeksAgo = historicalData?.[20]; // Circa 4 settimane fa
    const deltas: { [key: string]: number } = {};
    
    if (fourWeeksAgo) {
      // Solo per i campi principali che esistono
      const mainFields = ['walcl', 'wresbal', 'rrpontsyd', 'us10y', 'tga'];
      mainFields.forEach(key => {
        if (fourWeeksAgo[key] && fredData[key]) {
          deltas[`${key}_delta_4w`] = fredData[key] - fourWeeksAgo[key];
        }
      });
    }

    // Prepara i dati finali (solo i campi che esistono nel DB)
    const data = {
      ...fredData,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      created_at: new Date().toISOString(),
    };

    // I delta li usiamo solo per i calcoli V2, non li salviamo nel DB
    const dataWithDeltas = { ...data, ...deltas };

    // CALCOLI V2 - Liquidity Score e Leading Indicators
    if (forceRefresh || !historicalData?.[0]?.liquidity_score) {
      console.log('Calculating V2 indicators...');
      
      // Calcola Liquidity Score
      const liquidityData = calculateLiquidityScoreSimplified(dataWithDeltas, historicalData || []);
      Object.assign(data, liquidityData);

      // Calcola Leading Indicators
      const indicatorsData = calculateLeadingIndicatorsSimplified(dataWithDeltas, historicalData || []);
      Object.assign(data, indicatorsData);

      console.log('V2 calculations completed:', {
        liquidity_score: data.liquidity_score,
        liquidity_grade: data.liquidity_grade,
        overall_signal: data.leading_indicators?.overall_signal
      });
    }

    // Determina scenario
    let scenario = 'neutral';
    let qualifiers: string[] = [];

    if (dataWithDeltas.walcl_delta_4w > 50000) {
      scenario = 'expansion';
      qualifiers.push('aggressive');
    } else if (dataWithDeltas.walcl_delta_4w < -50000) {
      scenario = 'contraction';
      qualifiers.push('aggressive');
    }

    if (dataWithDeltas.rrpontsyd_delta_4w && Math.abs(dataWithDeltas.rrpontsyd_delta_4w) > 100000) {
      qualifiers.push('volatile');
    }

    if (dataWithDeltas.us10y_delta_4w && Math.abs(dataWithDeltas.us10y_delta_4w) > 0.2) {
      qualifiers.push('stressed');
    }

    data.scenario = scenario;
    // qualifiers non esiste come colonna, lo salviamo nel context
    data.context = qualifiers.join(', ');

    // Salva nel database (UPSERT per evitare duplicati)
    const { error: upsertError } = await supabase
      .from('fed_data')
      .upsert(data, { onConflict: 'date' });

    if (upsertError) {
      console.error('Database upsert error:', upsertError);
      throw upsertError;
    }

    // Genera segnale se necessario
    if (scenario !== 'neutral' || qualifiers.length > 0) {
      const signal = {
        type: scenario === 'expansion' ? 'bullish' : scenario === 'contraction' ? 'bearish' : 'neutral',
        message: `Market scenario: ${scenario}${qualifiers.length > 0 ? ` (${qualifiers.join(', ')})` : ''}`,
        data: {
          scenario,
          qualifiers,
          walcl_delta_4w: dataWithDeltas.walcl_delta_4w,
          rrpontsyd_delta_4w: dataWithDeltas.rrpontsyd_delta_4w,
          us10y_delta_4w: dataWithDeltas.us10y_delta_4w,
          liquidity_score: data.liquidity_score,
          overall_signal: data.leading_indicators?.overall_signal
        },
        created_at: new Date().toISOString(),
      };

      await supabase.from('signals').insert(signal);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        v2_enabled: true,
        message: 'Data fetched and V2 calculations completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in fetch-fed-data function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});