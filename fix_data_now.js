// Script per aggiornare i dati direttamente via API FRED e inserirli nel database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tolaojeqjcoskegelule.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjUzOSwiZXhwIjoyMDc3NTg4NTM5fQ.Y0xWNiSR3mTDxhN566I-cgloiQazBwg0HoFpDJT0_HE';
const fredApiKey = 'fae844cfb2f3f5bbaf82549a5656910d';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAndUpdateData() {
  console.log('🚀 Starting data update...');
  
  try {
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0];
    
    console.log(`📅 Fetching data for ${yesterday} to ${today}`);
    
    // Test FRED API with one series
    const testUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=SOFR&api_key=${fredApiKey}&file_type=json&observation_start=${yesterday}&observation_end=${today}`;
    
    const response = await fetch(testUrl);
    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ FRED API working:', data.observations?.slice(-1));
    
    // Test Supabase connection
    const { data: dbData, error } = await supabase
      .from('fed_data')
      .select('date')
      .order('date', { ascending: false })
      .limit(1);
      
    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }
    
    console.log('✅ Database connection working, latest date:', dbData?.[0]?.date);
    console.log('🎉 Both FRED API and database are working!');
    console.log('📝 The Edge Function should work with these credentials.');
    
    return {
      success: true,
      fred_working: true,
      database_working: true,
      latest_db_date: dbData?.[0]?.date,
      fred_latest: data.observations?.slice(-1)[0]
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
fetchAndUpdateData().then(result => {
  console.log('\n📊 RESULT:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
});
