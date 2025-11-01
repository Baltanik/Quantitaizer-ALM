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

    // Calculate date 90 days ago
    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);
    
    const startDate = ninetyDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    console.log(`Fetching data from ${startDate} to ${endDate}`);

    // Fetch historical data for each series (last 90 days)
    const seriesData: { [key: string]: FedDataPoint[] } = {};
    
    for (const seriesId of series) {
      try {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredApiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`;
        console.log(`Fetching ${seriesId}...`);
        
        const response = await fetch(url);
        const json: SeriesResponse = await response.json();
        
        if (json.observations && json.observations.length > 0) {
          const key = seriesId.toLowerCase().replace('dgs10', 'us10y');
          seriesData[key] = json.observations;
          console.log(`${seriesId}: ${json.observations.length} observations`);
        }
      } catch (error) {
        console.error(`Error fetching ${seriesId}:`, error);
        seriesData[seriesId.toLowerCase()] = [];
      }
    }

    // Generate complete date range (all days in last 90 days)
    const allDates: string[] = [];
    const currentDate = new Date(ninetyDaysAgo);
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

      // Calculate SOFR-IORB spread
      if (data.sofr !== null && data.iorb !== null) {
        data.sofr_iorb_spread = data.sofr - data.iorb;
      }

      // Determine scenario
      data.scenario = determineScenario(data);
      
      recordsToInsert.push(data);
    }

    console.log(`Inserting ${recordsToInsert.length} records into database`);

    // Insert all records (batch upsert)
    const { error: upsertError } = await supabase
      .from('fed_data')
      .upsert(recordsToInsert, { onConflict: 'date' });

    if (upsertError) {
      console.error('Database error:', upsertError);
      throw upsertError;
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