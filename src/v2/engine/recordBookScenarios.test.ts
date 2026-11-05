import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rupeesToPaise,
  paiseToRupees,
  formatINR,
  formatINRFromPaise,
  ensureValidUuid,
  extractPaiseFromText,
  computeNoteChecklistTotals,
  computeOverviewMetrics,
} from './financialEngine';
import { V2Account, V2CreditCard, V2LedgerEntry, V2PartyDue } from '../../types/v2';

test('Indian Rupee format and paise conversion edge cases', () => {
  // Test Lakhs & Crores formatting
  assert.equal(formatINR(10000000), '₹1,00,000'); // 1 Lakh (100,000 Rs in paise = 10,000,000)
  assert.equal(formatINR(1000000000), '₹1,00,00,000'); // 1 Crore (10,000,000 Rs in paise = 1,000,000,000)
  assert.equal(formatINR(0), '₹0');
  assert.equal(formatINR(50, true), '₹0.50'); // 50 paise
  assert.equal(formatINR(-500000), '-₹5,000'); // negative ₹5,000

  // Privacy masking
  assert.equal(formatINRFromPaise(99999999, { masked: true }), '₹ ••••••');
  assert.equal(formatINRFromPaise(0, { masked: true }), '₹ ••••••');

  // Floating point precision safety
  assert.equal(rupeesToPaise('0.10'), 10);
  assert.equal(rupeesToPaise('0.20'), 20);
  assert.equal(rupeesToPaise(0.1 + 0.2), 30); // Guard against standard JS 0.30000000000000004 drift!
  assert.equal(paiseToRupees(30), 0.3);
});

test('Checklist Rupee parser extracts various Indian billing notations', () => {
  assert.equal(extractPaiseFromText('Stationery bill ₹450'), 45000);
  assert.equal(extractPaiseFromText('Client lunch Rs 1,200.50'), 120050);
  assert.equal(extractPaiseFromText('Monthly internet bill INR 999'), 99900);
  assert.equal(extractPaiseFromText('Auto rickshaw fare 120'), 12000);
  assert.equal(extractPaiseFromText('No monetary text here'), 0);
  assert.equal(extractPaiseFromText(''), 0);
});

test('Scope filter correctly partitions multi-sphere financial portfolios', () => {
  const wsId = '11111111-2222-4333-8444-555555555555';
  const now = '2026-11-05T00:00:00.000Z';

  const accounts: V2Account[] = [
    {
      id: 'acc-biz',
      workspace_id: wsId,
      name: 'HDFC Business Current',
      account_type: 'current',
      balance_paise: 5000000, // ₹50,000
      is_default: true,
      scope: 'business',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'acc-personal',
      workspace_id: wsId,
      name: 'SBI Personal Savings',
      account_type: 'savings',
      balance_paise: 2000000, // ₹20,000
      is_default: false,
      scope: 'personal',
      created_at: now,
      updated_at: now,
    },
  ];

  const entries: V2LedgerEntry[] = [
    {
      id: 'tx-biz',
      workspace_id: wsId,
      entry_type: 'cash_in',
      amount_paise: 3000000, // ₹30,000
      category: 'Client Retainer',
      payment_mode: 'bank',
      note: 'Nov retainer',
      entry_date: now,
      scope: 'business',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tx-pers',
      workspace_id: wsId,
      entry_type: 'expense',
      amount_paise: 500000, // ₹5,000
      category: 'Groceries',
      payment_mode: 'upi',
      note: 'Supermarket',
      entry_date: now,
      scope: 'personal',
      created_at: now,
      updated_at: now,
    },
  ];

  const dues: V2PartyDue[] = [
    {
      id: 'due-1',
      workspace_id: wsId,
      party_name: 'Sharma Traders',
      party_type: 'customer',
      direction: 'receivable',
      total_amount_paise: 1500000, // ₹15,000
      paid_amount_paise: 500000, // ₹5,000 (Remaining = ₹10,000)
      due_date: now,
      status: 'partial',
      scope: 'business',
      created_at: now,
      updated_at: now,
    },
  ];

  const cards: V2CreditCard[] = [
    {
      id: 'card-1',
      workspace_id: wsId,
      card_name: 'Axis Bank Atlas',
      bank_name: 'Axis Bank',
      last4: '4421',
      network: 'visa',
      credit_limit_paise: 10000000, // ₹1,00,000
      utilized_paise: 2500000, // ₹25,000 (25% utilization)
      statement_day: 15,
      due_day: 5,
      scope: 'business',
      created_at: now,
      updated_at: now,
    },
  ];

  // 1. Business Scope Metrics
  const bizMetrics = computeOverviewMetrics({
    accounts,
    entries,
    dues,
    cards,
    scope: 'business',
  });
  assert.equal(bizMetrics.liquidCashPaise, 5000000); // Only business account ₹50,000
  assert.equal(bizMetrics.totalIncomePaise, 3000000); // ₹30,000
  assert.equal(bizMetrics.totalExpensePaise, 0); // Personal expense not included
  assert.equal(bizMetrics.totalReceivablePaise, 1000000); // ₹10,000 remaining
  assert.equal(bizMetrics.cardUtilizedPaise, 2500000); // ₹25,000
  // Net Worth = Liquid (50k) + Receivable (10k) - Card Utilized (25k) = ₹35,000 = 3500000 paise
  assert.equal(bizMetrics.netWorthPaise, 3500000);

  // 2. Personal Scope Metrics
  const persMetrics = computeOverviewMetrics({
    accounts,
    entries,
    dues,
    cards,
    scope: 'personal',
  });
  assert.equal(persMetrics.liquidCashPaise, 2000000); // Only personal account ₹20,000
  assert.equal(persMetrics.totalExpensePaise, 500000); // ₹5,000
  assert.equal(persMetrics.totalIncomePaise, 0);
  assert.equal(persMetrics.netWorthPaise, 2000000); // Liquid only (no cards or dues)

  // 3. Consolidated "All" Scope Metrics
  const allMetrics = computeOverviewMetrics({
    accounts,
    entries,
    dues,
    cards,
    scope: 'all',
  });
  assert.equal(allMetrics.liquidCashPaise, 7000000); // ₹70,000 (50k + 20k)
  assert.equal(allMetrics.totalIncomePaise, 3000000);
  assert.equal(allMetrics.totalExpensePaise, 500000);
  // Net Worth = Liquid (70k) + Receivable (10k) - Card Utilized (25k) = ₹55,000 = 5500000 paise
  assert.equal(allMetrics.netWorthPaise, 5500000);
});

test('ensureValidUuid guarantees RFC-4122 compliance for all inputs', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  assert.equal(ensureValidUuid(validUuid), validUuid);
  assert.equal(ensureValidUuid(validUuid.toUpperCase()), validUuid); // normalized to lowercase

  const fromRandomString = ensureValidUuid('custom-local-entry-12345');
  assert.match(
    fromRandomString,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );

  const fromEmpty = ensureValidUuid('');
  assert.match(
    fromEmpty,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
});
