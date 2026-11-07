# Record Book V2 — Daylight Financial & Wealth Suite

Greenfield 9-module financial and wealth management suite built with **TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, GSAP, Vite, Node.js, Express/NestJS modular architecture, PostgreSQL, and Supabase**.

## Production Links & Stack Configuration

- **GitHub Repository**: `https://github.com/ssarkar925-sudo/Record-Book.git`
- **Supabase Project URL**: `https://xelxvojazyscbounzajs.supabase.co`
- **Supabase Publishable Key**: `sb_publishable_1BG03u4BQDYfpV3nw99WKw_z0qen4Gi`
- **Supabase SQL Editor**: `https://supabase.com/dashboard/project/xelxvojazyscbounzajs/sql/new`

---

## 1. Initialize Fresh Supabase V2 Database (`xelxvojazyscbounzajs`)

1. Open [Supabase SQL Editor (`xelxvojazyscbounzajs`)](https://supabase.com/dashboard/project/xelxvojazyscbounzajs/sql/new).
2. Copy the entire contents of [`supabase_schema_v2.sql`](./supabase_schema_v2.sql) (also available inside the app under **Docs, Sync & Reports → Runnable PostgreSQL V2 Schema**) and click **Run**.
3. This provisions the isolated `v2_*` tables (`v2_workspaces`, `v2_accounts`, `v2_ledger_entries`, `v2_parties_dues`, `v2_credit_cards`, `v2_sheets`, `v2_notes`, `v2_vault_items`), Row-Level Security policies, Realtime publications, and the `get_or_create_v2_workspace()` RPC function.

---

## 2. Push Fresh V2 Code to GitHub (`ssarkar925-sudo/Record-Book`)

```bash
git init
git branch -M main
git remote add origin https://github.com/ssarkar925-sudo/Record-Book.git
git add .
git commit -m "feat: fresh Record Book V2 daylight-only 9-module suite + Supabase V2 schema"
git push -u origin main --force
```

---

## 3. Deploy to Fresh Vercel Project

1. Go to [Vercel New Project](https://vercel.com/new) and import `ssarkar925-sudo/Record-Book`.
2. Add the following Environment Variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://xelxvojazyscbounzajs.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_1BG03u4BQDYfpV3nw99WKw_z0qen4Gi`
3. Click **Deploy**.

---

## 4. Documentation Suite

- [`/docs/PRD.md`](./docs/PRD.md) — Product Requirements Document
- [`/docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) — Daylight-Only Multicolour Pastel Design System
- [`/docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Full-Stack System Architecture
- [`/docs/DATABASE_SCHEMA_V2.md`](./docs/DATABASE_SCHEMA_V2.md) — Relational Database Dictionary & Multi-Device Sync Invariants
- [`/supabase_schema_v2.sql`](./supabase_schema_v2.sql) — Runnable PostgreSQL & Supabase V2 Schema
