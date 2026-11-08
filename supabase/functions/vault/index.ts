// supabase/functions/vault/index.ts
// CRUD for v2_vault_items (AES-GCM encrypted secrets). Auth required.
// Server validates structure but cannot decrypt (zero-knowledge).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { err, handleCors, ok } from '../_shared/types.ts';
import { getAuthContext } from '../_shared/auth.ts';
import {
  isNonEmpty,
  isScope,
  isUuid,
  ValidationError,
  toResponse,
  VALID_VAULT_CATEGORIES,
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
        .from('v2_vault_items')
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
      if (!VALID_VAULT_CATEGORIES.includes(body?.category ?? ''))
        throw new ValidationError('invalid category');
      if (!isNonEmpty(body?.cipher_text)) throw new ValidationError('cipher_text required');
      if (!isNonEmpty(body?.iv)) throw new ValidationError('iv required');
      if (!isNonEmpty(body?.salt)) throw new ValidationError('salt required');
      if (!isScope(body?.scope)) throw new ValidationError('invalid scope');

      const { data, error } = await client
        .from('v2_vault_items')
        .insert({
          workspace_id: workspaceId,
          owner_id: userId,
          title: body.title.trim(),
          category: body.category,
          username: body.username ?? null,
          cipher_text: body.cipher_text,
          iv: body.iv,
          salt: body.salt,
          url: body.url ?? null,
          notes: body.notes ?? null,
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
      if (body.category !== undefined) {
        if (!VALID_VAULT_CATEGORIES.includes(body.category))
          throw new ValidationError('invalid category');
        patch.category = body.category;
      }
      if (body.username !== undefined) patch.username = body.username;
      if (body.cipher_text !== undefined) patch.cipher_text = body.cipher_text;
      if (body.iv !== undefined) patch.iv = body.iv;
      if (body.salt !== undefined) patch.salt = body.salt;
      if (body.url !== undefined) patch.url = body.url;
      if (body.notes !== undefined) patch.notes = body.notes;
      if (body.scope !== undefined) {
        if (!isScope(body.scope)) throw new ValidationError('invalid scope');
        patch.scope = body.scope;
      }
      patch.updated_at = new Date().toISOString();

      const { data, error } = await client
        .from('v2_vault_items')
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
        .from('v2_vault_items')
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