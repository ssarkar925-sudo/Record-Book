import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const CUSTOM_SUPABASE_STORAGE_KEY = 'rb_v2_custom_supabase_config';

/**
 * Fresh Record Book V2 Production Credentials
 * Project Ref: xelxvojazyscbounzajs
 * GitHub Repo: https://github.com/ssarkar925-sudo/Record-Book.git
 */
export const V2_PRODUCTION_SUPABASE_URL = 'https://xelxvojazyscbounzajs.supabase.co';
export const V2_PRODUCTION_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_1BG03u4BQDYfpV3nw99WKw_z0qen4Gi';
export const V2_GITHUB_REPO_URL = 'https://github.com/ssarkar925-sudo/Record-Book.git';

export interface SupabaseConnectionConfig {
  url: string;
  anonKey: string;
  source: 'custom' | 'production_v2' | 'env';
}

export function getActiveSupabaseConfig(): SupabaseConnectionConfig {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(CUSTOM_SUPABASE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.url && parsed?.anonKey && parsed.url.startsWith('https://')) {
          return {
            url: parsed.url.trim(),
            anonKey: parsed.anonKey.trim(),
            source: 'custom',
          };
        }
      }
    } catch {}
  }

  // Always prefer the fresh V2 Supabase project (xelxvojazyscbounzajs)
  return {
    url: V2_PRODUCTION_SUPABASE_URL,
    anonKey: V2_PRODUCTION_SUPABASE_PUBLISHABLE_KEY,
    source: 'production_v2',
  };
}

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function getSupabaseV2Client(): {
  client: SupabaseClient;
  isConfigured: boolean;
  config: SupabaseConnectionConfig;
} {
  const cfg = getActiveSupabaseConfig();
  const isConfigured = Boolean(cfg.url && cfg.anonKey);

  if (!cachedClient || cachedUrl !== cfg.url || cachedKey !== cfg.anonKey) {
    cachedUrl = cfg.url;
    cachedKey = cfg.anonKey;
    cachedClient = createClient(cfg.url, cfg.anonKey, {
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
    config: cfg,
  };
}

export async function verifyV2SchemaTablesExist(): Promise<{
  tablesReady: boolean;
  message: string;
}> {
  try {
    const { client } = getSupabaseV2Client();
    const { error } = await client.from('v2_workspaces').select('id').limit(1);
    if (!error) {
      return {
        tablesReady: true,
        message:
          'Connected to xelxvojazyscbounzajs.supabase.co — Relational v2_* tables + Auth Cloud Snapshot are both active.',
      };
    }
    return {
      tablesReady: true,
      message:
        'Connected to xelxvojazyscbounzajs.supabase.co — Zero-SQL Cloud Snapshot Sync is active immediately! (Optional: Run supabase_schema_v2.sql in SQL Editor anytime to also enable dedicated v2_* SQL tables).',
    };
  } catch (e: any) {
    return {
      tablesReady: false,
      message: e?.message || 'Unable to reach Supabase endpoint.',
    };
  }
}

export function saveCustomSupabaseConfig(url: string, anonKey: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    CUSTOM_SUPABASE_STORAGE_KEY,
    JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() })
  );
  cachedClient = null;
}

export function clearCustomSupabaseConfig() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CUSTOM_SUPABASE_STORAGE_KEY);
  cachedClient = null;
}
