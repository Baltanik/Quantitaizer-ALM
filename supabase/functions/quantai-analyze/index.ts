/**
 * QuantAI - Edge Function per analisi AI dei dati Fed
 * 
 * Chiama GPT-5.1 ogni 4 ore (lun-ven) per generare
 * un'analisi narrativa dei dati di liquidità.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FedData {
  date: string;
  scenario: string;
  
  // Balance Sheet & Reserves (in MILIONI)
  walcl: number;
  wresbal: number;
  d_walcl_4w: number;
  d_wresbal_4w: number;
  
  // RRP (in MILIARDI)
  rrpontsyd: number;
  d_rrpontsyd_4w: number;
  
  // Tassi
  sofr: number;
  iorb: number;
  effr: number;
  dff: number;
  us10y: number;
  dtb3: number;
  dtb1yr: number;
  
  // Spread (decimale, *100 per bps)
  sofr_effr_spread: number;
  sofr_iorb_spread: number;
  effr_iorb_spread: number;
  
  // Yield Curve
  t10y3m: number;
  d_t10y3m_4w: number;
  
  // Dollaro
  dxy_broad: number;
  d_dxy_4w: number;
  
  // Volatilità e Credit
  vix: number;
  hy_oas: number;
  ig_spread: number;
  
  // Liquidity Score
  liquidity_score: number;
  liquidity_grade: string;
  liquidity_trend: string;
  liquidity_confidence: number;
  
  // Scenario Qualifiers
  context: string;
  sustainability: string;
  risk_level: string;
  confidence: string;
  drivers: string[];
  
  // Leading Indicators (JSONB)
  leading_indicators: any;
}

interface QuantAIAnalysis {
  summary: string;
  implications: string;
  sentiment: 'bullish' | 'cauto' | 'bearish';
  focus_points: string[];
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request body per alert trigger
    let isAlert = false;
    let alertReason = '';
    
    try {
      const body = await req.json();
      isAlert = body?.trigger === 'alert';
      alertReason = body?.reason || '';
    } catch {
      // No body = scheduled call, not alert
    }

    // Get API keys
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured in Supabase secrets');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🤖 QuantAI: Starting analysis... ${isAlert ? `⚠️ ALERT: ${alertReason}` : '📅 Scheduled'}`);

    // 1. Fetch latest Fed data + storico (14 giorni per analisi trend)
    const { data: historicalData, error: histError } = await supabase
      .from('fed_data')
      .select('*')
      .order('date', { ascending: false })
      .limit(14);

    if (histError || !historicalData || historicalData.length === 0) {
      throw new Error(`Failed to fetch Fed data: ${histError?.message}`);
    }

    const fedData = historicalData[0]; // Dato più recente
    const history = historicalData;     // Tutto lo storico per trend
    
    console.log(`📊 Fed data fetched: ${fedData.date} (+ ${history.length - 1} giorni di storico)`);

    // 2. Check if we already have an analysis for this time slot (skip for alerts)
    const now = new Date();
    const timeSlot = generateTimeSlot(now, isAlert);
    
    if (!isAlert) {
      const { data: existingAnalysis } = await supabase
        .from('quantai_analyses')
        .select('id')
        .eq('time_slot', timeSlot)
        .single();

      if (existingAnalysis) {
        console.log('⏭️ Analysis already exists for this time slot:', timeSlot);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Analysis already exists',
            time_slot: timeSlot 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Build prompt for GPT con storico (+ alert context se presente)
    const prompt = buildPrompt(fedData as FedData, history as FedData[], isAlert ? alertReason : undefined);
    console.log('📝 Prompt built con storico, calling GPT...');

    // 4. Call OpenAI GPT-5.1
    const gptResponse = await callGPT(openaiKey, prompt);
    console.log('✅ GPT response received');

    // 5. Parse GPT response
    const analysis = parseGPTResponse(gptResponse.content);
    
    // 6. Save to database
    const processingTime = Date.now() - startTime;
    
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('quantai_analyses')
      .insert({
        analysis_date: fedData.date,
        scenario: fedData.scenario,
        d_walcl_4w: fedData.d_walcl_4w,
        d_wresbal_4w: fedData.d_wresbal_4w,
        d_rrpontsyd_4w: fedData.d_rrpontsyd_4w,
        sofr_effr_spread: fedData.sofr_effr_spread,
        vix: fedData.vix,
        hy_oas: fedData.hy_oas,
        summary: analysis.summary,
        implications: analysis.implications,
        sentiment: analysis.sentiment,
        focus_points: analysis.focus_points,
        full_response: gptResponse.content,
        model_used: gptResponse.model || 'gpt-4o',
        tokens_used: gptResponse.usage?.total_tokens || null,
        processing_time_ms: processingTime,
        time_slot: timeSlot,
        is_alert: isAlert,
        alert_reason: isAlert ? alertReason : null,
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Failed to save analysis: ${saveError.message}`);
    }

    console.log('💾 Analysis saved:', savedAnalysis.id);
    console.log(`⏱️ Total processing time: ${processingTime}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: savedAnalysis,
        processing_time_ms: processingTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ QuantAI Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

/**
 * Genera time slot nel formato "YYYY-MM-DD_HH:00"
 * Slot: 7:00 UTC (8:00 CET), 15:00 UTC (16:00 CET), + "alert" per trigger
 */
function generateTimeSlot(date: Date, isAlert: boolean = false): string {
  const dateStr = date.toISOString().split('T')[0];
  
  // Se è un alert, usa slot speciale
  if (isAlert) {
    return `${dateStr}_alert_${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
  }
  
  const hours = date.getUTCHours();
  // Slot: 7:00 UTC (8 CET) e 15:00 UTC (16 CET)
  const slots = [7, 15];
  
  let nearestSlot = slots[0];
  for (const slot of slots) {
    if (hours >= slot) nearestSlot = slot;
  }
  
  return `${dateStr}_${nearestSlot.toString().padStart(2, '0')}:00`;
}

/**
 * Analizza i trend storici e genera un report testuale
 */
function analyzeTrends(history: FedData[]): string {
  if (history.length < 2) return 'Storico insufficiente per analisi trend.';
  
  const latest = history[0];
  const oldest = history[history.length - 1];
  const weekAgo = history[Math.min(7, history.length - 1)];
  
  // Helper per calcolare variazione %
  const pctChange = (now: number | null, then: number | null): string => {
    if (!now || !then || then === 0) return 'N/A';
    const change = ((now - then) / Math.abs(then)) * 100;
    const emoji = change > 5 ? '📈' : change < -5 ? '📉' : '➖';
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}% ${emoji}`;
  };
  
  // Helper per direzione trend
  const trendDirection = (values: (number | null)[]): string => {
    const valid = values.filter((v): v is number => v !== null);
    if (valid.length < 3) return 'N/D';
    
    // Calcola se trend è in accelerazione o rallentamento
    const recent = valid.slice(0, Math.floor(valid.length / 2));
    const older = valid.slice(Math.floor(valid.length / 2));
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    if (Math.abs(diff) < 0.01 * Math.abs(olderAvg)) return '➖ Stabile';
    return diff > 0 ? '📈 In aumento' : '📉 In calo';
  };
  
  // Estrai serie storiche
  const spreadHistory = history.map(h => h.sofr_effr_spread);
  const vixHistory = history.map(h => h.vix);
  const rrpHistory = history.map(h => h.rrpontsyd);
  const yieldHistory = history.map(h => h.t10y3m);
  const dxyHistory = history.map(h => h.dxy_broad);
  
  // Conta cambi scenario
  const scenarios = history.map(h => h.scenario);
  const scenarioChanges = scenarios.filter((s, i) => i > 0 && s !== scenarios[i - 1]).length;
  const currentScenarioStreak = scenarios.findIndex(s => s !== scenarios[0]) || scenarios.length;
  
  // Costruisci tabella storica
  const historyTable = history.slice(0, 7).map(h => {
    const d = h.date;
    const sc = (h.scenario || 'N/A').toUpperCase().substring(0, 3);
    const sp = ((h.sofr_effr_spread || 0) * 100).toFixed(0);
    const v = (h.vix || 0).toFixed(0);
    const yc = (h.t10y3m || 0).toFixed(2);
    const dx = (h.dxy_broad || 0).toFixed(0);
    return `   ${d} | ${sc} | Spread: ${sp}bps | VIX: ${v} | YC: ${yc} | DXY: ${dx}`;
  }).join('\n');

  return `
📊 VARIAZIONI PERIODO (${oldest.date} → ${latest.date}):

   SPREAD SOFR-EFFR: ${((oldest.sofr_effr_spread || 0) * 100).toFixed(0)}bps → ${((latest.sofr_effr_spread || 0) * 100).toFixed(0)}bps ${pctChange(latest.sofr_effr_spread, oldest.sofr_effr_spread)}
   VIX: ${(oldest.vix || 0).toFixed(1)} → ${(latest.vix || 0).toFixed(1)} ${pctChange(latest.vix, oldest.vix)}
   YIELD CURVE: ${(oldest.t10y3m || 0).toFixed(2)} → ${(latest.t10y3m || 0).toFixed(2)} ${pctChange(latest.t10y3m, oldest.t10y3m)}
   DXY: ${(oldest.dxy_broad || 0).toFixed(1)} → ${(latest.dxy_broad || 0).toFixed(1)} ${pctChange(latest.dxy_broad, oldest.dxy_broad)}
   RRP: ${(oldest.rrpontsyd || 0).toFixed(1)}B → ${(latest.rrpontsyd || 0).toFixed(1)}B ${pctChange(latest.rrpontsyd, oldest.rrpontsyd)}

📈 DIREZIONE TREND:
   Spread: ${trendDirection(spreadHistory)}
   VIX: ${trendDirection(vixHistory)}
   Yield Curve: ${trendDirection(yieldHistory)}
   Dollaro: ${trendDirection(dxyHistory)}

⚡ SCENARIO:
   Scenario attuale: ${latest.scenario?.toUpperCase()} (da ${currentScenarioStreak} giorni)
   Cambi scenario nel periodo: ${scenarioChanges}
   ${scenarioChanges > 0 ? '⚠️ ATTENZIONE: Regime instabile!' : '✅ Regime stabile'}

📋 STORICO GIORNALIERO (ultimi 7 giorni):
${historyTable}
`;
}

/**
 * Costruisce il prompt COMPLETO per GPT con dati attuali + STORICO + alert context
 */
function buildPrompt(data: FedData, history: FedData[], alertReason?: string): string {
  // === CONVERSIONI UNITÀ ===
  const bsT = (data.walcl / 1000000).toFixed(2);
  const bsDeltaB = (data.d_walcl_4w / 1000).toFixed(1);
  const reservesT = (data.wresbal / 1000000).toFixed(2);
  const resDeltaB = (data.d_wresbal_4w / 1000).toFixed(1);
  const rrpB = data.rrpontsyd?.toFixed(1) || 'N/A';
  const rrpDeltaB = data.d_rrpontsyd_4w?.toFixed(1) || 'N/A';
  
  // Spread in bps
  const sofrEffrBps = ((data.sofr_effr_spread || 0) * 100).toFixed(1);
  const sofrIorbBps = ((data.sofr_iorb_spread || 0) * 100).toFixed(1);
  
  // Yield Curve
  const yieldCurve = data.t10y3m?.toFixed(2) || 'N/A';
  const yieldCurveDelta = data.d_t10y3m_4w?.toFixed(2) || 'N/A';
  const isInverted = (data.t10y3m || 0) < 0;
  
  // Dollar
  const dxy = data.dxy_broad?.toFixed(2) || 'N/A';
  const dxyDelta = data.d_dxy_4w?.toFixed(2) || 'N/A';

  // === ANALISI TREND STORICO ===
  const trendAnalysis = analyzeTrends(history);

  // Alert banner se presente
  const alertBanner = alertReason ? `
🚨🚨🚨 ALERT TRIGGER 🚨🚨🚨
Questa analisi è stata richiesta automaticamente per: ${alertReason}
FOCUS PRIORITARIO su questo evento!
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨

` : '';

  return `Sei QuantAI, l'intelligenza artificiale di Quantitaizer specializzata in analisi della liquidità Fed.

${alertBanner}Analizza TUTTI i dati forniti e spiega in ITALIANO SEMPLICE cosa sta succedendo, collegando i vari indicatori tra loro.

════════════════════════════════════════════════════════════════
📊 REPORT COMPLETO - ${data.date}
════════════════════════════════════════════════════════════════

🎯 SCENARIO: ${(data.scenario || 'neutral').toUpperCase()}
   Contesto: ${data.context || 'N/A'} | Sostenibilità: ${data.sustainability || 'N/A'}
   Rischio: ${data.risk_level || 'N/A'} | Confidenza: ${data.confidence || 'N/A'}

────────────────────────────────────────────────────────────────
💰 BILANCIO FED
────────────────────────────────────────────────────────────────
   Balance Sheet: $${bsT}T (Δ4w: ${bsDeltaB}B) ${parseFloat(bsDeltaB) > 0 ? '📈' : '📉'}
   ${parseFloat(bsDeltaB) < -20 ? '→ QT ATTIVO' : parseFloat(bsDeltaB) > 20 ? '→ QE ATTIVO' : '→ STABILE'}

────────────────────────────────────────────────────────────────
🏦 RISERVE BANCARIE
────────────────────────────────────────────────────────────────
   Totale: $${reservesT}T (Δ4w: ${resDeltaB}B) ${parseFloat(resDeltaB) > 0 ? '📈' : '📉'}
   ${parseFloat(reservesT) > 3 ? '🟢 ABBONDANTI' : parseFloat(reservesT) > 2.5 ? '🟡 ADEGUATE' : '🔴 BASSE'}

────────────────────────────────────────────────────────────────
🔄 REVERSE REPO (Liquidità Parcheggiata)
────────────────────────────────────────────────────────────────
   Totale: $${rrpB}B (Δ4w: ${rrpDeltaB}B) ${parseFloat(rrpDeltaB || '0') > 0 ? '📈' : '📉'}
   ${parseFloat(rrpB) < 100 ? '⚠️ QUASI ESAURITO!' : parseFloat(rrpB) < 500 ? '🟡 BASSO' : '🟢 NORMALE'}

────────────────────────────────────────────────────────────────
📈 TASSI DI INTERESSE
────────────────────────────────────────────────────────────────
   SOFR: ${data.sofr?.toFixed(2) || 'N/A'}% | EFFR: ${data.effr?.toFixed(2) || 'N/A'}% | IORB: ${data.iorb?.toFixed(2) || 'N/A'}%
   Treasury 10Y: ${data.us10y?.toFixed(2) || 'N/A'}% | T-Bill 3M: ${data.dtb3?.toFixed(2) || 'N/A'}%

────────────────────────────────────────────────────────────────
⚡ SPREAD (Indicatori Stress Liquidità)
────────────────────────────────────────────────────────────────
   SOFR-EFFR: ${sofrEffrBps} bps ${parseFloat(sofrEffrBps) > 15 ? '🔴 ELEVATO!' : parseFloat(sofrEffrBps) > 5 ? '🟡' : '🟢'}
   SOFR-IORB: ${sofrIorbBps} bps
   HY OAS (Credit): ${data.hy_oas?.toFixed(2) || 'N/A'}% ${(data.hy_oas || 0) > 5 ? '🔴 STRESS' : (data.hy_oas || 0) < 3.5 ? '🟢 TIGHT' : '🟡'}

────────────────────────────────────────────────────────────────
📉 YIELD CURVE (10Y-3M)
────────────────────────────────────────────────────────────────
   Spread: ${yieldCurve}% (Δ4w: ${yieldCurveDelta}%) ${isInverted ? '🔴 INVERTITA!' : '🟢 NORMALE'}
   ${isInverted ? '⚠️ Segnale recessione storico!' : ''}

────────────────────────────────────────────────────────────────
💵 DOLLARO USA
────────────────────────────────────────────────────────────────
   DXY: ${dxy} (Δ4w: ${dxyDelta}) ${parseFloat(dxyDelta || '0') > 1 ? '📈 FORTE' : parseFloat(dxyDelta || '0') < -1 ? '📉 DEBOLE' : '➖'}

────────────────────────────────────────────────────────────────
😰 VOLATILITÀ
────────────────────────────────────────────────────────────────
   VIX: ${data.vix?.toFixed(1) || 'N/A'} ${(data.vix || 20) > 25 ? '🔴 ALTO' : (data.vix || 20) > 20 ? '🟡 ELEVATO' : '🟢 CALMO'}

────────────────────────────────────────────────────────────────
🎯 DRIVER ATTUALI
────────────────────────────────────────────────────────────────
${data.drivers?.map(d => `   • ${d}`).join('\n') || '   Nessuno'}

════════════════════════════════════════════════════════════════
📈 ANALISI TREND (ultimi ${history.length} giorni)
════════════════════════════════════════════════════════════════

${trendAnalysis}

════════════════════════════════════════════════════════════════

ANALIZZA i dati e i TREND. Rispondi in ITALIANO SEMPLICE.

⚠️ REGOLE IMPORTANTI:
- NON usare markdown (no asterischi, no **bold**, no *italic*)
- Scrivi in testo normale e pulito
- Ogni punto deve essere una frase completa
- Separa i punti con • (bullet point)

FORMATO RICHIESTO:

<SUMMARY>
• Prima osservazione chiave, una frase completa.
• Seconda osservazione, una frase completa.
• Terza osservazione, una frase completa.
• Conclusione finale, una frase completa.
</SUMMARY>

<IMPLICATIONS>
OPPORTUNITÀ:
• Prima opportunità per investitori, frase completa.
• Seconda opportunità, frase completa.

RISCHI:
• Primo rischio da monitorare, frase completa.
• Secondo rischio, frase completa.
</IMPLICATIONS>

<SENTIMENT>
cauto
</SENTIMENT>

<FOCUS>
metrica1 | metrica2 | metrica3 | metrica4
</FOCUS>`;
}

/**
 * Chiama GPT-5.1 via OpenAI API (SOLO 5.1, no fallback)
 */
async function callGPT(apiKey: string, prompt: string): Promise<{ content: string; model?: string; usage?: { total_tokens: number } }> {
  const MODEL = 'gpt-5.1-2025-11-13';
  
  console.log(`🤖 Calling model: ${MODEL}...`);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Sei QuantAI, analista AI di Quantitaizer per liquidità Fed.

REGOLE OBBLIGATORIE:
1. Rispondi SOLO in italiano
2. NON usare MAI markdown (no ** no * no \`)
3. Scrivi in testo NORMALE e PULITO
4. Frasi brevi e chiare
5. Separa i punti con • (bullet)`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_completion_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ GPT-5.1 failed: ${errorText}`);
    throw new Error(`GPT-5.1 API error: ${errorText}`);
  }

  const data = await response.json();
  console.log(`✅ GPT-5.1 response received`);
  
  return {
    content: data.choices[0].message.content,
    model: MODEL,
    usage: data.usage,
  };
}

/**
 * Parsa la risposta GPT nei campi strutturati
 */
function parseGPTResponse(content: string): QuantAIAnalysis {
  const extractTag = (tag: string): string => {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : '';
  };

  const summary = extractTag('SUMMARY') || content.substring(0, 200);
  const implications = extractTag('IMPLICATIONS') || '';
  const sentimentRaw = extractTag('SENTIMENT').toLowerCase();
  const focusRaw = extractTag('FOCUS');

  // Valida sentiment
  let sentiment: 'bullish' | 'cauto' | 'bearish' = 'cauto';
  if (sentimentRaw.includes('bullish')) sentiment = 'bullish';
  else if (sentimentRaw.includes('bearish')) sentiment = 'bearish';

  // Parse focus points
  const focus_points = focusRaw
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return {
    summary,
    implications,
    sentiment,
    focus_points: focus_points.length > 0 ? focus_points : ['Monitorare sviluppi Fed'],
  };
}

