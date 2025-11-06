-- Setup Real-Time API Keys in Vault
-- Data: 6 Novembre 2025

-- Marketdata.app API Key (per VIX e DXY real-time)
SELECT vault.create_secret('MARKETDATA_API_KEY', 'MmxqRk9lQ3o2TEZFekpVaW84UlY2dk05LVZnZnRtbW56cW4ta1FqcnN5az0');

-- Finnhub API Key (backup FX rates)
SELECT vault.create_secret('FINNHUB_API_KEY', 'd3hepfpr01qi2vu0k3q0d3hepfpr01qi2vu0k3qg');

-- Verifica secrets creati
SELECT name, created_at 
FROM vault.secrets 
WHERE name IN ('MARKETDATA_API_KEY', 'FINNHUB_API_KEY');

