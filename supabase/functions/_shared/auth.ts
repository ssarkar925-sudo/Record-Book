// Auth + workspace resolution for Edge Functions.
// Every mutating function must resolve the caller's canonical workspace via
// get_or_create_v2_workspace() so Web and Mobile always share one row.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

export interface AuthContext {
  userId: string;
  workspaceId: string;
  client: ReturnType<typeof createClient>;
}

export async function getAuthContext(req: Request): Promise<AuthContext> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);

  if (error || !user) {
    throw new Error('UNAUTHORIZED');
  }

  // Resolve (or create) the single canonical workspace for this owner.
  let resolvedWsId: string | null = null;
  const { data: rpcData, error: wsError } = await client.rpc(
    'get_or_create_v2_workspace'
  );

  if (!wsError && rpcData) {
    resolvedWsId = typeof rpcData === 'object' && rpcData !== null && 'id' in rpcData
      ? (rpcData as any).id
      : (typeof rpcData === 'string' ? rpcData : null);
  }

  // Fallback to direct query if RPC returned non-standard format
  if (!resolvedWsId) {
    const { data: wsRows } = await client
      .from('v2_workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1);
    if (wsRows && wsRows[0]?.id) {
      resolvedWsId = wsRows[0].id;
    }
  }

  if (!resolvedWsId) {
    throw new Error('WORKSPACE_UNAVAILABLE');
  }

  return { userId: user.id, workspaceId: resolvedWsId, client };
}