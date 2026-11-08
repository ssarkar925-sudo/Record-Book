// supabase/functions/credit-cards/index.ts
// CRUD for v2_credit_cards with spend/bill-payment actions. Auth required.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { err, handleCors, ok } from '../_shared/types.ts';
import { getAuthContext } from '../_shared/auth.ts';
import {
  isPaise,
  isNonEmpty,
  isScope,
  isUuid,
  ValidationError,
  toResponse,
  VALID_CARD_NETWORKS,
} from '../_shared/validation.ts';

Deno.serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const { userId, workspaceId, client } = await getAuthContext(req);

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const scope = url.searchParams.get('scope') ?? 'all';

      let query = client
        .from('v2_credit_cards')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });

      if (scope !== 'all' && scope) {
        query = query.eq('scope', scope);
      }

      const { data, error } = await query;
      if (error) throw error;
      return ok(data ?? []);
    }

    if (req.method === 'POST') {
      const body = await req.json();
      if (!isNonEmpty(body?.card_name)) throw new ValidationError('card_name required');
      if (!isNonEmpty(body?.bank_name)) throw new ValidationError('bank_name required');
      if (!isNonEmpty(body?.last4) || body.last4.length !== 4)
        throw new ValidationError('last4 must be 4 digits');
      if (!VALID_CARD_NETWORKS.includes(body?.network ?? ''))
        throw new ValidationError('invalid network');
      if (!isPaise(body?.credit_limit_paise ?? -1))
        throw new ValidationError('credit_limit_paise required');
      if (!isScope(body?.scope)) throw new ValidationError('invalid scope');

      const { data, error } = await client
        .from('v2_credit_cards')
        .insert({
          workspace_id: workspaceId,
          owner_id: userId,
          card_name: body.card_name.trim(),
          bank_name: body.bank_name.trim(),
          last4: body.last4.trim(),
          network: body.network,
          credit_limit_paise: body.credit_limit_paise,
          utilized_paise: 0,
          statement_day: body.statement_day ?? 1,
          due_day: body.due_day ?? 15,
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
      if (body.card_name !== undefined) {
        if (!isNonEmpty(body.card_name)) throw new ValidationError('card_name cannot be empty');
        patch.card_name = body.card_name.trim();
      }
      if (body.bank_name !== undefined) patch.bank_name = body.bank_name;
      if (body.last4 !== undefined) {
        if (!isNonEmpty(body.last4) || body.last4.length !== 4)
          throw new ValidationError('last4 must be 4 digits');
        patch.last4 = body.last4;
      }
      if (body.network !== undefined) {
        if (!VALID_CARD_NETWORKS.includes(body.network))
          throw new ValidationError('invalid network');
        patch.network = body.network;
      }
      if (body.credit_limit_paise !== undefined) {
        if (!isPaise(body.credit_limit_paise)) throw new ValidationError('invalid credit_limit_paise');
        patch.credit_limit_paise = body.credit_limit_paise;
      }
      if (body.statement_day !== undefined) patch.statement_day = body.statement_day;
      if (body.due_day !== undefined) patch.due_day = body.due_day;
      if (body.scope !== undefined) {
        if (!isScope(body.scope)) throw new ValidationError('invalid scope');
        patch.scope = body.scope;
      }
      if (body.notes !== undefined) patch.notes = body.notes;
      patch.updated_at = new Date().toISOString();

      const { data, error } = await client
        .from('v2_credit_cards')
        .update(patch)
        .eq('id', body.id)
        .eq('workspace_id', workspaceId)
        .select()
        .single();
      if (error) throw error;
      return ok(data);
    }

    // Actions: spend, pay_bill
    if (req.method === 'POST') {
      const url = new URL(req.url);
      const action = url.searchParams.get('action');

      if (action === 'spend') {
        const body = await req.json();
        if (!isUuid(body?.card_id)) throw new ValidationError('card_id required');
        if (!isPaise(body?.amount_paise ?? -1))
          throw new ValidationError('amount_paise required');
        if (!isNonEmpty(body?.category)) throw new ValidationError('category required');
        if (!['cash', 'upi', 'bank', 'card'].includes(body?.payment_mode ?? ''))
          throw new ValidationError('invalid payment_mode');

        // Get card
        const { data: card, error: cardErr } = await client
          .from('v2_credit_cards')
          .select('*')
          .eq('id', body.card_id)
          .eq('workspace_id', workspaceId)
          .single();
        if (cardErr || !card) throw new ValidationError('card not found');

        const newUtilized = card.utilized_paise + body.amount_paise;

        // Update card
        const { data, error } = await client
          .from('v2_credit_cards')
          .update({
            utilized_paise: newUtilized,
            updated_at: new Date().toISOString(),
          })
          .eq('id', body.card_id)
          .eq('workspace_id', workspaceId)
          .select()
          .single();
        if (error) throw error;

        // Create ledger entry
        const { error: leErr } = await client.from('v2_ledger_entries').insert({
          workspace_id: workspaceId,
          owner_id: userId,
          entry_type: 'card_spend',
          amount_paise: body.amount_paise,
          category: body.category,
          payment_mode: body.payment_mode,
          account_id: body.account_id ?? null,
          card_id: body.card_id,
          note: body.note ?? `Card spend: ${body.category}`,
          entry_date: body.entry_date ?? new Date().toISOString(),
          scope: card.scope,
        });
        if (leErr) throw leErr;

        return ok(data);
      }

      if (action === 'pay_bill') {
        const body = await req.json();
        if (!isUuid(body?.card_id)) throw new ValidationError('card_id required');
        if (!isPaise(body?.amount_paise ?? -1))
          throw new ValidationError('amount_paise required');
        if (!isUuid(body?.account_id)) throw new ValidationError('account_id required');

        // Get card
        const { data: card, error: cardErr } = await client
          .from('v2_credit_cards')
          .select('*')
          .eq('id', body.card_id)
          .eq('workspace_id', workspaceId)
          .single();
        if (cardErr || !card) throw new ValidationError('card not found');

        const newUtilized = Math.max(0, card.utilized_paise - body.amount_paise);

        // Update card
        const { data, error } = await client
          .from('v2_credit_cards')
          .update({
            utilized_paise: newUtilized,
            updated_at: new Date().toISOString(),
          })
          .eq('id', body.card_id)
          .eq('workspace_id', workspaceId)
          .select()
          .single();
        if (error) throw error;

        // Create ledger entry
        const { error: leErr } = await client.from('v2_ledger_entries').insert({
          workspace_id: workspaceId,
          owner_id: userId,
          entry_type: 'card_payment',
          amount_paise: body.amount_paise,
          category: 'Credit Card Bill Payment',
          payment_mode: body.payment_mode ?? 'bank',
          account_id: body.account_id,
          card_id: body.card_id,
          note: body.note ?? `Bill payment: ${card.card_name}`,
          entry_date: body.entry_date ?? new Date().toISOString(),
          scope: card.scope,
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
        .from('v2_credit_cards')
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