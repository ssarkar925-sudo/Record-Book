// Edge Functions API Client for Record Book V2
// All data operations route through Supabase Edge Functions (Deno runtime)
// instead of direct Supabase client table access.

import type {
  V2Account,
  V2LedgerEntry,
  V2PartyDue,
  V2CreditCard,
  V2Sheet,
  V2Note,
  V2VaultItem,
  SphereScope,
} from '@/types/v2';

// Edge Function base URL - deployed functions at /functions/v1/<name>
// In production: https://<project-ref>.supabase.co/functions/v1/<name>
// In local dev: http://127.0.0.1:54321/functions/v1/<name>
function getEdgeBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (envUrl && !envUrl.includes('your-project-ref')) {
    return `${envUrl.replace(/\/$/, '')}/functions/v1`;
  }
  // Keep the Edge Function endpoint aligned with the production client
  // fallback. Browsers on Vercel cannot reach a visitor's localhost.
  return 'https://xelxvojazyscbounzajs.supabase.co/functions/v1';
}

import { getSupabaseV2Client } from '@/v2/supabaseClient';

async function getAuthToken(): Promise<string | null> {
  const { client, isConfigured } = getSupabaseV2Client();
  if (!isConfigured) return null;
  const { data: { session } } = await client.auth.getSession();
  return session?.access_token ?? null;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

async function edgeRequest<T>(functionName: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...init } = options;
  const baseUrl = getEdgeBaseUrl();
  const url = new URL(`${baseUrl}/${functionName}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const token = await getAuthToken();
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  const response = await fetch(url.toString(), {
    ...init,
    headers: requestHeaders,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Edge Function ${functionName} failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

// ============ Accounts ============
export const accountsApi = {
  list: (scope?: 'all' | SphereScope) =>
    edgeRequest<V2Account[]>('accounts', { method: 'GET', params: scope ? { scope } : {} }),

  get: (id: string) =>
    edgeRequest<V2Account>('accounts', { method: 'GET', params: { id } }),

  create: (data: Omit<V2Account, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) =>
    edgeRequest<V2Account>('accounts', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, patch: Partial<V2Account>) =>
    edgeRequest<V2Account>('accounts', { method: 'PATCH', body: JSON.stringify({ id, ...patch }) }),

  delete: (id: string) =>
    edgeRequest<{ deleted: string }>('accounts', { method: 'DELETE', params: { id } }),
};

// ============ Ledger Entries ============
export const ledgerApi = {
  list: (scope?: 'all' | SphereScope, limit = 200) =>
    edgeRequest<V2LedgerEntry[]>('ledger', { method: 'GET', params: { scope: scope || 'all', limit: String(limit) } }),

  create: (data: Omit<V2LedgerEntry, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) =>
    edgeRequest<V2LedgerEntry>('ledger', { method: 'POST', body: JSON.stringify(data) }),

  delete: (id: string) =>
    edgeRequest<{ deleted: string }>('ledger', { method: 'DELETE', params: { id } }),
};

// ============ Dues (Parties) ============
export const duesApi = {
  list: (scope?: 'all' | SphereScope) =>
    edgeRequest<V2PartyDue[]>('dues', { method: 'GET', params: scope ? { scope } : {} }),

  create: (data: Omit<V2PartyDue, 'id' | 'workspace_id' | 'created_at' | 'updated_at' | 'status'>) =>
    edgeRequest<V2PartyDue>('dues', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, patch: Partial<V2PartyDue>) =>
    edgeRequest<V2PartyDue>('dues', { method: 'PATCH', body: JSON.stringify({ id, ...patch }) }),

  settle: (data: { due_id: string; pay_amount_paise: number; account_id: string; payment_mode: 'cash' | 'upi' | 'bank' | 'card'; remark?: string; skip_ledger?: boolean }) =>
    edgeRequest<V2PartyDue>('dues', { method: 'POST', params: { action: 'settle' }, body: JSON.stringify(data) }),

  delete: (id: string) =>
    edgeRequest<{ deleted: string }>('dues', { method: 'DELETE', params: { id } }),
};

// ============ Credit Cards ============
export const creditCardsApi = {
  list: (scope?: 'all' | SphereScope) =>
    edgeRequest<V2CreditCard[]>('credit-cards', { method: 'GET', params: scope ? { scope } : {} }),

  create: (data: Omit<V2CreditCard, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) =>
    edgeRequest<V2CreditCard>('credit-cards', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, patch: Partial<V2CreditCard>) =>
    edgeRequest<V2CreditCard>('credit-cards', { method: 'PATCH', body: JSON.stringify({ id, ...patch }) }),

  spend: (data: { card_id: string; amount_paise: number; category: string; note?: string; payment_mode?: 'cash' | 'upi' | 'bank' | 'card'; account_id?: string; entry_date?: string; skip_ledger?: boolean }) =>
    edgeRequest<V2CreditCard>('credit-cards', { method: 'POST', params: { action: 'spend' }, body: JSON.stringify(data) }),

  payBill: (data: { card_id: string; amount_paise: number; account_id: string; payment_mode?: 'cash' | 'upi' | 'bank' | 'card'; note?: string; entry_date?: string; skip_ledger?: boolean }) =>
    edgeRequest<V2CreditCard>('credit-cards', { method: 'POST', params: { action: 'pay_bill' }, body: JSON.stringify(data) }),

  delete: (id: string) =>
    edgeRequest<{ deleted: string }>('credit-cards', { method: 'DELETE', params: { id } }),
};

// ============ Sheets (Registers) ============
export const sheetsApi = {
  list: (scope?: 'all' | SphereScope) =>
    edgeRequest<V2Sheet[]>('sheets', { method: 'GET', params: scope ? { scope } : {} }),

  create: (data: { title: string; category: string; scope: SphereScope; columns: V2Sheet['columns']; rows: V2Sheet['rows'] }) =>
    edgeRequest<V2Sheet>('sheets', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, patch: Partial<V2Sheet>) =>
    edgeRequest<V2Sheet>('sheets', { method: 'PATCH', body: JSON.stringify({ id, ...patch }) }),

  delete: (id: string) =>
    edgeRequest<{ deleted: string }>('sheets', { method: 'DELETE', params: { id } }),
};

// ============ Notes ============
export const notesApi = {
  list: (scope?: 'all' | SphereScope, includeArchived = false, includeTrashed = false) =>
    edgeRequest<V2Note[]>('notes', { method: 'GET', params: { scope: scope || 'all', archived: String(includeArchived), trashed: String(includeTrashed) } }),

  create: (data: Omit<V2Note, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) =>
    edgeRequest<V2Note>('notes', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, patch: Partial<V2Note>) =>
    edgeRequest<V2Note>('notes', { method: 'PATCH', body: JSON.stringify({ id, ...patch }) }),

  postToLedger: (noteId: string, entryType: 'cash_in' | 'expense', category?: string, paymentMode?: 'cash' | 'upi' | 'bank' | 'card', accountId?: string, note?: string, skipLedger?: boolean) =>
    edgeRequest<{ posted: boolean; amount_paise: number }>('notes', { method: 'POST', params: { action: 'post_to_ledger' }, body: JSON.stringify({ note_id: noteId, entry_type: entryType, category, payment_mode: paymentMode, account_id: accountId, note, skip_ledger: skipLedger }) }),

  delete: (id: string, permanent = false) =>
    edgeRequest<{ deleted: string }>('notes', { method: 'DELETE', params: { id, permanent: String(permanent) } }),
};

// ============ Vault ============
export const vaultApi = {
  list: (scope?: 'all' | SphereScope) =>
    edgeRequest<V2VaultItem[]>('vault', { method: 'GET', params: scope ? { scope } : {} }),

  create: (data: Omit<V2VaultItem, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) =>
    edgeRequest<V2VaultItem>('vault', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, patch: Partial<V2VaultItem>) =>
    edgeRequest<V2VaultItem>('vault', { method: 'PATCH', body: JSON.stringify({ id, ...patch }) }),

  delete: (id: string) =>
    edgeRequest<{ deleted: string }>('vault', { method: 'DELETE', params: { id } }),
};

// ============ Reconciliation & Summary ============
export const syncApi = {
  reconcile: (data: {
    remoteRecords: Array<{ id: string; workspace_id: string; updated_at: string }>;
    localRecords: Array<{ id: string; workspace_id: string; updated_at: string }>;
    confirmedCloudIds: string[];
    deletedTombstoneIds: string[];
    canonicalWorkspaceId: string;
  }) =>
    edgeRequest<{
      merged: Array<{ id: string; workspace_id: string; updated_at: string }>;
      toUpsertToCloud: string[];
      toDeleteFromCloud: string[];
      nextConfirmedCloudIds: string[];
    }>('reconcile', { method: 'POST', body: JSON.stringify(data) }),

  summary: (data: {
    accounts: Array<{ balance_paise: number; scope: SphereScope }>;
    entries: Array<{ entry_type: string; amount_paise: number; scope: SphereScope }>;
    dues: Array<{ direction: 'receivable' | 'payable'; total_amount_paise: number; paid_amount_paise: number; status: string; scope: SphereScope }>;
    cards: Array<{ credit_limit_paise: number; utilized_paise: number; scope: SphereScope }>;
    scope?: 'all' | SphereScope;
  }) =>
    edgeRequest<{
      liquidCashPaise: number;
      totalReceivablePaise: number;
      totalPayablePaise: number;
      cardUtilizedPaise: number;
      cardLimitPaise: number;
      totalIncomePaise: number;
      totalExpensePaise: number;
      netWorthPaise: number;
      computedAt: string;
    }>('summary', { method: 'POST', body: JSON.stringify(data) }),

  health: () =>
    edgeRequest<{
      application: string;
      version: string;
      themePosture: string;
      stack: string[];
      schemaTables: string[];
      status: 'healthy' | 'degraded';
      timestamp: string;
      runtime: 'supabase-edge';
    }>('health', { method: 'GET' }),
};

// Export all APIs
export const edgeApi = {
  accounts: accountsApi,
  ledger: ledgerApi,
  dues: duesApi,
  creditCards: creditCardsApi,
  sheets: sheetsApi,
  notes: notesApi,
  vault: vaultApi,
  sync: syncApi,
};
