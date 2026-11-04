'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeftRight,
  BookOpen,
  Building2,
  Cloud,
  CreditCard,
  FileSpreadsheet,
  FileText,
  HandCoins,
  LayoutDashboard,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  StickyNote,
  X,
} from 'lucide-react';
import { useV2Store } from '@/v2/store/useV2Store';
import {
  computeOverviewMetrics,
  formatINRFromPaise,
  rupeesToPaise,
} from '@/v2/engine/financialEngine';
import { ModuleId, PaymentMode, SphereScope } from '@/types/v2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { OverviewModule } from '@/v2/modules/OverviewModule';
import { BankCashModule } from '@/v2/modules/BankCashModule';
import { IncomeExpenseModule } from '@/v2/modules/IncomeExpenseModule';
import { DuesUdharModule } from '@/v2/modules/DuesUdharModule';
import { CreditCardsModule } from '@/v2/modules/CreditCardsModule';
import { SheetsRegistersModule } from '@/v2/modules/SheetsRegistersModule';
import { DailyNotesModule } from '@/v2/modules/DailyNotesModule';
import { EncryptedVaultModule } from '@/v2/modules/EncryptedVaultModule';
import { ReportsSyncDocsModule } from '@/v2/modules/ReportsSyncDocsModule';

interface NavModuleItem {
  id: ModuleId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  activeStyle: string;
}

const ALL_MODULES: NavModuleItem[] = [
  {
    id: 'overview',
    label: 'Executive Overview',
    shortLabel: 'Overview',
    icon: LayoutDashboard,
    activeStyle: 'border-indigo-300 bg-[#EEF2FF] text-indigo-950',
  },
  {
    id: 'notes',
    label: 'Daily Notes & ₹',
    shortLabel: 'Notes',
    icon: StickyNote,
    activeStyle: 'border-amber-300 bg-[#FFFBEB] text-amber-950',
  },
  {
    id: 'cards',
    label: 'Credit Cards',
    shortLabel: 'Credit Card',
    icon: CreditCard,
    activeStyle: 'border-rose-300 bg-[#FFF1F2] text-rose-950',
  },
  {
    id: 'dues',
    label: 'Dues & Udhar',
    shortLabel: 'Dues',
    icon: HandCoins,
    activeStyle: 'border-amber-300 bg-[#FFFBEB] text-amber-950',
  },
  {
    id: 'bank',
    label: 'Bank & Cash',
    shortLabel: 'Bank',
    icon: Building2,
    activeStyle: 'border-emerald-300 bg-[#ECFDF5] text-emerald-950',
  },
  {
    id: 'expenses',
    label: 'Income & Expenses',
    shortLabel: 'Expenses',
    icon: ArrowLeftRight,
    activeStyle: 'border-sky-300 bg-[#EFF6FF] text-sky-950',
  },
  {
    id: 'sheets',
    label: 'Sheets & Registers',
    shortLabel: 'Sheets',
    icon: FileSpreadsheet,
    activeStyle: 'border-sky-300 bg-[#EFF6FF] text-sky-950',
  },
  {
    id: 'vault',
    label: 'Encrypted Vault',
    shortLabel: 'Vault',
    icon: Lock,
    activeStyle: 'border-indigo-300 bg-[#EEF2FF] text-indigo-950',
  },
  {
    id: 'reports',
    label: 'Docs, Sync & Reports',
    shortLabel: 'Docs & Sync',
    icon: FileText,
    activeStyle: 'border-emerald-300 bg-[#ECFDF5] text-emerald-950',
  },
];

// Requested Mobile Bottom Bar Priority Order: Notes, Credit Card, Dues, Bank, Expenses, More
const MOBILE_PRIMARY_IDS: ModuleId[] = [
  'notes',
  'cards',
  'dues',
  'bank',
  'expenses',
];

const MOBILE_MORE_IDS: ModuleId[] = ['overview', 'sheets', 'vault', 'reports'];

export function V2AppShell() {
  const {
    activeModule,
    scopeFilter,
    searchQuery,
    accounts,
    entries,
    dues,
    cards,
    syncStatus,
    setActiveModule,
    setScopeFilter,
    setSearchQuery,
    addLedgerEntry,
    hydrateFromStorageAndCloud,
    syncNowWithCloud,
  } = useV2Store();

  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickType, setQuickType] = useState<'cash_in' | 'expense'>('expense');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickCategory, setQuickCategory] = useState('General Entry');
  const [quickMode, setQuickMode] = useState<PaymentMode>('upi');
  const [quickAccountId, setQuickAccountId] = useState('');
  const [quickNote, setQuickNote] = useState('');

  useEffect(() => {
    hydrateFromStorageAndCloud();
    if (typeof window !== 'undefined') {
      const rawHash = window.location.hash.replace('#', '') as ModuleId;
      if (ALL_MODULES.some((m) => m.id === rawHash)) {
        setActiveModule(rawHash);
      }
    }
  }, [hydrateFromStorageAndCloud, setActiveModule]);

  const metrics = computeOverviewMetrics({
    accounts,
    entries,
    dues,
    cards,
    scope: scopeFilter,
  });

  const activeMeta =
    ALL_MODULES.find((m) => m.id === activeModule) || ALL_MODULES[0];

  const handleOpenQuickEntry = (defaultType: 'cash_in' | 'expense' = 'expense') => {
    setQuickType(defaultType);
    setQuickCategory(
      defaultType === 'cash_in' ? 'Sales & Revenue' : 'Business Expense'
    );
    setQuickAccountId(accounts[0]?.id || '');
    setQuickOpen(true);
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = rupeesToPaise(quickAmount);
    if (paise <= 0) return;

    await addLedgerEntry({
      entry_type: quickType,
      amount_paise: paise,
      category: quickCategory.trim() || 'Quick Voucher',
      payment_mode: quickMode,
      account_id: quickAccountId || accounts[0]?.id,
      note: quickNote.trim() || quickCategory.trim(),
      entry_date: new Date().toISOString(),
      scope: scopeFilter === 'all' ? 'business' : scopeFilter,
    });

    setQuickAmount('');
    setQuickNote('');
    setQuickOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased">
      {/* Sticky Daylight Top Bar (3-Zone Contract) */}
      <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
          {/* Zone 1: Brand Wordmark + Active Module Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveModule('overview')}
              className="flex items-center gap-2.5 text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-200 bg-[#EEF2FF] font-mono text-sm font-bold text-indigo-700">
                RB
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-slate-900">
                    Record Book
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-indigo-600">
                    V2.0
                  </span>
                </div>
                <p className="hidden text-[11px] text-slate-500 sm:block">
                  {activeMeta.label}
                </p>
              </div>
            </button>
          </div>

          {/* Zone 2: Sphere Scope Selector + Global Search */}
          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'business', label: 'Business' },
                  { id: 'personal', label: 'Personal' },
                  { id: 'family', label: 'Family' },
                ] as { id: 'all' | SphereScope; label: string }[]
              ).map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => setScopeFilter(sp.id)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                    scopeFilter === sp.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>

            <div className="relative w-56 lg:w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search ledger, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Zone 3: Cloud Sync Action + Primary Quick Entry CTA */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => syncNowWithCloud()}
              title="Multi-Device Cloud Reconcile"
              className="flex h-9 items-center gap-2 rounded-xl border border-emerald-200 bg-[#ECFDF5] px-3 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-100/80"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  syncStatus === 'syncing'
                    ? 'animate-pulse bg-amber-500'
                    : 'bg-emerald-600'
                }`}
              />
              <span className="hidden sm:inline">
                {syncStatus === 'syncing' ? 'Syncing...' : 'V2 Synced'}
              </span>
              <RefreshCw
                className={`h-3.5 w-3.5 text-emerald-700 ${
                  syncStatus === 'syncing' ? 'animate-spin' : ''
                }`}
              />
            </button>

            <Button
              size="sm"
              onClick={() => handleOpenQuickEntry('expense')}
              className="h-9 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Quick Entry</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="mx-auto flex max-w-[1600px]">
        {/* Desktop Left Sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4 lg:flex">
          <div className="space-y-4 overflow-y-auto">
            {/* Daylight Pastel Mini Net Worth Summary */}
            <div className="rounded-2xl border border-indigo-200 bg-[#EEF2FF]/75 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-800">
                Liquid Cash & Bank
              </p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900">
                {formatINRFromPaise(metrics.liquidCashPaise)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-600">
                Net Worth: {formatINRFromPaise(metrics.netWorthPaise)}
              </p>
            </div>

            {/* 9 Module Navigation List */}
            <nav aria-label="Workspace Modules" className="space-y-1">
              {ALL_MODULES.map((mod) => {
                const Icon = mod.icon;
                const isActive = activeModule === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setActiveModule(mod.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition-all ${
                      isActive
                        ? mod.activeStyle
                        : 'border-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{mod.label}</span>
                    </span>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Docs & SQL Schema Quick Link Footer */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">
                Architecture & PRD
              </span>
              <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Vite · Express/NestJS · Supabase V2
            </p>
            <button
              type="button"
              onClick={() => setActiveModule('reports')}
              className="mt-2 w-full rounded-lg border border-indigo-200 bg-white py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              Inspect Docs & V2 SQL →
            </button>
          </div>
        </aside>

        {/* Active Module Viewport */}
        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">
          {/* Mobile Sphere Filter Bar */}
          <div className="mb-4 flex items-center gap-1.5 overflow-x-auto md:hidden">
            {(
              [
                { id: 'all', label: 'All Spheres' },
                { id: 'business', label: 'Business' },
                { id: 'personal', label: 'Personal' },
                { id: 'family', label: 'Family' },
              ] as { id: 'all' | SphereScope; label: string }[]
            ).map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => setScopeFilter(sp.id)}
                className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                  scopeFilter === sp.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {activeModule === 'overview' && (
                <OverviewModule onOpenQuickEntry={handleOpenQuickEntry} />
              )}
              {activeModule === 'bank' && <BankCashModule />}
              {activeModule === 'expenses' && <IncomeExpenseModule />}
              {activeModule === 'dues' && <DuesUdharModule />}
              {activeModule === 'cards' && <CreditCardsModule />}
              {activeModule === 'sheets' && <SheetsRegistersModule />}
              {activeModule === 'notes' && <DailyNotesModule />}
              {activeModule === 'vault' && <EncryptedVaultModule />}
              {activeModule === 'reports' && <ReportsSyncDocsModule />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile & Android 6-Slot Bottom Navigation Bar (Notes, Credit Card, Dues, Bank, Expenses, More) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-6 gap-1">
          {MOBILE_PRIMARY_IDS.map((modId) => {
            const item = ALL_MODULES.find((m) => m.id === modId)!;
            const Icon = item.icon;
            const isActive = activeModule === modId;
            return (
              <button
                key={modId}
                type="button"
                onClick={() => {
                  setActiveModule(modId);
                  setMoreDrawerOpen(false);
                }}
                className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[11px] font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#EEF2FF] text-indigo-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="mt-0.5 truncate">{item.shortLabel}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreDrawerOpen((prev) => !prev)}
            className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[11px] font-semibold transition-colors ${
              moreDrawerOpen || MOBILE_MORE_IDS.includes(activeModule)
                ? 'bg-[#EEF2FF] text-indigo-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="mt-0.5">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Drawer */}
      <AnimatePresence>
        {moreDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-16 left-3 right-3 z-40 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl lg:hidden"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                More Workspace Modules
              </span>
              <button
                type="button"
                onClick={() => setMoreDrawerOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {MOBILE_MORE_IDS.map((modId) => {
                const item = ALL_MODULES.find((m) => m.id === modId)!;
                const Icon = item.icon;
                const isActive = activeModule === modId;
                return (
                  <button
                    key={modId}
                    type="button"
                    onClick={() => {
                      setActiveModule(modId);
                      setMoreDrawerOpen(false);
                    }}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-left text-xs font-bold ${
                      isActive
                        ? item.activeStyle
                        : 'border-slate-200 bg-slate-50 text-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Quick Entry Dialog */}
      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Double-Entry Voucher</DialogTitle>
            <DialogDescription>
              Instantly record Cash In or Expense from anywhere in Record Book V2.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuickType('cash_in');
                  setQuickCategory('Sales & Revenue');
                }}
                className={`rounded-xl border py-2.5 text-xs font-bold ${
                  quickType === 'cash_in'
                    ? 'border-emerald-300 bg-[#ECFDF5] text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                + Cash In (Revenue)
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickType('expense');
                  setQuickCategory('Business Expense');
                }}
                className={`rounded-xl border py-2.5 text-xs font-bold ${
                  quickType === 'expense'
                    ? 'border-rose-300 bg-[#FFF1F2] text-rose-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                - Expense / Cash Out
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Amount (₹) *
              </label>
              <Input
                type="number"
                step="0.01"
                required
                placeholder="1500"
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Category
                </label>
                <Input
                  value={quickCategory}
                  onChange={(e) => setQuickCategory(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Payment Mode
                </label>
                <select
                  value={quickMode}
                  onChange={(e) => setQuickMode(e.target.value as PaymentMode)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="upi">UPI</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Physical Cash</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Account
              </label>
              <select
                value={quickAccountId || accounts[0]?.id || ''}
                onChange={(e) => setQuickAccountId(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatINRFromPaise(a.balance_paise)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Narration
              </label>
              <Input
                placeholder="Optional voucher note..."
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuickOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Entry</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
