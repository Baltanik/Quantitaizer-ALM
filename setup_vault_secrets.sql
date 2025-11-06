-- Setup Vault Secrets for Quantitaizer
-- Run this in Supabase SQL Editor or via psql

-- Enable vault extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vault WITH SCHEMA vault;

-- Add FRED API Key (missing secret causing the 500 error)
SELECT vault.create_secret('fae844cfb2f3f5bbaf82549a5656910d', 'FRED_API_KEY');

-- Add Supabase project URL (for cron job)
SELECT vault.create_secret('https://tolaojeqjcoskegelule.supabase.co', 'project_url');

-- Add service role key (for cron job authentication)
SELECT vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbGFvamVxamNvc2tlZ2VsdWxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjUzOSwiZXhwIjoyMDc3NTg4NTM5fQ.Y0xWNiSR3mTDxhN566I-cgloiQazBwg0HoFpDJT0_HE', 'service_key');

-- Verify all secrets are configured
SELECT 
  name,
  CASE 
    WHEN decrypted_secret IS NOT NULL THEN '✅ Configurato'
    ELSE '❌ Mancante'
  END as status,
  LENGTH(decrypted_secret) as secret_length
FROM vault.decrypted_secrets 
WHERE name IN ('FRED_API_KEY', 'project_url', 'service_key')
ORDER BY name;

-- Check cron job status
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN '✅ Attivo'
    ELSE '❌ Disattivato'
  END as status
FROM cron.job 
WHERE jobname = 'quantitaizer-fed-data-refresh';
