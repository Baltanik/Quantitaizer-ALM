/**
 * POLYGON/MASSIVE API TEST SCRIPT
 * 
 * Testa tutti gli endpoint disponibili per vedere cosa ottieni
 * con il piano FREE (Indices Basic + Options Basic)
 */

const API_KEY = 'D6oi9QYUgc8MjJlYnNcRvMz0A2djLf03';
const BASE_URL = 'https://api.polygon.io';

// Delay tra chiamate (5 calls/min = 1 ogni 12 sec)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAPI(endpoint, description) {
  const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apiKey=${API_KEY}`;
  
  console.log('\n' + '═'.repeat(70));
  console.log(`📡 ${description}`);
  console.log(`🔗 ${endpoint}`);
  console.log('═'.repeat(70));
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'ERROR' || data.error) {
      console.log('❌ ERROR:', data.error || data.message || 'Unknown error');
      return null;
    }
    
    console.log('✅ SUCCESS');
    console.log(JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.log('❌ FETCH ERROR:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║           POLYGON/MASSIVE API TEST - QUANTITAIZER                    ║');
  console.log('║                                                                      ║');
  console.log('║  Testing: Indices, Options, Stocks                                   ║');
  console.log('║  API Key: ' + API_KEY.substring(0, 10) + '...                                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  // ============================================================
  // TEST 1: INDICES
  // ============================================================
  console.log('\n\n🏛️  ═══════════════ INDICES TESTS ═══════════════\n');

  // SPX Index
  await fetchAPI(
    '/v2/aggs/ticker/I:SPX/prev',
    'SPX Index - Previous Day Close'
  );
  await delay(13000); // Wait 13 sec

  // SPX Historical
  await fetchAPI(
    '/v2/aggs/ticker/I:SPX/range/1/day/2025-11-01/2025-11-26',
    'SPX Index - Historical Daily (Nov 2025)'
  );
  await delay(13000);

  // VIX Index
  await fetchAPI(
    '/v2/aggs/ticker/I:VIX/prev',
    'VIX Index - Previous Day Close'
  );
  await delay(13000);

  // DXY (Dollar Index)
  await fetchAPI(
    '/v2/aggs/ticker/I:DXY/prev',
    'DXY Dollar Index - Previous Day Close'
  );
  await delay(13000);

  // ============================================================
  // TEST 2: STOCKS/ETFs
  // ============================================================
  console.log('\n\n📈 ═══════════════ STOCKS/ETF TESTS ═══════════════\n');

  // SPY ETF
  await fetchAPI(
    '/v2/aggs/ticker/SPY/prev',
    'SPY ETF - Previous Day Close'
  );
  await delay(13000);

  // GLD (Gold ETF)
  await fetchAPI(
    '/v2/aggs/ticker/GLD/prev',
    'GLD Gold ETF - Previous Day Close'
  );
  await delay(13000);

  // ============================================================
  // TEST 3: OPTIONS - SPX
  // ============================================================
  console.log('\n\n📊 ═══════════════ OPTIONS TESTS (SPX) ═══════════════\n');

  // SPX Options Contracts List
  await fetchAPI(
    '/v3/reference/options/contracts?underlying_ticker=SPX&limit=10',
    'SPX Options - Contracts List (first 10)'
  );
  await delay(13000);

  // SPX Options Snapshot (tutti i contratti)
  await fetchAPI(
    '/v3/snapshot/options/SPX?limit=5',
    'SPX Options - Snapshot (first 5 contracts)'
  );
  await delay(13000);

  // SPY Options Contracts (alternativa)
  await fetchAPI(
    '/v3/reference/options/contracts?underlying_ticker=SPY&expiration_date=2025-12-20&limit=10',
    'SPY Options - Dec 2025 Expiry Contracts'
  );
  await delay(13000);

  // SPY Options Snapshot
  await fetchAPI(
    '/v3/snapshot/options/SPY?limit=5',
    'SPY Options - Snapshot (first 5 contracts)'
  );
  await delay(13000);

  // ============================================================
  // TEST 4: SPECIFIC OPTION CONTRACT
  // ============================================================
  console.log('\n\n🎯 ═══════════════ SPECIFIC OPTION CONTRACT ═══════════════\n');

  // Cerca un contratto SPX specifico (Dec 2025, strike 6000)
  await fetchAPI(
    '/v3/reference/options/contracts?underlying_ticker=SPX&strike_price=6000&expiration_date.gte=2025-12-01&limit=5',
    'SPX Call/Put Strike 6000 - Dec 2025'
  );
  await delay(13000);

  // ============================================================
  // TEST 5: OPTIONS CHAIN AGGREGATES
  // ============================================================
  console.log('\n\n📉 ═══════════════ OPTIONS AGGREGATES ═══════════════\n');

  // Open Interest aggregato (se disponibile)
  await fetchAPI(
    '/v2/aggs/ticker/O:SPX251220C06000000/prev',
    'SPX Dec 2025 6000 Call - Previous Day'
  );
  await delay(13000);

  // ============================================================
  // TEST 6: FUTURES (probabilmente non attivo)
  // ============================================================
  console.log('\n\n⚡ ═══════════════ FUTURES TESTS ═══════════════\n');

  // ES Futures
  await fetchAPI(
    '/v2/aggs/ticker/ESZ25/prev',
    'ES Futures Dec 2025 - Previous Day (might not work)'
  );
  await delay(13000);

  // ============================================================
  // TEST 7: MARKET STATUS
  // ============================================================
  console.log('\n\n🕐 ═══════════════ MARKET STATUS ═══════════════\n');

  await fetchAPI(
    '/v1/marketstatus/now',
    'Current Market Status'
  );

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST COMPLETE                                 ║');
  console.log('║                                                                      ║');
  console.log('║  Check above results to see what data is available                   ║');
  console.log('║  ✅ = Data available    ❌ = Not available on free tier             ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');
}

// Run
runTests().catch(console.error);

