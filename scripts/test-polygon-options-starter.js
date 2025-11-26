/**
 * POLYGON OPTIONS STARTER TEST
 * 
 * Testa i nuovi endpoint disponibili con il piano a pagamento
 */

const API_KEY = 'D6oi9QYUgc8MjJlYnNcRvMz0A2djLf03';
const BASE_URL = 'https://api.polygon.io';

async function fetchAPI(endpoint, description) {
  const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apiKey=${API_KEY}`;
  
  console.log('\n' + '═'.repeat(70));
  console.log(`📡 ${description}`);
  console.log('═'.repeat(70));
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'NOT_AUTHORIZED' || data.status === 'ERROR') {
      console.log('❌ NOT AUTHORIZED or ERROR:', data.message);
      return null;
    }
    
    console.log('✅ SUCCESS');
    
    // Per snapshot, mostra solo primi risultati
    if (data.results && Array.isArray(data.results)) {
      console.log(`📊 Total results: ${data.results.length}`);
      console.log('\n🔍 First 2 results:');
      data.results.slice(0, 2).forEach((r, i) => {
        console.log(`\n--- Result ${i + 1} ---`);
        console.log(JSON.stringify(r, null, 2));
      });
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
    
    return data;
  } catch (error) {
    console.log('❌ FETCH ERROR:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║       POLYGON OPTIONS STARTER TEST - $29/month plan                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  // TEST 1: SPX Options Snapshot (questo dovrebbe funzionare ora!)
  console.log('\n\n🎯 ═══════════════ CRITICAL TEST: SPX OPTIONS SNAPSHOT ═══════════════\n');
  
  const snapshot = await fetchAPI(
    '/v3/snapshot/options/SPX?limit=20',
    'SPX Options Snapshot - Greeks, OI, IV (SHOULD WORK NOW!)'
  );

  if (snapshot && snapshot.results) {
    console.log('\n\n✅ SNAPSHOT WORKS! Checking data structure...');
    
    const firstOption = snapshot.results[0];
    if (firstOption) {
      console.log('\n📊 DATA AVAILABLE IN SNAPSHOT:');
      console.log('   - ticker:', firstOption.ticker ? '✅' : '❌');
      console.log('   - open_interest:', firstOption.open_interest !== undefined ? '✅' : '❌');
      console.log('   - greeks:', firstOption.greeks ? '✅' : '❌');
      if (firstOption.greeks) {
        console.log('     - delta:', firstOption.greeks.delta !== undefined ? '✅' : '❌');
        console.log('     - gamma:', firstOption.greeks.gamma !== undefined ? '✅' : '❌');
        console.log('     - theta:', firstOption.greeks.theta !== undefined ? '✅' : '❌');
        console.log('     - vega:', firstOption.greeks.vega !== undefined ? '✅' : '❌');
      }
      console.log('   - implied_volatility:', firstOption.implied_volatility !== undefined ? '✅' : '❌');
      console.log('   - day (OHLCV):', firstOption.day ? '✅' : '❌');
      console.log('   - last_quote:', firstOption.last_quote ? '✅' : '❌');
      console.log('   - underlying_asset:', firstOption.underlying_asset ? '✅' : '❌');
    }
  }

  // TEST 2: SPX Options Chain per expiry specifica
  console.log('\n\n📅 ═══════════════ SPX OPTIONS BY EXPIRY ═══════════════\n');
  
  await fetchAPI(
    '/v3/snapshot/options/SPX?expiration_date=2025-12-19&limit=30',
    'SPX Options Dec 19 2025 Expiry - Full Chain'
  );

  // TEST 3: SPX vicino ATM (strike 6000)
  console.log('\n\n🎯 ═══════════════ SPX ATM OPTIONS ═══════════════\n');
  
  await fetchAPI(
    '/v3/snapshot/options/SPX?strike_price.gte=5900&strike_price.lte=6100&expiration_date=2025-12-19&limit=20',
    'SPX Options ATM Range (5900-6100) Dec Expiry'
  );

  // TEST 4: SPY Options (alternativa)
  console.log('\n\n📈 ═══════════════ SPY OPTIONS SNAPSHOT ═══════════════\n');
  
  await fetchAPI(
    '/v3/snapshot/options/SPY?expiration_date=2025-12-20&limit=10',
    'SPY Options Dec 20 2025 - Snapshot'
  );

  // TEST 5: Underlying Asset Price
  console.log('\n\n💰 ═══════════════ SPX UNDERLYING PRICE ═══════════════\n');
  
  await fetchAPI(
    '/v2/aggs/ticker/I:SPX/prev',
    'SPX Index Price (should work with Indices plan)'
  );

  // SUMMARY
  console.log('\n\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST COMPLETE                                 ║');
  console.log('║                                                                      ║');
  console.log('║  If SPX Snapshot shows Greeks + OI → Ready to implement!            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
}

runTests().catch(console.error);

