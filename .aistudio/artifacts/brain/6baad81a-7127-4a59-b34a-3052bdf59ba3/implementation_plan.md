# Record Book V2 — Greenfield Financial & Wealth Suite (PRD, Design, Architecture & Database Blueprint)

A complete, ground-up rebuild of the Record Book financial and wealth management platform with zero legacy code overlap, a strictly daylight-only multicolour pastel-tinted aesthetic powered by **shadcn/ui**, **Framer Motion**, and **GSAP**, a unified **Vite + Node.js/Express (NestJS modular architecture)** runtime, and a clean **PostgreSQL / Supabase V2** database schema with deterministic multi-device real-time synchronization.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Please review this unified **PRD + Design System + System Architecture + Database V2 Specification**. Once you click **Proceed**, Step 1 of execution will write the standalone formal documentation suite (`PRD`, `DESIGN_SPEC`, `ARCHITECTURE`, `DATABASE_SCHEMA_V2`, and the clean SQL migration script) before retiring all previous code and building the new stack from scratch.

- **Confirmed Decision 1 — Full 9-Module Suite**: Complete greenfield implementation of Overview Dashboard, Bank & Cash Accounts, Income & Expenses Ledger, Dues & Udhar Khata, Credit Cards & Billing, Spreadsheet Registers (Sheets), Daily Notes & Smart ₹ Checklists, Encrypted Vault, and Financial Reports & Backup.
- **Confirmed Decision 2 — Strictly Daylight-Only Multicolour Pastel Aesthetic**: Pure alabaster canvas (`#F8FAFC` / `#FFFFFF`) with deep-light pastel-tinted module surfaces (Indigo, Emerald, Rose, Amber, Sky, Violet, Teal) and high-contrast slate ink (`#0F172A`). Dark mode is permanently excluded.
- **Confirmed Decision 3 — Fresh V2 PostgreSQL & Supabase Schema**: Isolated, clean V2 relational schema where every user account maps deterministically to a single canonical workspace (`owner_id UNIQUE`), eliminating any possibility of Web vs. Mobile workspace split-brain.
- **Confirmed Decision 4 — Unified Full-Stack Runtime**: Vite frontend + Node.js / Express backend structured with NestJS-style Controllers, Services, and DTOs, paired with Supabase Auth, PostgreSQL, and Realtime WebSockets on Port 3000.

---

## 1. Product Requirements Document (PRD) & Overview

### What It Does
Record Book V2 is an institutional-grade personal and business financial ledger, credit tracker, spreadsheet register, smart checklist notebook, and zero-knowledge credential vault engineered for instantaneous multi-device synchronization across Web and Mobile.

### Target Audience & Personas
- **Business Owners & Merchants**: Track daily cash/bank inflows, supplier payables, customer receivables (Udhar), GST/tax summaries, and custom inventory/sales registers.
- **Professionals & Households**: Manage multi-bank balances, credit card billing cycles and utilization limits, personal/family budgets, daily financial checklists, and encrypted credentials.

### Core Functional Modules (9-Module Specification)

| Module | Core Capabilities & Acceptance Criteria | Accent Palette (Daylight Pastel) |
| :--- | :--- | :--- |
| **01. Overview Hub** | Net worth summary, liquid cash vs. credit obligations, sphere filter (`All / Business / Personal / Family`), GSAP-animated KPI counters, quick cash-in/out actions, and recent ledger stream. | Indigo & Violet (`#EEF2FF` / `#4F46E5`) |
| **02. Bank & Cash** | Multi-account management (Savings, Current, OD/CC, Cash Drawer, UPI Wallet), instant intra-account transfers, and automatic balance reconciliation from ledger entries. | Sky & Blue (`#E0F2FE` / `#0284C7`) |
| **03. Income & Expenses** | Double-entry cash-in, cash-out, and expense journal with category tagging, payment mode (`Cash / UPI / Bank / Card`), search, and date range filtering. | Emerald & Rose (`#ECFDF5` / `#059669` & `#FFF1F2` / `#E11D48`) |
| **04. Dues & Udhar** | Customer & supplier directory, receivable (`You Will Get`) vs. payable (`You Will Pay`) tracking, partial or full settlement with automatic ledger posting, and due-date reminders. | Amber & Orange (`#FEF3C7` / `#D97706`) |
| **05. Credit Cards** | Credit limit vs. utilized balance tracking, statement day & due day countdowns, card spend logging, and 1-tap bill settlement from any bank account. | Violet & Purple (`#F3E8FF` / `#7C3AED`) |
| **06. Sheets & Registers** | Custom multi-column spreadsheet grids with text, number, currency, and date columns, live column totals, row addition/deletion, and CSV export. | Teal & Cyan (`#CCFBF1` / `#0D9488`) |
| **07. Daily Notes** | Rich notes and interactive checklists with automatic live ₹ currency extraction from checklist items, priority levels, color themes, pin/archive/trash states, and 1-tap ledger posting. | Warm Amber & Coral (`#FEF9C3` / `#CA8A04`) |
| **08. Encrypted Vault** | Client-side AES-GCM 256-bit encrypted password, PIN, and document note storage with master PIN lock, password generator, and 1-tap copy. | Rose & Magenta (`#FCE7F3` / `#DB2777`) |
| **09. Reports & Cloud Sync** | Cash flow statements, category breakdowns, workspace switcher/connection settings (connect any Supabase URL + Anon Key or use built-in cloud), and JSON/CSV export & restore. | Slate & Indigo (`#F1F5F9` / `#334155`) |

---

## 2. User Experience & Visual Design Specification

### Aesthetic Direction & Color System (60-30-10 Daylight Rule)
- **60% Dominant Daylight Canvas**: Crisp alabaster background (`--background: #F8FAFC`) and pure white primary work surfaces (`--card: #FFFFFF`) with zero dark mode classes or dark surfaces.
- **30% Deep-Light Multicolour Structural Surfaces**: Module-specific tinted headers and summary cards using high-luminance pastel fills (`#EEF2FF`, `#ECFDF5`, `#FFF1F2`, `#FEF3C7`, `#E0F2FE`, `#F3E8FF`) paired with 1px hairline borders (`border-slate-200/80`) and single-elevation depth.
- **10% High-Intent Accent Budget**: Vibrant semantic action triggers (`#4F46E5` Indigo primary CTA, `#059669` Emerald inflow/settle, `#E11D48` Rose outflow/alert, `#D97706` Amber due warning).
- **Zero-Pill Metadata Discipline**: All static metadata (dates, payment modes, sphere labels, account numbers, timestamps) is rendered as clean, unboxed inline text separated by middots (`·`), reserving button/segmented styling strictly for interactive filters and actions.

### Typography & Tabular Discipline (2+1 Font Rule)
- **Display & Navigation Face**: `Plus Jakarta Sans` (SemiBold 600 / Bold 700, tight tracking `-0.02em`, `text-wrap: balance` on headings).
- **Body & UI Controls Face**: `DM Sans` (Regular 400 / Medium 500, 14px–16px for effortless scannability).
- **Financial & Telemetry Numerals**: `JetBrains Mono` with `font-variant-numeric: tabular-nums` enforced across every currency figure (`₹`), balance, percentage, and date column so decimals align vertically without layout jitter.

### Layout, Spatial Math & Navigation Contract
- **Desktop Viewport (`1440px` Baseline)**:
  - Left Sidebar (`256px` fixed width) displaying all 9 modules with crisp active states and zero vertical overflow.
  - Top Bar following the strict 3-zone contract: Single-line Brand Wordmark + Active Module Breadcrumb on the left, Global Search & Sphere Selector (`All · Business · Personal · Family`) in the center, and Real-Time Sync Status + Primary Quick Entry CTA on the right.
- **Mobile Viewport (`390px` Touch Baseline)**:
  - Sticky header + bottom bar kept strictly under 15% of viewport height.
  - 6-slot bottom navigation bar (`Notes`, `Credit Card`, `Dues`, `Bank`, `Expenses`, `More` drawer housing `Overview`, `Sheets`, `Vault`, `Reports & Sync`) with `44px+` touch targets.

### Dual Animation Engine (Framer Motion + GSAP)
- **Framer Motion**: Orchestrates declarative tab transitions, `shadcn/ui` dialog/sheet entrances, and layout list reordering within a `< 180ms` compositor-only (`transform`, `opacity`) latency budget.
- **GSAP**: Powers smooth financial counter roll-ups on KPI cards, net-worth bar progressions, and tactile micro-feedback on transaction submission.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Single Canonical Workspace Per User (`v2_*` Schema Isolation)**
  - *Chosen Approach*: Create a clean V2 relational schema where every user has one deterministic primary workspace (`owner_id` indexed and resolved via an idempotent server/RPC upsert), and every client device queries and subscribes by `owner_id` / canonical `workspace_id`.
  - *Why*: Eliminates the #1 cause of Web vs. Mobile data divergence (where two devices accidentally create or lock onto different workspace UUIDs for the same user).
  - *Alternatives Considered*: Allowing unlimited auto-created default workspaces per user was rejected because concurrent first-logins on mobile and web create split-brain ledgers.

- **Decision 2 — Unified Vite + Express/NestJS Modular Backend on Port 3000**
  - *Chosen Approach*: Run a single Node.js + Express server on port 3000 structured using NestJS architectural patterns (`Controllers` -> `Services` -> `Repositories/Validators`) that serves both `/api/v2/*` REST endpoints and the Vite frontend via middleware.
  - *Why*: Satisfies the full technology stack (Vite, Node.js, Express.js, NestJS architecture, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, GSAP, PostgreSQL, Supabase) within the single-port runtime environment.

- **Decision 3 — Server-Authoritative Cloud Sync + Offline-Resilient Local Cache**
  - *Chosen Approach*: When authenticated with Supabase, cloud PostgreSQL is the single source of truth across Web and Mobile via Supabase Realtime (`postgres_changes` + Broadcast) and `/api/v2/sync` batch reconciliation. All monetary values are stored in integer **Paise** (`BIGINT`) to prevent floating-point rounding errors.

---

## 4. Technical Architecture & Data Strategy

### System Architecture & Component Hierarchy

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Vite + React + TypeScript)                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Design & Motion Layer: Tailwind CSS + shadcn/ui + Framer Motion + GSAP         │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────────────────────────────────────────────┐  │
│  │ Navigation Shell │  │                9 Functional Module Views                 │  │
│  │ ──────────────── │  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │  │
│  │ • TopBar (3-Zone)│  │  │ 01. Overview │ │ 02. Bank/Cash│ │ 03. Income/Expen.│  │  │
│  │ • DesktopSidebar │  │  ├──────────────┤ ├──────────────┤ ├──────────────────┤  │  │
│  │ • MobileNav (6)  │  │  │ 04. Dues     │ │ 05. Cards    │ │ 06. Sheets Grid  │  │  │
│  │ • MoreDrawer     │  │  ├──────────────┤ ├──────────────┤ ├──────────────────┤  │  │
│  │ • QuickEntryModal│  │  │ 07. Notes ₹  │ │ 08. Vault AES│ │ 09. Reports/Sync │  │  │
│  └────────┬─────────┘  └──┴──────────────┴─┴──────────────┴─┴──────────────────┴──┘  │
│           │                                         │                                │
│           ▼                                         ▼                                │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │             Unified V2 State & Real-Time Sync Engine (Zustand + WAL)           │  │
│  │  • Single Canonical Workspace Lock   • Optimistic UI + Queue Replay            │  │
│  │  • Supabase Realtime WebSocket       • Pure Financial Math & Paise Engine      │  │
│  └────────────────────────┬───────────────────────────────────────┬───────────────┘  │
└───────────────────────────┼───────────────────────────────────────┼──────────────────┘
                            │ HTTP REST (/api/v2/*)                 │ WebSocket / RPC
                            ▼                                       ▼
┌───────────────────────────────────────────────────┐   ┌──────────────────────────────┐
│   BACKEND SERVER (Node.js + Express + NestJS DI)  │   │  SUPABASE & POSTGRESQL V2    │
│  ┌─────────────────────────────────────────────┐  │   │  ┌────────────────────────┐  │
│  │ • WorkspaceController & WorkspaceService    │  │   │  │ • Supabase Auth (JWT)  │  │
│  │ • LedgerController & ReconciliationService  │──┼──▶│  │ • v2_workspaces        │  │
│  │ • SyncController & BatchUpsertService       │  │   │  │ • v2_accounts          │  │
│  │ • Health & Schema Diagnostics Controller    │  │   │  │ • v2_ledger_entries    │  │
│  └─────────────────────────────────────────────┘  │   │  │ • v2_parties_dues      │  │
└───────────────────────────────────────────────────┘   │  │ • v2_credit_cards      │  │
                                                        │  │ • v2_sheets            │  │
                                                        │  │ • v2_notes             │  │
                                                        │  │ • v2_vault_items       │  │
                                                        │  └────────────────────────┘  │
                                                        └──────────────────────────────┘
```

### Clean V2 PostgreSQL / Supabase Data Model
All monetary amounts are stored as integer **Paise** (`BIGINT`, where `₹1.00 = 100 paise`). Every table includes `id UUID PRIMARY KEY`, `workspace_id UUID NOT NULL`, `owner_id UUID`, `scope TEXT ('business' | 'personal' | 'family')`, `created_at TIMESTAMPTZ`, and `updated_at TIMESTAMPTZ`:

1. **`v2_workspaces`**: `id`, `owner_id (UNIQUE)`, `name`, `currency ('INR')`, `created_at`, `updated_at`.
2. **`v2_accounts`**: `id`, `workspace_id`, `name`, `account_type ('savings' | 'current' | 'cash' | 'upi' | 'od_cc')`, `bank_name`, `account_number_last4`, `ifsc`, `balance_paise`, `is_default`, `scope`, `notes`, `updated_at`.
3. **`v2_ledger_entries`**: `id`, `workspace_id`, `entry_type ('cash_in' | 'cash_out' | 'expense' | 'transfer' | 'card_spend' | 'card_payment' | 'due_settlement')`, `amount_paise`, `category`, `payment_mode ('cash' | 'upi' | 'bank' | 'card')`, `account_id`, `target_account_id`, `party_id`, `card_id`, `note`, `entry_date`, `scope`, `updated_at`.
4. **`v2_parties_dues`**: `id`, `workspace_id`, `party_name`, `phone`, `party_type ('customer' | 'supplier')`, `direction ('receivable' | 'payable')`, `total_amount_paise`, `paid_amount_paise`, `due_date`, `status ('pending' | 'partial' | 'settled')`, `scope`, `notes`, `updated_at`.
5. **`v2_credit_cards`**: `id`, `workspace_id`, `card_name`, `bank_name`, `last4`, `network ('visa' | 'mastercard' | 'rupay' | 'amex')`, `credit_limit_paise`, `utilized_paise`, `statement_day`, `due_day`, `scope`, `notes`, `updated_at`.
6. **`v2_sheets`**: `id`, `workspace_id`, `title`, `category`, `columns (JSONB)`, `rows (JSONB)`, `scope`, `updated_at`.
7. **`v2_notes`**: `id`, `workspace_id`, `title`, `body`, `checklist_items (JSONB)`, `calculated_total_paise`, `color_theme`, `priority ('low' | 'medium' | 'high')`, `is_pinned`, `is_archived`, `is_trashed`, `reminder_date`, `tags (TEXT[])`, `scope`, `updated_at`.
8. **`v2_vault_items`**: `id`, `workspace_id`, `title`, `category ('login' | 'bank_pin' | 'card_pin' | 'secret_note')`, `username`, `cipher_text`, `iv`, `salt`, `url`, `notes`, `scope`, `updated_at`.

### Interactive Component & State Mapping
- **Documentation-First Execution Sequence**:
  1. Generate formal standalone documentation (`PRD`, `DESIGN_SYSTEM`, `ARCHITECTURE`, `DATABASE_SCHEMA_V2`, and `supabase_schema_v2.sql`).
  2. Configure Vite + Express/NestJS server on Port 3000 with `shadcn/ui`, `framer-motion`, and `gsap`.
  3. Build pure domain math & multi-device reconciliation engine with `node:test` unit test suite (`100%` pass gate before UI mount).
  4. Implement all 9 interactive modules with complete CRUD handlers, real-time Supabase sync, and responsive desktop/mobile layouts.
  5. Verify end-to-end user journeys in a real headless browser at `1440×900` (Desktop) and `390×844` (Mobile).
