import { FedData } from '../../integrations/supabase/types';

export interface PolicyCycle {
  id: string;
  type: 'QE' | 'QT' | 'NEUTRAL' | 'TRANSITION';
  startDate: string;
  endDate?: string;
  duration?: number; // days
  peakValue?: number;
  troughValue?: number;
  volatility: number;
  confidence: number;
  characteristics: {
    balanceSheetChange: number; // Percentage change
    reservesChange: number;
    rateChange: number;
    marketImpact: number;
  };
}

export interface PatternMatch {
  pattern: string;
  confidence: number;
  historicalMatches: PolicyCycle[];
  expectedOutcome: {
    duration: number;
    magnitude: number;
    probability: number;
  };
}

export interface LiquidityRegime {
  regime: 'ABUNDANT' | 'ADEQUATE' | 'SCARCE' | 'CRISIS';
  confidence: number;
  duration: number;
  characteristics: {
    avgLiquidityScore: number;
    volatility: number;
    trendDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
    marketStress: number;
  };
  transitionProbability: {
    [key: string]: number;
  };
}

/**
 * Pattern Recognition Engine per Fed Policy Cycles
 * Identifica automaticamente pattern ricorrenti nei dati Fed
 */
export class FedPolicyPatternDetector {
  private readonly MIN_CYCLE_DURATION = 30; // Minimum 30 days for a valid cycle
  private readonly BALANCE_SHEET_THRESHOLD = 0.02; // 2% change threshold
  private readonly VOLATILITY_WINDOW = 20; // Days for volatility calculation

  /**
   * Rileva cicli di policy Fed (QE/QT) nei dati storici
   */
  detectPolicyCycles(data: FedData[]): PolicyCycle[] {
    console.log(`[Pattern] Analyzing ${data.length} data points for policy cycles`);

    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const cycles: PolicyCycle[] = [];
    let currentCycle: Partial<PolicyCycle> | null = null;

    for (let i = 1; i < sortedData.length; i++) {
      const current = sortedData[i];
      const previous = sortedData[i - 1];

      // Detect cycle start
      const cycleStart = this.detectCycleStart(current, previous, sortedData.slice(Math.max(0, i - 10), i));
      
      if (cycleStart && !currentCycle) {
        currentCycle = {
          id: `cycle_${current.date}`,
          type: cycleStart.type,
          startDate: current.date,
          volatility: 0,
          confidence: cycleStart.confidence,
          characteristics: {
            balanceSheetChange: 0,
            reservesChange: 0,
            rateChange: 0,
            marketImpact: 0
          }
        };
        console.log(`[Pattern] Detected ${cycleStart.type} cycle start at ${current.date}`);
      }

      // Detect cycle end
      if (currentCycle) {
        const cycleEnd = this.detectCycleEnd(current, previous, currentCycle, sortedData.slice(Math.max(0, i - 10), i));
        
        if (cycleEnd) {
          // Finalize cycle
          const startIndex = sortedData.findIndex(d => d.date === currentCycle!.startDate);
          const cycleData = sortedData.slice(startIndex, i + 1);
          
          const completedCycle = this.finalizeCycle(currentCycle, current.date, cycleData);
          
          if (completedCycle.duration! >= this.MIN_CYCLE_DURATION) {
            cycles.push(completedCycle);
            console.log(`[Pattern] Completed ${completedCycle.type} cycle: ${completedCycle.duration} days`);
          }
          
          currentCycle = null;
        }
      }
    }

    // Handle incomplete cycle at the end
    if (currentCycle) {
      const startIndex = sortedData.findIndex(d => d.date === currentCycle.startDate);
      const cycleData = sortedData.slice(startIndex);
      const incompleteCycle = this.finalizeCycle(currentCycle, sortedData[sortedData.length - 1].date, cycleData);
      incompleteCycle.endDate = undefined; // Mark as ongoing
      cycles.push(incompleteCycle);
    }

    console.log(`[Pattern] Detected ${cycles.length} policy cycles`);
    return cycles;
  }

  /**
   * Rileva l'inizio di un nuovo ciclo
   */
  private detectCycleStart(current: FedData, previous: FedData, context: FedData[]): { type: PolicyCycle['type']; confidence: number } | null {
    const balanceSheetChange = (current.walcl - previous.walcl) / previous.walcl;
    const reservesChange = (current.wresbal - previous.wresbal) / previous.wresbal;
    
    // QE Detection (Balance sheet expansion)
    if (balanceSheetChange > this.BALANCE_SHEET_THRESHOLD) {
      const confidence = Math.min(100, Math.abs(balanceSheetChange) * 100);
      return { type: 'QE', confidence };
    }

    // QT Detection (Balance sheet contraction)
    if (balanceSheetChange < -this.BALANCE_SHEET_THRESHOLD) {
      const confidence = Math.min(100, Math.abs(balanceSheetChange) * 100);
      return { type: 'QT', confidence };
    }

    // Transition Detection (Significant reserves change without balance sheet change)
    if (Math.abs(reservesChange) > 0.05 && Math.abs(balanceSheetChange) < 0.01) {
      return { type: 'TRANSITION', confidence: 60 };
    }

    return null;
  }

  /**
   * Rileva la fine di un ciclo
   */
  private detectCycleEnd(current: FedData, previous: FedData, cycle: Partial<PolicyCycle>, context: FedData[]): boolean {
    const balanceSheetChange = (current.walcl - previous.walcl) / previous.walcl;
    
    // Policy reversal detection
    if (cycle.type === 'QE' && balanceSheetChange < -this.BALANCE_SHEET_THRESHOLD) {
      return true;
    }
    
    if (cycle.type === 'QT' && balanceSheetChange > this.BALANCE_SHEET_THRESHOLD) {
      return true;
    }

    // Stagnation detection (no significant change for extended period)
    const recentChanges = context.slice(-10).map((d, i, arr) => 
      i > 0 ? (d.walcl - arr[i-1].walcl) / arr[i-1].walcl : 0
    );
    
    const avgRecentChange = recentChanges.reduce((sum, change) => sum + Math.abs(change), 0) / recentChanges.length;
    
    if (avgRecentChange < 0.005) { // Less than 0.5% average change
      return true;
    }

    return false;
  }

  /**
   * Finalizza un ciclo calcolando tutte le metriche
   */
  private finalizeCycle(cycle: Partial<PolicyCycle>, endDate: string, cycleData: FedData[]): PolicyCycle {
    const startData = cycleData[0];
    const endData = cycleData[cycleData.length - 1];
    
    const duration = Math.floor(
      (new Date(endDate).getTime() - new Date(cycle.startDate!).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate characteristics
    const balanceSheetChange = (endData.walcl - startData.walcl) / startData.walcl;
    const reservesChange = (endData.wresbal - startData.wresbal) / startData.wresbal;
    const rateChange = endData.us10y - startData.us10y;

    // Calculate volatility
    const liquidityScores = cycleData.map(d => d.liquidity_score || 50);
    const volatility = this.calculateVolatility(liquidityScores);

    // Calculate market impact (simplified)
    const marketImpact = Math.abs(rateChange) + Math.abs(balanceSheetChange) * 10;

    // Find peak/trough values
    const walclValues = cycleData.map(d => d.walcl);
    const peakValue = Math.max(...walclValues);
    const troughValue = Math.min(...walclValues);

    return {
      id: cycle.id!,
      type: cycle.type!,
      startDate: cycle.startDate!,
      endDate,
      duration,
      peakValue,
      troughValue,
      volatility,
      confidence: cycle.confidence!,
      characteristics: {
        balanceSheetChange: balanceSheetChange * 100,
        reservesChange: reservesChange * 100,
        rateChange,
        marketImpact
      }
    };
  }

  /**
   * Trova pattern simili nella storia
   */
  findSimilarPatterns(currentData: FedData[], historicalCycles: PolicyCycle[]): PatternMatch[] {
    const matches: PatternMatch[] = [];
    
    if (currentData.length < 30) {
      return matches; // Need sufficient data
    }

    const currentPattern = this.extractPatternFeatures(currentData);

    for (const cycle of historicalCycles) {
      const similarity = this.calculatePatternSimilarity(currentPattern, cycle);
      
      if (similarity > 0.7) { // 70% similarity threshold
        matches.push({
          pattern: `${cycle.type}_${cycle.duration}d`,
          confidence: similarity * 100,
          historicalMatches: [cycle],
          expectedOutcome: {
            duration: cycle.duration || 0,
            magnitude: Math.abs(cycle.characteristics.balanceSheetChange),
            probability: similarity * 100
          }
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Estrae features da un pattern per il matching
   */
  private extractPatternFeatures(data: FedData[]): {
    trend: number;
    volatility: number;
    momentum: number;
    seasonality: number;
  } {
    const walclValues = data.map(d => d.walcl);
    const liquidityScores = data.map(d => d.liquidity_score || 50);

    // Trend (linear regression slope)
    const trend = this.calculateTrend(walclValues);
    
    // Volatility
    const volatility = this.calculateVolatility(liquidityScores);
    
    // Momentum (recent vs older data)
    const recentAvg = walclValues.slice(-10).reduce((sum, val) => sum + val, 0) / 10;
    const olderAvg = walclValues.slice(0, 10).reduce((sum, val) => sum + val, 0) / 10;
    const momentum = (recentAvg - olderAvg) / olderAvg;
    
    // Seasonality (simplified)
    const seasonality = this.calculateSeasonality(data);

    return { trend, volatility, momentum, seasonality };
  }

  /**
   * Calcola similarità tra pattern
   */
  private calculatePatternSimilarity(pattern1: any, cycle: PolicyCycle): number {
    // Simplified similarity calculation
    // In production, this would use more sophisticated ML techniques
    
    const trendSimilarity = 1 - Math.abs(pattern1.trend - (cycle.characteristics.balanceSheetChange / 100)) / 2;
    const volatilitySimilarity = 1 - Math.abs(pattern1.volatility - cycle.volatility) / 100;
    
    return (trendSimilarity + volatilitySimilarity) / 2;
  }

  /**
   * Rileva regime di liquidità corrente
   */
  detectLiquidityRegime(data: FedData[]): LiquidityRegime {
    if (data.length < 30) {
      throw new Error('Insufficient data for regime detection');
    }

    const recentData = data.slice(-30); // Last 30 days
    const liquidityScores = recentData.map(d => d.liquidity_score || 50);
    
    const avgScore = liquidityScores.reduce((sum, score) => sum + score, 0) / liquidityScores.length;
    const volatility = this.calculateVolatility(liquidityScores);
    const trend = this.calculateTrend(liquidityScores);

    // Classify regime
    let regime: LiquidityRegime['regime'];
    let confidence = 0;

    if (avgScore >= 80) {
      regime = 'ABUNDANT';
      confidence = Math.min(100, avgScore);
    } else if (avgScore >= 60) {
      regime = 'ADEQUATE';
      confidence = 80;
    } else if (avgScore >= 30) {
      regime = 'SCARCE';
      confidence = 70;
    } else {
      regime = 'CRISIS';
      confidence = Math.min(100, 100 - avgScore);
    }

    // Determine trend direction
    let trendDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
    if (trend > 0.5) trendDirection = 'UP';
    else if (trend < -0.5) trendDirection = 'DOWN';
    else trendDirection = 'SIDEWAYS';

    // Calculate market stress
    const yieldVolatility = this.calculateVolatility(recentData.map(d => d.us10y));
    const marketStress = Math.min(100, yieldVolatility * 50);

    // Transition probabilities (simplified)
    const transitionProbability: { [key: string]: number } = {};
    
    switch (regime) {
      case 'ABUNDANT':
        transitionProbability.ADEQUATE = 20;
        transitionProbability.SCARCE = 5;
        transitionProbability.CRISIS = 1;
        break;
      case 'ADEQUATE':
        transitionProbability.ABUNDANT = 15;
        transitionProbability.SCARCE = 25;
        transitionProbability.CRISIS = 5;
        break;
      case 'SCARCE':
        transitionProbability.ABUNDANT = 5;
        transitionProbability.ADEQUATE = 30;
        transitionProbability.CRISIS = 20;
        break;
      case 'CRISIS':
        transitionProbability.ABUNDANT = 1;
        transitionProbability.ADEQUATE = 10;
        transitionProbability.SCARCE = 40;
        break;
    }

    return {
      regime,
      confidence,
      duration: 30, // Current analysis window
      characteristics: {
        avgLiquidityScore: Math.round(avgScore),
        volatility: Math.round(volatility),
        trendDirection,
        marketStress: Math.round(marketStress)
      },
      transitionProbability
    };
  }

  /**
   * Calcola volatilità (standard deviation)
   */
  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Calcola trend (linear regression slope)
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squared indices

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    return slope;
  }

  /**
   * Calcola componente stagionale
   */
  private calculateSeasonality(data: FedData[]): number {
    // Simplified seasonality calculation
    const months = data.map(d => new Date(d.date).getMonth());
    const monthCounts = new Array(12).fill(0);
    
    months.forEach(month => monthCounts[month]++);
    
    const maxCount = Math.max(...monthCounts);
    const minCount = Math.min(...monthCounts);
    
    return maxCount > 0 ? (maxCount - minCount) / maxCount : 0;
  }
}

/**
 * Anomaly Detection per identificare eventi outlier
 */
export class AnomalyDetector {
  private readonly Z_SCORE_THRESHOLD = 2.5; // Standard deviations for anomaly

  /**
   * Rileva anomalie nei dati Fed
   */
  detectAnomalies(data: FedData[]): {
    date: string;
    type: 'BALANCE_SHEET' | 'RESERVES' | 'RATES' | 'LIQUIDITY';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    zScore: number;
    description: string;
  }[] {
    const anomalies: any[] = [];

    if (data.length < 30) return anomalies;

    // Check different metrics for anomalies
    const metrics = [
      { key: 'walcl', name: 'Balance Sheet', type: 'BALANCE_SHEET' },
      { key: 'wresbal', name: 'Reserves', type: 'RESERVES' },
      { key: 'us10y', name: 'Rates', type: 'RATES' },
      { key: 'liquidity_score', name: 'Liquidity Score', type: 'LIQUIDITY' }
    ];

    for (const metric of metrics) {
      const values = data.map(d => (d as any)[metric.key] || 0);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const std = Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
      );

      // Check each data point for anomalies
      for (let i = 0; i < data.length; i++) {
        const value = values[i];
        const zScore = std > 0 ? Math.abs(value - mean) / std : 0;

        if (zScore > this.Z_SCORE_THRESHOLD) {
          let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
          if (zScore > 4) severity = 'CRITICAL';
          else if (zScore > 3) severity = 'HIGH';
          else if (zScore > 2.5) severity = 'MEDIUM';
          else severity = 'LOW';

          anomalies.push({
            date: data[i].date,
            type: metric.type,
            severity,
            zScore: Math.round(zScore * 100) / 100,
            description: `${metric.name} anomaly: ${value.toFixed(2)} (${zScore.toFixed(1)}σ from mean)`
          });
        }
      }
    }

    return anomalies.sort((a, b) => b.zScore - a.zScore);
  }
}



