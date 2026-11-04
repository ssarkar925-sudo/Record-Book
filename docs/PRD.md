# Product Requirements Document (PRD) — Record Book V2

**Product Name**: Record Book V2 — Smart Financial & Wealth Suite  
**Version**: 2.0.0 (Greenfield Architecture)  
**Posture**: Daylight-Only Multicolour Pastel Edition (Zero Dark Mode)  
**Target Platforms**: Web Application (1440px Desktop) & Capacitor Android Mobile App (390px Touch)

---

## 1. Executive Summary & Vision

Record Book V2 is a ground-up, zero-legacy-overlap financial management platform engineered for business owners, merchants, professionals, and households. It unifies banking, double-entry cash/expense ledgers, party receivables/payables (Udhar Khata), credit card billing cycles, custom spreadsheet registers, smart ₹-calculating daily notes, and an AES-GCM encrypted credential vault into a single cohesive workspace.

### Core Objectives
1. **Zero Legacy Overlap**: Built from scratch on a clean V2 data model, new state store, and new component tree.
2. **Deterministic Multi-Device Sync**: Every user account maps 1-to-1 to a single canonical cloud workspace (`v2_workspaces.owner_id UNIQUE`), guaranteeing that Web and Android Mobile always display the exact same records in real time.
3. **Strict Daylight-Only Multicolour Aesthetic**: A permanent bright alabaster canvas (`#F8FAFC` / `#FFFFFF`) with deep-light pastel-tinted module surfaces (`#EEF2FF`, `#ECFDF5`, `#FFF1F2`, `#FEF3C7`, `#E0F2FE`, `#F3E8FF`) and crisp slate typography (`#0F172A`).
4. **Integer Paise Precision**: All monetary calculations and database columns store values in integer Paise (`₹1.00 = 100 paise`) to prevent floating-point rounding drift.

---

## 2. Technology Stack Specification

| Technology | Role in Record Book V2 |
| :--- | :--- |
| **TypeScript** | End-to-end strict static typing across domain models, DTOs, API controllers, and UI components. |
| **Tailwind CSS** | Daylight-only utility styling, 60-30-10 pastel surface allocation, responsive grid layouts, and tabular numerals. |
| **shadcn/ui** | Accessible, composable Radix-backed UI primitives (`Button`, `Card`, `Dialog`, `Tabs`, `Input`, `Select`, `Sheet`). |
| **Framer Motion** | Declarative view transitions, modal/drawer animations, and layout list reordering (`< 180ms` latency budget). |
| **GSAP** | High-precision numeric counter roll-ups on financial KPIs, net-worth bar animations, and micro-interaction feedback. |
| **Vite** | Fast frontend bundler and module configuration (`vite.config.ts`) paired with static export for Android APK packaging. |
| **Node.js** | Server-side JavaScript runtime environment executing API controllers, validation, and build pipelines. |
| **Express.js** | HTTP REST routing layer (`/api/v2/*`) for health diagnostics, sync reconciliation, and ledger verification. |
| **NestJS Architecture** | Modular Dependency-Injection architecture (`@Module`, `@Controller`, `@Injectable` Services, and DTO Validators). |
| **PostgreSQL** | Relational ACID database engine enforcing foreign keys, `BIGINT` paise columns, and row-level security. |
| **Supabase** | Cloud authentication, PostgreSQL hosting, `get_or_create_v2_workspace` RPC, and Realtime WebSocket broadcast. |

---

## 3. Functional Scope: The 9 Core Modules

### Module 01: Overview Hub (Executive Dashboard)
- **Net Worth & Liquidity Summary**: Live calculation of Total Liquid Cash & Bank Balance, Total Receivables (`You Will Get`), Total Payables (`You Will Give`), and Credit Card Utilized Balance.
- **Sphere Segmentation**: Instant filtering across `All Spheres`, `Business`, `Personal`, and `Family`.
- **GSAP Animated KPI Strip**: Smooth counter roll-ups whenever sphere filters or ledger entries change.
- **Quick Entry Actions**: 1-click triggers to log Cash In, Cash Out/Expense, or Transfer Funds from anywhere.

### Module 02: Bank & Cash Accounts (`v2_accounts`)
- **Multi-Account Types**: Support for `Savings Account`, `Current Account`, `Cash Counter / Galla`, `UPI Wallet`, and `OD / CC Account`.
- **Self-Transfer Engine**: Atomic intra-account transfer that debits the source account, credits the destination account, and records a linked transfer journal entry.
- **Automatic Ledger Reconciliation**: Account balances automatically stay synchronized with linked cash-in and cash-out ledger entries.

### Module 03: Income & Expenses Ledger (`v2_ledger_entries`)
- **Unified Double-Entry Journal**: Log `Cash In (Income)`, `Cash Out`, and `Expense` transactions with category, payment mode (`Cash`, `UPI`, `Bank Transfer`, `Card`), linked bank account, sphere tag, and remarks.
- **Live Filtering & Search**: Filter by transaction type, payment mode, sphere, or text search across notes and categories.
- **Reversal on Delete**: Deleting a ledger entry automatically restores the linked bank account or credit card balance.

### Module 04: Dues & Udhar Khata (`v2_parties_dues`)
- **Receivables & Payables**: Track customers (`You Will Get` / Receivable) and suppliers (`You Will Give` / Payable) with phone numbers, due dates, and remarks.
- **Partial & Full Settlement**: Settle any due partially or in full into a chosen bank/cash account, automatically generating the corresponding ledger entry and updating `paid_amount_paise` and `status` (`pending` -> `partial` -> `settled`).

### Module 05: Credit Cards & Billing (`v2_credit_cards`)
- **Card Portfolio**: Track card name, issuing bank, last 4 digits, network (`Visa`, `Mastercard`, `RuPay`, `Amex`), total credit limit, and utilized balance.
- **Billing Cycle & Utilization**: Automated calculation of available limit, utilization percentage with semantic warning thresholds (`< 30%` healthy, `30–70%` moderate, `> 70%` high alert), statement day, and due day.
- **Card Spend & Bill Payment**: Log card purchases (increasing utilized balance) or pay credit card bills directly from a bank account (reducing utilized balance and debiting the bank account).

### Module 06: Sheets & Registers (`v2_sheets`)
- **Custom Multi-Column Spreadsheets**: Create custom registers (e.g., GST Sales Register, Daily Stock Register, Staff Attendance & Payroll) with typed columns (`text`, `number`, `currency`, `date`).
- **Live Column Aggregation**: Automatic bottom summary row calculating totals for all `currency` and `number` columns.
- **CSV Export**: 1-click export of any sheet to standard `.csv` format.

### Module 07: Daily Notes & Smart ₹ Checklists (`v2_notes`)
- **Live Currency Extraction**: Checklist items automatically parse embedded rupee values (e.g., `"Pay dairy supplier ₹1,450"` or `"Packaging boxes 600"`) and compute the note's live total (`calculated_total_paise`), settled amount (checked items), and pending amount (unchecked items).
- **1-Tap Post to Ledger**: Convert any note's calculated total directly into an Income or Expense ledger entry.
- **Lifecycle Organization**: Pinning, priority tagging (`Low`, `Medium`, `High`), pastel card themes, Archive, and Trash views.

### Module 08: Zero-Knowledge Encrypted Vault (`v2_vault_items`)
- **Client-Side WebCrypto AES-GCM**: Sensitive passwords, bank PINs, card PINs, and private recovery phrases are encrypted using PBKDF2 (100,000 iterations, SHA-256) + AES-GCM 256-bit encryption before storage.
- **Vault Lock & Reveal**: Master PIN lock screen, masked password display, 1-click reveal with auto-hide timer, and built-in high-entropy password generator.

### Module 09: Reports, Cloud Sync & Documentation Hub
- **Financial Audit Reports**: Category-wise expense breakdown, sphere-wise cash flow comparison, and net savings rate.
- **Supabase Cloud & Workspace Configuration**: Connect or switch Supabase project credentials, trigger instant cloud pull/push, or export/import a complete JSON workspace backup.
- **Built-In Documentation & SQL Blueprint Viewer**: Inspect and copy the complete `PRD.md`, `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA_V2.md`, and `supabase_schema_v2.sql` directly inside the application.
