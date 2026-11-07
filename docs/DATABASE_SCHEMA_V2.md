# Database Schema V2 Specification — PostgreSQL & Supabase

**Schema Namespace**: `public.v2_*` (100% isolated from any legacy tables)  
**Monetary Precision**: `BIGINT` in integer **Paise** (`₹1.00 = 100 paise`)  
**Security Model**: PostgreSQL Row-Level Security (RLS) scoped by `owner_id = auth.uid()`

---

## 1. Entity-Relationship Overview

```
                    ┌──────────────────────────────────┐
                    │          v2_workspaces           │
                    │ ──────────────────────────────── │
                    │ PK  id (UUID)                    │
                    │ UQ  owner_id (UUID -> auth.users)│
                    │     name, currency               │
                    └─────────────────┬────────────────┘
                                      │ 1:N (ON DELETE CASCADE)
        ┌─────────────┬───────────────┼───────────────┬─────────────┬─────────────┐
        ▼             ▼               ▼               ▼             ▼             ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐┌──────────┐┌──────────────┐
│ v2_accounts  ││v2_parties_due││v2_credit_card││  v2_sheets   ││ v2_notes ││v2_vault_items│
└──────┬───────┘└──────┬───────┘└──────┬───────┘└──────────────┘└──────────┘└──────────────┘
       │               │               │
       └───────────────┼───────────────┘
                       ▼
            ┌──────────────────────┐
            │  v2_ledger_entries   │
            │ ──────────────────── │
            │ FK account_id        │
            │ FK target_account_id │
            │ FK party_id          │
            │ FK card_id           │
            └──────────────────────┘
```

---

## 2. Table Definitions

### 2.1 `public.v2_workspaces`
Stores the single canonical workspace per authenticated user.
- `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`)
- `owner_id` (`UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE`)
- `name` (`TEXT NOT NULL DEFAULT 'Personal & Business Record Book'`)
- `currency` (`TEXT NOT NULL DEFAULT 'INR'`)
- `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)
- `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)

### 2.2 `public.v2_accounts`
Stores Bank Accounts, Cash Counters, UPI Wallets, and OD/CC Accounts.
- `id` (`UUID PRIMARY KEY`)
- `workspace_id` (`UUID NOT NULL REFERENCES public.v2_workspaces(id) ON DELETE CASCADE`)
- `owner_id` (`UUID REFERENCES auth.users(id) ON DELETE CASCADE`)
- `name` (`TEXT NOT NULL`)
- `account_type` (`TEXT NOT NULL CHECK (account_type IN ('savings', 'current', 'cash', 'upi', 'od_cc'))`)
- `bank_name` (`TEXT`)
- `account_number_last4` (`TEXT`)
- `ifsc` (`TEXT`)
- `balance_paise` (`BIGINT NOT NULL DEFAULT 0`)
- `is_default` (`BOOLEAN NOT NULL DEFAULT false`)
- `scope` (`TEXT NOT NULL DEFAULT 'business' CHECK (scope IN ('business', 'personal', 'family'))`)
- `notes` (`TEXT`)
- `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)
- `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)

### 2.3 `public.v2_ledger_entries`
Stores all double-entry Cash In, Cash Out, Expense, Transfer, Card Spend, and Settlement records.
- `id` (`UUID PRIMARY KEY`)
- `workspace_id` (`UUID NOT NULL REFERENCES public.v2_workspaces(id) ON DELETE CASCADE`)
- `owner_id` (`UUID REFERENCES auth.users(id) ON DELETE CASCADE`)
- `entry_type` (`TEXT NOT NULL CHECK (entry_type IN ('cash_in', 'cash_out', 'expense', 'transfer', 'card_spend', 'card_payment', 'due_settlement'))`)
- `amount_paise` (`BIGINT NOT NULL CHECK (amount_paise >= 0)`)
- `category` (`TEXT NOT NULL DEFAULT 'General'`)
- `payment_mode` (`TEXT NOT NULL DEFAULT 'upi' CHECK (payment_mode IN ('cash', 'upi', 'bank', 'card'))`)
- `account_id` (`UUID REFERENCES public.v2_accounts(id) ON DELETE SET NULL`)
- `target_account_id` (`UUID REFERENCES public.v2_accounts(id) ON DELETE SET NULL`)
- `party_id` (`UUID`)
- `card_id` (`UUID`)
- `note` (`TEXT`)
- `entry_date` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)
- `scope` (`TEXT NOT NULL DEFAULT 'business' CHECK (scope IN ('business', 'personal', 'family'))`)
- `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)
- `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)

### 2.4 `public.v2_parties_dues`
Stores Customer Receivables (`You Will Get`) and Supplier Payables (`You Will Give`).
- `id` (`UUID PRIMARY KEY`)
- `workspace_id` (`UUID NOT NULL REFERENCES public.v2_workspaces(id) ON DELETE CASCADE`)
- `owner_id` (`UUID REFERENCES auth.users(id) ON DELETE CASCADE`)
- `party_name` (`TEXT NOT NULL`)
- `phone` (`TEXT`)
- `party_type` (`TEXT NOT NULL DEFAULT 'customer' CHECK (party_type IN ('customer', 'supplier'))`)
- `direction` (`TEXT NOT NULL CHECK (direction IN ('receivable', 'payable'))`)
- `total_amount_paise` (`BIGINT NOT NULL DEFAULT 0`)
- `paid_amount_paise` (`BIGINT NOT NULL DEFAULT 0`)
- `due_date` (`TIMESTAMPTZ`)
- `status` (`TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'settled'))`)
- `scope` (`TEXT NOT NULL DEFAULT 'business' CHECK (scope IN ('business', 'personal', 'family'))`)
- `notes` (`TEXT`)
- `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)
- `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)

### 2.5 `public.v2_credit_cards`
Stores Credit Cards, limits, utilized balances, and billing dates.
- `id` (`UUID PRIMARY KEY`)
- `workspace_id` (`UUID NOT NULL REFERENCES public.v2_workspaces(id) ON DELETE CASCADE`)
- `owner_id` (`UUID REFERENCES auth.users(id) ON DELETE CASCADE`)
- `card_name` (`TEXT NOT NULL`)
- `bank_name` (`TEXT NOT NULL`)
- `last4` (`TEXT NOT NULL`)
- `network` (`TEXT NOT NULL DEFAULT 'visa' CHECK (network IN ('visa', 'mastercard', 'rupay', 'amex'))`)
- `credit_limit_paise` (`BIGINT NOT NULL DEFAULT 0`)
- `utilized_paise` (`BIGINT NOT NULL DEFAULT 0`)
- `statement_day` (`INT NOT NULL DEFAULT 15 CHECK (statement_day BETWEEN 1 AND 31)`)
- `due_day` (`INT NOT NULL DEFAULT 5 CHECK (due_day BETWEEN 1 AND 31)`)
- `scope` (`TEXT NOT NULL DEFAULT 'business' CHECK (scope IN ('business', 'personal', 'family'))`)
- `notes` (`TEXT`)
- `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)
- `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)

### 2.6 `public.v2_sheets`
Stores custom multi-column spreadsheet registers.
- `id` (`UUID PRIMARY KEY`)
- `workspace_id` (`UUID NOT NULL REFERENCES public.v2_workspaces(id) ON DELETE CASCADE`)
- `owner_id` (`UUID REFERENCES auth.users(id) ON DELETE CASCADE`)
- `title` (`TEXT NOT NULL`)
- `category` (`TEXT NOT NULL DEFAULT 'Business Register'`)
- `columns` (`JSONB NOT NULL DEFAULT '[]'::jsonb`)
- `rows` (`JSONB NOT NULL DEFAULT '[]'::jsonb`)
- `scope` (`TEXT NOT NULL DEFAULT 'business' CHECK (scope IN ('business', 'personal', 'family'))`)
- `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)
- `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)

### 2.7 `public.v2_notes`
Stores Daily Notes and Smart ₹ Checklists.
- `id` (`UUID PRIMARY KEY`)
- `workspace_id` (`UUID NOT NULL REFERENCES public.v2_workspaces(id) ON DELETE CASCADE`)
- `owner_id` (`UUID REFERENCES auth.users(id) ON DELETE CASCADE`)
- `title` (`TEXT NOT NULL`)
- `body` (`TEXT NOT NULL DEFAULT ''`)
- `checklist_items` (`JSONB NOT NULL DEFAULT '[]'::jsonb`)
- `calculated_total_paise` (`BIGINT NOT NULL DEFAULT 0`)
- `color_theme` (`TEXT NOT NULL DEFAULT 'amber'`)
- `priority` (`TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'))`)
- `is_pinned` (`BOOLEAN NOT NULL DEFAULT false`)
- `is_archived` (`BOOLEAN NOT NULL DEFAULT false`)
- `is_trashed` (`BOOLEAN NOT NULL DEFAULT false`)
- `reminder_date` (`TEXT`)
- `tags` (`TEXT[] NOT NULL DEFAULT '{}'::_text`)
- `scope` (`TEXT NOT NULL DEFAULT 'business' CHECK (scope IN ('business', 'personal', 'family'))`)
- `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)
- `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)

### 2.8 `public.v2_vault_items`
Stores Zero-Knowledge AES-GCM encrypted credentials and secret notes.
- `id` (`UUID PRIMARY KEY`)
- `workspace_id` (`UUID NOT NULL REFERENCES public.v2_workspaces(id) ON DELETE CASCADE`)
- `owner_id` (`UUID REFERENCES auth.users(id) ON DELETE CASCADE`)
- `title` (`TEXT NOT NULL`)
- `category` (`TEXT NOT NULL DEFAULT 'login' CHECK (category IN ('login', 'bank_pin', 'card_pin', 'secret_note'))`)
- `username` (`TEXT`)
- `cipher_text` (`TEXT NOT NULL`)
- `iv` (`TEXT NOT NULL`)
- `salt` (`TEXT NOT NULL`)
- `url` (`TEXT`)
- `notes` (`TEXT`)
- `scope` (`TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('business', 'personal', 'family'))`)
- `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)
- `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)
