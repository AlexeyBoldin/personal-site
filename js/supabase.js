const SUPABASE_URL = "https://ofwmifxoqpapabbygujo.supabase.co";

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9md21pZnhvcXBhcGFiYnlndWpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0OTk4MDQsImV4cCI6MjEwMDA";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
