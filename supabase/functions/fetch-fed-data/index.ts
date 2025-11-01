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

    const data: any = {};
    const today = new Date().toISOString().split('T')[0];

    // Fetch each series from FRED
    for (const seriesId of series) {
      try {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=1`;
        console.log(`Fetching ${seriesId}...`);
        
        const response = await fetch(url);
        const json: SeriesResponse = await response.json();
        
        if (json.observations && json.observations.length > 0) {
          const value = parseFloat(json.observations[0].value);
          const key = seriesId.toLowerCase().replace('dgs10', 'us10y');
          data[key] = isNaN(value) ? null : value;
          console.log(`${seriesId}: ${data[key]}`);
        }
      } catch (error) {
        console.error(`Error fetching ${seriesId}:`, error);
        data[seriesId.toLowerCase()] = null;
      }
    }

    // Calculate SOFR-IORB spread
    if (data.sofr !== null && data.iorb !== null) {
      data.sofr_iorb_spread = data.sofr - data.iorb;
    }

    // Determine scenario based on market conditions
    const scenario = determineScenario(data);
    data.scenario = scenario;
    data.date = today;

    console.log('Calculated scenario:', scenario);

    // Insert or update in database
    const { error: upsertError } = await supabase
      .from('fed_data')
      .upsert([data], { onConflict: 'date' });

    if (upsertError) {
      console.error('Database error:', upsertError);
      throw upsertError;
    }

    // Generate signal if needed
    const signal = generateSignal(data);
    if (signal) {
      console.log('Generated signal:', signal);
      const { error: signalError } = await supabase
        .from('signals')
        .insert([{ ...signal, date: today }]);
      
      if (signalError) {
        console.error('Signal insert error:', signalError);
      }
    }

    console.log('Fed data saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        scenario,
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

  // Stealth QE: Balance sheet expansion with tight spread
  if (walcl > 7200 && sofr_iorb_spread < 15 && wresbal > 2700) {
    return 'stealth_qe';
  }

  // Full QE: Large balance sheet and reserves
  if (walcl > 7500 && wresbal > 3000) {
    return 'qe';
  }

  // QT: Shrinking balance sheet with wide spread
  if (walcl < 7000 && sofr_iorb_spread > 20) {
    return 'qt';
  }

  return 'neutral';
}

function generateSignal(data: any): any {
  const { sofr_iorb_spread, wresbal, scenario } = data;

  // High stress signal
  if (sofr_iorb_spread > 25) {
    return {
      signal_type: 'high_stress',
      description: `SOFR-IORB spread elevated at ${sofr_iorb_spread.toFixed(2)} bps - potential liquidity stress`,
      confidence: 85
    };
  }

  // QE starting signal
  if (scenario === 'stealth_qe' && wresbal > 2800) {
    return {
      signal_type: 'qe_starting',
      description: 'Stealth QE detected - balance sheet expansion underway',
      confidence: 75
    };
  }

  return null;
}