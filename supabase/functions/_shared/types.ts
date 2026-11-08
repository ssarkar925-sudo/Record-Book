// Shared types for Record Book V2 Edge Functions.
// Edge Functions are deployed by `supabase/functions/<name>/index.ts` and run
// on the Supabase Edge runtime (Deno). They are the server-side layer the
// frontend calls instead of hitting Supabase client tables directly.

export type SphereScope = 'business' | 'personal' | 'family';

export interface HealthResponse {
  application: string;
  version: string;
  themePosture: string;
  stack: string[];
  schemaTables: string[];
  status: 'healthy' | 'degraded';
  timestamp: string;
  runtime: 'supabase-edge';
}

export interface ReconcileRequest {
  remoteRecords: Array<{
    id: string;
    workspace_id: string;
    updated_at: string;
  }>;
  localRecords: Array<{
    id: string;
    workspace_id: string;
    updated_at: string;
  }>;
  confirmedCloudIds: string[];
  deletedTombstoneIds: string[];
  canonicalWorkspaceId: string;
}

export interface ReconcileResponse {
  merged: Array<{ id: string; workspace_id: string; updated_at: string }>;
  toUpsertToCloud: string[];
  toDeleteFromCloud: string[];
  nextConfirmedCloudIds: string[];
}

export interface SummaryRequest {
  accounts: Array<{ balance_paise: number; scope: SphereScope }>;
  entries: Array<{ entry_type: string; amount_paise: number; scope: SphereScope }>;
  dues: Array<{
    direction: 'receivable' | 'payable';
    total_amount_paise: number;
    paid_amount_paise: number;
    status: string;
    scope: SphereScope;
  }>;
  cards: Array<{ credit_limit_paise: number; utilized_paise: number; scope: SphereScope }>;
  scope?: 'all' | SphereScope;
}

export interface SummaryResponse {
  liquidCashPaise: number;
  totalReceivablePaise: number;
  totalPayablePaise: number;
  cardUtilizedPaise: number;
  cardLimitPaise: number;
  totalIncomePaise: number;
  totalExpensePaise: number;
  netWorthPaise: number;
  computedAt: string;
}

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

export function ok<T>(data: T, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...init.headers,
    },
  });
}

export function err(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}