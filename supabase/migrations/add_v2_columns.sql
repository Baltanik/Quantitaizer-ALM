-- QUANTITAIZER V2 - Database Schema Update
-- Aggiunge colonne per Liquidity Score e Leading Indicators

-- Aggiungi nuove colonne alla tabella fed_data
ALTER TABLE fed_data 
ADD COLUMN IF NOT EXISTS tga DECIMAL, -- Treasury General Account
ADD COLUMN IF NOT EXISTS ig_spread DECIMAL, -- Investment Grade spread
ADD COLUMN IF NOT EXISTS liquidity_score INTEGER, -- Liquidity Score 0-100
ADD COLUMN IF NOT EXISTS liquidity_grade VARCHAR(5), -- Grade A+, A, B+, etc.
ADD COLUMN IF NOT EXISTS liquidity_trend VARCHAR(20), -- improving, stable, deteriorating
ADD COLUMN IF NOT EXISTS liquidity_confidence INTEGER, -- 0-100
ADD COLUMN IF NOT EXISTS leading_indicators JSONB; -- Leading indicators object

-- Aggiungi commenti per documentazione
COMMENT ON COLUMN fed_data.tga IS 'Treasury General Account balance (billions USD)';
COMMENT ON COLUMN fed_data.ig_spread IS 'Investment Grade credit spread (percentage points)';
COMMENT ON COLUMN fed_data.liquidity_score IS 'Quantitaizer Liquidity Score (0-100)';
COMMENT ON COLUMN fed_data.liquidity_grade IS 'Liquidity grade (A+, A, B+, B, C+, C, D)';
COMMENT ON COLUMN fed_data.liquidity_trend IS 'Liquidity trend direction';
COMMENT ON COLUMN fed_data.liquidity_confidence IS 'Confidence in liquidity score (0-100)';
COMMENT ON COLUMN fed_data.leading_indicators IS 'Leading indicators JSON object';

-- Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_fed_data_liquidity_score ON fed_data(liquidity_score);
CREATE INDEX IF NOT EXISTS idx_fed_data_liquidity_grade ON fed_data(liquidity_grade);
CREATE INDEX IF NOT EXISTS idx_fed_data_tga ON fed_data(tga);
CREATE INDEX IF NOT EXISTS idx_fed_data_ig_spread ON fed_data(ig_spread);

-- Crea vista per analisi V2
CREATE OR REPLACE VIEW fed_data_v2 AS
SELECT 
  *,
  -- Calcola componenti score se disponibili
  CASE 
    WHEN liquidity_score IS NOT NULL THEN
      json_build_object(
        'total', liquidity_score,
        'grade', liquidity_grade,
        'trend', liquidity_trend,
        'confidence', liquidity_confidence
      )
    ELSE NULL
  END as liquidity_summary,
  
  -- Estrai leading indicators principali
  CASE 
    WHEN leading_indicators IS NOT NULL THEN
      json_build_object(
        'overall_signal', leading_indicators->>'overall_signal',
        'credit_stress', (leading_indicators->>'credit_stress_index')::integer,
        'repo_risk', (leading_indicators->>'repo_spike_risk')::integer,
        'qt_pivot_prob', (leading_indicators->>'qt_pivot_probability')::integer
      )
    ELSE NULL
  END as leading_summary

FROM fed_data
ORDER BY date DESC;

-- Crea funzione per calcolare statistiche V2
CREATE OR REPLACE FUNCTION get_liquidity_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  avg_score DECIMAL,
  score_trend VARCHAR(20),
  grade_distribution JSONB,
  leading_signals JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_data AS (
    SELECT * FROM fed_data 
    WHERE date >= CURRENT_DATE - INTERVAL '1 day' * days_back
    AND liquidity_score IS NOT NULL
    ORDER BY date DESC
  ),
  score_stats AS (
    SELECT 
      AVG(liquidity_score) as avg_score,
      CASE 
        WHEN AVG(liquidity_score) FILTER (WHERE date >= CURRENT_DATE - 7) > 
             AVG(liquidity_score) FILTER (WHERE date < CURRENT_DATE - 7) + 3 
        THEN 'improving'
        WHEN AVG(liquidity_score) FILTER (WHERE date >= CURRENT_DATE - 7) < 
             AVG(liquidity_score) FILTER (WHERE date < CURRENT_DATE - 7) - 3 
        THEN 'deteriorating'
        ELSE 'stable'
      END as trend
    FROM recent_data
  ),
  grade_dist AS (
    SELECT json_object_agg(liquidity_grade, grade_count) as distribution
    FROM (
      SELECT liquidity_grade, COUNT(*) as grade_count
      FROM recent_data
      WHERE liquidity_grade IS NOT NULL
      GROUP BY liquidity_grade
    ) t
  ),
  leading_agg AS (
    SELECT json_build_object(
      'avg_credit_stress', AVG((leading_indicators->>'credit_stress_index')::integer),
      'avg_repo_risk', AVG((leading_indicators->>'repo_spike_risk')::integer),
      'avg_qt_pivot_prob', AVG((leading_indicators->>'qt_pivot_probability')::integer),
      'bullish_signals', COUNT(*) FILTER (WHERE leading_indicators->>'overall_signal' = 'bullish'),
      'bearish_signals', COUNT(*) FILTER (WHERE leading_indicators->>'overall_signal' = 'bearish')
    ) as signals
    FROM recent_data
    WHERE leading_indicators IS NOT NULL
  )
  
  SELECT 
    s.avg_score,
    s.trend,
    g.distribution,
    l.signals
  FROM score_stats s
  CROSS JOIN grade_dist g
  CROSS JOIN leading_agg l;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON fed_data_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_liquidity_stats TO anon, authenticated;
