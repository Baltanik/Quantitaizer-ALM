import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types
interface FedData {
  date: string;
  walcl: number;
  wresbal: number;
  us10y: number;
  sofr_iorb_spread?: number;
  walcl_delta_4w?: number;
  wresbal_delta_4w?: number;
  us10y_delta_4w?: number;
  rrpontsyd_delta_4w?: number;
  liquidity_score?: number;
  scenario?: string;
}

interface MLPrediction {
  date: string;
  model_version: string;
  prediction_horizon: number;
  predicted_liquidity_score: number;
  predicted_scenario: string;
  scenario_change_probability: number;
  direction_probability: number;
  confidence: number;
  features_used: string[];
  created_at: string;
}

interface PatternAnalysis {
  current_regime: string;
  regime_confidence: number;
  detected_cycles: number;
  similar_patterns: Array<{
    pattern: string;
    confidence: number;
    expected_duration: number;
  }>;
  anomalies: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
}

/**
 * Simplified ML Inference Engine
 * Implementa algoritmi ML lightweight per inference in Edge Function
 */
class SimplifiedMLEngine {
  private readonly SEQUENCE_LENGTH = 30;
  private readonly FEATURE_COUNT = 16;

  /**
   * Prepara features per inference (versione semplificata)
   */
  prepareFeatures(current: FedData, historical: FedData[]): number[] {
    const features: number[] = [];

    // Balance Sheet Features (4) - SOLO DATI GREZZI E STATISTICHE PURE
    const walclValues = historical.map(d => d.walcl);
    features.push(this.normalizeValue(current.walcl, walclValues));
    features.push(this.normalizeValue(current.walcl_delta_4w || 0, historical.map(d => d.walcl_delta_4w || 0)));
    features.push(this.calculateVolatility(walclValues.slice(-14))); // Volatility instead of RSI
    features.push(this.calculateAcceleration(historical.map(d => d.walcl_delta_4w || 0))); // Acceleration instead of MACD

    // Reserves Features (3)
    const wresbalValues = historical.map(d => d.wresbal);
    features.push(this.normalizeValue(current.wresbal, wresbalValues));
    features.push(this.normalizeValue(current.wresbal_delta_4w || 0, historical.map(d => d.wresbal_delta_4w || 0)));
    features.push(this.calculatePercentile(current.wresbal, wresbalValues));

    // Market Stress Features (4)
    const us10yValues = historical.map(d => d.us10y);
    features.push(this.normalizeValue(current.us10y, us10yValues));
    features.push(current.us10y_delta_4w || 0);
    features.push(this.calculateVolatility(us10yValues.slice(-10)));
    features.push(current.sofr_iorb_spread || 0);

    // Momentum Features (1)
    features.push(this.normalizeValue(current.rrpontsyd_delta_4w || 0, historical.map(d => d.rrpontsyd_delta_4w || 0)));

    // Temporal Features (4)
    const date = new Date(current.date);
    features.push(this.getSeasonality(date));
    features.push(this.getFOMCProximity(date));
    features.push(date.getDay() / 6);
    features.push(date.getMonth() / 11);

    return features;
  }

  /**
   * Simplified prediction usando rule-based approach
   * (In produzione sarebbe sostituito da TensorFlow.js model)
   */
  predict(features: number[], currentData: FedData): MLPrediction {
    // Rule-based prediction logic
    let predictedScore = currentData.liquidity_score || 50;
    let scenarioChangeProb = 0;
    let directionProb = 50;
    let confidence = 60;

    // Balance sheet trend impact
    const balanceSheetTrend = features[1]; // walcl_delta_4w_normalized
    if (balanceSheetTrend > 1) {
      predictedScore = Math.min(100, predictedScore + 15);
      directionProb = 75;
    } else if (balanceSheetTrend < -1) {
      predictedScore = Math.max(0, predictedScore - 15);
      directionProb = 25;
    }

    // Market stress impact
    const marketStress = features[9]; // us10y_volatility
    if (marketStress > 0.5) {
      predictedScore = Math.max(0, predictedScore - 10);
      confidence = Math.max(40, confidence - 10);
    }

    // Reserves impact
    const reservesPercentile = features[6];
    if (reservesPercentile < 0.2) {
      predictedScore = Math.max(0, predictedScore - 20);
      scenarioChangeProb = 30;
    } else if (reservesPercentile > 0.8) {
      predictedScore = Math.min(100, predictedScore + 10);
    }

    // Determine predicted scenario
    let predictedScenario = currentData.scenario || 'Neutral';
    if (scenarioChangeProb > 25) {
      if (predictedScore < 30) predictedScenario = 'QT Aggressive';
      else if (predictedScore > 70) predictedScenario = 'QE Stealth';
      else predictedScenario = 'Neutral';
    }

    return {
      date: new Date().toISOString().split('T')[0],
      model_version: 'rule_based_v1',
      prediction_horizon: 7,
      predicted_liquidity_score: Math.round(predictedScore),
      predicted_scenario: predictedScenario,
      scenario_change_probability: Math.round(scenarioChangeProb),
      direction_probability: Math.round(directionProb),
      confidence: Math.round(confidence),
      features_used: [
        'walcl_normalized', 'walcl_delta_4w', 'walcl_volatility', 'walcl_acceleration',
        'wresbal_normalized', 'wresbal_delta_4w', 'wresbal_percentile',
        'us10y_normalized', 'us10y_delta_4w', 'us10y_volatility', 'sofr_spread',
        'rrp_delta_4w', 'seasonality', 'fomc_proximity', 'day_of_week', 'month'
      ],
      created_at: new Date().toISOString()
    };
  }

  /**
   * Pattern analysis semplificato
   */
  analyzePatterns(data: FedData[]): PatternAnalysis {
    if (data.length < 30) {
      return {
        current_regime: 'INSUFFICIENT_DATA',
        regime_confidence: 0,
        detected_cycles: 0,
        similar_patterns: [],
        anomalies: []
      };
    }

    const recent = data.slice(-30);
    const liquidityScores = recent.map(d => d.liquidity_score || 50);
    const avgScore = liquidityScores.reduce((sum, score) => sum + score, 0) / liquidityScores.length;

    // Determine regime
    let regime: string;
    let confidence: number;

    if (avgScore >= 80) {
      regime = 'ABUNDANT';
      confidence = 90;
    } else if (avgScore >= 60) {
      regime = 'ADEQUATE';
      confidence = 80;
    } else if (avgScore >= 30) {
      regime = 'SCARCE';
      confidence = 75;
    } else {
      regime = 'CRISIS';
      confidence = 85;
    }

    // Simple cycle detection
    const walclValues = recent.map(d => d.walcl);
    const trend = this.calculateTrend(walclValues);
    const cycles = Math.abs(trend) > 0.02 ? 1 : 0;

    // Simple anomaly detection
    const anomalies = [];
    const recentVolatility = this.calculateVolatility(liquidityScores);
    if (recentVolatility > 20) {
      anomalies.push({
        type: 'HIGH_VOLATILITY',
        severity: 'MEDIUM',
        description: `High liquidity volatility detected: ${recentVolatility.toFixed(1)}`
      });
    }

    return {
      current_regime: regime,
      regime_confidence: confidence,
      detected_cycles: cycles,
      similar_patterns: [
        {
          pattern: `${regime}_TREND`,
          confidence: confidence,
          expected_duration: 30
        }
      ],
      anomalies
    };
  }

  // Utility methods
  private normalizeValue(value: number, historical: number[]): number {
    const mean = historical.reduce((sum, val) => sum + val, 0) / historical.length;
    const std = Math.sqrt(
      historical.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historical.length
    );
    return std > 0 ? (value - mean) / std : 0;
  }

  private calculateAcceleration(deltas: number[]): number {
    if (deltas.length < 3) return 0;

    // Calcola la derivata seconda (accelerazione del trend)
    const recent = deltas.slice(-3);
    const acceleration = (recent[2] - recent[1]) - (recent[1] - recent[0]);
    
    // Normalizza per evitare valori estremi
    return Math.max(-1, Math.min(1, acceleration / 100000));
  }

  private calculatePercentile(value: number, historical: number[]): number {
    const sorted = [...historical].sort((a, b) => a - b);
    const index = sorted.findIndex(val => val >= value);
    return index === -1 ? 1 : index / sorted.length;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private getSeasonality(date: Date): number {
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return (Math.sin(2 * Math.PI * dayOfYear / 365) + 1) / 2;
  }

  private getFOMCProximity(date: Date): number {
    const daysSinceEpoch = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
    const cyclePosition = (daysSinceEpoch % 42) / 42;
    return 1 - Math.abs(cyclePosition - 0.5) * 2;
  }
}

/**
 * Main Edge Function Handler
 */
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[ML-Inference] Starting ML inference process...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize ML engine
    const mlEngine = new SimplifiedMLEngine();

    // 1. Fetch recent historical data for context
    console.log('[ML-Inference] Fetching historical data...');
    const { data: historicalData, error: histError } = await supabase
      .from('fed_data')
      .select('*')
      .order('date', { ascending: false })
      .limit(100);

    if (histError) {
      throw new Error(`Failed to fetch historical data: ${histError.message}`);
    }

    if (!historicalData || historicalData.length < 30) {
      throw new Error('Insufficient historical data for ML inference');
    }

    // 2. Get latest data point
    const latestData = historicalData[0];
    const contextData = historicalData.slice(1).reverse(); // Oldest first for calculations

    console.log(`[ML-Inference] Processing data for ${latestData.date}`);

    // 3. Prepare features
    const features = mlEngine.prepareFeatures(latestData, contextData);
    console.log(`[ML-Inference] Extracted ${features.length} features`);

    // 4. Generate ML prediction
    const prediction = mlEngine.predict(features, latestData);
    console.log(`[ML-Inference] Generated prediction: Score=${prediction.predicted_liquidity_score}, Confidence=${prediction.confidence}%`);

    // 5. Perform pattern analysis
    const patternAnalysis = mlEngine.analyzePatterns(historicalData);
    console.log(`[ML-Inference] Pattern analysis: Regime=${patternAnalysis.current_regime}, Confidence=${patternAnalysis.regime_confidence}%`);

    // 6. Store prediction in database
    const { error: insertError } = await supabase
      .from('ml_predictions')
      .insert({
        date: prediction.date,
        model_version: prediction.model_version,
        prediction_horizon: prediction.prediction_horizon,
        predicted_score: prediction.predicted_liquidity_score,
        predicted_scenario: prediction.predicted_scenario,
        confidence: prediction.confidence / 100, // Store as decimal
        created_at: prediction.created_at
      });

    if (insertError) {
      console.error('[ML-Inference] Failed to store prediction:', insertError);
      // Continue execution - don't fail on storage error
    }

    // 7. Update fed_data with ML insights
    const { error: updateError } = await supabase
      .from('fed_data')
      .update({
        ml_prediction_score: prediction.predicted_liquidity_score,
        ml_confidence: prediction.confidence,
        ml_regime: patternAnalysis.current_regime,
        ml_updated_at: new Date().toISOString()
      })
      .eq('date', latestData.date);

    if (updateError) {
      console.error('[ML-Inference] Failed to update fed_data:', updateError);
    }

    // 8. Return comprehensive response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        current_date: latestData.date,
        current_liquidity_score: latestData.liquidity_score,
        prediction: {
          predicted_score: prediction.predicted_liquidity_score,
          predicted_scenario: prediction.predicted_scenario,
          scenario_change_probability: prediction.scenario_change_probability,
          direction_probability: prediction.direction_probability,
          confidence: prediction.confidence,
          horizon_days: prediction.prediction_horizon
        },
        pattern_analysis: {
          current_regime: patternAnalysis.current_regime,
          regime_confidence: patternAnalysis.regime_confidence,
          detected_cycles: patternAnalysis.detected_cycles,
          anomalies_count: patternAnalysis.anomalies.length,
          similar_patterns: patternAnalysis.similar_patterns.length
        },
        model_info: {
          version: prediction.model_version,
          features_count: features.length,
          inference_type: 'rule_based'
        }
      }
    };

    console.log('[ML-Inference] ML inference completed successfully');

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[ML-Inference] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
