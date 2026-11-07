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
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);

  if (error || !user) {
    throw new Error('UNAUTHORIZED');
  }

  // Resolve (or create) the single canonical workspace for this owner.
  const { data: workspaceId, error: wsError } = await client.rpc(
    'get_or_create_v2_workspace'
  );

  if (wsError || !workspaceId) {
    throw new Error('WORKSPACE_UNAVAILABLE');
  }

  return { userId: user.id, workspaceId, client };
}