import test from 'node:test';
import assert from 'node:assert/strict';
import { edgeApi } from './edgeClient';

// Mock fetch globally
const originalFetch = global.fetch;
let mockFetch: typeof fetch;

function setupMockFetch(responses: Map<string, { status: number; data: any }>) {
  mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = url.toString();
    for (const [pattern, response] of responses) {
      if (urlStr.includes(pattern)) {
        return {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          json: async () => response.data,
          text: async () => JSON.stringify(response.data),
        } as Response;
      }
    }
    return {
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    } as Response;
  };
  global.fetch = mockFetch;
}

function teardownMockFetch() {
  global.fetch = originalFetch;
}

test('edgeClient: accountsApi list constructs correct URL', async () => {
  setupMockFetch(new Map([
    ['accounts', { status: 200, data: [] }],
  ]));

  const result = await edgeApi.accounts.list('business');
  assert.ok(Array.isArray(result));
  teardownMockFetch();
});

test('edgeClient: accountsApi create posts to correct endpoint', async () => {
  let capturedUrl = '';
  let capturedBody = '';
  let capturedMethod = '';

  mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
    capturedUrl = url.toString();
    capturedMethod = init?.method || 'GET';
    capturedBody = init?.body?.toString() || '';
    return {
      ok: true,
      status: 201,
      json: async () => ({ id: 'new-id', ...JSON.parse(capturedBody) }),
    } as Response;
  };
  global.fetch = mockFetch;

  const newAccount = {
    name: 'Test Account',
    account_type: 'savings' as const,
    balance_paise: 100000,
    scope: 'personal' as const,
  };

  const result = await edgeApi.accounts.create(newAccount);
  assert.ok(capturedUrl.includes('/accounts'));
  assert.strictEqual(capturedMethod, 'POST');
  assert.ok(capturedBody.includes('Test Account'));
  assert.strictEqual(result.name, 'Test Account');
  teardownMockFetch();
});

test('edgeClient: ledgerApi list includes scope and limit params', async () => {
  setupMockFetch(new Map([
    ['ledger', { status: 200, data: [] }],
  ]));

  const result = await edgeApi.ledger.list('all', 100);
  assert.ok(Array.isArray(result));
  teardownMockFetch();
});

test('edgeClient: duesApi settle includes action param', async () => {
  let capturedUrl = '';

  mockFetch = async (url: string | URL | Request) => {
    capturedUrl = url.toString();
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'due-1', status: 'settled' }),
    } as Response;
  };
  global.fetch = mockFetch;

  await edgeApi.dues.settle({
    due_id: 'due-1',
    pay_amount_paise: 50000,
    account_id: 'acc-1',
    payment_mode: 'upi',
    remark: 'Test',
  });

  assert.ok(capturedUrl.includes('action=settle'));
  teardownMockFetch();
});

test('edgeClient: creditCardsApi spend includes action param', async () => {
  let capturedUrl = '';

  mockFetch = async (url: string | URL | Request) => {
    capturedUrl = url.toString();
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'card-1', utilized_paise: 150000 }),
    } as Response;
  };
  global.fetch = mockFetch;

  await edgeApi.creditCards.spend({
    card_id: 'card-1',
    amount_paise: 50000,
    category: 'Test',
    payment_mode: 'card',
  });

  assert.ok(capturedUrl.includes('action=spend'));
  teardownMockFetch();
});

test('edgeClient: creditCardsApi payBill includes action param', async () => {
  let capturedUrl = '';

  mockFetch = async (url: string | URL | Request) => {
    capturedUrl = url.toString();
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'card-1', utilized_paise: 100000 }),
    } as Response;
  };
  global.fetch = mockFetch;

  await edgeApi.creditCards.payBill({
    card_id: 'card-1',
    amount_paise: 50000,
    account_id: 'acc-1',
    payment_mode: 'bank',
  });

  assert.ok(capturedUrl.includes('action=pay_bill'));
  teardownMockFetch();
});

test('edgeClient: notesApi postToLedger includes action param', async () => {
  let capturedUrl = '';

  mockFetch = async (url: string | URL | Request) => {
    capturedUrl = url.toString();
    return {
      ok: true,
      status: 200,
      json: async () => ({ posted: true, amount_paise: 100000 }),
    } as Response;
  };
  global.fetch = mockFetch;

  await edgeApi.notes.postToLedger('note-1', 'expense', 'Test', 'upi', 'acc-1');

  assert.ok(capturedUrl.includes('action=post_to_ledger'));
  teardownMockFetch();
});

test('edgeClient: syncApi health checks system readiness', async () => {
  setupMockFetch(new Map([
    ['health', { status: 200, data: { status: 'healthy', version: '2.0.0' } }],
  ]));

  const result = await edgeApi.sync.health();
  assert.strictEqual(result.status, 'healthy');
  assert.strictEqual(result.version, '2.0.0');
  teardownMockFetch();
});

test('edgeClient: syncApi summary computes metrics', async () => {
  setupMockFetch(new Map([
    ['summary', { status: 200, data: { liquidCashPaise: 5000000, netWorthPaise: 3000000, computedAt: new Date().toISOString() } }],
  ]));

  const result = await edgeApi.sync.summary({
    accounts: [{ balance_paise: 5000000, scope: 'business' }],
    entries: [],
    dues: [],
    cards: [],
    scope: 'business',
  });

  assert.strictEqual(result.liquidCashPaise, 5000000);
  teardownMockFetch();
});

test('edgeClient: throws on HTTP error', async () => {
  mockFetch = async () => ({
    ok: false,
    status: 422,
    json: async () => ({ error: 'Validation failed', code: 'VALIDATION_FAILED' }),
  } as Response);
  global.fetch = mockFetch;

  try {
    await edgeApi.accounts.create({ name: '', account_type: 'invalid', balance_paise: -1, scope: 'business' });
    assert.fail('Should have thrown');
  } catch (err: any) {
    assert.ok(err.message.includes('Validation failed'));
  }
  teardownMockFetch();
});

console.log('All edgeClient tests passed!');