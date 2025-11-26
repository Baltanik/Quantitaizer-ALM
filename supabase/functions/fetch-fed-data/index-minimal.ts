import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting minimal Fed data fetch...');
    
    // Hardcoded credentials (temporary fix)
    const supabaseUrl = 'https://tolaojeqjcoskegelule.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjUzOSwiZXhwIjoyMDc3NTg4NTM5fQ.Y0xWNiSR3mTDxhN566I-cgloiQazBwg0HoFpDJT0_HE';
    const fredApiKey = 'fae844cfb2f3f5bbaf82549a5656910d';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test simple FRED API call
    const testUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=SOFR&api_key=${fredApiKey}&file_type=json&limit=1`;
    
    console.log('🔄 Testing FRED API...');
    const response = await fetch(testUrl);
    
    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ FRED API working:', data.observations?.[0]);

    // Test Supabase connection
    const { data: testData, error } = await supabase
      .from('fed_metrics')
      .select('date')
      .order('date', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    console.log('✅ Supabase working, latest date:', testData?.[0]?.date);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Both FRED API and Supabase are working!',
        latest_date: testData?.[0]?.date,
        fred_test: data.observations?.[0]
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});








