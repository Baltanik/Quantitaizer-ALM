// Script completo per aggiornare i dati Fed e inserirli nel database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tolaojeqjcoskegelule.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjUzOSwiZXhwIjoyMDc3NTg4NTM5fQ.Y0xWNiSR3mTDxhN566I-cgloiQazBwg0HoFpDJT0_HE';
const fredApiKey = 'fae844cfb2f3f5bbaf82549a5656910d';

const supabase = createClient(supabaseUrl, supabaseKey);

// Series da aggiornare (le principali)
const series = [
  'SOFR',
  'IORB', 
  'DFF',
  'WALCL',
  'WRESBAL',
  'RRPONTSYD',
  'DTB3',
  'DGS10',
  'VIXCLS'
];

async function updateFedData() {
  console.log('🚀 Starting complete Fed data update...');
  
  try {
    // Get date range (last 3 days to be sure)
    const today = new Date();
    const startDate = new Date(today.getTime() - 3*24*60*60*1000).toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    console.log(`📅 Fetching data from ${startDate} to ${endDate}`);
    
    const seriesData = {};
    
    // Fetch all series
    for (const seriesId of series) {
      try {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredApiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`;
        
        console.log(`🔄 Fetching ${seriesId}...`);
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`❌ HTTP Error ${response.status} for ${seriesId}`);
          continue;
        }
        
        const json = await response.json();
        
        if (json.observations && json.observations.length > 0) {
          // Map series names to database fields
          let key = seriesId.toLowerCase();
          if (seriesId === 'DGS10') key = 'us10y';
          if (seriesId === 'VIXCLS') key = 'vix';
          if (seriesId === 'DFF') key = 'dff';
          
          seriesData[key] = json.observations;
          console.log(`✅ ${seriesId}: ${json.observations.length} observations`);
        }
      } catch (error) {
        console.error(`❌ Error fetching ${seriesId}:`, error.message);
      }
    }
    
    // Group data by date and create records
    const dateMap = {};
    
    for (const [field, observations] of Object.entries(seriesData)) {
      for (const obs of observations) {
        if (!dateMap[obs.date]) {
          dateMap[obs.date] = { date: obs.date };
        }
        
        const value = parseFloat(obs.value);
        if (!isNaN(value)) {
          dateMap[obs.date][field] = value;
        }
      }
    }
    
    const recordsToInsert = Object.values(dateMap);
    console.log(`📊 Prepared ${recordsToInsert.length} records to insert`);
    
    if (recordsToInsert.length === 0) {
      throw new Error('No valid records to insert');
    }
    
    // Insert into database with upsert
    const { data, error } = await supabase
      .from('fed_data')
      .upsert(recordsToInsert, { 
        onConflict: 'date',
        ignoreDuplicates: false 
      })
      .select();
    
    if (error) {
      throw new Error(`Database insert error: ${error.message}`);
    }
    
    console.log(`✅ Successfully inserted/updated ${data?.length || recordsToInsert.length} records`);
    
    // Check latest data
    const { data: latest } = await supabase
      .from('fed_data')
      .select('date')
      .order('date', { ascending: false })
      .limit(1);
    
    console.log(`🎉 Latest data date in database: ${latest?.[0]?.date}`);
    
    return {
      success: true,
      records_processed: recordsToInsert.length,
      latest_date: latest?.[0]?.date
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the update
updateFedData().then(result => {
  console.log('\n📊 FINAL RESULT:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
});
