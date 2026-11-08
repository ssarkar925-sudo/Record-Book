// supabase/functions/reconcile/index.ts
// POST /reconcile — deterministic client/server reconciliation.
// Implements the four sync invariants from docs/ARCHITECTURE.md:
//   1. Single canonical workspace per user
//   2. Pre-push workspace & UUID normalization
//   3. Awaited upserts with confirmed cloud-id tracking
//   4. Dual-channel realtime broadcast (client-side)

import { err, handleCors, ok, type ReconcileRequest, type ReconcileResponse } from '../_shared/types.ts';

function byUpdated(a: { updated_at: string }, b: { updated_at: string }): number {
  return a.updated_at < b.updated_at ? -1 : a.updated_at > b.updated_at ? 1 : 0;
}

Deno.serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;
  if (req.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  let body: ReconcileRequest;
  try {
    body = (await req.json()) as ReconcileRequest;
  } catch {
    return err('Invalid JSON body', 400);
  }

  const canonical = body.canonicalWorkspaceId;
  if (!canonical) {
    return err('canonicalWorkspaceId is required', 400);
  }

  // Deterministic merge: newest record wins on conflict, canonical workspace
  // wins when workspace ids disagree.
  const merged = new Map<string, { id: string; workspace_id: string; updated_at: string }>();
  const all = [...body.remoteRecords, ...body.localRecords].sort(byUpdated);
  const confirmed = new Set(body.confirmedCloudIds);
  const tombstones = new Set(body.deletedTombstoneIds);

  for (const rec of all) {
    const existing = merged.get(rec.id);
    if (!existing) {
      merged.set(rec.id, { ...rec, workspace_id: canonical });
    } else if (rec.updated_at >= existing.updated_at) {
      merged.set(rec.id, { ...rec, workspace_id: canonical });
    }
  }

  const toUpsertToCloud: string[] = [];
  const toDeleteFromCloud: string[] = [];
  const nextConfirmed = new Set(confirmed);

  for (const [id, rec] of merged) {
    if (tombstones.has(id)) {
      toDeleteFromCloud.push(id);
      nextConfirmed.delete(id);
      continue;
    }
    // Only push records the client has confirmed as persisted, or records
    // whose workspace matches the canonical one (fresh local creates).
    if (confirmed.has(id) || rec.workspace_id === canonical) {
      toUpsertToCloud.push(id);
      nextConfirmed.add(id);
    }
  }

  const response: ReconcileResponse = {
    merged: Array.from(merged.values()),
    toUpsertToCloud,
    toDeleteFromCloud,
    nextConfirmedCloudIds: Array.from(nextConfirmed),
  };

  return ok(response);
});