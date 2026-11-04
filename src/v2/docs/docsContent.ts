export const PRD_DOC = `# Product Requirements Document (PRD) — Record Book V2

## 1. Executive Summary
Record Book V2 is a greenfield, zero-legacy-overlap financial and wealth management platform designed for business owners, merchants, professionals, and households. It unifies Bank & Cash Accounts, Income & Expense Double-Entry Ledgers, Customer/Supplier Dues (Udhar), Credit Card Billing Cycles, Custom Spreadsheet Registers, Smart ₹-Calculating Daily Notes, and an AES-GCM 256-Bit Encrypted Vault.

## 2. Core Architectural Mandates
- **Strictly Daylight-Only Multicolour Pastel Aesthetic**: Pure alabaster canvas (#F8FAFC / #FFFFFF) with pastel-tinted headers (Indigo, Sky, Emerald, Rose, Amber, Violet, Teal) and crisp slate ink (#0F172A). Dark mode is permanently disabled.
- **Deterministic Single Canonical Workspace**: Every user account maps 1-to-1 to a single canonical workspace (v2_workspaces.owner_id UNIQUE) so Web, Android Phone, and Tablet never diverge.
- **Integer Paise Precision**: All monetary columns and calculations operate in integer Paise (₹1.00 = 100 paise) to prevent floating-point drift.

## 3. Functional Modules (9-Module Suite)
01. Overview Hub — Net Worth, Liquid Cash, Receivables, Payables, Card Utilization & GSAP KPI counters.
02. Bank & Cash Accounts — Savings, Current, Cash Counter, UPI Wallet, OD/CC + Atomic Self-Transfers.
03. Income & Expenses — Double-entry Cash In, Cash Out, and Expense journal with live search & sphere filtering.
04. Dues & Udhar Khata — Customer Receivables & Supplier Payables with partial/full bank settlement.
05. Credit Cards & Billing — Credit limits, utilization bars, statement/due days, card spend & 1-tap bill pay.
06. Sheets & Registers — Multi-column custom spreadsheets with live numeric/currency column totals & CSV export.
07. Daily Notes & Smart ₹ Checklists — Automatic live Rupee extraction from checklist items & 1-tap ledger posting.
08. Encrypted Vault — Client-side WebCrypto PBKDF2 + AES-GCM 256-bit password & PIN vault.
09. Reports, Cloud Sync & Docs Hub — Financial analytics, Supabase V2 cloud connection, JSON backup & docs viewer.`;

export const DESIGN_DOC = `# UI/UX Design Specification — Record Book V2

## 1. 60-30-10 Daylight Multicolour System
- **60% Neutral Daylight Canvas**: Alabaster background (#F8FAFC) and pure white work surfaces (#FFFFFF).
- **30% Deep-Light Pastel Structural Surfaces**:
  • Overview Hub: Indigo Pastel (#EEF2FF / border-indigo-200)
  • Bank & Cash: Sky Pastel (#E0F2FE / border-sky-200)
  • Income & Expenses: Emerald & Rose Pastel (#ECFDF5 & #FFF1F2)
  • Dues & Udhar: Amber Pastel (#FEF3C7 / border-amber-200)
  • Credit Cards: Violet Pastel (#F3E8FF / border-violet-200)
  • Sheets & Registers: Teal Pastel (#CCFBF1 / border-teal-200)
  • Daily Notes: Warm Yellow Pastel (#FEF9C3 / border-yellow-200)
  • Encrypted Vault: Pink Pastel (#FCE7F3 / border-pink-200)
- **10% Semantic Action Accents**: Indigo (#4F46E5), Emerald (#059669), Rose (#E11D48), Amber (#D97706).

## 2. Typography & Tabular Discipline (2+1 Font Rule)
- **Display & Headings**: Plus Jakarta Sans (600/700, tight tracking)
- **Body & Controls**: DM Sans (400/500, high scannability)
- **Financial Figures & Dates**: JetBrains Mono (tabular-nums enforced on all ₹ values)

## 3. Navigation & Motion
- **Top Bar Contract**: 3-Zone layout (Brand Wordmark + Module Breadcrumb | Sphere Filter | Sync + Quick Action CTA).
- **Mobile Bottom Bar**: 6-slot layout (Notes, Credit Card, Dues, Bank, Expenses, More Drawer).
- **Dual Animation Engine**: Framer Motion (<180ms layout/tab transitions) + GSAP (smooth numeric counter tweening).`;

export const ARCHITECTURE_DOC = `# System Architecture — Record Book V2

## 1. Technology Stack Matrix
- **TypeScript**: Strict domain models, DTOs, and type-safe state actions.
- **Tailwind CSS + shadcn/ui**: Accessible Radix-backed UI primitives styled in Daylight Pastel mode.
- **Framer Motion + GSAP**: Declarative component transitions + timeline numeric roll-ups.
- **Vite**: Fast frontend bundling and static export compatibility for Capacitor Android.
- **Node.js + Express.js + NestJS Pattern**: Modular @Module / @Controller / @Injectable backend services.
- **PostgreSQL + Supabase**: Relational cloud persistence, Row-Level Security (RLS), and Realtime WebSockets.

## 2. Multi-Device Convergence Invariants
1. **Single Canonical Workspace per User**: v2_workspaces enforces UNIQUE(owner_id) via get_or_create_v2_workspace() RPC.
2. **Pre-Push UUID & Workspace Normalization**: Every record is normalized with ensureValidUuid() and canonicalWorkspaceId before upsert.
3. **Confirmed Cloud ID Tracking**: Local records are only marked as cloud-confirmed after a 2xx response from Supabase, preventing premature deletion on slow networks.`;

export const DB_SCHEMA_DOC = `# Database Schema V2 — PostgreSQL & Supabase

## Isolated V2 Tables (public.v2_*)
1. **v2_workspaces**: id (UUID PK), owner_id (UUID UNIQUE), name, currency, created_at, updated_at
2. **v2_accounts**: id, workspace_id, owner_id, name, account_type, bank_name, account_number_last4, ifsc, balance_paise, is_default, scope, notes
3. **v2_ledger_entries**: id, workspace_id, owner_id, entry_type, amount_paise, category, payment_mode, account_id, target_account_id, party_id, card_id, note, entry_date, scope
4. **v2_parties_dues**: id, workspace_id, owner_id, party_name, phone, party_type, direction, total_amount_paise, paid_amount_paise, due_date, status, scope, notes
5. **v2_credit_cards**: id, workspace_id, owner_id, card_name, bank_name, last4, network, credit_limit_paise, utilized_paise, statement_day, due_day, scope, notes
6. **v2_sheets**: id, workspace_id, owner_id, title, category, columns (JSONB), rows (JSONB), scope
7. **v2_notes**: id, workspace_id, owner_id, title, body, checklist_items (JSONB), calculated_total_paise, color_theme, priority, is_pinned, is_archived, is_trashed, reminder_date, tags, scope
8. **v2_vault_items**: id, workspace_id, owner_id, title, category, username, cipher_text, iv, salt, url, notes, scope`;

export const SQL_SCHEMA_V2 = `-- RECORD BOOK V2 — GREENFIELD POSTGRESQL & SUPABASE SCHEMA
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.v2_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Personal & Business Record Book',
    currency TEXT NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.v2_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.v2_workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'savings' CHECK (account_type IN ('savings', 'current', 'cash', 'upi', 'od_cc')),
    bank_name TEXT,
    account_number_last4 TEXT,
    ifsc TEXT,
    balance_paise BIGINT NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    scope TEXT NOT NULL DEFAULT 'business' CHECK (scope IN ('business', 'personal', 'family')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.v2_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.v2_workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('cash_in', 'cash_out', 'expense', 'transfer', 'card_spend', 'card_payment', 'due_settlement')),
    amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
    category TEXT NOT NULL DEFAULT 'General',
    payment_mode TEXT NOT NULL DEFAULT 'upi' CHECK (payment_mode IN ('cash', 'upi', 'bank', 'card')),
    account_id UUID REFERENCES public.v2_accounts(id) ON DELETE SET NULL,
    target_account_id UUID REFERENCES public.v2_accounts(id) ON DELETE SET NULL,
    party_id UUID,
    card_id UUID,
    note TEXT,
    entry_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    scope TEXT NOT NULL DEFAULT 'business' CHECK (scope IN ('business', 'personal', 'family')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.v2_parties_dues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.v2_workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    party_name TEXT NOT NULL,
    phone TEXT,
    party_type TEXT NOT NULL DEFAULT 'customer' CHECK (party_type IN ('customer', 'supplier')),
    direction TEXT NOT NULL CHECK (direction IN ('receivable', 'payable')),
    total_amount_paise BIGINT NOT NULL DEFAULT 0,
    paid_amount_paise BIGINT NOT NULL DEFAULT 0,
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'settled')),
    scope TEXT NOT NULL DEFAULT 'business' CHECK (scope IN ('business', 'personal', 'family')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.v2_credit_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.v2_workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    card_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    last4 TEXT NOT NULL,
    network TEXT NOT NULL DEFAULT 'visa' CHECK (network IN ('visa', 'mastercard', 'rupay', 'amex')),
    credit_limit_paise BIGINT NOT NULL DEFAULT 0,
    utilized_paise BIGINT NOT NULL DEFAULT 0,
    statement_day INT NOT NULL DEFAULT 15 CHECK (statement_day BETWEEN 1 AND 31),
    due_day INT NOT NULL DEFAULT 5 CHECK (due_day BETWEEN 1 AND 31),
    scope TEXT NOT NULL DEFAULT 'business' CHECK (scope IN ('business', 'personal', 'family')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.v2_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.v2_workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Business Register',
    columns JSONB NOT NULL DEFAULT '[]'::jsonb,
    rows JSONB NOT NULL DEFAULT '[]'::jsonb,
    scope TEXT NOT NULL DEFAULT 'business' CHECK (scope IN ('business', 'personal', 'family')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.v2_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.v2_workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    calculated_total_paise BIGINT NOT NULL DEFAULT 0,
    color_theme TEXT NOT NULL DEFAULT 'amber',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    is_trashed BOOLEAN NOT NULL DEFAULT false,
    reminder_date TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    scope TEXT NOT NULL DEFAULT 'business' CHECK (scope IN ('business', 'personal', 'family')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.v2_vault_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.v2_workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'login' CHECK (category IN ('login', 'bank_pin', 'card_pin', 'secret_note')),
    username TEXT,
    cipher_text TEXT NOT NULL,
    iv TEXT NOT NULL,
    salt TEXT NOT NULL,
    url TEXT,
    notes TEXT,
    scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('business', 'personal', 'family')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.v2_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_parties_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_vault_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v2_workspaces_owner_policy" ON public.v2_workspaces FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "v2_accounts_owner_policy" ON public.v2_accounts FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "v2_ledger_entries_owner_policy" ON public.v2_ledger_entries FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "v2_parties_dues_owner_policy" ON public.v2_parties_dues FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "v2_credit_cards_owner_policy" ON public.v2_credit_cards FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "v2_sheets_owner_policy" ON public.v2_sheets FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "v2_notes_owner_policy" ON public.v2_notes FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "v2_vault_items_owner_policy" ON public.v2_vault_items FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.get_or_create_v2_workspace()
RETURNS public.v2_workspaces LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ws public.v2_workspaces;
BEGIN
    INSERT INTO public.v2_workspaces (owner_id, name, currency)
    VALUES (auth.uid(), 'Personal & Business Record Book', 'INR')
    ON CONFLICT (owner_id) DO UPDATE SET updated_at = timezone('utc', now())
    RETURNING * INTO v_ws;
    RETURN v_ws;
END;
$$;`;
