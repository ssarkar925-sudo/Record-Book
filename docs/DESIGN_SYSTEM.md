# UI/UX Design System Specification — Record Book V2

**Design Philosophy**: Daylight-Only Multicolour Pastel Precision  
**Theme Posture**: Strictly Light Mode (`#F8FAFC` Alabaster Canvas & `#FFFFFF` Pure Surface — Zero Dark Mode)  
**Component Primitives**: `shadcn/ui` + Tailwind CSS v4  
**Motion Engines**: Framer Motion (Layout & Declarative Transitions) + GSAP (Numeric & Timeline Choreography)

---

## 1. Core Visual Principles

1. **Strictly Daylight-Only Posture**:
   - No `.dark` classes, no dark slate backgrounds, and no dark mode toggles.
   - The application maintains a bright, welcoming, high-legibility daylight atmosphere across every view, modal, drawer, and table.
2. **60-30-10 Multicolour Deep-Light Surface Allocation**:
   - **60% Neutral Alabaster Canvas**: Root background `#F8FAFC` (`bg-slate-50`) and primary table/card interiors `#FFFFFF` (`bg-white`).
   - **30% Deep-Light Tinted Structural Surfaces**: Module headers, KPI summary cards, and active navigation states use rich, luminous pastel tints with matching hairline borders (`1px solid`).
   - **10% Crisp Semantic Accents**: High-contrast primary action buttons, active indicators, and semantic financial figures (`#4F46E5` Indigo, `#059669` Emerald, `#E11D48` Rose, `#D97706` Amber).
3. **Zero-Pill Metadata Discipline**:
   - Static metadata (dates, payment modes, account types, sphere names, timestamps) is rendered as clean inline text separated by middots (`·`), never wrapped in redundant pill boxes.
   - Pill/capsule geometry is reserved strictly for interactive filter controls (`<button>`) and primary actions.
4. **Single-Elevation Depth**:
   - Cards sit on a single elevation plane with `border border-slate-200/80` and subtle ambient shadow (`shadow-xs`), avoiding nested bordered boxes ("cards within cards").

---

## 2. Module Colour Palette Tokens

| Module | Surface Tint (Deep-Light Pastel) | Border Token | Primary Accent & Ink |
| :--- | :--- | :--- | :--- |
| **01. Overview Hub** | `bg-indigo-50/85` (`#EEF2FF`) | `border-indigo-200/80` | `text-indigo-950` · CTA `bg-indigo-600` |
| **02. Bank & Cash** | `bg-sky-50/85` (`#F0F9FF`) | `border-sky-200/80` | `text-sky-950` · CTA `bg-sky-600` |
| **03. Income & Expenses** | `bg-emerald-50/80` & `bg-rose-50/80` | `border-emerald-200/80` | `text-emerald-950` / `text-rose-950` |
| **04. Dues & Udhar** | `bg-amber-50/85` (`#FFFBEB`) | `border-amber-200/80` | `text-amber-950` · CTA `bg-amber-600` |
| **05. Credit Cards** | `bg-violet-50/85` (`#F5F3FF`) | `border-violet-200/80` | `text-violet-950` · CTA `bg-violet-600` |
| **06. Sheets & Registers** | `bg-teal-50/85` (`#F0FDFA`) | `border-teal-200/80` | `text-teal-950` · CTA `bg-teal-600` |
| **07. Daily Notes ₹** | `bg-yellow-50/85` (`#FEFCE8`) | `border-yellow-200/80` | `text-amber-950` · CTA `bg-amber-600` |
| **08. Encrypted Vault** | `bg-pink-50/85` (`#FDF2F8`) | `border-pink-200/80` | `text-pink-950` · CTA `bg-pink-600` |
| **09. Reports & Sync** | `bg-slate-100/85` (`#F1F5F9`) | `border-slate-200/90` | `text-slate-900` · CTA `bg-indigo-600` |

---

## 3. Typography & Tabular Hierarchy (2+1 Font Rule)

1. **Display & Navigation Font (`Plus Jakarta Sans`)**:
   - Module Titles: `clamp(1.35rem, 2vw, 1.75rem)`, `font-bold`, `tracking-tight`, `text-slate-900`.
   - Section Headers: `1.05rem` (`17px`), `font-semibold`, `text-slate-900`.
2. **Body & Control Font (`DM Sans`)**:
   - Body Copy & Table Text: `0.875rem` (`14px`) to `0.9375rem` (`15px`), `font-normal` / `font-medium`, `text-slate-700`.
   - Muted Inline Metadata: `0.75rem` (`12px`), `text-slate-500`.
3. **Numeric & Financial Font (`JetBrains Mono` + `tabular-nums`)**:
   - Every currency display (`₹1,24,500.00`), balance, percentage, and date column enforces `font-mono tabular-nums` so digits align vertically across rows.

---

## 4. Responsive Navigation & Layout Contract

### Top Bar Contract (3-Zone Header)
- **Zone 1 (Left)**: Brand Wordmark (`Record Book V2`) + Active Module Breadcrumb (`whitespace-nowrap shrink-0`).
- **Zone 2 (Center)**: Interactive Sphere Segmented Control (`All · Business · Personal · Family`) + Quick Search input.
- **Zone 3 (Right)**: Live Sync Status Action (`Synced` / `Sync Now`) + Primary Quick Entry Button (`+ Log Entry`).

### Desktop Layout (`1440px` Viewport)
- Fixed Left Sidebar (`256px` width) listing all 9 modules with clear icon + label pairs, zero text wrapping, and instant keyboard/click switching.
- Main scrollable workspace container with `24px` (`p-6`) outer padding and `16px` (`gap-4`) grid spacing.

### Mobile Layout (`390px` Viewport & Capacitor Android)
- Fixed 6-column Bottom Navigation Bar (`height: 60px`, within the 15% sticky viewport budget):
  1. `Notes`
  2. `Credit Card`
  3. `Dues`
  4. `Bank`
  5. `Expenses`
  6. `More` (opens a `shadcn/ui` bottom drawer with `Overview`, `Sheets`, `Vault`, and `Reports & Sync`)

---

## 5. Motion Choreography (Framer Motion + GSAP)

- **Framer Motion**:
  - Module tab transitions use `initial={{ opacity: 0, y: 6 }}`, `animate={{ opacity: 1, y: 0 }}`, `transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}`.
  - `shadcn/ui` modals and drawers animate strictly via `opacity` and `transform`.
- **GSAP (`gsap.to`)**:
  - KPI numeric counters smoothly tween from previous value to new value over `0.45s` (`power2.out`) whenever transactions are added or sphere filters change.
