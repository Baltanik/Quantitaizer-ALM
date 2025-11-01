-- Questo SQL query mostra come forzare il ricalcolo
-- VAI SU SUPABASE SQL EDITOR e esegui:

UPDATE fed_data 
SET scenario = CASE
  WHEN walcl > 8000000 AND wresbal > 4000 THEN 'qe'
  WHEN walcl > 6500000 AND sofr_iorb_spread < 0.20 AND wresbal > 2500 THEN 'stealth_qe'
  WHEN walcl < 6500000 AND sofr_iorb_spread > 0.25 THEN 'qt'
  ELSE 'neutral'
END
WHERE date >= '2025-01-01';
