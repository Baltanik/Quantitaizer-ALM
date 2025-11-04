/**
 * QUANTITAIZER V2 - EDGE FUNCTION SEPARATA
 * 
 * Calcola Liquidity Score e Leading Indicators senza impattare produzione
 * Usa algoritmi V2 avanzati con Z-score normalization
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FedDataV2 {
  date: string;
  walcl: number;
  wresbal: number;
  sofr: number;
  iorb: number;
  sofr_iorb_spread: number;
  us10y: number;
  rrpontsyd: number;
  tga?: number;
  ig_spread?: number;
  walcl_delta_4w?: number;
  wresbal_delta_4w?: number;
  us10y_delta_4w?: number;
  rrpontsyd_delta_4w?: number;
  scenario?: string;
  liquidity_score?: number;
  liquidity_grade?: string;
  liquidity_trend?: string;
  liquidity_confidence?: number;
  leading_indicators?: any;
}

/**
 * Calcola Liquidity Score V2 con Z-score normalization
 */
function calculateLiquidityScoreV2(currentData: FedDataV2, historicalContext: FedDataV2[]): any {
  try {
    // Helper function per standard deviation
    const calculateStandardDeviation = (values: number[]) => {
      if (values.length < 2) return 0;
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const squareDiffs = values.map(value => Math.pow(value - avg, 2));
      const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
      return Math.sqrt(avgSquareDiff);
    };

    // Balance Sheet Component (40%) - Z-score normalization
    let balanceSheetScore = 50;
    if (historicalContext.length >= 20) {
      const historicalDeltas = historicalContext
        .slice(-30)
        .map(item => item.walcl_delta_4w || 0)
        .filter(delta => delta !== 0);
      
      if (historicalDeltas.length > 0) {
        const avgDelta = historicalDeltas.reduce((a, b) => a + b, 0) / historicalDeltas.length;
        const stdDev = calculateStandardDeviation(historicalDeltas);
        const currentDelta = currentData.walcl_delta_4w || 0;
        
        if (stdDev > 0) {
          const zScore = (currentDelta - avgDelta) / stdDev;
          balanceSheetScore = Math.min(100, Math.max(0, 50 + (zScore * 15)));
        }
      }
    }

    // Reserves Component (30%) - Percentile analysis
    let reservesScore = 50;
    if (historicalContext.length >= 20) {
      const historicalReserves = historicalContext
        .slice(-90)
        .map(item => item.wresbal || 0)
        .filter(val => val > 0)
        .sort((a, b) => a - b);
      
      if (historicalReserves.length > 0) {
        const currentReserves = currentData.wresbal || 0;
        const percentile = historicalReserves.findIndex(val => val >= currentReserves) / historicalReserves.length;
        reservesScore = Math.round(percentile * 100);
      }
    }

    // Market Stress Component (20%) - Volatility based
    let stressScore = 50;
    if (historicalContext.length >= 10) {
      const recentYields = historicalContext
        .slice(-10)
        .map(item => item.us10y || 0)
        .filter(val => val > 0);
      
      if (recentYields.length > 0) {
        const yieldVolatility = calculateStandardDeviation(recentYields);
        stressScore = Math.min(100, Math.max(0, 100 - (yieldVolatility * 50)));
      }
    }

    // Momentum Component (10%) - RRP trend
    let momentumScore = 50;
    if (currentData.rrpontsyd_delta_4w !== undefined) {
      const rrpImpact = (currentData.rrpontsyd_delta_4w || 0) / 100000;
      momentumScore = Math.min(100, Math.max(0, 50 - (rrpImpact * 20)));
    }

    // Weighted Score
    const liquidityScore = Math.round(
      balanceSheetScore * 0.4 + 
      reservesScore * 0.3 + 
      stressScore * 0.2 + 
      momentumScore * 0.1
    );

    // Grade calculation
    let grade = 'F';
    if (liquidityScore >= 80) grade = 'A';
    else if (liquidityScore >= 70) grade = 'B';
    else if (liquidityScore >= 60) grade = 'C';
    else if (liquidityScore >= 50) grade = 'D';

    // Trend calculation
    let trend = 'neutral';
    if (historicalContext.length >= 5) {
      const recentScores = historicalContext.slice(-5).map(item => item.liquidity_score || 50);
      const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      if (liquidityScore > avgRecent + 5) trend = 'up';
      else if (liquidityScore < avgRecent - 5) trend = 'down';
    }

    // Confidence calculation
    const confidence = Math.min(100, Math.max(0, 
      100 - Math.abs(50 - liquidityScore) * 2
    ));

    return {
      score: liquidityScore,
      grade: grade,
      trend: trend,
      confidence: Math.round(confidence),
      components: {
        balanceSheet: Math.round(balanceSheetScore),
        reserves: Math.round(reservesScore),
        stress: Math.round(stressScore),
        momentum: Math.round(momentumScore)
      }
    };
  } catch (error) {
    console.error('Error in calculateLiquidityScoreV2:', error);
    return {
      score: 50,
      grade: 'C',
      trend: 'neutral',
      confidence: 50,
      components: { balanceSheet: 50, reserves: 50, stress: 50, momentum: 50 }
    };
  }
}

/**
 * Calcola Leading Indicators V2
 */
function calculateLeadingIndicatorsV2(currentData: FedDataV2, historicalContext: FedDataV2[]): any {
  try {
    // TGA Trend (basato su variazioni treasury)
    const tgaTrend = (currentData.us10y_delta_4w || 0) * 10;
    
    // RRP Velocity (basato su RRP delta)
    const rrpVelocity = (currentData.rrpontsyd_delta_4w || 0) / 100000;
    
    // Credit Stress Index (basato su yield volatility)
    let creditStressIndex = 30;
    if (historicalContext.length >= 10) {
      const recentYields = historicalContext.slice(-10).map(item => item.us10y || 0);
      const yieldStd = recentYields.length > 1 ? 
        Math.sqrt(recentYields.map(y => Math.pow(y - recentYields.reduce((a,b) => a+b,0)/recentYields.length, 2)).reduce((a,b) => a+b,0) / recentYields.length) : 0;
      creditStressIndex = Math.min(100, Math.max(0, yieldStd * 100));
    }
    
    // Repo Spike Risk (basato su SOFR spread)
    const repoSpikeRisk = Math.abs(currentData.sofr_iorb_spread || 0) > 0.15 ? 25 : 0;
    
    // QT Pivot Probability (basato su balance sheet trend)
    let qtPivotProbability = 40;
    if (currentData.walcl_delta_4w && currentData.walcl_delta_4w < -50000) {
      qtPivotProbability = 70;
    } else if (currentData.walcl_delta_4w && currentData.walcl_delta_4w > 50000) {
      qtPivotProbability = 20;
    }
    
    // Overall Signal
    let overallSignal = 'neutral';
    const bullishFactors = (tgaTrend < -10 ? 1 : 0) + (rrpVelocity < -0.1 ? 1 : 0) + (creditStressIndex < 30 ? 1 : 0);
    const bearishFactors = (tgaTrend > 10 ? 1 : 0) + (rrpVelocity > 0.1 ? 1 : 0) + (creditStressIndex > 60 ? 1 : 0);
    
    if (bullishFactors >= 2) overallSignal = 'bullish';
    else if (bearishFactors >= 2) overallSignal = 'bearish';
    
    return {
      tga_trend: Math.round(tgaTrend * 100) / 100,
      rrp_velocity: Math.round(rrpVelocity * 100) / 100,
      credit_stress_index: Math.round(creditStressIndex),
      repo_spike_risk: repoSpikeRisk,
      qt_pivot_probability: qtPivotProbability,
      overall_signal: overallSignal
    };
  } catch (error) {
    console.error('Error in calculateLeadingIndicatorsV2:', error);
    return {
      tga_trend: 0,
      rrp_velocity: 0,
      credit_stress_index: 30,
      repo_spike_risk: 0,
      qt_pivot_probability: 40,
      overall_signal: 'neutral'
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Starting Fed data fetch V2...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch historical data per context
    const { data: historicalData, error: histError } = await supabase
      .from('fed_data')
      .select('*')
      .order('date', { ascending: false })
      .limit(100);

    if (histError) {
      throw new Error(`Historical data fetch failed: ${histError.message}`);
    }

    if (!historicalData || historicalData.length === 0) {
      throw new Error('No historical data available');
    }

    // 2. Get latest record
    const latestData = historicalData[0];
    console.log('📊 Processing latest data:', latestData.date);

    // 3. Calculate V2 metrics
    const liquidityResult = calculateLiquidityScoreV2(latestData, historicalData.slice(1));
    const leadingIndicators = calculateLeadingIndicatorsV2(latestData, historicalData.slice(1));

    // 4. Update database with V2 data
    const { error: updateError } = await supabase
      .from('fed_data')
      .update({
        liquidity_score: liquidityResult.score,
        liquidity_grade: liquidityResult.grade,
        liquidity_trend: liquidityResult.trend,
        liquidity_confidence: liquidityResult.confidence,
        leading_indicators: leadingIndicators
      })
      .eq('date', latestData.date);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log('✅ V2 data calculated and saved successfully');
    console.log(`📊 Liquidity Score: ${liquidityResult.score} (${liquidityResult.grade})`);
    console.log(`📈 Overall Signal: ${leadingIndicators.overall_signal}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          date: latestData.date,
          liquidityScore: liquidityResult.score,
          liquidityGrade: liquidityResult.grade,
          liquidityTrend: liquidityResult.trend,
          liquidityConfidence: liquidityResult.confidence,
          leadingIndicators: leadingIndicators,
          components: liquidityResult.components
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ V2 Edge Function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error in V2 processing'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})