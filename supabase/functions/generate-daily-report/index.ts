// ============================================================================
// GENERATE DAILY REPORT - Edge Function
// ============================================================================
// Scheduled: ogni giorno 18:00 UTC via cron trigger
// Output: PDF report in Supabase Storage (bucket: reports)
// Log: JSON structured per audit/monitoring

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generatePDF } from './pdfGenerator.ts';
import { calculateDeltas, getAlerts } from './alertEngine.ts';
import { deriveScenario } from './scenarioEngine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FedMetric {
  date: string;
  walcl: number;
  wresbal: number;
  rrpon: number;
  sofr: number;
  iorb: number;
  vix: number;
  hy_oas: number;
  t10y3m: number;
  dxy_broad: number;
  d_walcl_4w: number;
  d_wresbal_4w: number;
  d_rrpon_4w: number;
  d_t10y3m_4w: number;
  d_dxy_4w: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch latest metrics (oggi + 90 giorni storia)
    console.log(JSON.stringify({
      event: 'report_generation_started',
      timestamp: new Date().toISOString()
    }));

    const { data: metrics, error: fetchError } = await supabase
      .from('fed_metrics')
      .select('*')
      .order('date', { ascending: false })
      .limit(91); // oggi + 90d per range

    if (fetchError) {
      throw new Error(`Failed to fetch metrics: ${fetchError.message}`);
    }

    if (!metrics || metrics.length === 0) {
      throw new Error('No metrics available in database');
    }

    const today = metrics[0] as FedMetric;
    const yesterday = metrics[1] as FedMetric;
    const week4Ago = metrics[28] as FedMetric; // ~4 settimane
    const month3Ago = metrics[90] as FedMetric; // ~3 mesi

    // Validate data non è placeholder
    if (!today.walcl || !today.vix) {
      console.error(JSON.stringify({
        event: 'invalid_data_detected',
        date: today.date,
        reason: 'Missing critical metrics',
        timestamp: new Date().toISOString()
      }));
      throw new Error('Invalid or incomplete data - aborting report generation');
    }

    // 2. Calcola deltas e range
    const deltas = calculateDeltas(today, yesterday, week4Ago, month3Ago, metrics);

    // 3. Deriva scenario
    const scenario = deriveScenario({
      walcl: today.walcl,
      dWalcl_4w: today.d_walcl_4w,
      wresbal: today.wresbal,
      dWresbal_4w: today.d_wresbal_4w,
      rrpon: today.rrpon,
      dRrpon_4w: today.d_rrpon_4w,
      sofr: today.sofr,
      iorb: today.iorb,
      vix: today.vix,
      hyOAS: today.hy_oas,
      t10y3m: today.t10y3m,
      dT10y3m_4w: today.d_t10y3m_4w,
      dxyBroad: today.dxy_broad,
      dDxy_4w: today.d_dxy_4w
    });

    // 4. Calcola alerts
    const alerts = getAlerts(today, deltas, scenario);

    // 5. Genera PDF
    const pdfBytes = await generatePDF({
      date: today.date,
      metrics: today,
      deltas,
      scenario,
      alerts
    });

    // 6. Save to Supabase Storage
    const fileName = `daily-report-${today.date}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    const duration = Date.now() - startTime;

    // 7. Log success
    console.log(JSON.stringify({
      event: 'report_generated_successfully',
      date: today.date,
      scenario: scenario.scenario,
      context: scenario.context,
      risk_level: scenario.risk_level,
      alerts_count: alerts.length,
      file: fileName,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    }));

    return new Response(
      JSON.stringify({
        success: true,
        file: fileName,
        date: today.date,
        scenario: scenario.scenario,
        alerts: alerts.length,
        duration_ms: duration
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error(JSON.stringify({
      event: 'report_generation_failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }));

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});












