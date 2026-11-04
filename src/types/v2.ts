export type SphereScope = 'business' | 'personal' | 'family';

export type ModuleId =
  | 'overview'
  | 'bank'
  | 'expenses'
  | 'dues'
  | 'cards'
  | 'sheets'
  | 'notes'
  | 'vault'
  | 'reports';

export type AccountType = 'savings' | 'current' | 'cash' | 'upi' | 'od_cc';

export type LedgerEntryType =
  | 'cash_in'
  | 'cash_out'
  | 'expense'
  | 'transfer'
  | 'card_spend'
  | 'card_payment'
  | 'due_settlement';

export type PaymentMode = 'cash' | 'upi' | 'bank' | 'card';

export type DueDirection = 'receivable' | 'payable';
export type DueStatus = 'pending' | 'partial' | 'settled';

export type CardNetwork = 'visa' | 'mastercard' | 'rupay' | 'amex';

export type NotePriority = 'low' | 'medium' | 'high';
export type NoteColorTheme = 'amber' | 'indigo' | 'emerald' | 'rose' | 'sky' | 'violet';

export type VaultCategory = 'login' | 'bank_pin' | 'card_pin' | 'secret_note';

export interface V2Workspace {
  id: string;
  owner_id: string;
  name: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface V2Account {
  id: string;
  workspace_id: string;
  owner_id?: string;
  name: string;
  account_type: AccountType;
  bank_name?: string;
  account_number_last4?: string;
  ifsc?: string;
  balance_paise: number;
  is_default: boolean;
  scope: SphereScope;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface V2LedgerEntry {
  id: string;
  workspace_id: string;
  owner_id?: string;
  entry_type: LedgerEntryType;
  amount_paise: number;
  category: string;
  payment_mode: PaymentMode;
  account_id?: string | null;
  target_account_id?: string | null;
  party_id?: string | null;
  card_id?: string | null;
  note: string;
  entry_date: string;
  scope: SphereScope;
  created_at: string;
  updated_at: string;
}

export interface V2PartyDue {
  id: string;
  workspace_id: string;
  owner_id?: string;
  party_name: string;
  phone?: string;
  party_type: 'customer' | 'supplier';
  direction: DueDirection;
  total_amount_paise: number;
  paid_amount_paise: number;
  due_date: string;
  status: DueStatus;
  scope: SphereScope;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface V2CreditCard {
  id: string;
  workspace_id: string;
  owner_id?: string;
  card_name: string;
  bank_name: string;
  last4: string;
  network: CardNetwork;
  credit_limit_paise: number;
  utilized_paise: number;
  statement_day: number;
  due_day: number;
  scope: SphereScope;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SheetColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'currency' | 'date';
}

export interface SheetRow {
  id: string;
  cells: Record<string, string | number>;
}

export interface V2Sheet {
  id: string;
  workspace_id: string;
  owner_id?: string;
  title: string;
  category: string;
  columns: SheetColumn[];
  rows: SheetRow[];
  scope: SphereScope;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  amount_paise: number;
}

export interface V2Note {
  id: string;
  workspace_id: string;
  owner_id?: string;
  title: string;
  body: string;
  checklist_items: ChecklistItem[];
  calculated_total_paise: number;
  color_theme: NoteColorTheme;
  priority: NotePriority;
  is_pinned: boolean;
  is_archived: boolean;
  is_trashed: boolean;
  reminder_date?: string | null;
  tags: string[];
  scope: SphereScope;
  created_at: string;
  updated_at: string;
}

export interface V2VaultItem {
  id: string;
  workspace_id: string;
  owner_id?: string;
  title: string;
  category: VaultCategory;
  username?: string;
  cipher_text: string;
  iv: string;
  salt: string;
  url?: string;
  notes?: string;
  scope: SphereScope;
  created_at: string;
  updated_at: string;
}

export interface OverviewMetrics {
  liquidCashPaise: number;
  totalReceivablePaise: number;
  totalPayablePaise: number;
  cardUtilizedPaise: number;
  cardLimitPaise: number;
  totalIncomePaise: number;
  totalExpensePaise: number;
  netWorthPaise: number;
}
