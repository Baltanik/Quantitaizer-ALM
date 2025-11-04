import { FedData } from '../../integrations/supabase/types';

export interface TrainingData {
  trainFeatures: number[][];
  trainTargets: number[][];
  valFeatures: number[][];
  valTargets: number[][];
  featureNames: string[];
  targetNames: string[];
}

export interface MLFeatures {
  // Balance sheet features
  walcl_normalized: number;
  walcl_delta_4w_normalized: number;
  walcl_rsi: number;
  walcl_macd: number;
  
  // Reserves features
  wresbal_normalized: number;
  wresbal_delta_4w_normalized: number;
  wresbal_percentile: number;
  
  // Market stress features
  us10y_normalized: number;
  us10y_delta_4w: number;
  us10y_volatility: number;
  sofr_iorb_spread: number;
  
  // Momentum features
  rrpontsyd_delta_4w_normalized: number;
  
  // Temporal features
  seasonality: number;
  fomc_proximity: number;
  day_of_week: number;
  month_of_year: number;
}

export class FedDataPreprocessor {
  private readonly LOOKBACK_WINDOW = 100; // Historical context for normalization

  /**
   * Prepara i dati per il training del modello ML
   * Implementa feature engineering avanzato con normalizzazione Z-score
   */
  async prepareTrainingData(historicalData: FedData[]): Promise<TrainingData> {
    console.log(`[ML] Preparing training data from ${historicalData.length} records`);
    
    // Sort data by date
    const sortedData = [...historicalData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Extract features and targets
    const features: number[][] = [];
    const targets: number[][] = [];

    for (let i = this.LOOKBACK_WINDOW; i < sortedData.length - 7; i++) {
      const currentData = sortedData[i];
      const historicalContext = sortedData.slice(i - this.LOOKBACK_WINDOW, i);
      const futureData = sortedData[i + 7]; // 7-day forward target

      // Skip if missing critical data
      if (!this.isValidDataPoint(currentData) || !this.isValidDataPoint(futureData)) {
        continue;
      }

      // Extract features
      const featureVector = this.extractFeatures(currentData, historicalContext);
      features.push(featureVector);

      // Extract targets (7-day forward prediction)
      const targetVector = this.extractTargets(currentData, futureData);
      targets.push(targetVector);
    }

    console.log(`[ML] Generated ${features.length} training samples`);

    // Train/validation split (80/20)
    const splitIndex = Math.floor(features.length * 0.8);
    
    return {
      trainFeatures: features.slice(0, splitIndex),
      trainTargets: targets.slice(0, splitIndex),
      valFeatures: features.slice(splitIndex),
      valTargets: targets.slice(splitIndex),
      featureNames: this.getFeatureNames(),
      targetNames: this.getTargetNames()
    };
  }

  /**
   * Estrae features engineered da un data point
   */
  private extractFeatures(current: FedData, historical: FedData[]): number[] {
    const features: number[] = [];

    // Balance Sheet Features (4 features) - SOLO DATI GREZZI E STATISTICHE PURE
    features.push(this.normalizeValue(current.walcl, historical.map(d => d.walcl)));
    features.push(this.normalizeValue(current.walcl_delta_4w || 0, historical.map(d => d.walcl_delta_4w || 0)));
    features.push(this.calculateVolatility(historical.slice(-14).map(d => d.walcl))); // Volatility instead of RSI
    features.push(this.calculateAcceleration(historical.map(d => d.walcl_delta_4w || 0))); // Acceleration instead of MACD

    // Reserves Features (3 features)
    features.push(this.normalizeValue(current.wresbal, historical.map(d => d.wresbal)));
    features.push(this.normalizeValue(current.wresbal_delta_4w || 0, historical.map(d => d.wresbal_delta_4w || 0)));
    features.push(this.calculatePercentile(current.wresbal, historical.map(d => d.wresbal)));

    // Market Stress Features (4 features)
    features.push(this.normalizeValue(current.us10y, historical.map(d => d.us10y)));
    features.push(current.us10y_delta_4w || 0);
    features.push(this.calculateVolatility(historical.slice(-10).map(d => d.us10y)));
    features.push(current.sofr_iorb_spread || 0);

    // Momentum Features (1 feature)
    features.push(this.normalizeValue(current.rrpontsyd_delta_4w || 0, historical.map(d => d.rrpontsyd_delta_4w || 0)));

    // Temporal Features (4 features)
    const date = new Date(current.date);
    features.push(this.getSeasonality(date));
    features.push(this.getFOMCProximity(date));
    features.push(date.getDay() / 6); // Day of week normalized
    features.push(date.getMonth() / 11); // Month normalized

    return features;
  }

  /**
   * Estrae targets per il training (7-day forward prediction)
   */
  private extractTargets(current: FedData, future: FedData): number[] {
    const targets: number[] = [];

    // Target 1: Future liquidity score (normalized 0-1)
    targets.push((future.liquidity_score || 50) / 100);

    // Target 2: Scenario change (binary)
    targets.push(current.scenario !== future.scenario ? 1 : 0);

    // Target 3: Direction of US10Y (binary)
    targets.push(future.us10y > current.us10y ? 1 : 0);

    // Target 4: Magnitude of change (normalized)
    const magnitudeChange = Math.abs(future.us10y - current.us10y) / current.us10y;
    targets.push(Math.min(1, magnitudeChange * 10)); // Cap at 1

    return targets;
  }

  /**
   * Z-score normalization
   */
  private normalizeValue(value: number, historical: number[]): number {
    const mean = historical.reduce((sum, val) => sum + val, 0) / historical.length;
    const std = Math.sqrt(
      historical.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historical.length
    );
    
    return std > 0 ? (value - mean) / std : 0;
  }

  /**
   * Calcola accelerazione (derivata seconda) - ALTERNATIVA PURA A MACD
   */
  private calculateAcceleration(deltas: number[]): number {
    if (deltas.length < 3) return 0;

    // Calcola la derivata seconda (accelerazione del trend)
    const recent = deltas.slice(-3);
    const acceleration = (recent[2] - recent[1]) - (recent[1] - recent[0]);
    
    // Normalizza per evitare valori estremi
    return Math.max(-1, Math.min(1, acceleration / 100000));
  }

  /**
   * Calcola percentile di un valore rispetto al dataset storico
   */
  private calculatePercentile(value: number, historical: number[]): number {
    const sorted = [...historical].sort((a, b) => a - b);
    const index = sorted.findIndex(val => val >= value);
    return index === -1 ? 1 : index / sorted.length;
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
   * Calcola componente stagionale (0-1)
   */
  private getSeasonality(date: Date): number {
    const dayOfYear = this.getDayOfYear(date);
    // Simple sine wave for seasonality
    return (Math.sin(2 * Math.PI * dayOfYear / 365) + 1) / 2;
  }

  /**
   * Calcola prossimità al prossimo meeting FOMC (0-1)
   */
  private getFOMCProximity(date: Date): number {
    // Simplified: assume FOMC meetings every 6 weeks
    const daysSinceEpoch = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
    const cyclePosition = (daysSinceEpoch % 42) / 42; // 6 weeks = 42 days
    
    // Return proximity to next meeting (closer = higher value)
    return 1 - Math.abs(cyclePosition - 0.5) * 2;
  }

  /**
   * Ottiene il giorno dell'anno (1-365)
   */
  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Verifica se un data point è valido per il training
   */
  private isValidDataPoint(data: FedData): boolean {
    return !!(
      data.walcl &&
      data.wresbal &&
      data.us10y &&
      data.date
    );
  }

  /**
   * Nomi delle features per debugging e interpretability
   */
  private getFeatureNames(): string[] {
    return [
      'walcl_normalized',
      'walcl_delta_4w_normalized', 
      'walcl_volatility',        // Changed from walcl_rsi
      'walcl_acceleration',      // Changed from walcl_macd
      'wresbal_normalized',
      'wresbal_delta_4w_normalized',
      'wresbal_percentile',
      'us10y_normalized',
      'us10y_delta_4w',
      'us10y_volatility',
      'sofr_iorb_spread',
      'rrpontsyd_delta_4w_normalized',
      'seasonality',
      'fomc_proximity',
      'day_of_week',
      'month_of_year'
    ];
  }

  /**
   * Nomi dei targets per debugging
   */
  private getTargetNames(): string[] {
    return [
      'future_liquidity_score',
      'scenario_change',
      'us10y_direction',
      'change_magnitude'
    ];
  }
}

/**
 * Utility per calcolare statistiche sui dati di training
 */
export class TrainingDataAnalyzer {
  static analyzeData(data: TrainingData): void {
    console.log('\n=== TRAINING DATA ANALYSIS ===');
    console.log(`Training samples: ${data.trainFeatures.length}`);
    console.log(`Validation samples: ${data.valFeatures.length}`);
    console.log(`Features: ${data.featureNames.length}`);
    console.log(`Targets: ${data.targetNames.length}`);

    // Feature statistics
    console.log('\n--- FEATURE STATISTICS ---');
    for (let i = 0; i < data.featureNames.length; i++) {
      const values = data.trainFeatures.map(sample => sample[i]);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const std = Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
      );
      
      console.log(`${data.featureNames[i]}: mean=${mean.toFixed(3)}, std=${std.toFixed(3)}`);
    }

    // Target statistics
    console.log('\n--- TARGET STATISTICS ---');
    for (let i = 0; i < data.targetNames.length; i++) {
      const values = data.trainTargets.map(sample => sample[i]);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      
      console.log(`${data.targetNames[i]}: mean=${mean.toFixed(3)}`);
    }
  }
}
