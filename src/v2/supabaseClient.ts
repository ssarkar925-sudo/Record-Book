import { createClient, SupabaseClient } from '@supabase/supabase-js';

function resolveSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (
    envUrl &&
    envUrl.startsWith('https://') &&
    !envUrl.includes('your-project-ref')
  ) {
    return envUrl;
  }
  return 'https://xelxvojazyscbounzajs.supabase.co';
}

function resolveSupabaseKey(): string {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (envKey && !envKey.includes('your-anon-key')) {
    return envKey;
  }
  return 'sb_publishable_1BG03u4BQDYfpV3nw99WKw_z0qen4Gi';
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseV2Client(): {
  client: SupabaseClient;
  isConfigured: boolean;
} {
  const url = resolveSupabaseUrl();
  const key = resolveSupabaseKey();
  const isConfigured = Boolean(url && key);

  if (!cachedClient) {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return {
    client: cachedClient,
    isConfigured,
  };
}
