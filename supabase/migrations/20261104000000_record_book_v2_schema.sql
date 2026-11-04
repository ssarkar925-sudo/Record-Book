-- ============================================================================
-- RECORD BOOK V2 — GREENFIELD POSTGRESQL & SUPABASE SCHEMA
-- Project: https://xelxvojazyscbounzajs.supabase.co
-- Clean V2 Relational Tables + Deterministic Single-Workspace RPC + Realtime
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CANONICAL WORKSPACES (Strictly 1 Canonical Workspace per User Account)
CREATE TABLE IF NOT EXISTS public.v2_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Personal & Business Record Book',
    currency TEXT NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. BANK & CASH ACCOUNTS
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

-- 3. DOUBLE-ENTRY INCOME, EXPENSE & TRANSFER LEDGER
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

-- 4. CUSTOMERS & SUPPLIERS DUES (UDHAR KHATA)
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

-- 5. CREDIT CARDS & BILLING CYCLES
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

-- 6. SPREADSHEET REGISTERS (SHEETS)
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

-- 7. DAILY NOTES & LIVE RUPEE CHECKLISTS
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

-- 8. ZERO-KNOWLEDGE ENCRYPTED VAULT
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

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES — STRICT OWNER ISOLATION
-- ============================================================================

ALTER TABLE public.v2_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_parties_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_vault_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v2_workspaces_owner_policy" ON public.v2_workspaces;
CREATE POLICY "v2_workspaces_owner_policy" ON public.v2_workspaces
    FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "v2_accounts_owner_policy" ON public.v2_accounts;
CREATE POLICY "v2_accounts_owner_policy" ON public.v2_accounts
    FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "v2_ledger_entries_owner_policy" ON public.v2_ledger_entries;
CREATE POLICY "v2_ledger_entries_owner_policy" ON public.v2_ledger_entries
    FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "v2_parties_dues_owner_policy" ON public.v2_parties_dues;
CREATE POLICY "v2_parties_dues_owner_policy" ON public.v2_parties_dues
    FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "v2_credit_cards_owner_policy" ON public.v2_credit_cards;
CREATE POLICY "v2_credit_cards_owner_policy" ON public.v2_credit_cards
    FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "v2_sheets_owner_policy" ON public.v2_sheets;
CREATE POLICY "v2_sheets_owner_policy" ON public.v2_sheets
    FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "v2_notes_owner_policy" ON public.v2_notes;
CREATE POLICY "v2_notes_owner_policy" ON public.v2_notes
    FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "v2_vault_items_owner_policy" ON public.v2_vault_items;
CREATE POLICY "v2_vault_items_owner_policy" ON public.v2_vault_items
    FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- ============================================================================
-- DETERMINISTIC CANONICAL WORKSPACE RPC
-- Guarantees Web, Android App, and Tablet always lock onto the exact same ID!
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_or_create_v2_workspace()
RETURNS public.v2_workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ws public.v2_workspaces;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    INSERT INTO public.v2_workspaces (owner_id, name, currency)
    VALUES (auth.uid(), 'Personal & Business Record Book', 'INR')
    ON CONFLICT (owner_id) DO UPDATE
        SET updated_at = timezone('utc', now())
    RETURNING * INTO v_ws;

    RETURN v_ws;
END;
$$;

-- Enable Realtime on all V2 tables
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.v2_accounts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.v2_ledger_entries;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.v2_parties_dues;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.v2_credit_cards;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.v2_sheets;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.v2_notes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.v2_vault_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
