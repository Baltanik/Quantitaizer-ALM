import { supabase } from "@/integrations/supabase/client";

/**
 * QUANTITAIZER V2 - DATABASE MIGRATION UTILITY
 * 
 * Esegue la migrazione del database per aggiungere le colonne V2
 */

export async function migrateToV2(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔄 Starting V2 database migration...');

    // Step 1: Try to add columns one by one using raw SQL
    const migrations = [
      'ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS tga DECIMAL',
      'ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS ig_spread DECIMAL', 
      'ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS liquidity_score INTEGER',
      'ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS liquidity_grade VARCHAR(5)',
      'ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS liquidity_trend VARCHAR(20)',
      'ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS liquidity_confidence INTEGER',
      'ALTER TABLE fed_data ADD COLUMN IF NOT EXISTS leading_indicators JSONB'
    ];

    console.log('📊 Adding V2 columns...');
    
    // Try to execute migrations via RPC if available
    for (const migration of migrations) {
      try {
        console.log(`Executing: ${migration}`);
        
        // Try using the SQL editor approach
        const { error } = await supabase.rpc('exec_sql', { sql: migration });
        
        if (error) {
          console.warn(`RPC failed for: ${migration}`, error);
        } else {
          console.log(`✅ Success: ${migration}`);
        }
      } catch (err) {
        console.warn(`Exception for: ${migration}`, err);
      }
    }

    // Step 2: Verify columns exist by trying to select them
    console.log('🔍 Verifying V2 columns...');
    
    const { data: testData, error: testError } = await supabase
      .from('fed_data')
      .select('id, tga, ig_spread, liquidity_score, liquidity_grade, liquidity_trend, liquidity_confidence, leading_indicators')
      .limit(1);

    if (testError) {
      console.error('❌ V2 columns not available:', testError);
      return {
        success: false,
        message: `Migration incomplete. Error: ${testError.message}. Please run the SQL manually in Supabase dashboard.`
      };
    }

    console.log('✅ V2 columns verified successfully');

    // Step 3: Trigger data fetch to populate V2 fields
    console.log('🔄 Triggering Fed data fetch to populate V2 fields...');
    
    const { error: fetchError } = await supabase.functions.invoke('fetch-fed-data');
    
    if (fetchError) {
      console.warn('⚠️ Could not trigger automatic data fetch:', fetchError);
    } else {
      console.log('✅ Data fetch triggered successfully');
    }

    return {
      success: true,
      message: 'V2 migration completed successfully! Refresh the page to see new features.'
    };

  } catch (error) {
    console.error('❌ Migration error:', error);
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check if V2 features are available
 */
export async function checkV2Availability(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('fed_data')
      .select('liquidity_score')
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
}

/**
 * Manual SQL for user to run in Supabase dashboard
 */
export const MANUAL_MIGRATION_SQL = `
-- QUANTITAIZER V2 - Manual Migration SQL
-- Copy and paste this in your Supabase SQL Editor

-- Add V2 columns
ALTER TABLE fed_data 
ADD COLUMN IF NOT EXISTS tga DECIMAL,
ADD COLUMN IF NOT EXISTS ig_spread DECIMAL,
ADD COLUMN IF NOT EXISTS liquidity_score INTEGER,
ADD COLUMN IF NOT EXISTS liquidity_grade VARCHAR(5),
ADD COLUMN IF NOT EXISTS liquidity_trend VARCHAR(20),
ADD COLUMN IF NOT EXISTS liquidity_confidence INTEGER,
ADD COLUMN IF NOT EXISTS leading_indicators JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_fed_data_liquidity_score ON fed_data(liquidity_score);
CREATE INDEX IF NOT EXISTS idx_fed_data_liquidity_grade ON fed_data(liquidity_grade);
CREATE INDEX IF NOT EXISTS idx_fed_data_tga ON fed_data(tga);
CREATE INDEX IF NOT EXISTS idx_fed_data_ig_spread ON fed_data(ig_spread);

-- Verify migration
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'fed_data' 
AND column_name IN ('tga', 'ig_spread', 'liquidity_score', 'liquidity_grade', 'liquidity_trend', 'liquidity_confidence', 'leading_indicators');
`;
