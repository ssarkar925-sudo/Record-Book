import {
  ChecklistItem,
  OverviewMetrics,
  SphereScope,
  V2Account,
  V2CreditCard,
  V2LedgerEntry,
  V2PartyDue,
  V2Workspace,
} from '../../types/v2';

export const DEFAULT_V2_WORKSPACE_ID = '11111111-2222-4333-8444-555555555555';

/**
 * Converts a Rupee float/string to integer Paise accurately without IEEE-754 drift.
 */
export function rupeesToPaise(rupees: number | string): number {
  const cleaned = typeof rupees === 'string' ? rupees.replace(/[^0-9.-]/g, '') : String(rupees);
  const parsed = Number.parseFloat(cleaned);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

/**
 * Converts integer Paise back to Rupee number.
 */
export function paiseToRupees(paise: number): number {
  if (!Number.isFinite(paise)) return 0;
  return Math.round(paise) / 100;
}

/**
 * Formats integer Paise into Indian Rupee notation (e.g. ₹1,24,500.00 or ₹1,24,500)
 */
export function formatINR(paise: number, showDecimals = false): string {
  const rupees = paiseToRupees(paise || 0);
  const abs = Math.abs(rupees);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(abs);
  return `${rupees < 0 ? '-' : ''}₹${formatted}`;
}

export function formatINRFromPaise(
  paise: number,
  options?: { showSign?: boolean; showDecimals?: boolean; masked?: boolean }
): string {
  if (options?.masked) {
    return '₹ ••••••';
  }
  const rupees = paiseToRupees(paise || 0);
  const abs = Math.abs(rupees);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: options?.showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(abs);
  const sign =
    rupees < 0 ? '-' : options?.showSign && rupees > 0 ? '+' : '';
  return `${sign}₹${formatted}`;
}

/**
 * Guarantees a deterministic RFC-4122 UUID string for PostgreSQL UUID columns.
 */
export function ensureValidUuid(candidate?: string | null): string {
  if (
    candidate &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate)
  ) {
    return candidate.toLowerCase();
  }
  const seed = String(candidate || `v2-${Date.now()}-${Math.random()}`);
  let h1 = 0xdeadbeef ^ seed.length;
  let h2 = 0x41c6ce57 ^ seed.length;
  let h3 = 0x1b873593 ^ seed.length;
  let h4 = 0x85ebca6b ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const full = `${hex(h1)}${hex(h2)}${hex(h3)}${hex(h4)}`;
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
}

/**
 * Extracts embedded Rupee amount from checklist text (e.g., "Milk supplier ₹1,250" -> 125000 paise,
 * or "Electricity bill Rs. 3400" -> 340000 paise, or "Packaging 450" -> 45000 paise).
 */
export function extractPaiseFromText(text: string): number {
  if (!text || typeof text !== 'string') return 0;

  // Prefer explicit currency prefixed values first: ₹1,200.50 or Rs 1200
  const explicitMatch = text.match(/(?:₹|rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i);
  if (explicitMatch && explicitMatch[1]) {
    const val = Number.parseFloat(explicitMatch[1].replace(/,/g, ''));
    if (!Number.isNaN(val) && val > 0) {
      return Math.round(val * 100);
    }
  }

  // Fallback: trailing number at the end of the checklist line (e.g. "Shop rent 15000")
  const trailingMatch = text.trim().match(/(?:^|\s)([0-9][0-9,]*(?:\.[0-9]{1,2})?)$/);
  if (trailingMatch && trailingMatch[1]) {
    const val = Number.parseFloat(trailingMatch[1].replace(/,/g, ''));
    if (!Number.isNaN(val) && val > 0) {
      return Math.round(val * 100);
    }
  }

  return 0;
}

/**
 * Computes total, settled (checked), and pending (unchecked) paise across note checklist items.
 */
export function computeNoteChecklistTotals(items: ChecklistItem[]): {
  totalPaise: number;
  settledPaise: number;
  pendingPaise: number;
} {
  let totalPaise = 0;
  let settledPaise = 0;
  let pendingPaise = 0;

  for (const item of items) {
    const amount = item.amount_paise > 0 ? item.amount_paise : extractPaiseFromText(item.text);
    totalPaise += amount;
    if (item.checked) {
      settledPaise += amount;
    } else {
      pendingPaise += amount;
    }
  }

  return { totalPaise, settledPaise, pendingPaise };
}

/**
 * Computes comprehensive Overview KPIs across all modules, filtered by sphere ('all' | SphereScope).
 */
export function computeOverviewMetrics(params: {
  accounts: V2Account[];
  entries: V2LedgerEntry[];
  dues: V2PartyDue[];
  cards: V2CreditCard[];
  scopeFilter?: 'all' | SphereScope;
  scope?: 'all' | SphereScope;
}): OverviewMetrics {
  const { accounts, entries, dues, cards, scopeFilter, scope } = params;
  const activeScope = scopeFilter ?? scope ?? 'all';
  const matchScope = <T extends { scope: SphereScope }>(item: T) =>
    activeScope === 'all' || item.scope === activeScope;

  const liquidCashPaise = accounts
    .filter(matchScope)
    .reduce((sum, acc) => sum + Number(acc.balance_paise || 0), 0);

  const totalReceivablePaise = dues
    .filter((d) => matchScope(d) && d.direction === 'receivable' && d.status !== 'settled')
    .reduce((sum, d) => sum + Math.max(0, Number(d.total_amount_paise || 0) - Number(d.paid_amount_paise || 0)), 0);

  const totalPayablePaise = dues
    .filter((d) => matchScope(d) && d.direction === 'payable' && d.status !== 'settled')
    .reduce((sum, d) => sum + Math.max(0, Number(d.total_amount_paise || 0) - Number(d.paid_amount_paise || 0)), 0);

  const cardUtilizedPaise = cards
    .filter(matchScope)
    .reduce((sum, c) => sum + Number(c.utilized_paise || 0), 0);

  const cardLimitPaise = cards
    .filter(matchScope)
    .reduce((sum, c) => sum + Number(c.credit_limit_paise || 0), 0);

  const totalIncomePaise = entries
    .filter((e) => matchScope(e) && e.entry_type === 'cash_in')
    .reduce((sum, e) => sum + Number(e.amount_paise || 0), 0);

  const totalExpensePaise = entries
    .filter(
      (e) =>
        matchScope(e) &&
        (e.entry_type === 'cash_out' || e.entry_type === 'expense' || e.entry_type === 'card_spend')
    )
    .reduce((sum, e) => sum + Number(e.amount_paise || 0), 0);

  const netWorthPaise =
    liquidCashPaise + totalReceivablePaise - totalPayablePaise - cardUtilizedPaise;

  return {
    liquidCashPaise,
    totalReceivablePaise,
    totalPayablePaise,
    cardUtilizedPaise,
    cardLimitPaise,
    totalIncomePaise,
    totalExpensePaise,
    netWorthPaise,
  };
}

/**
 * Deterministically selects the single canonical cloud workspace for a user across all devices.
 */
export function selectCanonicalV2Workspace(
  workspaces: V2Workspace[],
  recordCounts: Map<string, number>
): V2Workspace | null {
  if (!workspaces || workspaces.length === 0) return null;
  const sorted = [...workspaces].sort((a, b) => {
    const countA = recordCounts.get(a.id) || 0;
    const countB = recordCounts.get(b.id) || 0;
    if (countA !== countB) return countB - countA;
    const tA = new Date(a.created_at || 0).getTime();
    const tB = new Date(b.created_at || 0).getTime();
    if (!Number.isNaN(tA) && !Number.isNaN(tB) && tA !== tB) return tA - tB;
    return a.id.localeCompare(b.id);
  });
  return sorted[0];
}

export interface ReconcileRecordsInput<T extends { id: string; workspace_id: string; updated_at: string }> {
  remoteRecords: T[];
  localRecords: T[];
  confirmedCloudIds: Set<string>;
  deletedTombstoneIds: Set<string>;
  canonicalWorkspaceId: string;
}

export interface ReconcileRecordsOutput<T> {
  merged: T[];
  toUpsertToCloud: T[];
  toDeleteFromCloud: string[];
  nextConfirmedCloudIds: Set<string>;
}

/**
 * Bi-directional multi-device record reconciler for Record Book V2:
 * - Honors local deletion tombstones (`deletedTombstoneIds`)
 * - Removes local records that were previously confirmed in the cloud (`confirmedCloudIds`)
 *   and are now absent from `remoteRecords` (deleted on another device)
 * - Preserves unconfirmed local additions and newer local edits, returning them in
 *   `toUpsertToCloud` without prematurely marking them as cloud-confirmed before upsert succeeds!
 */
export function reconcileV2Records<
  T extends { id: string; workspace_id: string; updated_at: string }
>(input: ReconcileRecordsInput<T>): ReconcileRecordsOutput<T> {
  const {
    remoteRecords,
    localRecords,
    confirmedCloudIds,
    deletedTombstoneIds,
    canonicalWorkspaceId,
  } = input;

  const mergedMap = new Map<string, T>();
  const toUpsertToCloud: T[] = [];
  const toDeleteFromCloud: string[] = [];
  const nextConfirmedCloudIds = new Set<string>();

  const localMap = new Map<string, T>();
  for (const loc of localRecords) {
    if (loc && loc.id && !deletedTombstoneIds.has(loc.id)) {
      localMap.set(loc.id, loc);
    }
  }

  for (const rem of remoteRecords) {
    if (!rem || !rem.id) continue;
    if (deletedTombstoneIds.has(rem.id)) {
      toDeleteFromCloud.push(rem.id);
      continue;
    }

    const local = localMap.get(rem.id);
    if (local) {
      const remTime = new Date(rem.updated_at || 0).getTime() || 0;
      const locTime = new Date(local.updated_at || 0).getTime() || 0;
      if (locTime > remTime + 500) {
        const normalizedLocal = { ...rem, ...local, workspace_id: canonicalWorkspaceId };
        mergedMap.set(rem.id, normalizedLocal);
        toUpsertToCloud.push(normalizedLocal);
        nextConfirmedCloudIds.add(rem.id);
        continue;
      }
    }

    const normalizedRemote =
      rem.workspace_id !== canonicalWorkspaceId
        ? { ...rem, workspace_id: canonicalWorkspaceId }
        : rem;
    if (rem.workspace_id !== canonicalWorkspaceId) {
      toUpsertToCloud.push(normalizedRemote);
    }
    mergedMap.set(rem.id, normalizedRemote);
    nextConfirmedCloudIds.add(rem.id);
  }

  for (const [id, loc] of localMap.entries()) {
    if (mergedMap.has(id)) continue;
    if (deletedTombstoneIds.has(id)) continue;

    // If this record was previously confirmed in the cloud and is now missing from remote,
    // another device deleted it — do not resurrect it!
    if (confirmedCloudIds.has(id)) {
      continue;
    }

    // Genuine unsynced local record: keep in merged AND schedule for cloud upsert
    const normalizedLocal = {
      ...loc,
      id: ensureValidUuid(loc.id),
      workspace_id: canonicalWorkspaceId,
    };
    mergedMap.set(normalizedLocal.id, normalizedLocal);
    toUpsertToCloud.push(normalizedLocal);
  }

  return {
    merged: Array.from(mergedMap.values()),
    toUpsertToCloud,
    toDeleteFromCloud,
    nextConfirmedCloudIds,
  };
}

/**
 * Deterministic salted hash for 4-digit App Lock PIN verification.
 */
export function hashSecurityPin(pin: string): string {
  const normalized = (pin || '').trim();
  const salted = `rb_v2_pin_salt_9941::${normalized}::vault_guard`;
  let h1 = 0xdeadbeef ^ salted.length;
  let h2 = 0x41c6ce57 ^ salted.length;
  for (let i = 0; i < salted.length; i++) {
    const ch = salted.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `pinv2_${hex1}${hex2}`;
}

export function verifySecurityPin(pin: string, expectedHash: string | null | undefined): boolean {
  if (!expectedHash) return false;
  return hashSecurityPin(pin) === expectedHash;
}

/**
 * Evaluates secret / password strength for the Encrypted Vault.
 */
export function evaluateSecretStrength(secret: string): {
  score: number;
  label: 'Weak' | 'Fair' | 'Strong' | 'Vault Grade';
  color: 'rose' | 'amber' | 'sky' | 'emerald';
} {
  const s = (secret || '').trim();
  if (!s) {
    return { score: 0, label: 'Weak', color: 'rose' };
  }
  let points = 0;
  if (s.length >= 6) points += 1;
  if (s.length >= 10) points += 1;
  if (s.length >= 14) points += 1;
  if (/[A-Z]/.test(s) && /[a-z]/.test(s)) points += 1;
  if (/\d/.test(s)) points += 1;
  if (/[^A-Za-z0-9]/.test(s)) points += 1;

  if (points <= 2) return { score: 25, label: 'Weak', color: 'rose' };
  if (points <= 3) return { score: 55, label: 'Fair', color: 'amber' };
  if (points <= 4) return { score: 80, label: 'Strong', color: 'sky' };
  return { score: 100, label: 'Vault Grade', color: 'emerald' };
}

