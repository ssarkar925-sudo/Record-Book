# System Architecture Specification — Record Book V2

**Architecture Pattern**: Modular Full-Stack Architecture (Vite + React Frontend, Node.js + Express + NestJS-Pattern Backend, PostgreSQL + Supabase Cloud)  
**Runtime Port**: Port 3000

---

## 1. High-Level Architectural Topology

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND APPLICATION (Vite + React 19 + TS)                   │
│                                                                                      │
│  ┌──────────────────────────┐  ┌──────────────────────────┐  ┌────────────────────┐  │
│  │   shadcn/ui Primitives   │  │   Framer Motion + GSAP   │  │  Tailwind CSS v4   │  │
│  │  Button, Card, Dialog,   │  │  Page Transitions & KPI  │  │  Daylight Pastel   │  │
│  │  Tabs, Sheet, Select     │  │  Number Tweening Engine  │  │  Design Tokens     │  │
│  └────────────┬─────────────┘  └────────────┬─────────────┘  └─────────┬──────────┘  │
│               └─────────────────────────────┼──────────────────────────┘             │
│                                             ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │                   9 Modular Feature Views (src/v2/modules/*)                   │  │
│  │  Overview · Bank · Ledger · Dues · Cards · Sheets · Notes · Vault · Reports    │  │
│  └──────────────────────────────────────────┬─────────────────────────────────────┘  │
│                                             ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │               V2 Store & Deterministic Sync Engine (src/v2/store/*)            │  │
│  │  • Pure Paise Math Engine (src/v2/engine/financialEngine.ts)                   │  │
│  │  • Canonical Workspace Resolver (1 User = 1 Canonical Cloud Workspace)         │  │
│  │  • Optimistic Local Cache + Offline Mutation Queue + Realtime Listener         │  │
│  └────────────────────┬──────────────────────────────────────────┬────────────────┘  │
└───────────────────────┼──────────────────────────────────────────┼───────────────────┘
                        │ REST JSON (/api/v2/*)                    │ Supabase SDK / WS
                        ▼                                          ▼
┌───────────────────────────────────────────────┐  ┌───────────────────────────────────┐
│   BACKEND LAYER (Node.js + Express + NestJS)  │  │   SUPABASE & POSTGRESQL V2 CLOUD  │
│                                               │  │                                   │
│  ┌─────────────────────────────────────────┐  │  │  • Auth: Email/Password & JWT     │
│  │ @Module AppModule                       │  │  │  • RPC: get_or_create_v2_workspace│
│  │  ├── WorkspaceController & Service      │──┼─▶│  • Tables: v2_workspaces,         │
│  │  ├── LedgerController & Service         │  │  │    v2_accounts, v2_ledger_entries,│
│  │  ├── SyncController & ReconcileService  │  │  │    v2_parties_dues,               │
│  │  └── DiagnosticsController              │  │  │    v2_credit_cards, v2_sheets,    │
│  └─────────────────────────────────────────┘  │  │    v2_notes, v2_vault_items       │
└───────────────────────────────────────────────┘  └───────────────────────────────────┘
```

---

## 2. Backend Architecture (Node.js + Express + NestJS Modular Pattern)

To provide clean enterprise separation of concerns while remaining compatible with both serverless/edge routes and standalone Node.js + Express execution (`src/backend/`), the backend is organized using **NestJS architectural primitives**:

1. **DTOs & Validation (`src/backend/dto/`)**:
   - Validates incoming payloads for accounts, ledger entries, dues settlements, credit card spends, sheets, notes, and vault items.
   - Enforces integer Paise amounts, RFC-4122 UUIDs, and valid sphere enums (`business`, `personal`, `family`).
2. **Injectable Services (`src/backend/services/`)**:
   - `WorkspaceService`: Resolves the single canonical workspace for any authenticated `owner_id`.
   - `ReconciliationService`: Computes deterministic account balances, credit card utilization, note checklist currency totals, and bi-directional record merges.
3. **Controllers (`src/backend/controllers/`)**:
   - `HealthController`: Reports system readiness, schema version (`2.0.0`), and technology stack telemetry.
   - `SyncController`: Handles batch reconciliation and workspace state verification.
4. **Express Router Adapter (`src/backend/expressServer.ts`)**:
   - Mounts the NestJS-structured controllers onto an Express.js application router (`/api/v2/health`, `/api/v2/reconcile`, `/api/v2/schema`) and bridges seamlessly with the frontend runtime.

---

## 3. Why Web & Mobile Never Diverge in V2 (Sync Invariants)

In V1, Web and Mobile could display different data because multiple workspaces could be created for the same user, local records were tagged with non-cloud workspace UUIDs that failed foreign-key checks (`23503`), and background pushes were unawaited.

**Record Book V2 enforces four strict architectural invariants**:

1. **Invariant 1 — Single Canonical Workspace per User**:
   - In `v2_workspaces`, `owner_id` has a `UNIQUE` constraint.
   - When a user signs in on Web, Android Phone, or Tablet, all devices resolve the exact same workspace row for `auth.uid()`. Even if legacy workspaces exist, the resolver deterministically picks the single canonical workspace and re-keys all records to it.
2. **Invariant 2 — Pre-Push Workspace & UUID Normalization**:
   - Every record created offline or online is normalized through `normalizeRecordForCloud(record, canonicalWorkspaceId)` before leaving the client, guaranteeing a valid RFC-4122 `id` and the active `canonicalWorkspaceId`.
3. **Invariant 3 — Awaited Upserts & Confirmed Cloud ID Tracking**:
   - Records are only added to `confirmedCloudIds` *after* Supabase returns a `2xx` confirmation. Unconfirmed local records are never mistaken for remote deletions.
4. **Invariant 4 — Dual-Channel Real-Time Sync**:
   - Every mutation updates local state optimistically in `< 5ms`, persists to `localStorage` (`rb_v2_*` isolated namespace), upserts to Supabase `v2_*` tables, and broadcasts over a user-scoped Supabase Realtime channel (`rb-v2-live-${user.id}`).
