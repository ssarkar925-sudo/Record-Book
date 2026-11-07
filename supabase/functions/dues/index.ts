// supabase/functions/dues/index.ts
// CRUD for v2_parties_dues with settlement logic. Auth required.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { err, ok } from '../_shared/types.ts';
import { getAuthContext } from '../_shared/auth.ts';
import {
  isPaise,
  isNonEmpty,
  isScope,
  isUuid,
  ValidationError,
  toResponse,
  VALID_DIRECTIONS,
} from '../_shared/validation.ts';

Deno.serve(async (req: Request) => {
  try {
    const { userId, workspaceId, client } = await getAuthContext(req);

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const scope = url.searchParams.get('scope') ?? 'all';

      let query = client
        .from('v2_parties_dues')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('due_date', { ascending: true });

      if (scope !== 'all' && scope) {
        query = query.eq('scope', scope);
      }

      const { data, error } = await query;
      if (error) throw error;
      return ok(data ?? []);
    }

    if (req.method === 'POST') {
      const body = await req.json();
      if (!isNonEmpty(body?.party_name)) throw new ValidationError('party_name required');
      if (!VALID_DIRECTIONS.includes(body?.direction ?? ''))
        throw new ValidationError('direction must be receivable or payable');
      if (!isPaise(body?.total_amount_paise ?? -1))
        throw new ValidationError('total_amount_paise must be non-negative integer');
      if (!isScope(body?.scope)) throw new ValidationError('invalid scope');
      if (body?.due_date === undefined)
        throw new ValidationError('due_date required');

      const { data, error } = await client
        .from('v2_parties_dues')
        .insert({
          workspace_id: workspaceId,
          owner_id: userId,
          party_name: body.party_name.trim(),
          phone: body.phone ?? null,
          party_type: body.party_type ?? 'customer',
          direction: body.direction,
          total_amount_paise: body.total_amount_paise,
          paid_amount_paise: 0,
          due_date: body.due_date,
          status: 'pending',
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
      if (body.party_name !== undefined) {
        if (!isNonEmpty(body.party_name)) throw new ValidationError('party_name cannot be empty');
        patch.party_name = body.party_name.trim();
      }
      if (body.phone !== undefined) patch.phone = body.phone;
      if (body.party_type !== undefined) patch.party_type = body.party_type;
      if (body.direction !== undefined) {
        if (!VALID_DIRECTIONS.includes(body.direction))
          throw new ValidationError('invalid direction');
        patch.direction = body.direction;
      }
      if (body.total_amount_paise !== undefined) {
        if (!isPaise(body.total_amount_paise)) throw new ValidationError('invalid total_amount_paise');
        patch.total_amount_paise = body.total_amount_paise;
      }
      if (body.due_date !== undefined) patch.due_date = body.due_date;
      if (body.scope !== undefined) {
        if (!isScope(body.scope)) throw new ValidationError('invalid scope');
        patch.scope = body.scope;
      }
      if (body.notes !== undefined) patch.notes = body.notes;
      patch.updated_at = new Date().toISOString();

      const { data, error } = await client
        .from('v2_parties_dues')
        .update(patch)
        .eq('id', body.id)
        .eq('workspace_id', workspaceId)
        .select()
        .single();
      if (error) throw error;
      return ok(data);
    }

    if (req.method === 'POST') {
      // Settlement endpoint: /dues?action=settle
      const url = new URL(req.url);
      if (url.searchParams.get('action') === 'settle') {
        const body = await req.json();
        if (!isUuid(body?.due_id)) throw new ValidationError('due_id required');
        if (!isPaise(body?.pay_amount_paise ?? -1))
          throw new ValidationError('pay_amount_paise required');
        if (!isUuid(body?.account_id)) throw new ValidationError('account_id required');
        if (!['cash', 'upi', 'bank', 'card'].includes(body?.payment_mode ?? ''))
          throw new ValidationError('invalid payment_mode');

        // Get the due
        const { data: due, error: dueErr } = await client
          .from('v2_parties_dues')
          .select('*')
          .eq('id', body.due_id)
          .eq('workspace_id', workspaceId)
          .single();
        if (dueErr || !due) throw new ValidationError('due not found');

        const newPaid = due.paid_amount_paise + body.pay_amount_paise;
        const newStatus = newPaid >= due.total_amount_paise ? 'settled' : newPaid > 0 ? 'partial' : 'pending';

        // Atomic update
        const { data, error } = await client
          .from('v2_parties_dues')
          .update({
            paid_amount_paise: newPaid,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', body.due_id)
          .eq('workspace_id', workspaceId)
          .select()
          .single();
        if (error) throw error;

        // Also create a ledger entry for the settlement
        const { error: leErr } = await client.from('v2_ledger_entries').insert({
          workspace_id: workspaceId,
          owner_id: userId,
          entry_type: 'due_settlement',
          amount_paise: body.pay_amount_paise,
          category: due.direction === 'receivable' ? 'Payment Received' : 'Payment Made',
          payment_mode: body.payment_mode,
          account_id: body.account_id,
          party_id: due.id,
          note: body.remark ?? `Settlement: ${due.party_name}`,
          entry_date: new Date().toISOString(),
          scope: due.scope,
        });
        if (leErr) throw leErr;

        return ok(data);
      }
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      if (!isUuid(id)) throw new ValidationError('valid id required');

      const { error } = await client
        .from('v2_parties_dues')
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