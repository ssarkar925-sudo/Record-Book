// supabase/functions/health/index.ts
// GET /health — system readiness, schema version, and stack telemetry.
// Public endpoint, no auth required.

import { handleCors, ok } from '../_shared/types.ts';

Deno.serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== 'GET') {
    return new Response(null, { status: 405 });
  }

  return ok({
    application: 'Record Book V2 — Financial & Wealth Suite',
    version: '2.0.0',
    themePosture: 'daylight-multicolour-pastel-only',
    stack: [
      'TypeScript',
      'Tailwind CSS v4',
      'shadcn/ui',
      'Framer Motion',
      'GSAP',
      'Next.js 16',
      'Supabase Edge Runtime',
      'PostgreSQL',
      'Supabase Realtime V2',
    ],
    schemaTables: [
      'v2_workspaces',
      'v2_accounts',
      'v2_ledger_entries',
      'v2_parties_dues',
      'v2_credit_cards',
      'v2_sheets',
      'v2_notes',
      'v2_vault_items',
    ],
    status: 'healthy',
    timestamp: new Date().toISOString(),
    runtime: 'supabase-edge',
  });
});