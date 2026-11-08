-- ============================================================================
-- RECORD BOOK V2 — PERFORMANCE INDEXES & AUTO-UPDATE TRIGGERS
-- Adds missing FK & RLS performance indexes and auto updated_at triggers
-- ============================================================================

-- 1. Performance Indexes for Workspaces & Foreign Keys
CREATE INDEX IF NOT EXISTS idx_v2_accounts_ws_owner ON public.v2_accounts(workspace_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_v2_accounts_scope ON public.v2_accounts(workspace_id, scope);

CREATE INDEX IF NOT EXISTS idx_v2_ledger_ws_date ON public.v2_ledger_entries(workspace_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_v2_ledger_account ON public.v2_ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_v2_ledger_scope ON public.v2_ledger_entries(workspace_id, scope);

CREATE INDEX IF NOT EXISTS idx_v2_dues_ws_status ON public.v2_parties_dues(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_v2_dues_due_date ON public.v2_parties_dues(workspace_id, due_date);

CREATE INDEX IF NOT EXISTS idx_v2_cards_ws ON public.v2_credit_cards(workspace_id);

CREATE INDEX IF NOT EXISTS idx_v2_notes_ws_state ON public.v2_notes(workspace_id, is_trashed, is_archived, is_pinned);

CREATE INDEX IF NOT EXISTS idx_v2_sheets_ws ON public.v2_sheets(workspace_id);

CREATE INDEX IF NOT EXISTS idx_v2_vault_ws ON public.v2_vault_items(workspace_id);

-- 2. Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Apply triggers to all V2 tables
DROP TRIGGER IF EXISTS trigger_v2_workspaces_updated_at ON public.v2_workspaces;
CREATE TRIGGER trigger_v2_workspaces_updated_at
    BEFORE UPDATE ON public.v2_workspaces
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_v2_accounts_updated_at ON public.v2_accounts;
CREATE TRIGGER trigger_v2_accounts_updated_at
    BEFORE UPDATE ON public.v2_accounts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_v2_ledger_updated_at ON public.v2_ledger_entries;
CREATE TRIGGER trigger_v2_ledger_updated_at
    BEFORE UPDATE ON public.v2_ledger_entries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_v2_dues_updated_at ON public.v2_parties_dues;
CREATE TRIGGER trigger_v2_dues_updated_at
    BEFORE UPDATE ON public.v2_parties_dues
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_v2_cards_updated_at ON public.v2_credit_cards;
CREATE TRIGGER trigger_v2_cards_updated_at
    BEFORE UPDATE ON public.v2_credit_cards
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_v2_sheets_updated_at ON public.v2_sheets;
CREATE TRIGGER trigger_v2_sheets_updated_at
    BEFORE UPDATE ON public.v2_sheets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_v2_notes_updated_at ON public.v2_notes;
CREATE TRIGGER trigger_v2_notes_updated_at
    BEFORE UPDATE ON public.v2_notes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_v2_vault_updated_at ON public.v2_vault_items;
CREATE TRIGGER trigger_v2_vault_updated_at
    BEFORE UPDATE ON public.v2_vault_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
