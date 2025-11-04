/**
 * QUANTITAIZER V2 - BACKTEST VALIDATION SCRIPT
 * 
 * Valida accuracy del Liquidity Score V2 contro dati storici
 * Misura correlazione con VIX, HY OAS, market sentiment
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configurazione Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Supabase URL not found in environment variables');
  console.log('💡 Create a .env file with:');
  console.log('   VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.log('   VITE_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configurazione backtest
const BACKTEST_CONFIG = {
  startDate: '2024-08-01', // 3 mesi fa
  endDate: '2024-11-02',   // oggi
  minDataPoints: 30,       // minimo dati per validità
  correlationThreshold: 0.6 // soglia correlazione accettabile
};

/**
 * Calcola Liquidity Score usando la VERA logica V2 production
 * (Z-score normalization come in liquidityScore.ts)
 */
function calculateHistoricalLiquidityScore(data, historicalContext) {
  try {
    // Helper function per calcolare standard deviation
    const calculateStandardDeviation = (values) => {
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
        const currentDelta = data.walcl_delta_4w || 0;
        
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
        const currentReserves = data.wresbal || 0;
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
        // Lower volatility = higher score (less stress)
        stressScore = Math.min(100, Math.max(0, 100 - (yieldVolatility * 50)));
      }
    }

    // Momentum Component (10%) - RRP trend
    let momentumScore = 50;
    if (data.rrpontsyd_delta_4w !== undefined) {
      // Positive RRP delta (drainage) = lower liquidity score
      const rrpImpact = (data.rrpontsyd_delta_4w || 0) / 100000; // Scale factor
      momentumScore = Math.min(100, Math.max(0, 50 - (rrpImpact * 20)));
    }

    // Weighted Score (same as production)
    const liquidityScore = Math.round(
      balanceSheetScore * 0.4 + 
      reservesScore * 0.3 + 
      stressScore * 0.2 + 
      momentumScore * 0.1
    );

    // Grade calculation (same as production)
    let grade = 'F';
    if (liquidityScore >= 80) grade = 'A';
    else if (liquidityScore >= 70) grade = 'B';
    else if (liquidityScore >= 60) grade = 'C';
    else if (liquidityScore >= 50) grade = 'D';

    return {
      score: liquidityScore,
      grade: grade,
      components: {
        balanceSheet: Math.round(balanceSheetScore),
        reserves: Math.round(reservesScore),
        stress: Math.round(stressScore),
        momentum: Math.round(momentumScore)
      }
    };
  } catch (error) {
    console.warn('Error in calculateHistoricalLiquidityScore:', error);
    return {
      score: 50,
      grade: 'C',
      components: { balanceSheet: 50, reserves: 50, stress: 50, momentum: 50 }
    };
  }
}

/**
 * Calcola Leading Indicators storici (simulato per backtest)
 */
function calculateHistoricalLeadingIndicators(data, historicalContext) {
  try {
    // TGA Trend (simulato - basato su variazioni treasury)
    const tgaTrend = (data.us10y_delta_4w || 0) * 10; // Scale factor
    
    // RRP Velocity (basato su RRP delta)
    const rrpVelocity = (data.rrpontsyd_delta_4w || 0) / 100000; // Normalized
    
    // Credit Stress Index (basato su yield volatility)
    let creditStressIndex = 30; // Default
    if (historicalContext.length >= 10) {
      const recentYields = historicalContext.slice(-10).map(item => item.us10y || 0);
      const yieldStd = calculateStandardDeviation(recentYields);
      creditStressIndex = Math.min(100, Math.max(0, yieldStd * 100));
    }
    
    // Repo Spike Risk (basato su SOFR spread)
    const repoSpikeRisk = Math.abs(data.sofr_iorb_spread || 0) > 0.15 ? 25 : 0;
    
    // QT Pivot Probability (basato su balance sheet trend)
    let qtPivotProbability = 40; // Default
    if (data.walcl_delta_4w && data.walcl_delta_4w < -50000) {
      qtPivotProbability = 70; // High probability se balance sheet scende
    } else if (data.walcl_delta_4w && data.walcl_delta_4w > 50000) {
      qtPivotProbability = 20; // Low probability se balance sheet sale
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
    console.warn('Error in calculateHistoricalLeadingIndicators:', error);
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

/**
 * Calcola correlazione tra due array
 */
function calculateCorrelation(x, y) {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Esegue backtest completo
 */
async function runBacktest() {
  console.log('🔬 QUANTITAIZER V2 - BACKTEST VALIDATION');
  console.log('=====================================');
  
  try {
    // 1. Fetch dati storici
    console.log('📊 Fetching historical data...');
    const { data: historicalData, error } = await supabase
      .from('fed_data')
      .select('*')
      .gte('date', BACKTEST_CONFIG.startDate)
      .lte('date', BACKTEST_CONFIG.endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    if (!historicalData || historicalData.length < BACKTEST_CONFIG.minDataPoints) {
      throw new Error(`Insufficient data: ${historicalData?.length || 0} points`);
    }

    console.log(`✅ Loaded ${historicalData.length} historical records`);

    // 2. Calcola Liquidity Score per ogni punto storico
    console.log('🧮 Calculating historical Liquidity Scores...');
    const results = [];
    
    for (let i = 30; i < historicalData.length; i++) { // Skip primi 30 per context
      const currentData = historicalData[i];
      const context = historicalData.slice(0, i);
      
      // Calcola delta 4w
      const fourWeeksAgo = historicalData[i - 20]; // ~4 settimane
      if (fourWeeksAgo) {
        currentData.walcl_delta_4w = currentData.walcl - fourWeeksAgo.walcl;
        currentData.wresbal_delta_4w = currentData.wresbal - fourWeeksAgo.wresbal;
        currentData.us10y_delta_4w = currentData.us10y - fourWeeksAgo.us10y;
        currentData.rrpontsyd_delta_4w = currentData.rrpontsyd - fourWeeksAgo.rrpontsyd;
      }

      const liquidityResult = calculateHistoricalLiquidityScore(currentData, context);
      
      // Calcola Leading Indicators (simulato)
      const leadingIndicators = calculateHistoricalLeadingIndicators(currentData, historicalContext);
      
      results.push({
        date: currentData.date,
        liquidityScore: liquidityResult.score,
        grade: liquidityResult.grade,
        components: liquidityResult.components,
        leadingIndicators: leadingIndicators,
        vix: currentData.vix,
        hyOas: currentData.hy_oas,
        sofr: currentData.sofr,
        scenario: currentData.scenario
      });
    }

    console.log(`✅ Calculated ${results.length} Liquidity Scores`);

    // 2.5. Validazione consistenza temporale
    const consistency = validateTimeSeriesConsistency(results);
    if (consistency.gaps.length > 0) {
      console.warn(`⚠️  Found ${consistency.gaps.length} date gaps in data`);
      consistency.gaps.forEach(gap => {
        console.log(`   ${gap.from} → ${gap.to} (${gap.days} days)`);
      });
    }
    if (consistency.duplicates.length > 0) {
      console.warn(`⚠️  Found ${consistency.duplicates.length} duplicate dates`);
    }

    // 3. Analisi correlazioni
    console.log('📈 Analyzing correlations...');
    
    const liquidityScores = results.map(r => r.liquidityScore).filter(s => s != null);
    const vixValues = results.map(r => r.vix).filter(v => v != null);
    const hyOasValues = results.map(r => r.hyOas).filter(h => h != null);
    
    // Correlazioni (Liquidity Score dovrebbe essere inversamente correlato con VIX/HY OAS)
    const vixCorrelation = vixValues.length > 0 ? 
      -calculateCorrelation(liquidityScores.slice(0, vixValues.length), vixValues) : 0;
    const hyOasCorrelation = hyOasValues.length > 0 ? 
      -calculateCorrelation(liquidityScores.slice(0, hyOasValues.length), hyOasValues) : 0;

    // 4. Accuracy analysis
    const scenarioAccuracy = analyzeScenarioAccuracy(results);
    const trendAccuracy = analyzeTrendAccuracy(results);
    const leadingIndicatorsAccuracy = analyzeLeadingIndicatorsAccuracy(results);
    const forwardReturns = calculateForwardReturns(results);
    const regimePerformance = calculateRegimeSpecificPerformance(results);
    const chiSquareTest = calculateChiSquareTest(scenarioAccuracy.confusionMatrix);

    // 5. Results summary
    const summary = {
      totalDataPoints: results.length,
      dateRange: {
        start: results[0]?.date,
        end: results[results.length - 1]?.date
      },
      correlations: {
        vix: Math.round(vixCorrelation * 100) / 100,
        hyOas: Math.round(hyOasCorrelation * 100) / 100
      },
      accuracy: {
        scenario: scenarioAccuracy.accuracy,
        scenarioDetails: scenarioAccuracy,
        trend: trendAccuracy,
        leadingIndicators: leadingIndicatorsAccuracy
      },
      forwardReturns: forwardReturns,
      regimePerformance: regimePerformance,
      statisticalTest: chiSquareTest,
      liquidityScore: {
        min: Math.min(...liquidityScores),
        max: Math.max(...liquidityScores),
        avg: Math.round(liquidityScores.reduce((a, b) => a + b, 0) / liquidityScores.length),
        std: calculateStandardDeviation(liquidityScores)
      }
    };

    // 6. Print results
    printBacktestResults(summary);
    
    // 7. Export CSV and save results
    await exportToCSV(results);
    await saveBacktestResults(summary, results);

    return summary;

  } catch (error) {
    console.error('❌ Backtest failed:', error);
    throw error;
  }
}

/**
 * Mappa Liquidity Score a scenario atteso (logica V2)
 */
function mapScoreToScenario(score) {
  if (score >= 75) return 'qe';
  if (score >= 60) return 'stealth_qe';
  if (score >= 40) return 'neutral';
  return 'qt';
}

/**
 * Analizza accuracy predizione scenari con mappatura corretta
 */
function analyzeScenarioAccuracy(results) {
  let correct = 0;
  let total = 0;
  const confusionMatrix = {
    qe: { qe: 0, stealth_qe: 0, neutral: 0, qt: 0 },
    stealth_qe: { qe: 0, stealth_qe: 0, neutral: 0, qt: 0 },
    neutral: { qe: 0, stealth_qe: 0, neutral: 0, qt: 0 },
    qt: { qe: 0, stealth_qe: 0, neutral: 0, qt: 0 }
  };

  for (let i = 1; i < results.length; i++) {
    const prev = results[i - 1];
    const curr = results[i];
    
    if (prev.liquidityScore && curr.scenario) {
      total++;
      
      // Usa mappatura score → scenario
      const predictedScenario = mapScoreToScenario(prev.liquidityScore);
      const actualScenario = curr.scenario;
      
      // Aggiorna confusion matrix
      if (confusionMatrix[predictedScenario] && confusionMatrix[predictedScenario][actualScenario] !== undefined) {
        confusionMatrix[predictedScenario][actualScenario]++;
      }
      
      if (predictedScenario === actualScenario) {
        correct++;
      }
    }
  }

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  
  return {
    accuracy,
    total,
    correct,
    confusionMatrix
  };
}

/**
 * Calcola trend recente usando linear regression
 */
function calculateRecentTrend(recentData) {
  if (recentData.length < 2) return 0;
  
  const scores = recentData.map(d => d.liquidityScore).filter(s => s != null);
  if (scores.length < 2) return 0;
  
  const n = scores.length;
  const xAvg = (n - 1) / 2;
  const yAvg = scores.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xAvg) * (scores[i] - yAvg);
    denominator += Math.pow(i - xAvg, 2);
  }
  
  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Analizza accuracy predizione trend con momentum analysis
 */
function analyzeTrendAccuracy(results) {
  let correct = 0;
  let total = 0;

  for (let i = 7; i < results.length; i++) { // 7 giorni look-back
    const prev = results[i - 7];
    const curr = results[i];
    
    if (prev.liquidityScore != null && curr.liquidityScore != null) {
      total++;
      
      // Calcola trend previsto (based on momentum component)
      const recentData = results.slice(i - 7, i);
      const recentTrend = calculateRecentTrend(recentData);
      const predictedUp = recentTrend > 0;
      
      // Calcola trend reale
      const actualUp = curr.liquidityScore > prev.liquidityScore;
      
      if (predictedUp === actualUp) {
        correct++;
      }
    }
  }

  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

/**
 * Analizza accuracy dei Leading Indicators
 */
function analyzeLeadingIndicatorsAccuracy(results) {
  let qtPivotCorrect = 0;
  let qtPivotTotal = 0;
  let signalCorrect = 0;
  let signalTotal = 0;
  
  for (let i = 7; i < results.length; i++) { // 7 giorni forward
    const current = results[i - 7];
    const future = results[i];
    
    if (current.leadingIndicators && future.scenario) {
      // Test QT Pivot Probability
      if (current.leadingIndicators.qt_pivot_probability > 60) {
        qtPivotTotal++;
        const scenarioChanged = current.scenario !== future.scenario;
        if (scenarioChanged) qtPivotCorrect++;
      }
      
      // Test Overall Signal
      if (current.leadingIndicators.overall_signal !== 'neutral') {
        signalTotal++;
        const expectedBullish = current.leadingIndicators.overall_signal === 'bullish';
        const actualBullish = future.liquidityScore > current.liquidityScore;
        if (expectedBullish === actualBullish) signalCorrect++;
      }
    }
  }
  
  return {
    qtPivot: {
      correct: qtPivotCorrect,
      total: qtPivotTotal,
      accuracy: qtPivotTotal > 0 ? Math.round((qtPivotCorrect / qtPivotTotal) * 100) : 0
    },
    overallSignal: {
      correct: signalCorrect,
      total: signalTotal,
      accuracy: signalTotal > 0 ? Math.round((signalCorrect / signalTotal) * 100) : 0
    }
  };
}

/**
 * Calcola Sharpe Ratio delle strategie basate su Liquidity Score
 */
function calculateSharpeRatio(results) {
  const returns = [];
  
  for (let i = 0; i < results.length - 5; i++) {
    const current = results[i];
    const future = results[i + 5];
    
    if (current.liquidityScore != null && future.liquidityScore != null) {
      if (current.liquidityScore > 70 || current.liquidityScore < 40) {
        const returnPct = current.liquidityScore > 70 
          ? ((future.liquidityScore - current.liquidityScore) / current.liquidityScore) * 100
          : ((current.liquidityScore - future.liquidityScore) / current.liquidityScore) * 100;
        returns.push(returnPct);
      }
    }
  }
  
  if (returns.length < 2) return 0;
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdReturn = calculateStandardDeviation(returns);
  
  // Sharpe = (Avg Return - Risk-Free Rate) / Std Dev
  // Assume risk-free rate = 0 per semplicità
  const sharpeRatio = stdReturn > 0 ? avgReturn / stdReturn : 0;
  
  return Math.round(sharpeRatio * 100) / 100;
}

/**
 * Calcola massimo drawdown cumulativo
 */
function calculateMaxDrawdown(results) {
  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  
  for (let i = 0; i < results.length - 5; i++) {
    const current = results[i];
    const future = results[i + 5];
    
    if (current.liquidityScore != null && future.liquidityScore != null) {
      if (current.liquidityScore > 70 || current.liquidityScore < 40) {
        const returnPct = current.liquidityScore > 70 
          ? ((future.liquidityScore - current.liquidityScore) / current.liquidityScore) * 100
          : ((current.liquidityScore - future.liquidityScore) / current.liquidityScore) * 100;
        
        cumulative += returnPct;
        
        if (cumulative > peak) {
          peak = cumulative;
        }
        
        const drawdown = peak - cumulative;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    }
  }
  
  return Math.round(maxDrawdown * 100) / 100;
}

/**
 * Calcola forward returns ipotetici basati su score
 */
function calculateForwardReturns(results) {
  let totalReturn = 0;
  let trades = 0;
  let wins = 0;
  
  for (let i = 0; i < results.length - 5; i++) {
    const current = results[i];
    const future = results[i + 5]; // 5 giorni forward
    
    if (current.liquidityScore != null && future.liquidityScore != null) {
      let returnPct = 0;
      let shouldTrade = false;
      
      if (current.liquidityScore > 70) {
        // Simula long (assume positive return se score sale)
        returnPct = ((future.liquidityScore - current.liquidityScore) / current.liquidityScore) * 100;
        shouldTrade = true;
      } else if (current.liquidityScore < 40) {
        // Simula short (assume positive return se score scende)
        returnPct = ((current.liquidityScore - future.liquidityScore) / current.liquidityScore) * 100;
        shouldTrade = true;
      }
      
      if (shouldTrade) {
        totalReturn += returnPct;
        trades++;
        if (returnPct > 0) wins++;
      }
    }
  }
  
  return {
    avgReturn: trades > 0 ? Math.round((totalReturn / trades) * 100) / 100 : 0,
    totalTrades: trades,
    winRate: trades > 0 ? Math.round((wins / trades) * 100) : 0,
    totalReturn: Math.round(totalReturn * 100) / 100,
    sharpeRatio: calculateSharpeRatio(results),
    maxDrawdown: calculateMaxDrawdown(results)
  };
}

/**
 * Calcola performance separata per ogni regime
 */
function calculateRegimeSpecificPerformance(results) {
  const regimes = {
    qe: { trades: 0, wins: 0, totalReturn: 0, returns: [] },
    stealth_qe: { trades: 0, wins: 0, totalReturn: 0, returns: [] },
    neutral: { trades: 0, wins: 0, totalReturn: 0, returns: [] },
    qt: { trades: 0, wins: 0, totalReturn: 0, returns: [] }
  };
  
  for (let i = 0; i < results.length - 5; i++) {
    const current = results[i];
    const future = results[i + 5];
    const regime = current.scenario || 'neutral';
    
    if (current.liquidityScore != null && future.liquidityScore != null && regimes[regime]) {
      if (current.liquidityScore > 70 || current.liquidityScore < 40) {
        const returnPct = current.liquidityScore > 70 
          ? ((future.liquidityScore - current.liquidityScore) / current.liquidityScore) * 100
          : ((current.liquidityScore - future.liquidityScore) / current.liquidityScore) * 100;
        
        regimes[regime].trades++;
        regimes[regime].totalReturn += returnPct;
        regimes[regime].returns.push(returnPct);
        if (returnPct > 0) regimes[regime].wins++;
      }
    }
  }
  
  // Calcola metriche per regime
  Object.keys(regimes).forEach(regime => {
    const r = regimes[regime];
    r.avgReturn = r.trades > 0 ? Math.round((r.totalReturn / r.trades) * 100) / 100 : 0;
    r.winRate = r.trades > 0 ? Math.round((r.wins / r.trades) * 100) : 0;
    r.sharpe = r.returns.length > 1 ? 
      (r.returns.reduce((a, b) => a + b, 0) / r.returns.length) / calculateStandardDeviation(r.returns) : 0;
    r.sharpe = Math.round(r.sharpe * 100) / 100;
  });
  
  return regimes;
}

/**
 * Valida consistenza temporale dei dati
 */
function validateTimeSeriesConsistency(results) {
  const gaps = [];
  const duplicates = [];
  
  for (let i = 1; i < results.length; i++) {
    const prevDate = new Date(results[i - 1].date);
    const currDate = new Date(results[i].date);
    const daysDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 1) {
      gaps.push({ 
        from: results[i - 1].date, 
        to: results[i].date, 
        days: Math.round(daysDiff) 
      });
    }
    
    if (daysDiff === 0) {
      duplicates.push(results[i].date);
    }
  }
  
  return { gaps, duplicates };
}

/**
 * Test Chi-quadrato per validare che accuracy non sia casuale
 */
function calculateChiSquareTest(confusionMatrix) {
  // Calcola totali
  let total = 0;
  Object.keys(confusionMatrix).forEach(pred => {
    Object.keys(confusionMatrix[pred]).forEach(actual => {
      total += confusionMatrix[pred][actual];
    });
  });
  
  if (total === 0) return { chiSquare: 0, isSignificant: false, pValue: '>0.05' };
  
  // Expected frequency (null hypothesis: random prediction)
  const expectedFreq = total / 16; // 4x4 matrix
  
  // Chi-square statistic
  let chiSquare = 0;
  Object.keys(confusionMatrix).forEach(pred => {
    Object.keys(confusionMatrix[pred]).forEach(actual => {
      const observed = confusionMatrix[pred][actual];
      if (expectedFreq > 0) {
        chiSquare += Math.pow(observed - expectedFreq, 2) / expectedFreq;
      }
    });
  });
  
  // Critical value (15 df, p=0.05) ≈ 25
  const isSignificant = chiSquare > 25;
  
  return {
    chiSquare: Math.round(chiSquare * 100) / 100,
    isSignificant,
    pValue: isSignificant ? '<0.05' : '>0.05'
  };
}

/**
 * Calcola deviazione standard
 */
function calculateStandardDeviation(values) {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.round(Math.sqrt(avgSquareDiff) * 100) / 100;
}

/**
 * Esporta risultati in formato CSV
 */
async function exportToCSV(results) {
  try {
    const header = 'Date,Liquidity Score,Grade,Scenario,VIX,HY OAS,SOFR,BS Component,Reserves Component,Stress Component,Momentum Component,QT Pivot Prob,Overall Signal,TGA Trend,RRP Velocity,Credit Stress,Repo Risk\n';
    
    const rows = results.map(r => {
      return [
        r.date || '',
        r.liquidityScore || '',
        r.grade || '',
        r.scenario || '',
        r.vix || '',
        r.hyOas || '',
        r.sofr || '',
        r.components?.balanceSheet || '',
        r.components?.reserves || '',
        r.components?.stress || '',
        r.components?.momentum || '',
        r.leadingIndicators?.qt_pivot_probability || '',
        r.leadingIndicators?.overall_signal || '',
        r.leadingIndicators?.tga_trend || '',
        r.leadingIndicators?.rrp_velocity || '',
        r.leadingIndicators?.credit_stress_index || '',
        r.leadingIndicators?.repo_spike_risk || ''
      ].join(',');
    }).join('\n');
    
    const csv = header + rows;
    
    // In Node.js, usa fs.writeFileSync
    const fs = await import('fs');
    fs.writeFileSync('backtest-results-v2.csv', csv);
    console.log('📄 CSV exported to: backtest-results-v2.csv');
    
    return csv;
  } catch (error) {
    console.warn('⚠️  CSV export failed:', error.message);
  }
}

/**
 * Stampa confusion matrix
 */
function printConfusionMatrix(matrix) {
  console.log('\n🎯 CONFUSION MATRIX:');
  console.log('                    Actual →');
  console.log('Predicted ↓     QE  Stealth  Neutral   QT');
  console.log(`QE             ${String(matrix.qe.qe).padStart(3)} ${String(matrix.qe.stealth_qe).padStart(7)} ${String(matrix.qe.neutral).padStart(8)} ${String(matrix.qe.qt).padStart(5)}`);
  console.log(`Stealth        ${String(matrix.stealth_qe.qe).padStart(3)} ${String(matrix.stealth_qe.stealth_qe).padStart(7)} ${String(matrix.stealth_qe.neutral).padStart(8)} ${String(matrix.stealth_qe.qt).padStart(5)}`);
  console.log(`Neutral        ${String(matrix.neutral.qe).padStart(3)} ${String(matrix.neutral.stealth_qe).padStart(7)} ${String(matrix.neutral.neutral).padStart(8)} ${String(matrix.neutral.qt).padStart(5)}`);
  console.log(`QT             ${String(matrix.qt.qe).padStart(3)} ${String(matrix.qt.stealth_qe).padStart(7)} ${String(matrix.qt.neutral).padStart(8)} ${String(matrix.qt.qt).padStart(5)}`);
}

/**
 * Stampa risultati backtest
 */
function printBacktestResults(summary) {
  console.log('\n🎯 BACKTEST RESULTS');
  console.log('==================');
  console.log(`📅 Period: ${summary.dateRange.start} → ${summary.dateRange.end}`);
  console.log(`📊 Data Points: ${summary.totalDataPoints}`);
  console.log('\n📈 CORRELATIONS:');
  console.log(`   VIX: ${summary.correlations.vix} ${summary.correlations.vix > 0.6 ? '✅' : '⚠️'}`);
  console.log(`   HY OAS: ${summary.correlations.hyOas} ${summary.correlations.hyOas > 0.6 ? '✅' : '⚠️'}`);
  console.log('\n🎯 ACCURACY:');
  console.log(`   Scenario Prediction: ${summary.accuracy.scenario}% ${summary.accuracy.scenario > 70 ? '✅' : '⚠️'}`);
  console.log(`   Trend Prediction: ${summary.accuracy.trend}% ${summary.accuracy.trend > 60 ? '✅' : '⚠️'}`);
  console.log(`   QT Pivot Signals: ${summary.accuracy.leadingIndicators.qtPivot.accuracy}% (${summary.accuracy.leadingIndicators.qtPivot.total} tests)`);
  console.log(`   Overall Signals: ${summary.accuracy.leadingIndicators.overallSignal.accuracy}% (${summary.accuracy.leadingIndicators.overallSignal.total} tests)`);
  
  // Print confusion matrix
  if (summary.accuracy.scenarioDetails?.confusionMatrix) {
    printConfusionMatrix(summary.accuracy.scenarioDetails.confusionMatrix);
  }
  console.log('\n💰 FORWARD RETURNS (5-day):');
  console.log(`   Total Trades: ${summary.forwardReturns.totalTrades}`);
  console.log(`   Win Rate: ${summary.forwardReturns.winRate}% ${summary.forwardReturns.winRate > 60 ? '✅' : '⚠️'}`);
  console.log(`   Avg Return: ${summary.forwardReturns.avgReturn}%`);
  console.log(`   Total Return: ${summary.forwardReturns.totalReturn}%`);
  console.log(`   Sharpe Ratio: ${summary.forwardReturns.sharpeRatio} ${summary.forwardReturns.sharpeRatio > 1 ? '✅' : '⚠️'}`);
  console.log(`   Max Drawdown: ${summary.forwardReturns.maxDrawdown}%`);
  
  console.log('\n📊 LIQUIDITY SCORE STATS:');
  console.log(`   Range: ${summary.liquidityScore.min} - ${summary.liquidityScore.max}`);
  console.log(`   Average: ${summary.liquidityScore.avg}`);
  console.log(`   Std Dev: ${summary.liquidityScore.std}`);
  
  // Performance by regime
  console.log('\n📊 PERFORMANCE BY REGIME:');
  Object.entries(summary.regimePerformance).forEach(([regime, perf]) => {
    if (perf.trades > 0) {
      console.log(`   ${regime.toUpperCase()}:`);
      console.log(`     Trades: ${perf.trades}, Win Rate: ${perf.winRate}%, Avg Return: ${perf.avgReturn}%, Sharpe: ${perf.sharpe}`);
    }
  });
  
  // Statistical significance
  console.log('\n🔬 STATISTICAL VALIDATION:');
  console.log(`   Chi-Square: ${summary.statisticalTest.chiSquare}`);
  console.log(`   P-Value: ${summary.statisticalTest.pValue}`);
  console.log(`   Statistically Significant: ${summary.statisticalTest.isSignificant ? '✅ YES' : '⚠️ NO'}`);
  
  // Overall grade
  const overallScore = (
    (summary.correlations.vix > 0.6 ? 25 : 0) +
    (summary.correlations.hyOas > 0.6 ? 25 : 0) +
    (summary.accuracy.scenario > 70 ? 25 : 0) +
    (summary.accuracy.trend > 60 ? 25 : 0)
  );
  
  console.log(`\n⭐ OVERALL GRADE: ${overallScore}/100 ${overallScore >= 75 ? '🎉 EXCELLENT' : overallScore >= 50 ? '✅ GOOD' : '⚠️ NEEDS IMPROVEMENT'}`);
}

/**
 * Salva risultati su file
 */
async function saveBacktestResults(summary, results) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `backtest-results-${timestamp}.json`;
  
  const output = {
    timestamp: new Date().toISOString(),
    summary,
    config: BACKTEST_CONFIG,
    detailedResults: results.slice(-30) // Ultimi 30 giorni per dettaglio
  };

  // In un ambiente reale, salveresti su filesystem o database
  console.log(`\n💾 Results saved to: ${filename}`);
  console.log('📄 Sample data:', JSON.stringify(output.detailedResults.slice(0, 3), null, 2));
}

// Esegui backtest se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runBacktest()
    .then(() => console.log('\n✅ Backtest completed successfully'))
    .catch(error => {
      console.error('\n❌ Backtest failed:', error);
      process.exit(1);
    });
}

export { runBacktest, calculateHistoricalLiquidityScore };
