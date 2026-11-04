import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rupeesToPaise,
  paiseToRupees,
  formatINR,
  ensureValidUuid,
  extractPaiseFromText,
  computeNoteChecklistTotals,
  computeOverviewMetrics,
  selectCanonicalV2Workspace,
  reconcileV2Records,
} from './financialEngine';

test('rupeesToPaise and paiseToRupees convert accurately without floating-point drift', () => {
  assert.equal(rupeesToPaise(19.99), 1999);
  assert.equal(rupeesToPaise('₹1,25,000.50'), 12500050);
  assert.equal(paiseToRupees(12500050), 125000.5);
  assert.equal(formatINR(12500000), '₹1,25,000');
});

test('extractPaiseFromText and computeNoteChecklistTotals extract live ₹ totals from checklist items', () => {
  assert.equal(extractPaiseFromText('Wholesale sugar stock ₹2,450'), 245000);
  assert.equal(extractPaiseFromText('Shop electricity bill Rs. 1800'), 180000);
  assert.equal(extractPaiseFromText('Courier charges 350'), 35000);

  const totals = computeNoteChecklistTotals([
    { id: '1', text: 'Supplier advance ₹5,000', checked: true, amount_paise: 0 },
    { id: '2', text: 'Packaging boxes ₹1,200', checked: false, amount_paise: 0 },
  ]);

  assert.equal(totals.totalPaise, 620000);
  assert.equal(totals.settledPaise, 500000);
  assert.equal(totals.pendingPaise, 120000);
});

test('computeOverviewMetrics calculates liquid cash, receivables, payables, card utilization, and net worth', () => {
  const wsId = '11111111-2222-4333-8444-555555555555';
  const now = '2026-11-04T00:00:00.000Z';

  const metrics = computeOverviewMetrics({
    accounts: [
      {
        id: 'acc-1',
        workspace_id: wsId,
        name: 'HDFC Current',
        account_type: 'current',
        balance_paise: 5000000, // ₹50,000
        is_default: true,
        scope: 'business',
        created_at: now,
        updated_at: now,
      },
    ],
    entries: [
      {
        id: 'tx-1',
        workspace_id: wsId,
        entry_type: 'cash_in',
        amount_paise: 2000000,
        category: 'Sales',
        payment_mode: 'upi',
        note: 'Client invoice',
        entry_date: now,
        scope: 'business',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'tx-2',
        workspace_id: wsId,
        entry_type: 'expense',
        amount_paise: 500000,
        category: 'Rent',
        payment_mode: 'bank',
        note: 'Office rent',
        entry_date: now,
        scope: 'business',
        created_at: now,
        updated_at: now,
      },
    ],
    dues: [
      {
        id: 'due-1',
        workspace_id: wsId,
        party_name: 'Ramesh Traders',
        party_type: 'customer',
        direction: 'receivable',
        total_amount_paise: 1500000, // ₹15,000
        paid_amount_paise: 500000, // ₹5,000 paid -> ₹10,000 remaining
        due_date: now,
        status: 'partial',
        scope: 'business',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'due-2',
        workspace_id: wsId,
        party_name: 'Metro Distributors',
        party_type: 'supplier',
        direction: 'payable',
        total_amount_paise: 400000, // ₹4,000 payable
        paid_amount_paise: 0,
        due_date: now,
        status: 'pending',
        scope: 'business',
        created_at: now,
        updated_at: now,
      },
    ],
    cards: [
      {
        id: 'card-1',
        workspace_id: wsId,
        card_name: 'ICICI Sapphiro',
        bank_name: 'ICICI Bank',
        last4: '4821',
        network: 'visa',
        credit_limit_paise: 30000000,
        utilized_paise: 600000, // ₹6,000 utilized
        statement_day: 18,
        due_day: 5,
        scope: 'business',
        created_at: now,
        updated_at: now,
      },
    ],
    scopeFilter: 'all',
  });

  // Net worth = 50,000 + 10,000 - 4,000 - 6,000 = ₹50,000 (5000000 paise)
  assert.equal(metrics.liquidCashPaise, 5000000);
  assert.equal(metrics.totalReceivablePaise, 1000000);
  assert.equal(metrics.totalPayablePaise, 400000);
  assert.equal(metrics.cardUtilizedPaise, 600000);
  assert.equal(metrics.netWorthPaise, 5000000);
});

test('reconcileV2Records converges Web and Mobile datasets without dropping unconfirmed local records', () => {
  const canonicalWs = '11111111-2222-4333-8444-555555555555';
  const now = '2026-11-04T05:00:00.000Z';

  const remoteRecords = [
    { id: 'rec-shared', workspace_id: canonicalWs, updated_at: now, name: 'SBI Savings' },
  ];

  const localRecords = [
    { id: 'rec-shared', workspace_id: canonicalWs, updated_at: now, name: 'SBI Savings' },
    { id: 'rec-deleted-on-web', workspace_id: canonicalWs, updated_at: now, name: 'Old Closed Account' },
    { id: ensureValidUuid('rec-new-on-mobile'), workspace_id: canonicalWs, updated_at: now, name: 'Galla Cash Box' },
  ];

  // rec-shared and rec-deleted-on-web were previously confirmed in cloud; rec-new-on-mobile is new
  const confirmedCloudIds = new Set(['rec-shared', 'rec-deleted-on-web']);

  const result = reconcileV2Records({
    remoteRecords,
    localRecords,
    confirmedCloudIds,
    deletedTombstoneIds: new Set(),
    canonicalWorkspaceId: canonicalWs,
  });

  assert.equal(result.merged.length, 2);
  assert.equal(result.toUpsertToCloud.length, 1);
  assert.equal(result.toUpsertToCloud[0].name, 'Galla Cash Box');
  // Unconfirmed local record is not prematurely marked in nextConfirmedCloudIds until upsert succeeds
  assert.equal(result.nextConfirmedCloudIds.has(ensureValidUuid('rec-new-on-mobile')), false);
});

test('selectCanonicalV2Workspace deterministically selects workspace with highest record count', () => {
  const wsA = {
    id: 'aaaaaaaa-1111-4111-8111-111111111111',
    owner_id: 'u1',
    name: 'WS A',
    currency: 'INR',
    created_at: '2026-11-01T00:00:00.000Z',
    updated_at: '2026-11-01T00:00:00.000Z',
  };
  const wsB = {
    id: 'bbbbbbbb-2222-4222-8222-222222222222',
    owner_id: 'u1',
    name: 'WS B',
    currency: 'INR',
    created_at: '2026-11-02T00:00:00.000Z',
    updated_at: '2026-11-02T00:00:00.000Z',
  };
  const counts = new Map([
    [wsA.id, 3],
    [wsB.id, 18],
  ]);

  assert.equal(selectCanonicalV2Workspace([wsA, wsB], counts)?.id, wsB.id);
});
