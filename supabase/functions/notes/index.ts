// supabase/functions/notes/index.ts
// CRUD for v2_notes with checklist totals. Auth required.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { err, handleCors, ok } from '../_shared/types.ts';
import { getAuthContext } from '../_shared/auth.ts';
import {
  isNonEmpty,
  isPaise,
  isScope,
  isUuid,
  ValidationError,
  toResponse,
  VALID_NOTE_PRIORITIES,
} from '../_shared/validation.ts';

Deno.serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;
  try {
    const { userId, workspaceId, client } = await getAuthContext(req);

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const scope = url.searchParams.get('scope') ?? 'all';
      const includeArchived = url.searchParams.get('archived') === 'true';
      const includeTrashed = url.searchParams.get('trashed') === 'true';

      let query = client
        .from('v2_notes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (scope !== 'all' && scope) {
        query = query.eq('scope', scope);
      }
      if (!includeArchived) query = query.eq('is_archived', false);
      if (!includeTrashed) query = query.eq('is_trashed', false);

      const { data, error } = await query;
      if (error) throw error;
      return ok(data ?? []);
    }

    if (req.method === 'POST') {
      const body = await req.json();
      if (!isNonEmpty(body?.title)) throw new ValidationError('title required');
      if (!isScope(body?.scope)) throw new ValidationError('invalid scope');
      if (!['low', 'medium', 'high'].includes(body?.priority ?? ''))
        throw new ValidationError('invalid priority');

      const { data, error } = await client
        .from('v2_notes')
        .insert({
          workspace_id: workspaceId,
          owner_id: userId,
          title: body.title.trim(),
          body: body.body ?? '',
          checklist_items: body.checklist_items ?? [],
          calculated_total_paise: body.calculated_total_paise ?? 0,
          color_theme: body.color_theme ?? 'amber',
          priority: body.priority ?? 'medium',
          is_pinned: body.is_pinned ?? false,
          is_archived: false,
          is_trashed: false,
          reminder_date: body.reminder_date ?? null,
          tags: body.tags ?? [],
          scope: body.scope,
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
      if (body.title !== undefined) {
        if (!isNonEmpty(body.title)) throw new ValidationError('title cannot be empty');
        patch.title = body.title.trim();
      }
      if (body.body !== undefined) patch.body = body.body;
      if (body.checklist_items !== undefined) patch.checklist_items = body.checklist_items;
      if (body.calculated_total_paise !== undefined) {
        if (!isPaise(body.calculated_total_paise)) throw new ValidationError('invalid calculated_total_paise');
        patch.calculated_total_paise = body.calculated_total_paise;
      }
      if (body.color_theme !== undefined) patch.color_theme = body.color_theme;
      if (body.priority !== undefined) {
        if (!['low', 'medium', 'high'].includes(body.priority))
          throw new ValidationError('invalid priority');
        patch.priority = body.priority;
      }
      if (body.is_pinned !== undefined) patch.is_pinned = body.is_pinned;
      if (body.is_archived !== undefined) patch.is_archived = body.is_archived;
      if (body.is_trashed !== undefined) patch.is_trashed = body.is_trashed;
      if (body.reminder_date !== undefined) patch.reminder_date = body.reminder_date;
      if (body.tags !== undefined) patch.tags = body.tags;
      if (body.scope !== undefined) {
        if (!isScope(body.scope)) throw new ValidationError('invalid scope');
        patch.scope = body.scope;
      }
      patch.updated_at = new Date().toISOString();

      const { data, error } = await client
        .from('v2_notes')
        .update(patch)
        .eq('id', body.id)
        .eq('workspace_id', workspaceId)
        .select()
        .single();
      if (error) throw error;
      return ok(data);
    }

    // Action: post_to_ledger
    if (req.method === 'POST') {
      const url = new URL(req.url);
      if (url.searchParams.get('action') === 'post_to_ledger') {
        const body = await req.json();
        if (!isUuid(body?.note_id)) throw new ValidationError('note_id required');
        if (!['cash_in', 'expense'].includes(body?.entry_type ?? ''))
          throw new ValidationError('entry_type must be cash_in or expense');

        const { data: note, error: noteErr } = await client
          .from('v2_notes')
          .select('*')
          .eq('id', body.note_id)
          .eq('workspace_id', workspaceId)
          .single();
        if (noteErr || !note) throw new ValidationError('note not found');

        const amount = note.calculated_total_paise;
        if (amount <= 0) throw new ValidationError('note has no calculated amount');

        if (!body.skip_ledger) {
          const { error } = await client.from('v2_ledger_entries').insert({
            workspace_id: workspaceId,
            owner_id: userId,
            entry_type: body.entry_type,
            amount_paise: amount,
            category: body.category ?? (body.entry_type === 'cash_in' ? 'From Notes' : 'From Notes'),
            payment_mode: body.payment_mode ?? 'upi',
            account_id: body.account_id ?? null,
            note: body.note ?? `From note: ${note.title}`,
            entry_date: new Date().toISOString(),
            scope: note.scope,
          });
          if (error) throw error;
        }

        return ok({ posted: true, amount_paise: amount });
      }
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      const permanent = url.searchParams.get('permanent') === 'true';

      if (!isUuid(id)) throw new ValidationError('valid id required');

      if (permanent) {
        const { error } = await client
          .from('v2_notes')
          .delete()
          .eq('id', id)
          .eq('workspace_id', workspaceId);
        if (error) throw error;
        return ok({ deleted: id });
      } else {
        const { data, error } = await client
          .from('v2_notes')
          .update({ is_trashed: true, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('workspace_id', workspaceId)
          .select()
          .single();
        if (error) throw error;
        return ok(data);
      }
    }

    return new Response(null, { status: 405 });
  } catch (e) {
    return toResponse(e);
  }
});