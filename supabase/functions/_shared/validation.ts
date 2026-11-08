// Boundary validation for Edge Function payloads.
// Rejects malformed data before it touches PostgreSQL — the trust-boundary
// check the client cannot be trusted to perform on its own.

import { corsHeaders } from './types.ts';

export const VALID_SPHERES = ['business', 'personal', 'family'] as const;
export const VALID_ACCOUNT_TYPES = ['savings', 'current', 'cash', 'upi', 'od_cc'] as const;
export const VALID_ENTRY_TYPES = [
  'cash_in',
  'cash_out',
  'expense',
  'transfer',
  'card_spend',
  'card_payment',
  'due_settlement',
] as const;
export const VALID_PAYMENT_MODES = ['cash', 'upi', 'bank', 'card'] as const;
export const VALID_DIRECTIONS = ['receivable', 'payable'] as const;
export const VALID_CARD_NETWORKS = ['visa', 'mastercard', 'rupay', 'amex'] as const;
export const VALID_NOTE_PRIORITIES = ['low', 'medium', 'high'] as const;
export const VALID_VAULT_CATEGORIES = ['login', 'bank_pin', 'card_pin', 'secret_note'] as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPaise(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}

export function isUuid(s: unknown): s is string {
  return typeof s === 'string' && UUID_RE.test(s);
}

export function isNonEmpty(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0 && s.trim().length <= 200;
}

export function isScope(s: unknown): s is (typeof VALID_SPHERES)[number] {
  return typeof s === 'string' && (VALID_SPHERES as readonly string[]).includes(s);
}

export function assert(cond: unknown, message: string): void {
  if (!cond) throw new ValidationError(message);
}

export class ValidationError extends Error {
  status = 422;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function toResponse(e: unknown): Response {
  if (e instanceof ValidationError) {
    return new Response(
      JSON.stringify({ error: e.message, code: 'VALIDATION_FAILED' }),
      { status: e.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
  if (e instanceof Error && e.message === 'UNAUTHORIZED') {
    return new Response(
      JSON.stringify({ error: 'Authentication required', code: 'UNAUTHORIZED' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
  if (e instanceof Error && e.message === 'WORKSPACE_UNAVAILABLE') {
    return new Response(
      JSON.stringify({ error: 'Workspace unavailable', code: 'WORKSPACE_UNAVAILABLE' }),
      { status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
  console.error('Unhandled function error:', e);
  return new Response(
    JSON.stringify({ error: 'Internal server error', code: 'INTERNAL' }),
    { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}