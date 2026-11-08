// supabase/functions/sheets/index.ts
// CRUD for v2_sheets (custom multi-column registers). Auth required.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { err, handleCors, ok } from '../_shared/types.ts';
import { getAuthContext } from '../_shared/auth.ts';
import {
  isNonEmpty,
  isScope,
  isUuid,
  ValidationError,
  toResponse,
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
        .from('v2_sheets')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (scope !== 'all' && scope) {
        query = query.eq('scope', scope);
      }

      const { data, error } = await query;
      if (error) throw error;
      return ok(data ?? []);
    }

    if (req.method === 'POST') {
      const body = await req.json();
      if (!isNonEmpty(body?.title)) throw new ValidationError('title required');
      if (!isNonEmpty(body?.category)) throw new ValidationError('category required');
      if (!isScope(body?.scope)) throw new ValidationError('invalid scope');
      if (!Array.isArray(body?.columns) || body.columns.length === 0)
        throw new ValidationError('columns array required');

      const { data, error } = await client
        .from('v2_sheets')
        .insert({
          workspace_id: workspaceId,
          owner_id: userId,
          title: body.title.trim(),
          category: body.category.trim(),
          columns: body.columns,
          rows: [],
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
      if (body.category !== undefined) patch.category = body.category;
      if (body.columns !== undefined) patch.columns = body.columns;
      if (body.rows !== undefined) patch.rows = body.rows;
      if (body.scope !== undefined) {
        if (!isScope(body.scope)) throw new ValidationError('invalid scope');
        patch.scope = body.scope;
      }
      patch.updated_at = new Date().toISOString();

      const { data, error } = await client
        .from('v2_sheets')
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
        .from('v2_sheets')
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