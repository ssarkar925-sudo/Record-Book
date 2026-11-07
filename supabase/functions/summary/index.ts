// supabase/functions/summary/index.ts
// POST /summary — server-derived financial summary (KPI roll-ups).
// Runs the same integer-paise engine as the client, so dashboard numbers
// match whether computed locally or server-side.

import { computeSummary } from '../_shared/engine.ts';
import { err, ok, type SummaryRequest, type SummaryResponse } from '../_shared/types.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  let body: SummaryRequest;
  try {
    body = (await req.json()) as SummaryRequest;
  } catch {
    return err('Invalid JSON body', 400);
  }

  const summary = computeSummary(body);
  const response: SummaryResponse = {
    ...summary,
    computedAt: new Date().toISOString(),
  };

  return ok(response);
});