// Chennai Express Supabase Config
// anon public key is safe for browser use when RLS policies are configured correctly.

const SUPABASE_URL = "https://gvibgyeallfkbwrkgkun.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2aWJneWVhbGxma2J3cmtna3VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTc4MjYsImV4cCI6MjA5Njc3MzgyNn0.tKRm1iwhrj0AlNc-VDwWIWJDwMco4WagVSlEDAVaPkI";

const ceSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.ceSupabase = ceSupabase;
