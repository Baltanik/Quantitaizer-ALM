-- Migration: Enable Automatic Fed Data Refresh
-- Date: 2025-11-04
-- Purpose: Setup pg_cron for automatic Fed data updates every 4 hours on weekdays

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Note: You must manually add secrets to Vault via SQL Editor or Supabase CLI:
-- 
-- For LOCAL development:
-- SELECT vault.create_secret('http://127.0.0.1:54321', 'project_url');
-- SELECT vault.create_secret('YOUR_SUPABASE_ANON_KEY', 'service_key');
--
-- For PRODUCTION (replace with your actual values):
-- SELECT vault.create_secret('https://your-project-ref.supabase.co', 'project_url');
-- SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_key');

-- Create cron job for automatic Fed data refresh
-- Schedule: Every 4 hours on weekdays (Mon-Fri) at 8:00, 12:00, 16:00, 20:00 UTC
-- This ensures data is fresh without hitting rate limits (4 calls/day vs 120/hour limit)
SELECT cron.schedule(
  'quantitaizer-fed-data-refresh',
  '0 8,12,16,20 * * 1-5',  -- Cron syntax: minute hour day month weekday
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/fetch-fed-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_key')
    ),
    body := jsonb_build_object(
      'triggered_by', 'cron',
      'timestamp', now()
    ),
    timeout_milliseconds := 120000  -- 2 minute timeout
  ) AS request_id;
  $$
);

-- Verify cron job was created
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job 
WHERE jobname = 'quantitaizer-fed-data-refresh';

-- Optional: Create a logging table for refresh history
CREATE TABLE IF NOT EXISTS public.fed_data_refresh_log (
  id BIGSERIAL PRIMARY KEY,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  trigger_source TEXT NOT NULL, -- 'cron' or 'manual'
  status TEXT, -- 'success', 'failed', 'timeout'
  error_message TEXT,
  duration_ms INTEGER,
  records_updated INTEGER
);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE public.fed_data_refresh_log ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to insert logs
CREATE POLICY "Service can insert refresh logs"
  ON public.fed_data_refresh_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Allow authenticated users to read logs
CREATE POLICY "Authenticated users can view refresh logs"
  ON public.fed_data_refresh_log
  FOR SELECT
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_refresh_log_triggered_at 
  ON public.fed_data_refresh_log(triggered_at DESC);

-- Create helper function to get last refresh info
CREATE OR REPLACE FUNCTION public.get_last_refresh_info()
RETURNS TABLE (
  last_data_date DATE,
  last_refresh_at TIMESTAMPTZ,
  hours_since_refresh NUMERIC,
  trigger_source TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT MAX(date)::DATE FROM fed_data) as last_data_date,
    (SELECT MAX(triggered_at) FROM fed_data_refresh_log) as last_refresh_at,
    ROUND(
      EXTRACT(EPOCH FROM (NOW() - (SELECT MAX(triggered_at) FROM fed_data_refresh_log))) / 3600,
      2
    ) as hours_since_refresh,
    (SELECT trigger_source FROM fed_data_refresh_log ORDER BY triggered_at DESC LIMIT 1) as trigger_source,
    (SELECT status FROM fed_data_refresh_log ORDER BY triggered_at DESC LIMIT 1) as status;
END;
$$;

COMMENT ON FUNCTION public.get_last_refresh_info() IS 
  'Returns information about the last Fed data refresh for UI display';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_last_refresh_info() TO authenticated;

