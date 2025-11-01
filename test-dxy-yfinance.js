// Test DXY fetch da Yahoo Finance
const startDate = '2021-01-01';
const endDate = new Date().toISOString().split('T')[0];

const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

const yfinanceUrl = `https://query1.finance.yahoo.com/v7/finance/download/DX-Y.NYB?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d&events=history`;

console.log('🔄 Fetching DXY from Yahoo Finance...');
console.log('URL:', yfinanceUrl);

fetch(yfinanceUrl)
  .then(response => {
    console.log('Status:', response.status);
    return response.text();
  })
  .then(csvText => {
    const lines = csvText.split('\n').slice(1); // Skip header
    
    const dxyData = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const [date, open, high, low, close, adjClose, volume] = line.split(',');
      if (date && close && close !== 'null') {
        dxyData.push({ date, value: parseFloat(close) });
      }
    }
    
    console.log(`\n✅ DXY: ${dxyData.length} observations fetched`);
    console.log('\n📊 Last 10 values:');
    dxyData.slice(-10).forEach(obs => {
      console.log(`   ${obs.date}: ${obs.value.toFixed(2)}`);
    });
    
    console.log('\n📊 Statistics:');
    const values = dxyData.map(d => d.value);
    console.log(`   Min: ${Math.min(...values).toFixed(2)}`);
    console.log(`   Max: ${Math.max(...values).toFixed(2)}`);
    console.log(`   Latest: ${values[values.length - 1].toFixed(2)}`);
  })
  .catch(error => {
    console.error('❌ Error:', error);
  });

