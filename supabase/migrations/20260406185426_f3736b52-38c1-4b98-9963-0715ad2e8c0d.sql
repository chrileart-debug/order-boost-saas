SELECT cron.schedule(
  'expire-trials-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vneumrbaohyzmuhibwzc.supabase.co/functions/v1/expire-trials',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZXVtcmJhb2h5em11aGlid3pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODYwMjksImV4cCI6MjA5MDA2MjAyOX0.B-QIXavGBpwNJK5nLZ5F2W_EelnQttMaLhrBbPPI-38"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);