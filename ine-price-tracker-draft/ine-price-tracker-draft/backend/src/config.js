import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  storeBaseUrl: process.env.STORE_BASE_URL || 'https://demo.inelabteamdev.com',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  timeoutMs: Number(process.env.SCRAPE_TIMEOUT_MS || 15000),
  attempts: Number(process.env.SCRAPE_ATTEMPTS || 3),
  backoffMs: Number(process.env.BACKOFF_MS || 1000)
};

if (!config.supabaseUrl || !config.supabaseKey) {
  console.warn('Supabase environment variables are not configured. API calls requiring DB will fail.');
}
