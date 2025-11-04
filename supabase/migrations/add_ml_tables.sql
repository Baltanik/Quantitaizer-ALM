-- Migration: Add ML prediction tables for Phase 2
-- Created: 2024-11-02
-- Description: Tables per storing ML predictions, pattern analysis, and model metadata

-- Table for ML predictions
CREATE TABLE IF NOT EXISTS ml_predictions (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  prediction_horizon INTEGER NOT NULL DEFAULT 7, -- days ahead
  predicted_score INTEGER CHECK (predicted_score >= 0 AND predicted_score <= 100),
  predicted_scenario VARCHAR(50),
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1), -- 0-1 scale
  scenario_change_probability DECIMAL(3,2) DEFAULT 0,
  direction_probability DECIMAL(3,2) DEFAULT 0.5,
  features_used JSONB,
  model_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(date, model_version, prediction_horizon)
);

-- Table for pattern analysis results
CREATE TABLE IF NOT EXISTS pattern_analysis (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  analysis_type VARCHAR(50) NOT NULL, -- 'REGIME', 'CYCLE', 'ANOMALY'
  regime VARCHAR(20), -- 'ABUNDANT', 'ADEQUATE', 'SCARCE', 'CRISIS'
  regime_confidence DECIMAL(3,2),
  detected_cycles INTEGER DEFAULT 0,
  cycle_metadata JSONB,
  anomalies JSONB,
  similar_patterns JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(date, analysis_type)
);

-- Table for model performance tracking
CREATE TABLE IF NOT EXISTS model_performance (
  id SERIAL PRIMARY KEY,
  model_version VARCHAR(50) NOT NULL,
  training_date DATE NOT NULL,
  validation_accuracy DECIMAL(5,4),
  validation_loss DECIMAL(8,6),
  test_accuracy DECIMAL(5,4),
  test_loss DECIMAL(8,6),
  training_samples INTEGER,
  validation_samples INTEGER,
  features_count INTEGER,
  model_config JSONB,
  performance_metrics JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table for market correlations (Phase 3 prep)
CREATE TABLE IF NOT EXISTS market_correlations (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  asset_pair VARCHAR(50) NOT NULL, -- e.g., 'BTC_LIQUIDITY', 'SPY_LIQUIDITY'
  correlation DECIMAL(5,4) CHECK (correlation >= -1 AND correlation <= 1),
  significance DECIMAL(5,4),
  regime VARCHAR(20),
  window_days INTEGER DEFAULT 30,
  correlation_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(date, asset_pair, window_days)
);

-- Add ML-related columns to existing fed_data table
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS ml_prediction_score INTEGER;
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS ml_confidence INTEGER;
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS ml_regime VARCHAR(20);
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS ml_updated_at TIMESTAMP;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ml_predictions_date ON ml_predictions(date DESC);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_model ON ml_predictions(model_version, date DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_analysis_date ON pattern_analysis(date DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_analysis_type ON pattern_analysis(analysis_type, date DESC);
CREATE INDEX IF NOT EXISTS idx_model_performance_version ON model_performance(model_version, training_date DESC);
CREATE INDEX IF NOT EXISTS idx_market_correlations_date ON market_correlations(date DESC);
CREATE INDEX IF NOT EXISTS idx_market_correlations_pair ON market_correlations(asset_pair, date DESC);
CREATE INDEX IF NOT EXISTS idx_fed_data_ml_updated ON fed_data(ml_updated_at DESC) WHERE ml_updated_at IS NOT NULL;

-- Views for easy querying
CREATE OR REPLACE VIEW latest_ml_predictions AS
SELECT DISTINCT ON (model_version) 
  *
FROM ml_predictions 
ORDER BY model_version, date DESC, created_at DESC;

CREATE OR REPLACE VIEW latest_pattern_analysis AS
SELECT DISTINCT ON (analysis_type)
  *
FROM pattern_analysis
ORDER BY analysis_type, date DESC, created_at DESC;

CREATE OR REPLACE VIEW ml_enhanced_fed_data AS
SELECT 
  f.*,
  p.predicted_score,
  p.predicted_scenario,
  p.confidence as ml_confidence_decimal,
  pa.regime as pattern_regime,
  pa.regime_confidence
FROM fed_data f
LEFT JOIN LATERAL (
  SELECT * FROM ml_predictions mp 
  WHERE mp.date = f.date 
  ORDER BY created_at DESC 
  LIMIT 1
) p ON true
LEFT JOIN LATERAL (
  SELECT * FROM pattern_analysis pa 
  WHERE pa.date = f.date AND pa.analysis_type = 'REGIME'
  ORDER BY created_at DESC 
  LIMIT 1
) pa ON true
ORDER BY f.date DESC;

-- Function to calculate prediction accuracy
CREATE OR REPLACE FUNCTION calculate_prediction_accuracy(
  model_version_param VARCHAR(50),
  days_back INTEGER DEFAULT 30
) RETURNS TABLE (
  model_version VARCHAR(50),
  total_predictions INTEGER,
  correct_predictions INTEGER,
  accuracy_percentage DECIMAL(5,2),
  avg_confidence DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.model_version,
    COUNT(*)::INTEGER as total_predictions,
    COUNT(CASE 
      WHEN ABS(p.predicted_score - COALESCE(f.liquidity_score, 50)) <= 10 
      THEN 1 
    END)::INTEGER as correct_predictions,
    ROUND(
      (COUNT(CASE 
        WHEN ABS(p.predicted_score - COALESCE(f.liquidity_score, 50)) <= 10 
        THEN 1 
      END)::DECIMAL / COUNT(*)) * 100, 
      2
    ) as accuracy_percentage,
    ROUND(AVG(p.confidence) * 100, 2) as avg_confidence
  FROM ml_predictions p
  LEFT JOIN fed_data f ON f.date = p.date + INTERVAL '7 days' -- 7-day forward prediction
  WHERE p.model_version = model_version_param
    AND p.date >= CURRENT_DATE - INTERVAL '1 day' * days_back
    AND f.date IS NOT NULL -- Only include predictions where we have actual data
  GROUP BY p.model_version;
END;
$$ LANGUAGE plpgsql;

-- Function to get regime transition probabilities
CREATE OR REPLACE FUNCTION get_regime_transitions(
  days_back INTEGER DEFAULT 90
) RETURNS TABLE (
  from_regime VARCHAR(20),
  to_regime VARCHAR(20),
  transition_count INTEGER,
  transition_probability DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH regime_changes AS (
    SELECT 
      regime as current_regime,
      LAG(regime) OVER (ORDER BY date) as previous_regime,
      date
    FROM pattern_analysis 
    WHERE analysis_type = 'REGIME' 
      AND date >= CURRENT_DATE - INTERVAL '1 day' * days_back
      AND regime IS NOT NULL
    ORDER BY date
  ),
  transitions AS (
    SELECT 
      previous_regime as from_regime,
      current_regime as to_regime,
      COUNT(*) as transition_count
    FROM regime_changes
    WHERE previous_regime IS NOT NULL 
      AND previous_regime != current_regime
    GROUP BY previous_regime, current_regime
  ),
  total_transitions AS (
    SELECT from_regime, SUM(transition_count) as total_from_regime
    FROM transitions
    GROUP BY from_regime
  )
  SELECT 
    t.from_regime,
    t.to_regime,
    t.transition_count,
    ROUND((t.transition_count::DECIMAL / tt.total_from_regime) * 100, 2) as transition_probability
  FROM transitions t
  JOIN total_transitions tt ON tt.from_regime = t.from_regime
  ORDER BY t.from_regime, transition_probability DESC;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update ml_updated_at when ML columns change
CREATE OR REPLACE FUNCTION update_ml_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.ml_prediction_score IS DISTINCT FROM NEW.ml_prediction_score OR
      OLD.ml_confidence IS DISTINCT FROM NEW.ml_confidence OR
      OLD.ml_regime IS DISTINCT FROM NEW.ml_regime) THEN
    NEW.ml_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ml_timestamp
  BEFORE UPDATE ON fed_data
  FOR EACH ROW
  EXECUTE FUNCTION update_ml_timestamp();

-- Comments for documentation
COMMENT ON TABLE ml_predictions IS 'Stores ML model predictions for Fed liquidity analysis';
COMMENT ON TABLE pattern_analysis IS 'Stores pattern recognition and regime analysis results';
COMMENT ON TABLE model_performance IS 'Tracks ML model training and validation metrics';
COMMENT ON TABLE market_correlations IS 'Stores cross-asset correlation analysis (Phase 3)';

COMMENT ON COLUMN ml_predictions.prediction_horizon IS 'Number of days ahead the prediction is for';
COMMENT ON COLUMN ml_predictions.confidence IS 'Model confidence score (0-1 scale)';
COMMENT ON COLUMN pattern_analysis.regime IS 'Current liquidity regime classification';
COMMENT ON COLUMN pattern_analysis.cycle_metadata IS 'JSON metadata about detected policy cycles';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON ml_predictions TO authenticated;
-- GRANT SELECT, INSERT, UPDATE ON pattern_analysis TO authenticated;
-- GRANT SELECT ON model_performance TO authenticated;
-- GRANT SELECT ON market_correlations TO authenticated;



