-- ==========================================
-- HOTFIX CRITICO V1: ADD EFFR
-- Data: 2025-11-04
-- Severity: HIGH - Missing critical money market data
-- ==========================================

-- Step 1: Add EFFR column (nullable = safe, non-breaking)
ALTER TABLE public.fed_data 
ADD COLUMN IF NOT EXISTS effr DECIMAL(10, 5);

-- Step 2: Add SOFR-EFFR spread column
ALTER TABLE public.fed_data
ADD COLUMN IF NOT EXISTS sofr_effr_spread DECIMAL(10, 5);

-- Step 3: Add EFFR-IORB spread column (optional, for completeness)
ALTER TABLE public.fed_data
ADD COLUMN IF NOT EXISTS effr_iorb_spread DECIMAL(10, 5);

-- Step 4: Comments for documentation
COMMENT ON COLUMN public.fed_data.effr IS 
'Effective Federal Funds Rate (DFF) - Volume-weighted average of unsecured fed funds transactions. HOTFIX added 2025-11-04';

COMMENT ON COLUMN public.fed_data.sofr_effr_spread IS 
'SOFR - EFFR spread in decimal (0.10 = 10bps) - Money market stress indicator. Measures credit risk premium between secured and unsecured rates. HOTFIX added 2025-11-04';

COMMENT ON COLUMN public.fed_data.effr_iorb_spread IS 
'EFFR - IORB spread in decimal - Fed floor effectiveness indicator. Measures how well Fed controls fed funds rate. HOTFIX added 2025-11-04';

-- Step 5: Validation constraints (reasonable range checks)
ALTER TABLE public.fed_data
ADD CONSTRAINT effr_range CHECK (effr IS NULL OR (effr >= 0 AND effr <= 10));

ALTER TABLE public.fed_data
ADD CONSTRAINT sofr_effr_spread_range CHECK (sofr_effr_spread IS NULL OR (sofr_effr_spread >= -0.5 AND sofr_effr_spread <= 0.5));

ALTER TABLE public.fed_data
ADD CONSTRAINT effr_iorb_spread_range CHECK (effr_iorb_spread IS NULL OR (effr_iorb_spread >= -0.5 AND effr_iorb_spread <= 0.5));

-- Step 6: Index for performance (optional)
CREATE INDEX IF NOT EXISTS idx_fed_data_effr ON public.fed_data(effr) WHERE effr IS NOT NULL;

-- Step 7: Verification query (comment out before running)
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'fed_data' 
-- AND column_name IN ('effr', 'sofr_effr_spread', 'effr_iorb_spread');

-- Expected result:
-- effr | numeric | YES | null
-- sofr_effr_spread | numeric | YES | null
-- effr_iorb_spread | numeric | YES | null

-- ==========================================
-- MIGRATION SAFE: 
-- - All columns nullable (non-breaking)
-- - Existing data unchanged
-- - Rollback: Keep columns (no impact)
-- ==========================================

