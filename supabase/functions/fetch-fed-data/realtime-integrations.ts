/**
 * REAL-TIME MARKET DATA INTEGRATIONS
 * File: realtime-integrations.ts
 * 
 * Funzioni per integrare dati real-time da Marketdata.app e Finnhub
 * Da includere in index.ts per sostituire VIX/DXY lenti di FRED
 */

interface FXRates {
  EUR: number;
  JPY: number;
  GBP: number;
  CAD: number;
  SEK: number;
  CHF: number;
}

interface RealtimeMarketData {
  vix: number | null;
  dxy: number | null;
  timestamp: number;
  source: 'marketdata' | 'finnhub' | 'fred_fallback';
}

// Pesi ufficiali DXY (stesso di index.ts)
const DXY_WEIGHTS = {
  EUR: 0.576,
  JPY: 0.136,
  GBP: 0.119,
  CAD: 0.091,
  SEK: 0.042,
  CHF: 0.036,
};

/**
 * Fetch VIX da CBOE (fonte ufficiale, gratis, 15min delayed)
 * FREE - No API key needed
 * 
 * @returns VIX real-time o null se errore
 */
export async function fetchCBOEVIX(): Promise<number | null> {
  try {
    const res = await fetch('https://cdn.cboe.com/api/global/delayed_quotes/quotes/_VIX.json', {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.data?.current_price) {
        const vix = parseFloat(data.data.current_price);
        console.log(`✅ VIX real-time: ${vix.toFixed(2)} (CBOE official)`);
        return vix;
      }
    }
  } catch (error) {
    console.error('⚠️ CBOE VIX fetch error:', error.message);
  }
  
  return null;
}

/**
 * Fetch VIX e DXY da Marketdata.app (FALLBACK se CBOE down)
 * 
 * @param apiKey - Marketdata API token (da Vault)
 * @returns VIX e DXY real-time o null se errore
 */
export async function fetchMarketDataRealtime(
  apiKey: string
): Promise<RealtimeMarketData> {
  const result: RealtimeMarketData = {
    vix: null,
    dxy: null,
    timestamp: Date.now(),
    source: 'marketdata',
  };

  if (!apiKey || apiKey.length === 0) {
    console.warn('⚠️ Marketdata API key missing, using CBOE for VIX only');
    // Try CBOE for VIX
    result.vix = await fetchCBOEVIX();
    result.source = result.vix !== null ? 'cboe' : 'fred_fallback';
    return result;
  }

  try {
    // STRATEGIA: CBOE per VIX (gratis) + exchangerate-api per DXY (gratis)
    result.vix = await fetchCBOEVIX();

    // Fetch FX rates from exchangerate-api e calcola DXY
    console.log('🔄 Fetching FX rates for DXY calculation...');
    const fxRates = await fetchExchangeRateFX();
    result.dxy = calculateDXYFromRates(fxRates);
    
    if (result.dxy !== null) {
      console.log(`✅ DXY real-time: ${result.dxy.toFixed(2)} (calculated from FX rates)`);
    }
    
    result.source = 'cboe+exchangerate';
  } catch (error) {
    console.error('⚠️ Real-time fetch error (using FRED fallback):', error.message);
    result.source = 'fred_fallback';
  }

  return result;
}

/**
 * Fetch FX rates da exchangerate-api.com (FREE, no API key)
 * Update: ogni ora
 * 
 * @returns FX rates per calcolo DXY
 */
export async function fetchExchangeRateFX(): Promise<Partial<FXRates>> {
  const rates: Partial<FXRates> = {};

  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      
      // exchangerate-api fornisce: 1 USD = X foreign currency
      // Esempio: EUR: 0.87 = 1 USD = 0.87 EUR (quindi formato USD/EUR)
      
      // Formula DXY (adattata a formati FRED) usa:
      // EUR: USD/EUR (quanto EUR per 1 USD) ← exchangerate dà questo (as-is)
      // JPY: JPY/USD (quanti JPY per 1 USD) ← exchangerate dà USD/JPY (as-is, stesso!)
      // GBP: USD/GBP (quanto GBP per 1 USD) ← exchangerate dà questo (as-is)
      // CAD: CAD/USD (quanto CAD per 1 USD) ← exchangerate dà USD/CAD (INVERTI)
      // SEK: SEK/USD (quanto SEK per 1 USD) ← exchangerate dà USD/SEK (INVERTI)
      // CHF: CHF/USD (quanto CHF per 1 USD) ← exchangerate dà USD/CHF (INVERTI)
      
      if (data.rates.EUR) rates.EUR = data.rates.EUR; // USD/EUR as-is
      if (data.rates.JPY) rates.JPY = data.rates.JPY; // USD/JPY as-is (= JPY/USD in formula)
      if (data.rates.GBP) rates.GBP = data.rates.GBP; // USD/GBP as-is
      if (data.rates.CAD) rates.CAD = 1 / data.rates.CAD; // CAD/USD (inversione)
      if (data.rates.SEK) rates.SEK = 1 / data.rates.SEK; // SEK/USD (inversione)
      if (data.rates.CHF) rates.CHF = 1 / data.rates.CHF; // CHF/USD (inversione)

      console.log('✅ FX rates from exchangerate-api:');
      Object.entries(rates).forEach(([key, val]) => {
        console.log(`   ${key}: ${val?.toFixed(4)}`);
      });
    } else {
      console.error(`❌ exchangerate-api fetch failed: HTTP ${res.status}`);
    }
  } catch (error) {
    console.error('⚠️ exchangerate-api fetch error:', error.message);
  }

  return rates;
}

/**
 * Fetch FX rates da Finnhub (BACKUP - requires paid plan)
 * @deprecated Use fetchExchangeRateFX() instead (free)
 */
export async function fetchFinnhubFX(apiKey: string): Promise<Partial<FXRates>> {
  const rates: Partial<FXRates> = {};

  if (!apiKey || apiKey.length === 0) {
    console.warn('⚠️ Finnhub API key missing, using exchangerate-api fallback');
    return await fetchExchangeRateFX();
  }

  try {
    const pairs: Array<{ symbol: string; key: keyof FXRates }> = [
      { symbol: 'OANDA:EUR_USD', key: 'EUR' },
      { symbol: 'OANDA:USD_JPY', key: 'JPY' },
      { symbol: 'OANDA:GBP_USD', key: 'GBP' },
      { symbol: 'OANDA:USD_CAD', key: 'CAD' },
      { symbol: 'OANDA:USD_SEK', key: 'SEK' },
      { symbol: 'OANDA:USD_CHF', key: 'CHF' },
    ];

    for (const pair of pairs) {
      try {
        const url = `https://finnhub.io/api/v1/quote?symbol=${pair.symbol}&token=${apiKey}`;
        const res = await fetch(url);

        if (res.ok) {
          const data = await res.json();
          if (data.c && data.c > 0) {
            // Formula DXY ufficiale usa questi formati:
            // EUR: USD/EUR (inverte EUR/USD)
            // JPY: JPY/USD (già corretto da USD/JPY)
            // GBP: USD/GBP (inverte GBP/USD)
            // CAD: CAD/USD (già corretto da USD/CAD)
            // SEK: SEK/USD (già corretto da USD/SEK)
            // CHF: CHF/USD (già corretto da USD/CHF)
            
            if (pair.key === 'EUR' || pair.key === 'GBP') {
              // EUR/USD -> USD/EUR, GBP/USD -> USD/GBP
              rates[pair.key] = 1 / data.c;
            } else {
              // USD/JPY, USD/CAD, USD/SEK, USD/CHF -> già formato corretto
              rates[pair.key] = data.c;
            }

            console.log(`✅ FX ${pair.key}: ${rates[pair.key]?.toFixed(4)}`);
          } else {
            console.warn(`⚠️ ${pair.key}: no data`);
          }
        } else {
          console.error(`❌ ${pair.key} fetch failed: HTTP ${res.status}`);
        }

        // Rate limit courtesy: 150ms delay
        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (error) {
        console.error(`⚠️ ${pair.key} fetch error:`, error.message);
      }
    }
  } catch (error) {
    console.error('⚠️ Finnhub fetch error:', error.message);
  }

  return rates;
}

/**
 * Calcola DXY da FX rates (da usare con Finnhub se Marketdata DXY non disponibile)
 * 
 * @param rates - FX rates nel formato corretto per formula DXY
 * @returns Valore DXY calcolato o null se mancano dati
 */
export function calculateDXYFromRates(rates: Partial<FXRates>): number | null {
  // Verifica che abbiamo tutte le 6 currencies
  const required: Array<keyof FXRates> = ['EUR', 'JPY', 'GBP', 'CAD', 'SEK', 'CHF'];
  const missing = required.filter((key) => !rates[key]);

  if (missing.length > 0) {
    console.warn(`⚠️ Cannot calculate DXY: missing ${missing.join(', ')}`);
    return null;
  }

  try {
    // Formula ufficiale DXY con base 50.14348112
    const dxy =
      50.14348112 *
      Math.pow(rates.EUR!, -DXY_WEIGHTS.EUR) *
      Math.pow(rates.JPY!, DXY_WEIGHTS.JPY) *
      Math.pow(rates.GBP!, -DXY_WEIGHTS.GBP) *
      Math.pow(rates.CAD!, DXY_WEIGHTS.CAD) *
      Math.pow(rates.SEK!, DXY_WEIGHTS.SEK) *
      Math.pow(rates.CHF!, DXY_WEIGHTS.CHF);

    console.log(`✅ DXY calculated: ${dxy.toFixed(4)} (from FX rates)`);
    return dxy;
  } catch (error) {
    console.error('⚠️ DXY calculation error:', error.message);
    return null;
  }
}

/**
 * STRATEGIA FETCH IBRIDA (raccomandato)
 * 1. Prova Marketdata per VIX + DXY (veloce, 2 calls)
 * 2. Se DXY fallisce, prova Finnhub FX + calcolo (lento, 6 calls)
 * 3. Se tutto fallisce, usa FRED (fallback)
 * 
 * @param marketdataKey - Marketdata API token
 * @param finnhubKey - Finnhub API key (opzionale)
 * @returns Dati real-time con source indicator
 */
export async function fetchRealtimeHybrid(
  marketdataKey: string,
  finnhubKey?: string
): Promise<RealtimeMarketData> {
  console.log('\n🌐 === FETCHING REAL-TIME MARKET DATA (HYBRID) ===');

  // Strategia 1: Marketdata (preferito)
  const marketdata = await fetchMarketDataRealtime(marketdataKey);

  // Se abbiamo VIX e DXY, perfetto!
  if (marketdata.vix !== null && marketdata.dxy !== null) {
    console.log('✅ Real-time data complete (Marketdata only)');
    return marketdata;
  }

  // Strategia 2: Finnhub FX per calcolare DXY (se manca)
  if (marketdata.dxy === null && finnhubKey) {
    console.log('🔄 DXY missing, trying Finnhub FX calculation...');
    const fxRates = await fetchFinnhubFX(finnhubKey);
    const calculatedDxy = calculateDXYFromRates(fxRates);

    if (calculatedDxy !== null) {
      marketdata.dxy = calculatedDxy;
      marketdata.source = 'finnhub';
      console.log('✅ Real-time data complete (Marketdata VIX + Finnhub DXY)');
    }
  }

  // Strategia 3: FRED fallback (già gestito in index.ts)
  if (marketdata.vix === null || marketdata.dxy === null) {
    console.warn(
      '⚠️ Incomplete real-time data, FRED fallback will be used:',
      `VIX=${marketdata.vix}, DXY=${marketdata.dxy}`
    );
    marketdata.source = 'fred_fallback';
  }

  return marketdata;
}

/**
 * HELPER: Valida dati real-time vs FRED (sanity check)
 * Alert se delta >5% (possibile errore API o mercato in panico)
 * 
 * @param realtime - Valore real-time
 * @param fred - Valore FRED (fallback)
 * @param metric - Nome metrica (per log)
 * @param thresholdPercent - Soglia alert (default 5%)
 */
export function validateRealtimeData(
  realtime: number | null,
  fred: number | null,
  metric: string,
  thresholdPercent: number = 5
): void {
  if (realtime === null || fred === null) return;

  const delta = Math.abs(realtime - fred);
  const deltaPercent = (delta / fred) * 100;

  if (deltaPercent > thresholdPercent) {
    console.warn(
      `⚠️ ${metric} LARGE DELTA: real-time=${realtime}, FRED=${fred}, delta=${deltaPercent.toFixed(1)}%`
    );
    console.warn(
      `   → Possibile: 1) FRED stale, 2) Market volatility, 3) API error`
    );
  }
}

/**
 * ESEMPIO USO IN index.ts
 * 
 * // 1. Setup (dopo line 71)
 * const marketdataKey = Deno.env.get('MARKETDATA_API_KEY') || '';
 * const finnhubKey = Deno.env.get('FINNHUB_API_KEY') || '';
 * 
 * // 2. Fetch real-time (prima del loop FRED, circa line 120)
 * const realtimeMarket = await fetchRealtimeHybrid(marketdataKey, finnhubKey);
 * 
 * // 3. Override VIX/DXY (dentro loop date, circa line 400)
 * const input = {
 *   date,
 *   // ... altri campi ...
 *   
 *   // Override real-time per data odierna
 *   vix: (date === endDate && realtimeMarket.vix !== null)
 *        ? realtimeMarket.vix
 *        : (transformedData[date]?.vix ?? null),
 *   
 *   dxy_broad: (date === endDate && realtimeMarket.dxy !== null)
 *              ? realtimeMarket.dxy
 *              : (transformedData[date]?.dxy_broad ?? null),
 * };
 * 
 * // 4. Validation logging (per debug)
 * if (date === endDate) {
 *   validateRealtimeData(realtimeMarket.vix, transformedData[date]?.vix, 'VIX');
 *   validateRealtimeData(realtimeMarket.dxy, transformedData[date]?.dxy_broad, 'DXY');
 * }
 */

