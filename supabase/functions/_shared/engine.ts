// Pure integer-paise financial computation for Edge Functions.
// Mirrors src/v2/engine/financialEngine.ts so the server can derive summary
// metrics without importing the frontend bundle. All math is integer-only.

export type SphereScope = 'business' | 'personal' | 'family';

export interface SummaryInput {
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

export interface SummaryOutput {
  liquidCashPaise: number;
  totalReceivablePaise: number;
  totalPayablePaise: number;
  cardUtilizedPaise: number;
  cardLimitPaise: number;
  totalIncomePaise: number;
  totalExpensePaise: number;
  netWorthPaise: number;
}

function inScope(scope: SphereScope, filter: 'all' | SphereScope): boolean {
  return filter === 'all' || scope === filter;
}

// Accounts with type OD/CC are credit facilities, not liquid cash.
function isLiquid(accountType: string): boolean {
  return accountType !== 'od_cc';
}

export function computeSummary(input: SummaryInput): SummaryOutput {
  const filter = input.scope ?? 'all';

  let liquidCashPaise = 0;
  let cardUtilizedPaise = 0;
  let cardLimitPaise = 0;
  let totalIncomePaise = 0;
  let totalExpensePaise = 0;

  for (const a of input.accounts) {
    if (!inScope(a.scope, filter)) continue;
    if (isLiquid((a as { account_type?: string }).account_type ?? 'savings')) {
      liquidCashPaise += a.balance_paise;
    }
  }

  for (const c of input.cards) {
    if (!inScope(c.scope, filter)) continue;
    cardUtilizedPaise += c.utilized_paise;
    cardLimitPaise += c.credit_limit_paise;
  }

  for (const e of input.entries) {
    if (!inScope(e.scope, filter)) continue;
    if (e.entry_type === 'cash_in') {
      totalIncomePaise += e.amount_paise;
    } else if (e.entry_type === 'expense' || e.entry_type === 'cash_out') {
      totalExpensePaise += e.amount_paise;
    }
  }

  let totalReceivablePaise = 0;
  let totalPayablePaise = 0;
  for (const d of input.dues) {
    if (!inScope(d.scope, filter)) continue;
    if (d.status === 'settled') continue;
    const outstanding = d.total_amount_paise - d.paid_amount_paise;
    if (outstanding <= 0) continue;
    if (d.direction === 'receivable') {
      totalReceivablePaise += outstanding;
    } else {
      totalPayablePaise += outstanding;
    }
  }

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