// supabase/functions/accounts/index.ts
// CRUD for v2_accounts with server-side validation.
// Auth required. All payloads validated before hitting Postgres.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { err, ok } from '../_shared/types.ts';
import { getAuthContext } from '../_shared/auth.ts';
import {
  isPaise,
  isNonEmpty,
  isScope,
  ValidationError,
  toResponse,
  VALID_ACCOUNT_TYPES,
} from '../_shared/validation.ts';

Deno.serve(async (req: Request) => {
  try {
    const { userId, workspaceId, client } = await getAuthContext(req);

    if (req.method === 'GET') {
      const { data, error } = await client
        .from('v2_accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return ok(data ?? []);
    }

    if (req.method === 'POST') {
      const body = await req.json();
      if (!isNonEmpty(body?.name)) throw new ValidationError('name required');
      if (
        !VALID_ACCOUNT_TYPES.includes(body?.account_type ?? '')
      )
        throw new ValidationError('invalid account_type');
      if (!isPaise(body?.balance_paise ?? -1))
        throw new ValidationError('balance_paise must be non-negative integer');
      if (!isScope(body?.scope)) throw new ValidationError('invalid scope');

      const { data, error } = await client
        .from('v2_accounts')
        .insert({
          workspace_id: workspaceId,
          owner_id: userId,
          name: body.name.trim(),
          account_type: body.account_type,
          bank_name: body.bank_name ?? null,
          account_number_last4: body.account_number_last4 ?? null,
          ifsc: body.ifsc ?? null,
          balance_paise: body.balance_paise,
          is_default: body.is_default ?? false,
          scope: body.scope,
          notes: body.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return ok(data, { status: 201 });
    }

    if (req.method === 'PATCH') {
      const body = await req.json();
      if (!isUuid(body?.id)) throw new ValidationError('valid id required');

      const patch: Record<string, unknown> = {};
      if (body.name !== undefined) {
        if (!isNonEmpty(body.name)) throw new ValidationError('name cannot be empty');
        patch.name = body.name.trim();
      }
      if (body.account_type !== undefined) {
        if (!VALID_ACCOUNT_TYPES.includes(body.account_type))
          throw new ValidationError('invalid account_type');
        patch.account_type = body.account_type;
      }
      if (body.bank_name !== undefined) patch.bank_name = body.bank_name;
      if (body.account_number_last4 !== undefined)
        patch.account_number_last4 = body.account_number_last4;
      if (body.ifsc !== undefined) patch.ifsc = body.ifsc;
      if (body.balance_paise !== undefined) {
        if (!isPaise(body.balance_paise)) throw new ValidationError('invalid balance_paise');
        patch.balance_paise = body.balance_paise;
      }
      if (body.is_default !== undefined) patch.is_default = body.is_default;
      if (body.scope !== undefined) {
        if (!isScope(body.scope)) throw new ValidationError('invalid scope');
        patch.scope = body.scope;
      }
      if (body.notes !== undefined) patch.notes = body.notes;
      patch.updated_at = new Date().toISOString();

      const { data, error } = await client
        .from('v2_accounts')
        .update(patch)
        .eq('id', body.id)
        .eq('workspace_id', workspaceId)
        .select()
        .single();
      if (error) throw error;
      return ok(data);
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      if (!isUuid(id)) throw new ValidationError('valid id required');

      const { error } = await client
        .from('v2_accounts')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return ok({ deleted: id });
    }

    return new Response(null, { status: 405 });
  } catch (e) {
    return toResponse(e);
  }
});

// Helper to import from types
function isUuid(s: unknown): s is string {
  return (
    typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  );
}