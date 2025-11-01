-- Aggiungi colonne per il sistema di qualificazione scenari
-- Nuovi indicatori di mercato
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS vix DECIMAL(10, 5);
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS hy_oas DECIMAL(10, 5);
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS t10y3m DECIMAL(10, 5);
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS dxy_broad DECIMAL(10, 5);

-- Delta a 4 settimane per trend analysis
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS d_walcl_4w DECIMAL(15, 2);
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS d_wresbal_4w DECIMAL(15, 2);
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS d_rrpontsyd_4w DECIMAL(15, 2);
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS d_t10y3m_4w DECIMAL(10, 5);
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS d_dxy_4w DECIMAL(10, 5);

-- Qualificatori scenario
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS context VARCHAR(50);
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS sustainability VARCHAR(50);
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS risk_level VARCHAR(50);
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS confidence VARCHAR(50);
ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS drivers TEXT[];

-- Commenti per documentazione
COMMENT ON COLUMN fed_data.vix IS 'VIX Volatility Index';
COMMENT ON COLUMN fed_data.hy_oas IS 'High Yield Option Adjusted Spread';
COMMENT ON COLUMN fed_data.t10y3m IS '10Y-3M Treasury Yield Spread';
COMMENT ON COLUMN fed_data.dxy_broad IS 'Dollar Index Broad';
COMMENT ON COLUMN fed_data.context IS 'stress_driven | growth_driven | ambiguous';
COMMENT ON COLUMN fed_data.sustainability IS 'low | medium | high';
COMMENT ON COLUMN fed_data.risk_level IS 'normal | elevated | high';
COMMENT ON COLUMN fed_data.confidence IS 'low | medium | high';
COMMENT ON COLUMN fed_data.drivers IS 'Array of key scenario drivers';
