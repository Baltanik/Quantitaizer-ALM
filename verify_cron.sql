-- Query rapida per verificare che il cron job sia attivo

SELECT
  jobid,
  schedule,
  active,
  jobname,
  LEFT(command, 100) as command_preview
FROM cron.job
WHERE jobname = 'quantitaizer-fed-data-refresh';
