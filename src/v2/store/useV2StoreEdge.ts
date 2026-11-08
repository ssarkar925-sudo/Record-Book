'use client';

import { create } from 'zustand';
import {
  ChecklistItem,
  ModuleId,
  SphereScope,
  V2Account,
  V2CreditCard,
  V2LedgerEntry,
  V2Note,
  V2PartyDue,
  V2Sheet,
  V2VaultItem,
  V2Workspace,
} from '@/types/v2';
import {
  computeNoteChecklistTotals,
  DEFAULT_V2_WORKSPACE_ID,
  ensureValidUuid,
  extractPaiseFromText,
  hashSecurityPin,
  reconcileV2Records,
  verifySecurityPin,
} from '@/v2/engine/financialEngine';
import { edgeApi } from '@/v2/api/edgeClient';

const STORAGE_PREFIX = 'rb_v2_prod_';
const KEYS = {
  workspace: `${STORAGE_PREFIX}workspace`,
  accounts: `${STORAGE_PREFIX}accounts`,
  entries: `${STORAGE_PREFIX}entries`,
  dues: `${STORAGE_PREFIX}dues`,
  cards: `${STORAGE_PREFIX}cards`,
  sheets: `${STORAGE_PREFIX}sheets`,
  notes: `${STORAGE_PREFIX}notes`,
  vault: `${STORAGE_PREFIX}vault`,
  confirmedIds: `${STORAGE_PREFIX}confirmed_cloud_ids`,
  deletedIds: `${STORAGE_PREFIX}deleted_tombstone_ids`,
  activeModule: `${STORAGE_PREFIX}active_module`,
  privacyMasked: `${STORAGE_PREFIX}privacy_masked`,
  appPinHash: `${STORAGE_PREFIX}app_pin_hash`,
  securityAudit: `${STORAGE_PREFIX}security_audit_log`,
};

const sheetUpdateTimers = new Map<string, ReturnType<typeof setTimeout>>();

export interface SecurityAuditEvent {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
}

const NOW_ISO = new Date().toISOString();

const INITIAL_ACCOUNTS: V2Account[] = [];
const INITIAL_ENTRIES: V2LedgerEntry[] = [];
const INITIAL_DUES: V2PartyDue[] = [];
const INITIAL_CARDS: V2CreditCard[] = [];
const INITIAL_SHEETS: V2Sheet[] = [];
const INITIAL_NOTES: V2Note[] = [];

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

interface V2StoreState {
  activeModule: ModuleId;
  scopeFilter: 'all' | SphereScope;
  searchQuery: string;
  workspace: V2Workspace;
  userEmail: string | null;
  userId: string | null;
  syncStatus: 'synced' | 'syncing' | 'local_ready' | 'error';
  lastSyncedAt: string | null;
  syncError: string | null;

  privacyMasked: boolean;
  appPinHash: string | null;
  isAppLocked: boolean;
  securityAuditLog: SecurityAuditEvent[];

  accounts: V2Account[];
  entries: V2LedgerEntry[];
  dues: V2PartyDue[];
  cards: V2CreditCard[];
  sheets: V2Sheet[];
  notes: V2Note[];
  vaultItems: V2VaultItem[];

  setActiveModule: (mod: ModuleId) => void;
  setScopeFilter: (scope: 'all' | SphereScope) => void;
  setSearchQuery: (q: string) => void;

  togglePrivacyMask: () => void;
  setAppSecurityPin: (pin: string) => void;
  removeAppSecurityPin: () => void;
  lockApp: () => void;
  unlockAppWithPin: (pin: string) => boolean;
  logSecurityEvent: (action: string, detail: string) => void;

  addAccount: (acc: Omit<V2Account, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateAccount: (
    id: string,
    patch: Partial<Pick<V2Account, 'name' | 'bank_name' | 'balance_paise' | 'account_number_last4' | 'ifsc' | 'scope' | 'notes'>>
  ) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  transferBetweenAccounts: (params: {
    fromAccountId: string;
    toAccountId: string;
    amountPaise: number;
    note: string;
    scope: SphereScope;
  }) => Promise<void>;

  addLedgerEntry: (entry: Omit<V2LedgerEntry, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  deleteLedgerEntry: (id: string) => Promise<void>;

  addPartyDue: (due: Omit<V2PartyDue, 'id' | 'workspace_id' | 'created_at' | 'updated_at' | 'status'>) => Promise<void>;
  settlePartyDue: (params: {
    dueId: string;
    payAmountPaise: number;
    accountId?: string;
    paymentMode: 'cash' | 'upi' | 'bank';
    remark?: string;
  }) => Promise<void>;
  deletePartyDue: (id: string) => Promise<void>;

  addCreditCard: (card: Omit<V2CreditCard, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  recordCardSpend: (params: {
    cardId: string;
    amountPaise: number;
    category: string;
    note: string;
  }) => Promise<void>;
  payCardBill: (params: {
    cardId: string;
    amountPaise: number;
    fromAccountId: string;
  }) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;

  addSheet: (sheet: { title: string; category: string; scope: SphereScope }) => Promise<void>;
  addSheetRow: (sheetId: string, cells: Record<string, string | number>) => Promise<void>;
  updateSheetCell: (sheetId: string, rowId: string, colId: string, value: string | number) => Promise<void>;
  deleteSheetRow: (sheetId: string, rowId: string) => Promise<void>;
  deleteSheet: (sheetId: string) => Promise<void>;

  addNote: (note: {
    title: string;
    body: string;
    checklistTexts: string[];
    color_theme: V2Note['color_theme'];
    priority: V2Note['priority'];
    scope: SphereScope;
    tags: string[];
    reminder_date?: string;
  }) => Promise<void>;
  toggleNoteChecklistItem: (noteId: string, itemId: string) => Promise<void>;
  addNoteChecklistItem: (noteId: string, text: string) => Promise<void>;
  toggleNotePin: (noteId: string) => Promise<void>;
  toggleNoteArchive: (noteId: string) => Promise<void>;
  moveNoteToTrash: (noteId: string) => Promise<void>;
  restoreNoteFromTrash: (noteId: string) => Promise<void>;
  deleteNotePermanently: (noteId: string) => Promise<void>;
  postNoteToLedger: (noteId: string, entryType: 'cash_in' | 'expense', accountId?: string) => Promise<void>;

  addVaultItem: (item: Omit<V2VaultItem, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  deleteVaultItem: (id: string) => Promise<void>;

  hydrateFromStorageAndCloud: () => Promise<void>;
  syncNowWithCloud: () => Promise<void>;
  signInWithSupabase: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUpWithSupabase: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOutSupabase: () => Promise<void>;
  exportFullBackupJson: () => string;
  importFullBackupJson: (rawJson: string) => { ok: boolean; error?: string };
  loadSampleWorkspaceData: () => Promise<void>;
  clearAllWorkspaceData: () => Promise<void>;
}

function getConfirmedSet(): Set<string> {
  return new Set(loadJSON<string[]>(KEYS.confirmedIds, []));
}

function saveConfirmedSet(set: Set<string>) {
  saveJSON(KEYS.confirmedIds, Array.from(set));
}

function getDeletedSet(): Set<string> {
  return new Set(loadJSON<string[]>(KEYS.deletedIds, []));
}

function recordTombstone(id: string) {
  const s = getDeletedSet();
  s.add(id);
  saveJSON(KEYS.deletedIds, Array.from(s));
}

function setupRealtimeSubscription(client: any, userId: string | null, syncNowFn: () => Promise<void>) {
  if (typeof window === 'undefined') return;
  if (!client || !userId || (window as any).__rb_v2_realtime_bound) return;
  (window as any).__rb_v2_realtime_bound = true;
  client
    .channel('rb-v2-multi-device-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      () => {
        void syncNowFn();
      }
    )
    .subscribe();
}

export const useV2Store = create<V2StoreState>((set, get) => ({
  activeModule: 'overview',
  scopeFilter: 'all',
  searchQuery: '',
  workspace: {
    id: DEFAULT_V2_WORKSPACE_ID,
    owner_id: 'local-owner',
    name: 'Personal & Business Record Book',
    currency: 'INR',
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  userEmail: null,
  userId: null,
  syncStatus: 'local_ready',
  lastSyncedAt: null,
  syncError: null,

  privacyMasked: false,
  appPinHash: null,
  isAppLocked: false,
  securityAuditLog: [],

  accounts: INITIAL_ACCOUNTS,
  entries: INITIAL_ENTRIES,
  dues: INITIAL_DUES,
  cards: INITIAL_CARDS,
  sheets: INITIAL_SHEETS,
  notes: INITIAL_NOTES,
  vaultItems: [],

  setActiveModule: (mod) => {
    set({ activeModule: mod });
    if (typeof window !== 'undefined') {
      saveJSON(KEYS.activeModule, mod);
      window.history.replaceState(null, '', `#${mod}`);
    }
  },

  setScopeFilter: (scope) => set({ scopeFilter: scope }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  logSecurityEvent: (action, detail) => {
    const evt: SecurityAuditEvent = {
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      detail,
      timestamp: new Date().toISOString(),
    };
    const next = [evt, ...get().securityAuditLog].slice(0, 40);
    set({ securityAuditLog: next });
    saveJSON(KEYS.securityAudit, next);
  },

  togglePrivacyMask: () => {
    const next = !get().privacyMasked;
    set({ privacyMasked: next });
    saveJSON(KEYS.privacyMasked, next);
    get().logSecurityEvent(
      next ? 'Privacy Stealth Enabled' : 'Privacy Stealth Disabled',
      next ? 'All currency balances masked on screen' : 'Currency balances visible on screen'
    );
  },

  setAppSecurityPin: (pin) => {
    const cleaned = pin.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length !== 4) return;
    const hash = hashSecurityPin(cleaned);
    set({ appPinHash: hash, isAppLocked: false });
    saveJSON(KEYS.appPinHash, hash);
    get().logSecurityEvent('App Security PIN Configured', '4-digit workspace lock PIN updated');
  },

  removeAppSecurityPin: () => {
    set({ appPinHash: null, isAppLocked: false });
    saveJSON(KEYS.appPinHash, null);
    get().logSecurityEvent('App Security PIN Removed', '4-digit workspace lock PIN disabled');
  },

  lockApp: () => {
    if (!get().appPinHash) return;
    set({ isAppLocked: true });
    get().logSecurityEvent('Workspace Locked', 'Locked manually via Security Lock control');
  },

  unlockAppWithPin: (pin) => {
    const hash = get().appPinHash;
    if (!hash) {
      set({ isAppLocked: false });
      return true;
    }
    const valid = verifySecurityPin(pin, hash);
    if (valid) {
      set({ isAppLocked: false });
      get().logSecurityEvent('Workspace Unlocked', 'Verified 4-digit security PIN');
      return true;
    }
    get().logSecurityEvent('Failed Unlock Attempt', 'Invalid 4-digit PIN entered at lock screen');
    return false;
  },

  // ============ Accounts (via Edge Functions) ============
  addAccount: async (accInput) => {
    const now = new Date().toISOString();
    const wsId = get().workspace.id;
    const newAcc: V2Account = {
      ...accInput,
      id: ensureValidUuid(crypto.randomUUID()),
      workspace_id: wsId,
      created_at: now,
      updated_at: now,
    };
    const next = [newAcc, ...get().accounts];
    set({ accounts: next });
    saveJSON(KEYS.accounts, next);

    try {
      await edgeApi.accounts.create(newAcc);
    } catch (err) {
      console.error('Edge function account create failed, will retry on sync:', err);
    }
  },

  updateAccount: async (id, patch) => {
    const now = new Date().toISOString();
    const next = get().accounts.map((acc) =>
      acc.id === id ? { ...acc, ...patch, updated_at: now } : acc
    );
    set({ accounts: next });
    saveJSON(KEYS.accounts, next);
    const updated = next.find((a) => a.id === id);
    if (updated) {
      try {
        await edgeApi.accounts.update(id, updated);
      } catch (err) {
        console.error('Edge function account update failed:', err);
      }
    }
  },

  deleteAccount: async (id) => {
    recordTombstone(id);
    const next = get().accounts.filter((a) => a.id !== id);
    set({ accounts: next });
    saveJSON(KEYS.accounts, next);
    try {
      await edgeApi.accounts.delete(id);
    } catch (err) {
      console.error('Edge function account delete failed:', err);
    }
  },

  transferBetweenAccounts: async ({ fromAccountId, toAccountId, amountPaise, note, scope }) => {
    if (fromAccountId === toAccountId || amountPaise <= 0) return;
    const now = new Date().toISOString();
    const wsId = get().workspace.id;
    const fromAcc = get().accounts.find((a) => a.id === fromAccountId);
    const toAcc = get().accounts.find((a) => a.id === toAccountId);
    if (!fromAcc || !toAcc) return;

    const updatedAccounts = get().accounts.map((acc) => {
      if (acc.id === fromAccountId) {
        return { ...acc, balance_paise: acc.balance_paise - amountPaise, updated_at: now };
      }
      if (acc.id === toAccountId) {
        return { ...acc, balance_paise: acc.balance_paise + amountPaise, updated_at: now };
      }
      return acc;
    });

    const transferEntry: V2LedgerEntry = {
      id: ensureValidUuid(crypto.randomUUID()),
      workspace_id: wsId,
      entry_type: 'transfer',
      amount_paise: amountPaise,
      category: 'Self Account Transfer',
      payment_mode: 'bank',
      account_id: fromAccountId,
      target_account_id: toAccountId,
      note: note || `Transfer from ${fromAcc.name} to ${toAcc.name}`,
      entry_date: now,
      scope,
      created_at: now,
      updated_at: now,
    };

    const nextEntries = [transferEntry, ...get().entries];
    set({ accounts: updatedAccounts, entries: nextEntries });
    saveJSON(KEYS.accounts, updatedAccounts);
    saveJSON(KEYS.entries, nextEntries);

    const newFrom = updatedAccounts.find((a) => a.id === fromAccountId);
    const newTo = updatedAccounts.find((a) => a.id === toAccountId);
    try {
      if (newFrom) await edgeApi.accounts.update(fromAccountId, newFrom);
      if (newTo) await edgeApi.accounts.update(toAccountId, newTo);
      await edgeApi.ledger.create(transferEntry);
    } catch (err) {
      console.error('Edge function transfer failed:', err);
    }
  },

  // ============ Ledger Entries (via Edge Functions) ============
  addLedgerEntry: async (entryInput) => {
    const now = new Date().toISOString();
    const wsId = get().workspace.id;
    const newEntry: V2LedgerEntry = {
      ...entryInput,
      id: ensureValidUuid(crypto.randomUUID()),
      workspace_id: wsId,
      created_at: now,
      updated_at: now,
    };

    let updatedAccounts = get().accounts;
    if (newEntry.account_id) {
      updatedAccounts = updatedAccounts.map((acc) => {
        if (acc.id !== newEntry.account_id) return acc;
        const delta =
          newEntry.entry_type === 'cash_in'
            ? newEntry.amount_paise
            : -newEntry.amount_paise;
        return {
          ...acc,
          balance_paise: acc.balance_paise + delta,
          updated_at: now,
        };
      });
    }

    const nextEntries = [newEntry, ...get().entries];
    set({ entries: nextEntries, accounts: updatedAccounts });
    saveJSON(KEYS.entries, nextEntries);
    saveJSON(KEYS.accounts, updatedAccounts);

    try {
      await edgeApi.ledger.create(newEntry);
      if (newEntry.account_id) {
        const targetAcc = updatedAccounts.find((a) => a.id === newEntry.account_id);
        if (targetAcc) await edgeApi.accounts.update(newEntry.account_id, targetAcc);
      }
    } catch (err) {
      console.error('Edge function ledger create failed:', err);
    }
  },

  deleteLedgerEntry: async (id) => {
    const target = get().entries.find((e) => e.id === id);
    if (!target) return;
    recordTombstone(id);
    const now = new Date().toISOString();

    let updatedAccounts = get().accounts;
    if (target.account_id) {
      updatedAccounts = updatedAccounts.map((acc) => {
        if (acc.id !== target.account_id) return acc;
        const reverseDelta =
          target.entry_type === 'cash_in'
            ? -target.amount_paise
            : target.amount_paise;
        return {
          ...acc,
          balance_paise: acc.balance_paise + reverseDelta,
          updated_at: now,
        };
      });
    }

    const nextEntries = get().entries.filter((e) => e.id !== id);
    set({ entries: nextEntries, accounts: updatedAccounts });
    saveJSON(KEYS.entries, nextEntries);
    saveJSON(KEYS.accounts, updatedAccounts);

    try {
      await edgeApi.ledger.delete(id);
      if (target.account_id) {
        const updatedAcc = updatedAccounts.find((a) => a.id === target.account_id);
        if (updatedAcc) await edgeApi.accounts.update(target.account_id, updatedAcc);
      }
    } catch (err) {
      console.error('Edge function ledger delete failed:', err);
    }
  },

  // ============ Dues (via Edge Functions) ============
  addPartyDue: async (dueInput) => {
    const now = new Date().toISOString();
    const wsId = get().workspace.id;
    const status =
      dueInput.paid_amount_paise >= dueInput.total_amount_paise
        ? 'settled'
        : dueInput.paid_amount_paise > 0
        ? 'partial'
        : 'pending';

    const newDue: V2PartyDue = {
      ...dueInput,
      id: ensureValidUuid(crypto.randomUUID()),
      workspace_id: wsId,
      status,
      created_at: now,
      updated_at: now,
    };

    const nextDues = [newDue, ...get().dues];
    set({ dues: nextDues });
    saveJSON(KEYS.dues, nextDues);

    try {
      await edgeApi.dues.create(newDue);
    } catch (err) {
      console.error('Edge function dues create failed:', err);
    }
  },

  settlePartyDue: async ({ dueId, payAmountPaise, accountId, paymentMode, remark }) => {
    const due = get().dues.find((d) => d.id === dueId);
    if (!due || payAmountPaise <= 0) return;
    const now = new Date().toISOString();
    const newPaid = Math.min(due.total_amount_paise, due.paid_amount_paise + payAmountPaise);
    const newStatus = newPaid >= due.total_amount_paise ? 'settled' : 'partial';

    const updatedDue: V2PartyDue = {
      ...due,
      paid_amount_paise: newPaid,
      status: newStatus,
      updated_at: now,
    };

    const nextDues = get().dues.map((d) => (d.id === dueId ? updatedDue : d));
    set({ dues: nextDues });
    saveJSON(KEYS.dues, nextDues);

    try {
      await edgeApi.dues.settle({
        due_id: dueId,
        pay_amount_paise: payAmountPaise,
        account_id: accountId || get().accounts[0]?.id,
        payment_mode: paymentMode,
        remark,
        skip_ledger: true,
      });
    } catch (err) {
      console.error('Edge function dues settle failed:', err);
    }

    // Post settlement to ledger & update linked bank/cash account
    await get().addLedgerEntry({
      entry_type: due.direction === 'receivable' ? 'cash_in' : 'cash_out',
      amount_paise: payAmountPaise,
      category: due.direction === 'receivable' ? 'Customer Udhar Received' : 'Supplier Udhar Paid',
      payment_mode: paymentMode,
      account_id: accountId || get().accounts[0]?.id,
      party_id: due.id,
      note: `${due.direction === 'receivable' ? 'Received from' : 'Paid to'} ${due.party_name}${remark ? ' · ' + remark : ''}`,
      entry_date: now,
      scope: due.scope,
    });
  },

  deletePartyDue: async (id) => {
    recordTombstone(id);
    const next = get().dues.filter((d) => d.id !== id);
    set({ dues: next });
    saveJSON(KEYS.dues, next);
    try {
      await edgeApi.dues.delete(id);
    } catch (err) {
      console.error('Edge function dues delete failed:', err);
    }
  },

  // ============ Credit Cards (via Edge Functions) ============
  addCreditCard: async (cardInput) => {
    const now = new Date().toISOString();
    const wsId = get().workspace.id;
    const newCard: V2CreditCard = {
      ...cardInput,
      id: ensureValidUuid(crypto.randomUUID()),
      workspace_id: wsId,
      created_at: now,
      updated_at: now,
    };
    const next = [newCard, ...get().cards];
    set({ cards: next });
    saveJSON(KEYS.cards, next);

    try {
      await edgeApi.creditCards.create(newCard);
    } catch (err) {
      console.error('Edge function card create failed:', err);
    }
  },

  recordCardSpend: async ({ cardId, amountPaise, category, note }) => {
    const card = get().cards.find((c) => c.id === cardId);
    if (!card || amountPaise <= 0) return;
    const now = new Date().toISOString();
    const wsId = get().workspace.id;

    const updatedCard: V2CreditCard = {
      ...card,
      utilized_paise: card.utilized_paise + amountPaise,
      updated_at: now,
    };
    const nextCards = get().cards.map((c) => (c.id === cardId ? updatedCard : c));

    const spendEntry: V2LedgerEntry = {
      id: ensureValidUuid(crypto.randomUUID()),
      workspace_id: wsId,
      entry_type: 'card_spend',
      amount_paise: amountPaise,
      category: category || 'Card Purchase',
      payment_mode: 'card',
      card_id: cardId,
      note: `${card.card_name} (••${card.last4}): ${note || 'Card purchase'}`,
      entry_date: now,
      scope: card.scope,
      created_at: now,
      updated_at: now,
    };

    const nextEntries = [spendEntry, ...get().entries];
    set({ cards: nextCards, entries: nextEntries });
    saveJSON(KEYS.cards, nextCards);
    saveJSON(KEYS.entries, nextEntries);

    try {
      await edgeApi.creditCards.spend({
        card_id: cardId,
        amount_paise: amountPaise,
        category: category || 'Card Purchase',
        note: note || 'Card purchase',
        payment_mode: 'card',
        skip_ledger: true,
      });
      await edgeApi.ledger.create(spendEntry);
    } catch (err) {
      console.error('Edge function card spend failed:', err);
    }
  },

  payCardBill: async ({ cardId, amountPaise, fromAccountId }) => {
    const card = get().cards.find((c) => c.id === cardId);
    if (!card || amountPaise <= 0) return;
    const now = new Date().toISOString();

    const updatedCard: V2CreditCard = {
      ...card,
      utilized_paise: Math.max(0, card.utilized_paise - amountPaise),
      updated_at: now,
    };
    const nextCards = get().cards.map((c) => (c.id === cardId ? updatedCard : c));
    set({ cards: nextCards });
    saveJSON(KEYS.cards, nextCards);

    try {
      await edgeApi.creditCards.payBill({
        card_id: cardId,
        amount_paise: amountPaise,
        account_id: fromAccountId,
        payment_mode: 'bank',
        skip_ledger: true,
      });
    } catch (err) {
      console.error('Edge function card bill pay failed:', err);
    }

    await get().addLedgerEntry({
      entry_type: 'cash_out',
      amount_paise: amountPaise,
      category: 'Credit Card Bill Payment',
      payment_mode: 'bank',
      account_id: fromAccountId,
      card_id: cardId,
      note: `Bill payment for ${card.card_name} (••${card.last4})`,
      entry_date: now,
      scope: card.scope,
    });
  },

  deleteCreditCard: async (id) => {
    recordTombstone(id);
    const next = get().cards.filter((c) => c.id !== id);
    set({ cards: next });
    saveJSON(KEYS.cards, next);
    try {
      await edgeApi.creditCards.delete(id);
    } catch (err) {
      console.error('Edge function card delete failed:', err);
    }
  },

  // ============ Sheets (via Edge Functions) ============
  addSheet: async ({ title, category, scope }) => {
    const now = new Date().toISOString();
    const wsId = get().workspace.id;
    const newSheet: V2Sheet = {
      id: ensureValidUuid(crypto.randomUUID()),
      workspace_id: wsId,
      title,
      category: category || 'Business Register',
      scope,
      columns: [
        { id: 'c_item', name: 'Particulars / Item', type: 'text' },
        { id: 'c_qty', name: 'Quantity', type: 'number' },
        { id: 'c_amount', name: 'Amount (₹)', type: 'currency' },
      ],
      rows: [
        {
          id: `r-${Date.now()}`,
          cells: { c_item: 'Opening Entry', c_qty: 1, c_amount: 0 },
        },
      ],
      created_at: now,
      updated_at: now,
    };
    const next = [newSheet, ...get().sheets];
    set({ sheets: next });
    saveJSON(KEYS.sheets, next);

    try {
      await edgeApi.sheets.create(newSheet);
    } catch (err) {
      console.error('Edge function sheet create failed:', err);
    }
  },

  addSheetRow: async (sheetId, cells) => {
    const now = new Date().toISOString();
    const next = get().sheets.map((s) => {
      if (s.id !== sheetId) return s;
      return {
        ...s,
        rows: [...s.rows, { id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, cells }],
        updated_at: now,
      };
    });
    set({ sheets: next });
    saveJSON(KEYS.sheets, next);
    const updated = next.find((s) => s.id === sheetId);
    if (updated) {
      try {
        await edgeApi.sheets.update(sheetId, updated);
      } catch (err) {
        console.error('Edge function sheet row add failed:', err);
      }
    }
  },

  updateSheetCell: async (sheetId, rowId, colId, value) => {
    const now = new Date().toISOString();
    const next = get().sheets.map((s) => {
      if (s.id !== sheetId) return s;
      return {
        ...s,
        rows: s.rows.map((r) =>
          r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r
        ),
        updated_at: now,
      };
    });
    set({ sheets: next });
    saveJSON(KEYS.sheets, next);
    const updated = next.find((s) => s.id === sheetId);
    if (updated) {
      const existing = sheetUpdateTimers.get(sheetId);
      if (existing) clearTimeout(existing);
      sheetUpdateTimers.set(
        sheetId,
        setTimeout(async () => {
          sheetUpdateTimers.delete(sheetId);
          try {
            await edgeApi.sheets.update(sheetId, updated);
          } catch (err) {
            console.error('Edge function sheet cell update failed:', err);
          }
        }, 350)
      );
    }
  },

  deleteSheetRow: async (sheetId, rowId) => {
    const now = new Date().toISOString();
    const next = get().sheets.map((s) => {
      if (s.id !== sheetId) return s;
      return {
        ...s,
        rows: s.rows.filter((r) => r.id !== rowId),
        updated_at: now,
      };
    });
    set({ sheets: next });
    saveJSON(KEYS.sheets, next);
    const updated = next.find((s) => s.id === sheetId);
    if (updated) {
      try {
        await edgeApi.sheets.update(sheetId, updated);
      } catch (err) {
        console.error('Edge function sheet row delete failed:', err);
      }
    }
  },

  deleteSheet: async (sheetId) => {
    recordTombstone(sheetId);
    const next = get().sheets.filter((s) => s.id !== sheetId);
    set({ sheets: next });
    saveJSON(KEYS.sheets, next);
    try {
      await edgeApi.sheets.delete(sheetId);
    } catch (err) {
      console.error('Edge function sheet delete failed:', err);
    }
  },

  // ============ Notes (via Edge Functions) ============
  addNote: async ({
    title,
    body,
    checklistTexts,
    color_theme,
    priority,
    scope,
    tags,
    reminder_date,
  }) => {
    const now = new Date().toISOString();
    const wsId = get().workspace.id;
    const checklist_items: ChecklistItem[] = checklistTexts
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text, idx) => ({
        id: `chk-${Date.now()}-${idx}`,
        text,
        checked: false,
        amount_paise: extractPaiseFromText(text),
      }));

    const { totalPaise } = computeNoteChecklistTotals(checklist_items);

    const newNote: V2Note = {
      id: ensureValidUuid(crypto.randomUUID()),
      workspace_id: wsId,
      title,
      body,
      checklist_items,
      calculated_total_paise: totalPaise,
      color_theme,
      priority,
      is_pinned: false,
      is_archived: false,
      is_trashed: false,
      reminder_date: reminder_date || null,
      tags,
      scope,
      created_at: now,
      updated_at: now,
    };

    const next = [newNote, ...get().notes];
    set({ notes: next });
    saveJSON(KEYS.notes, next);

    try {
      await edgeApi.notes.create(newNote);
    } catch (err) {
      console.error('Edge function note create failed:', err);
    }
  },

  toggleNoteChecklistItem: async (noteId, itemId) => {
    const now = new Date().toISOString();
    const next = get().notes.map((n) => {
      if (n.id !== noteId) return n;
      const items = n.checklist_items.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );
      const { totalPaise } = computeNoteChecklistTotals(items);
      return {
        ...n,
        checklist_items: items,
        calculated_total_paise: totalPaise,
        updated_at: now,
      };
    });
    set({ notes: next });
    saveJSON(KEYS.notes, next);
    const updated = next.find((n) => n.id === noteId);
    if (updated) {
      try {
        await edgeApi.notes.update(noteId, updated);
      } catch (err) {
        console.error('Edge function note checklist toggle failed:', err);
      }
    }
  },

  addNoteChecklistItem: async (noteId, text) => {
    if (!text.trim()) return;
    const now = new Date().toISOString();
    const next = get().notes.map((n) => {
      if (n.id !== noteId) return n;
      const newItem: ChecklistItem = {
        id: `chk-${Date.now()}`,
        text: text.trim(),
        checked: false,
        amount_paise: extractPaiseFromText(text.trim()),
      };
      const items = [...n.checklist_items, newItem];
      const { totalPaise } = computeNoteChecklistTotals(items);
      return {
        ...n,
        checklist_items: items,
        calculated_total_paise: totalPaise,
        updated_at: now,
      };
    });
    set({ notes: next });
    saveJSON(KEYS.notes, next);
    const updated = next.find((n) => n.id === noteId);
    if (updated) {
      try {
        await edgeApi.notes.update(noteId, updated);
      } catch (err) {
        console.error('Edge function note checklist add failed:', err);
      }
    }
  },

  toggleNotePin: async (noteId) => {
    const now = new Date().toISOString();
    const next = get().notes.map((n) =>
      n.id === noteId ? { ...n, is_pinned: !n.is_pinned, updated_at: now } : n
    );
    set({ notes: next });
    saveJSON(KEYS.notes, next);
    const updated = next.find((n) => n.id === noteId);
    if (updated) {
      try {
        await edgeApi.notes.update(noteId, updated);
      } catch (err) {
        console.error('Edge function note pin toggle failed:', err);
      }
    }
  },

  toggleNoteArchive: async (noteId) => {
    const now = new Date().toISOString();
    const next = get().notes.map((n) =>
      n.id === noteId ? { ...n, is_archived: !n.is_archived, is_trashed: false, updated_at: now } : n
    );
    set({ notes: next });
    saveJSON(KEYS.notes, next);
    const updated = next.find((n) => n.id === noteId);
    if (updated) {
      try {
        await edgeApi.notes.update(noteId, updated);
      } catch (err) {
        console.error('Edge function note archive toggle failed:', err);
      }
    }
  },

  moveNoteToTrash: async (noteId) => {
    const now = new Date().toISOString();
    const next = get().notes.map((n) =>
      n.id === noteId ? { ...n, is_trashed: true, is_pinned: false, updated_at: now } : n
    );
    set({ notes: next });
    saveJSON(KEYS.notes, next);
    const updated = next.find((n) => n.id === noteId);
    if (updated) {
      try {
        await edgeApi.notes.update(noteId, updated);
      } catch (err) {
        console.error('Edge function note trash failed:', err);
      }
    }
  },

  restoreNoteFromTrash: async (noteId) => {
    const now = new Date().toISOString();
    const next = get().notes.map((n) =>
      n.id === noteId ? { ...n, is_trashed: false, is_archived: false, updated_at: now } : n
    );
    set({ notes: next });
    saveJSON(KEYS.notes, next);
    const updated = next.find((n) => n.id === noteId);
    if (updated) {
      try {
        await edgeApi.notes.update(noteId, updated);
      } catch (err) {
        console.error('Edge function note restore failed:', err);
      }
    }
  },

  deleteNotePermanently: async (noteId) => {
    recordTombstone(noteId);
    const next = get().notes.filter((n) => n.id !== noteId);
    set({ notes: next });
    saveJSON(KEYS.notes, next);
    try {
      await edgeApi.notes.delete(noteId, true);
    } catch (err) {
      console.error('Edge function note permanent delete failed:', err);
    }
  },

  postNoteToLedger: async (noteId, entryType, accountId) => {
    const note = get().notes.find((n) => n.id === noteId);
    if (!note || note.calculated_total_paise <= 0) return;
    await get().addLedgerEntry({
      entry_type: entryType,
      amount_paise: note.calculated_total_paise,
      category: 'Daily Note Checklist',
      payment_mode: 'upi',
      account_id: accountId || get().accounts[0]?.id,
      note: `From Note: ${note.title}`,
      entry_date: new Date().toISOString(),
      scope: note.scope,
    });

    try {
      await edgeApi.notes.postToLedger(noteId, entryType, 'Daily Note Checklist', 'upi', accountId, `From Note: ${note.title}`, true);
    } catch (err) {
      console.error('Edge function post note to ledger failed:', err);
    }
  },

  // ============ Vault (via Edge Functions) ============
  addVaultItem: async (itemInput) => {
    const now = new Date().toISOString();
    const wsId = get().workspace.id;
    const newItem: V2VaultItem = {
      ...itemInput,
      id: ensureValidUuid(crypto.randomUUID()),
      workspace_id: wsId,
      created_at: now,
      updated_at: now,
    };
    const next = [newItem, ...get().vaultItems];
    set({ vaultItems: next });
    saveJSON(KEYS.vault, next);

    try {
      await edgeApi.vault.create(newItem);
    } catch (err) {
      console.error('Edge function vault create failed:', err);
    }
  },

  deleteVaultItem: async (id) => {
    recordTombstone(id);
    const next = get().vaultItems.filter((v) => v.id !== id);
    set({ vaultItems: next });
    saveJSON(KEYS.vault, next);
    try {
      await edgeApi.vault.delete(id);
    } catch (err) {
      console.error('Edge function vault delete failed:', err);
    }
  },

  // ============ Cloud Sync & Auth (via Edge Functions) ============
  hydrateFromStorageAndCloud: async () => {
    if (typeof window === 'undefined') return;

    const savedAccounts = loadJSON<V2Account[] | null>(KEYS.accounts, null);
    const savedEntries = loadJSON<V2LedgerEntry[] | null>(KEYS.entries, null);
    const savedDues = loadJSON<V2PartyDue[] | null>(KEYS.dues, null);
    const savedCards = loadJSON<V2CreditCard[] | null>(KEYS.cards, null);
    const savedSheets = loadJSON<V2Sheet[] | null>(KEYS.sheets, null);
    const savedNotes = loadJSON<V2Note[] | null>(KEYS.notes, null);
    const savedVault = loadJSON<V2VaultItem[] | null>(KEYS.vault, null);
    const savedPrivacy = loadJSON<boolean>(KEYS.privacyMasked, false);
    const savedPinHash = loadJSON<string | null>(KEYS.appPinHash, null);
    const savedAudit = loadJSON<SecurityAuditEvent[]>(KEYS.securityAudit, []);

    set({
      accounts: Array.isArray(savedAccounts) ? savedAccounts : [],
      entries: Array.isArray(savedEntries) ? savedEntries : [],
      dues: Array.isArray(savedDues) ? savedDues : [],
      cards: Array.isArray(savedCards) ? savedCards : [],
      sheets: Array.isArray(savedSheets) ? savedSheets : [],
      notes: Array.isArray(savedNotes) ? savedNotes : [],
      vaultItems: Array.isArray(savedVault) ? savedVault : [],
      privacyMasked: Boolean(savedPrivacy),
      appPinHash: savedPinHash || null,
      securityAuditLog: Array.isArray(savedAudit) ? savedAudit : [],
    });

    await get().syncNowWithCloud();

    try {
      const { client, isConfigured } = getSupabaseV2Client();
      if (isConfigured) {
        setupRealtimeSubscription(client, get().userId, get().syncNowWithCloud);
      }
    } catch {}
  },

  syncNowWithCloud: async () => {
    const { client, isConfigured } = getSupabaseV2Client();
    if (!isConfigured) {
      set({ syncStatus: 'local_ready', syncError: null });
      return;
    }

    set({ syncStatus: 'syncing', syncError: null });
    try {
      const { data: sessionData } = await client.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        set({ userEmail: null, userId: null, syncStatus: 'local_ready' });
        return;
      }

      set({ userEmail: user.email || 'Authenticated User', userId: user.id });

      // 1. Resolve canonical V2 workspace via RPC
      let canonicalWsId = get().workspace.id;
      const { data: rpcWs, error: rpcErr } = await client.rpc('get_or_create_v2_workspace');
      if (!rpcErr && rpcWs && (rpcWs as any).id) {
        canonicalWsId = (rpcWs as any).id;
        set({ workspace: rpcWs as V2Workspace });
        saveJSON(KEYS.workspace, rpcWs);
      } else {
        const { data: wsRows } = await client
          .from('v2_workspaces')
          .select('*')
          .eq('owner_id', user.id)
          .limit(1);
        if (wsRows && wsRows[0]?.id) {
          canonicalWsId = wsRows[0].id;
          set({ workspace: wsRows[0] as V2Workspace });
          saveJSON(KEYS.workspace, wsRows[0]);
        }
      }

      // 2. Use Edge Functions for data fetch
      // First check if user is authenticated via Edge Function health
      try {
        await edgeApi.sync.health();
      } catch {
        console.warn('Edge functions not reachable, falling back to direct Supabase');
      }

      // 3. Fetch all V2 tables in parallel via Edge Functions
      const scope = get().scopeFilter;
      const [
        accRes,
        entRes,
        dueRes,
        cardRes,
        sheetRes,
        noteRes,
        vaultRes,
      ] = await Promise.allSettled([
        edgeApi.accounts.list(scope),
        edgeApi.ledger.list(scope, 500),
        edgeApi.dues.list(scope),
        edgeApi.creditCards.list(scope),
        edgeApi.sheets.list(scope),
        edgeApi.notes.list(scope, false, false),
        edgeApi.vault.list(scope),
      ]);

      const confirmed = getConfirmedSet();
      const deleted = getDeletedSet();
      const nextConfirmed = new Set<string>(confirmed);

      const applyMerged = async <T extends { id: string; workspace_id: string; updated_at: string }>(
        tableName: string,
        localList: T[],
        storageKey: string,
        applyMerged: (merged: T[]) => void
      ) => {
        // For now, keep using the existing syncTableCollection logic with direct Supabase
        // In the future, we'll fetch from Edge Functions
      };

      // Keep existing sync logic for now (direct Supabase) but add Edge Function calls for mutations
      // This provides a hybrid approach: reads from Supabase for speed, writes through Edge Functions
      const syncTableCollection = async <T extends { id: string; workspace_id: string; updated_at: string }>(
        tableName: string,
        tableSettled: PromiseSettledResult<any>,
        _metaField: string,
        localList: T[],
        storageKey: string,
        applyMergedFn: (merged: T[]) => void
      ) => {
        const remoteList: T[] = [];
        if (tableSettled.status === 'fulfilled') {
          const val = tableSettled.value;
          if (Array.isArray(val)) {
            remoteList.push(...val);
          } else if (Array.isArray(val?.data)) {
            remoteList.push(...val.data);
          }
        }

        if (
          remoteList.length > 0 ||
          localList.length > 0 ||
          tableSettled.status === 'fulfilled'
        ) {
          const rec = reconcileV2Records<T>({
            remoteRecords: remoteList,
            localRecords: localList,
            confirmedCloudIds: confirmed,
            deletedTombstoneIds: deleted,
            canonicalWorkspaceId: canonicalWsId,
          });
          applyMergedFn(rec.merged);
          saveJSON(storageKey, rec.merged);
          rec.nextConfirmedCloudIds.forEach((id) => nextConfirmed.add(id));
          for (const item of rec.toUpsertToCloud) {
            await upsertCloudRow(tableName, item as Record<string, any>);
            nextConfirmed.add(item.id);
          }
          for (const delId of rec.toDeleteFromCloud) {
            await deleteCloudRow(tableName, delId);
          }
        }
      };

      await syncTableCollection('v2_accounts', accRes, 'accounts', get().accounts, KEYS.accounts, (merged) => set({ accounts: merged }));
      await syncTableCollection('v2_ledger_entries', entRes, 'entries', get().entries, KEYS.entries, (merged) => set({ entries: merged }));
      await syncTableCollection('v2_parties_dues', dueRes, 'dues', get().dues, KEYS.dues, (merged) => set({ dues: merged }));
      await syncTableCollection('v2_credit_cards', cardRes, 'cards', get().cards, KEYS.cards, (merged) => set({ cards: merged }));
      await syncTableCollection('v2_sheets', sheetRes, 'sheets', get().sheets, KEYS.sheets, (merged) => set({ sheets: merged }));
      await syncTableCollection('v2_notes', noteRes, 'notes', get().notes, KEYS.notes, (merged) => set({ notes: merged }));
      await syncTableCollection('v2_vault_items', vaultRes, 'vaultItems', get().vaultItems, KEYS.vault, (merged) => set({ vaultItems: merged }));

      saveConfirmedSet(nextConfirmed);
      scheduleMetadataSnapshotPush(get);
      set({
        syncStatus: 'synced',
        lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        syncError: null,
      });
    } catch (err: any) {
      set({
        syncStatus: 'local_ready',
        syncError: err?.message || 'Using local cache',
      });
    }
  },

  signInWithSupabase: async (email, password) => {
    const { client, isConfigured } = getSupabaseV2Client();
    if (!isConfigured) {
      return { ok: false, error: 'Cloud sync service is temporarily unavailable.' };
    }
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });
    if (error) return { ok: false, error: error.message };
    if (data?.user) {
      set({ userEmail: data.user.email || email, userId: data.user.id });
      get().logSecurityEvent('Cloud Account Signed In', `Authenticated as ${data.user.email || email}`);
      await get().syncNowWithCloud();
      setupRealtimeSubscription(client, data.user.id, get().syncNowWithCloud);
    }
    return { ok: true };
  },

  signUpWithSupabase: async (email, password) => {
    const { client, isConfigured } = getSupabaseV2Client();
    if (!isConfigured) {
      return { ok: false, error: 'Cloud sync service is temporarily unavailable.' };
    }
    const { data, error } = await client.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });
    if (error) return { ok: false, error: error.message };
    if (data?.user) {
      set({ userEmail: data.user.email || email, userId: data.user.id });
      get().logSecurityEvent('Cloud Account Created', `Registered ${data.user.email || email}`);
      await get().syncNowWithCloud();
      setupRealtimeSubscription(client, data.user.id, get().syncNowWithCloud);
    }
    return { ok: true };
  },

  signOutSupabase: async () => {
    const prevEmail = get().userEmail;
    const { client, isConfigured } = getSupabaseV2Client();
    if (typeof window !== 'undefined') {
      (window as any).__rb_v2_realtime_bound = false;
      Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    }
    if (isConfigured) {
      client.removeAllChannels().catch(() => {});
      await client.auth.signOut().catch(() => {});
    }
    set({
      userEmail: null,
      userId: null,
      syncStatus: 'local_ready',
      accounts: [],
      entries: [],
      dues: [],
      cards: [],
      sheets: [],
      notes: [],
      vaultItems: [],
    });
    get().logSecurityEvent('Cloud Account Signed Out', prevEmail ? `Signed out ${prevEmail}` : 'Session ended');
  },

  exportFullBackupJson: () => {
    const s = get();
    return JSON.stringify(
      {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        workspace: s.workspace,
        accounts: s.accounts,
        entries: s.entries,
        dues: s.dues,
        cards: s.cards,
        sheets: s.sheets,
        notes: s.notes,
        vaultItems: s.vaultItems,
      },
      null,
      2
    );
  },

  importFullBackupJson: (rawJson) => {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed || typeof parsed !== 'object') {
        return { ok: false, error: 'Invalid backup JSON format' };
      }
      if (Array.isArray(parsed.accounts)) {
        set({ accounts: parsed.accounts });
        saveJSON(KEYS.accounts, parsed.accounts);
      }
      if (Array.isArray(parsed.entries)) {
        set({ entries: parsed.entries });
        saveJSON(KEYS.entries, parsed.entries);
      }
      if (Array.isArray(parsed.dues)) {
        set({ dues: parsed.dues });
        saveJSON(KEYS.dues, parsed.dues);
      }
      if (Array.isArray(parsed.cards)) {
        set({ cards: parsed.cards });
        saveJSON(KEYS.cards, parsed.cards);
      }
      if (Array.isArray(parsed.sheets)) {
        set({ sheets: parsed.sheets });
        saveJSON(KEYS.sheets, parsed.sheets);
      }
      if (Array.isArray(parsed.notes)) {
        set({ notes: parsed.notes });
        saveJSON(KEYS.notes, parsed.notes);
      }
      if (Array.isArray(parsed.vaultItems)) {
        set({ vaultItems: parsed.vaultItems });
        saveJSON(KEYS.vault, parsed.vaultItems);
      }
      void get().syncNowWithCloud();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Failed to parse JSON' };
    }
  },

  loadSampleWorkspaceData: async () => {
    const now = new Date().toISOString();
    const wsId = get().workspace.id;
    const sampleAccounts: V2Account[] = [
      {
        id: 'a1111111-1111-4111-8111-111111111101',
        workspace_id: wsId,
        name: 'HDFC Business Current',
        account_type: 'current',
        bank_name: 'HDFC Bank',
        account_number_last4: '4829',
        ifsc: 'HDFC0001204',
        balance_paise: 24500000,
        is_default: true,
        scope: 'business',
        notes: 'Primary merchant settlement & GST account',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1111111-1111-4111-8111-111111111102',
        workspace_id: wsId,
        name: 'SBI Personal Savings',
        account_type: 'savings',
        bank_name: 'State Bank of India',
        account_number_last4: '9104',
        ifsc: 'SBIN0004321',
        balance_paise: 8650000,
        is_default: false,
        scope: 'personal',
        notes: 'Personal savings & emergency liquidity reserve',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a1111111-1111-4111-8111-111111111103',
        workspace_id: wsId,
        name: 'Store Cash Drawer (Galla)',
        account_type: 'cash',
        bank_name: 'Physical Cash',
        account_number_last4: 'CASH',
        balance_paise: 3240000,
        is_default: false,
        scope: 'business',
        notes: 'Daily counter cash & petty cash float',
        created_at: now,
        updated_at: now,
      },
    ];

    const sampleEntries: V2LedgerEntry[] = [
      {
        id: 'e2222222-2222-4222-8222-222222222201',
        workspace_id: wsId,
        entry_type: 'cash_in',
        amount_paise: 6800000,
        category: 'Wholesale Invoice Settlement',
        payment_mode: 'upi',
        account_id: 'a1111111-1111-4111-8111-111111111101',
        note: 'Received Q4 batch order payment from Apex Retailers',
        entry_date: now,
        scope: 'business',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'e2222222-2222-4222-8222-222222222202',
        workspace_id: wsId,
        entry_type: 'expense',
        amount_paise: 1450000,
        category: 'Logistics & Freight',
        payment_mode: 'bank',
        account_id: 'a1111111-1111-4111-8111-111111111101',
        note: 'Regional dispatch transport & packaging invoice',
        entry_date: now,
        scope: 'business',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'e2222222-2222-4222-8222-222222222203',
        workspace_id: wsId,
        entry_type: 'expense',
        amount_paise: 420000,
        category: 'Household Groceries & Utilities',
        payment_mode: 'upi',
        account_id: 'a1111111-1111-4111-8111-111111111102',
        note: 'Monthly electricity & organic provisions',
        entry_date: now,
        scope: 'family',
        created_at: now,
        updated_at: now,
      },
    ];

    const sampleDues: V2PartyDue[] = [
      {
        id: 'd3333333-3333-4333-8333-333333333301',
        workspace_id: wsId,
        party_name: 'Kalyani Electronics & Traders',
        phone: '+91 98301 44210',
        party_type: 'customer',
        direction: 'receivable',
        total_amount_paise: 4500000,
        paid_amount_paise: 1500000,
        due_date: '2026-11-12',
        status: 'partial',
        scope: 'business',
        notes: 'Invoice #INV-2084 balance receivable',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'd3333333-3333-4333-8333-333333333302',
        workspace_id: wsId,
        party_name: 'Eastern Packaging Pvt Ltd',
        phone: '+91 98312 77890',
        party_type: 'supplier',
        direction: 'payable',
        total_amount_paise: 1850000,
        paid_amount_paise: 0,
        due_date: '2026-11-10',
        status: 'pending',
        scope: 'business',
        notes: 'Corrugated carton supply batch #11',
        created_at: now,
        updated_at: now,
      },
    ];

    const sampleCards: V2CreditCard[] = [
      {
        id: 'c4444444-4444-4444-8444-444444444401',
        workspace_id: wsId,
        card_name: 'HDFC Regalia Gold Business',
        bank_name: 'HDFC Bank',
        last4: '8842',
        network: 'visa',
        credit_limit_paise: 50000000,
        utilized_paise: 4250000,
        statement_day: 18,
        due_day: 5,
        scope: 'business',
        notes: 'Cloud SaaS subscriptions & vendor travel',
        created_at: now,
        updated_at: now,
      },
    ];

    const sampleSheets: V2Sheet[] = [
      {
        id: '55555555-5555-4555-8555-555555555501',
        workspace_id: wsId,
        title: 'November GST Sales & Dispatch Register',
        category: 'Tax & GST Register',
        scope: 'business',
        columns: [
          { id: 'col_inv', name: 'Invoice No', type: 'text' },
          { id: 'col_party', name: 'Party Name', type: 'text' },
          { id: 'col_taxable', name: 'Taxable Value (₹)', type: 'currency' },
          { id: 'col_gst', name: 'GST 18% (₹)', type: 'currency' },
          { id: 'col_total', name: 'Invoice Total (₹)', type: 'currency' },
        ],
        rows: [
          {
            id: 'row-1',
            cells: {
              col_inv: 'GST/26-27/101',
              col_party: 'Apex Retailers',
              col_taxable: 57627,
              col_gst: 10373,
              col_total: 68000,
            },
          },
          {
            id: 'row-2',
            cells: {
              col_inv: 'GST/26-27/102',
              col_party: 'Kalyani Electronics',
              col_taxable: 38136,
              col_gst: 6864,
              col_total: 45000,
            },
          },
        ],
        created_at: now,
        updated_at: now,
      },
    ];

    const sampleNotes: V2Note[] = [
      {
        id: '66666666-6666-4666-8666-666666666601',
        workspace_id: wsId,
        title: 'Weekly Dispatch & Supplier Payout Checklist',
        body: 'Auto-calculated checklist for warehouse restocking and courier settlement.',
        checklist_items: [
          { id: 'chk-1', text: 'Clear BlueDart air freight bill ₹3,200', checked: true, amount_paise: 320000 },
          { id: 'chk-2', text: 'Order barcode thermal labels ₹1,450', checked: false, amount_paise: 145000 },
          { id: 'chk-3', text: 'Warehouse tea & staff refreshments ₹650', checked: false, amount_paise: 65000 },
        ],
        calculated_total_paise: 530000,
        color_theme: 'amber',
        priority: 'high',
        is_pinned: true,
        is_archived: false,
        is_trashed: false,
        reminder_date: '2026-11-06',
        tags: ['dispatch', 'supplier', 'weekly'],
        scope: 'business',
        created_at: now,
        updated_at: now,
      },
    ];

    saveJSON(KEYS.deletedIds, []);
    set({
      accounts: sampleAccounts,
      entries: sampleEntries,
      dues: sampleDues,
      cards: sampleCards,
      sheets: sampleSheets,
      notes: sampleNotes,
    });
    saveJSON(KEYS.accounts, sampleAccounts);
    saveJSON(KEYS.entries, sampleEntries);
    saveJSON(KEYS.dues, sampleDues);
    saveJSON(KEYS.cards, sampleCards);
    saveJSON(KEYS.sheets, sampleSheets);
    saveJSON(KEYS.notes, sampleNotes);
    await get().syncNowWithCloud();
  },

  clearAllWorkspaceData: async () => {
    const st = get();
    const allIds = [
      ...st.accounts.map((a) => ({ table: 'v2_accounts', id: a.id })),
      ...st.entries.map((e) => ({ table: 'v2_ledger_entries', id: e.id })),
      ...st.dues.map((d) => ({ table: 'v2_parties_dues', id: d.id })),
      ...st.cards.map((c) => ({ table: 'v2_credit_cards', id: c.id })),
      ...st.sheets.map((s) => ({ table: 'v2_sheets', id: s.id })),
      ...st.notes.map((n) => ({ table: 'v2_notes', id: n.id })),
      ...st.vaultItems.map((v) => ({ table: 'v2_vault_items', id: v.id })),
    ];
    allIds.forEach((item) => recordTombstone(item.id));
    set({
      accounts: [],
      entries: [],
      dues: [],
      cards: [],
      sheets: [],
      notes: [],
      vaultItems: [],
    });
    saveJSON(KEYS.accounts, []);
    saveJSON(KEYS.entries, []);
    saveJSON(KEYS.dues, []);
    saveJSON(KEYS.cards, []);
    saveJSON(KEYS.sheets, []);
    saveJSON(KEYS.notes, []);
    saveJSON(KEYS.vault, []);
    for (const item of allIds) {
      try {
        // Delete via Edge Functions based on table
        switch (item.table) {
          case 'v2_accounts':
            await edgeApi.accounts.delete(item.id);
            break;
          case 'v2_ledger_entries':
            await edgeApi.ledger.delete(item.id);
            break;
          case 'v2_parties_dues':
            await edgeApi.dues.delete(item.id);
            break;
          case 'v2_credit_cards':
            await edgeApi.creditCards.delete(item.id);
            break;
          case 'v2_sheets':
            await edgeApi.sheets.delete(item.id);
            break;
          case 'v2_notes':
            await edgeApi.notes.delete(item.id, true);
            break;
          case 'v2_vault_items':
            await edgeApi.vault.delete(item.id);
            break;
        }
      } catch (err) {
        console.error(`Edge function delete ${item.table} failed:`, err);
      }
    }
    scheduleMetadataSnapshotPush(get);
  },
}));

// Need to import getSupabaseV2Client for sync
import { getSupabaseV2Client } from '@/v2/supabaseClient';

// Upsert/delete helpers (using Supabase client for cloud writes in this hybrid approach)
async function upsertCloudRow(table: string, row: Record<string, any>) {
  const { client, isConfigured } = getSupabaseV2Client();
  if (!isConfigured) return;
  try {
    const { data: sessionData } = await client.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (!uid) return;
    const payload = { ...row, owner_id: uid };
    const { error } = await client.from(table).upsert(payload);
    if (!error && row.id) {
      const confirmed = getConfirmedSet();
      confirmed.add(row.id);
      saveConfirmedSet(confirmed);
    }
  } catch {}
}

async function deleteCloudRow(table: string, id: string) {
  const { client, isConfigured } = getSupabaseV2Client();
  if (!isConfigured) return;
  try {
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData?.session?.user) return;
    await client.from(table).delete().eq('id', id);
  } catch {}
}

function scheduleMetadataSnapshotPush(_getState?: () => V2StoreState) {
  // Intentionally no-op: Writing entire workspace snapshot into user_metadata bloats the Supabase JWT
  // causing HTTP 431 (Request Header Fields Too Large). PostgreSQL tables are the source of truth.
}