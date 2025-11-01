// Test DXY proxy (DEXUSEU) da FRED
const fredApiKey = 'aa7aa2fe6370c5bfd18eec08afb88dbd';
const startDate = '2024-10-01';
const endDate = new Date().toISOString().split('T')[0];

const url = `https://api.stlouisfed.org/fred/series/observations?series_id=DEXUSEU&api_key=${fredApiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`;

console.log('🔄 Fetching DEXUSEU (USD/EUR) from FRED...');

fetch(url)
  .then(response => response.json())
  .then(json => {
    if (json.observations && json.observations.length > 0) {
      // Convertiamo USD/EUR in DXY proxy
      const dxyData = json.observations.map(obs => ({
        date: obs.date,
        usdeur: parseFloat(obs.value),
        dxy_proxy: obs.value === '.' ? null : (100 / parseFloat(obs.value)).toFixed(2)
      })).filter(d => d.dxy_proxy !== null);
      
      console.log(`\n✅ ${dxyData.length} observations fetched`);
      console.log('\n📊 Last 10 values:');
      dxyData.slice(-10).forEach(obs => {
        console.log(`   ${obs.date}: USD/EUR=${obs.usdeur.toFixed(4)} → DXY Proxy=${obs.dxy_proxy}`);
      });
      
      const values = dxyData.map(d => parseFloat(d.dxy_proxy));
      console.log('\n📊 Statistics:');
      console.log(`   Min: ${Math.min(...values).toFixed(2)}`);
      console.log(`   Max: ${Math.max(...values).toFixed(2)}`);
      console.log(`   Latest: ${values[values.length - 1].toFixed(2)}`);
      console.log('\n✅ Range tipico DXY: 90-110');
      console.log(`   Il nostro proxy è: ${values[values.length - 1].toFixed(2)} ${values[values.length - 1] >= 90 && values[values.length - 1] <= 110 ? '✓' : '✗'}`);
    }
  })
  .catch(error => {
    console.error('❌ Error:', error);
  });

