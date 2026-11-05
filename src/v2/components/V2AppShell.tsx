'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  FileSpreadsheet,
  HandCoins,
  KeyRound,
  LayoutDashboard,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
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
    label: 'Executive Dashboard',
    shortLabel: 'Dashboard',
    icon: LayoutDashboard,
    activeStyle: 'border-indigo-300 bg-[#EEF2FF] text-indigo-950 shadow-2xs',
  },
  {
    id: 'notes',
    label: 'Smart Notes & Tasks',
    shortLabel: 'Notes',
    icon: StickyNote,
    activeStyle: 'border-amber-300 bg-[#FFFBEB] text-amber-950 shadow-2xs',
  },
  {
    id: 'cards',
    label: 'Credit Cards',
    shortLabel: 'Cards',
    icon: CreditCard,
    activeStyle: 'border-rose-300 bg-[#FFF1F2] text-rose-950 shadow-2xs',
  },
  {
    id: 'dues',
    label: 'Customer & Vendor Dues',
    shortLabel: 'Dues',
    icon: HandCoins,
    activeStyle: 'border-amber-300 bg-[#FFFBEB] text-amber-950 shadow-2xs',
  },
  {
    id: 'bank',
    label: 'Bank & Cash Accounts',
    shortLabel: 'Bank',
    icon: Building2,
    activeStyle: 'border-emerald-300 bg-[#ECFDF5] text-emerald-950 shadow-2xs',
  },
  {
    id: 'expenses',
    label: 'Cashbook & Expenses',
    shortLabel: 'Cashbook',
    icon: ArrowLeftRight,
    activeStyle: 'border-sky-300 bg-[#EFF6FF] text-sky-950 shadow-2xs',
  },
  {
    id: 'sheets',
    label: 'Business Registers',
    shortLabel: 'Registers',
    icon: FileSpreadsheet,
    activeStyle: 'border-sky-300 bg-[#EFF6FF] text-sky-950 shadow-2xs',
  },
  {
    id: 'vault',
    label: 'Password & PIN Vault',
    shortLabel: 'Vault',
    icon: Lock,
    activeStyle: 'border-indigo-300 bg-[#EEF2FF] text-indigo-950 shadow-2xs',
  },
  {
    id: 'reports',
    label: 'Reports, Security & Backup',
    shortLabel: 'Security',
    icon: ShieldCheck,
    activeStyle: 'border-emerald-300 bg-[#ECFDF5] text-emerald-950 shadow-2xs',
  },
];

// Mobile Bottom Bar Priority Order: Notes, Credit Card, Dues, Bank, Expenses, More
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
    userEmail,
    syncStatus,
    privacyMasked,
    appPinHash,
    isAppLocked,
    setActiveModule,
    setScopeFilter,
    setSearchQuery,
    togglePrivacyMask,
    setAppSecurityPin,
    lockApp,
    unlockAppWithPin,
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

  // PIN Lock & Setup State
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [newPinValue, setNewPinValue] = useState('');
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [unlockError, setUnlockError] = useState(false);

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
      category: quickCategory.trim() || 'Quick Entry',
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

  const handleLockButtonClick = () => {
    if (appPinHash) {
      setUnlockPinInput('');
      setUnlockError(false);
      lockApp();
    } else {
      setNewPinValue('');
      setPinSetupOpen(true);
    }
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newPinValue.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length !== 4) return;
    setAppSecurityPin(cleaned);
    setNewPinValue('');
    setPinSetupOpen(false);
  };

  const handleDigitPress = (digit: string) => {
    if (unlockPinInput.length >= 4) return;
    const next = unlockPinInput + digit;
    setUnlockPinInput(next);
    setUnlockError(false);
    if (next.length === 4) {
      const ok = unlockAppWithPin(next);
      if (!ok) {
        setUnlockError(true);
        setTimeout(() => setUnlockPinInput(''), 350);
      } else {
        setUnlockPinInput('');
      }
    }
  };

  useEffect(() => {
    if (!isAppLocked) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        setUnlockPinInput((prev) => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        setUnlockPinInput('');
        setUnlockError(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased">
      {/* Full-Screen Daylight Security Lock Overlay (100% opaque privacy shield, preserves module state underneath) */}
      {isAppLocked && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F8FAFC] px-4 py-12 text-[#0F172A]">
          <div className="w-full max-w-md rounded-3xl border border-indigo-200 bg-white p-8 shadow-xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-200 bg-[#EEF2FF] text-indigo-700">
                <Lock className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-center text-xl font-bold tracking-tight text-slate-900">
                Record Book Locked
              </h1>
              <p className="mt-1 text-center text-xs text-slate-600">
                Enter your 4-digit security PIN to unlock your financial workspace.
              </p>

              {/* 4-Digit Indicator Dots */}
              <div className="my-6 flex items-center justify-center gap-3.5">
                {[0, 1, 2, 3].map((idx) => {
                  const filled = unlockPinInput.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-lg font-bold transition-all ${
                        unlockError
                          ? 'border-rose-400 bg-[#FFF1F2] text-rose-700'
                          : filled
                            ? 'border-indigo-500 bg-[#EEF2FF] text-indigo-900'
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                    >
                      {filled ? '●' : ''}
                    </div>
                  );
                })}
              </div>

              {unlockError && (
                <p className="mb-4 text-center text-xs font-semibold text-rose-600">
                  Incorrect security PIN. Please try again.
                </p>
              )}

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleDigitPress(digit)}
                    className="flex h-13 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/70 font-mono text-lg font-bold text-slate-900 transition-colors hover:border-indigo-300 hover:bg-[#EEF2FF]"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setUnlockPinInput('');
                    setUnlockError(false);
                  }}
                  className="flex h-13 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleDigitPress('0')}
                  className="flex h-13 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/70 font-mono text-lg font-bold text-slate-900 transition-colors hover:border-indigo-300 hover:bg-[#EEF2FF]"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setUnlockPinInput((prev) => prev.slice(0, -1))}
                  className="flex h-13 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      {/* Sticky Daylight Top Bar */}
      <header className="sticky top-0 z-30 h-16 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
          {/* Zone 1: Brand Wordmark & Contextual Module Breadcrumb */}
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <button
              type="button"
              onClick={() => setActiveModule('overview')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-200 bg-[#EEF2FF] font-mono text-xs font-extrabold text-indigo-700 shadow-2xs transition-colors group-hover:bg-indigo-100">
                RB
              </div>
              <div>
                <span className="block text-sm font-bold tracking-tight text-slate-900">
                  Record Book
                </span>
                <span className="block text-[10px] font-medium text-slate-500 sm:hidden">
                  {activeMeta.shortLabel}
                </span>
              </div>
            </button>
            <span aria-hidden="true" className="hidden text-slate-300 sm:inline">
              /
            </span>
            <span className="hidden rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 sm:inline">
              {activeMeta.label}
            </span>
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
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                    scopeFilter === sp.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>

            <div className="relative w-52 lg:w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search transactions, parties, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/90 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Zone 3: Privacy Mask Toggle + Security Lock + Cloud Sync + Primary CTA */}
          <div className="flex items-center gap-2">
            {/* Privacy Stealth Toggle */}
            <button
              type="button"
              onClick={togglePrivacyMask}
              title={
                privacyMasked
                  ? 'Show all currency balances'
                  : 'Mask all currency balances on screen'
              }
              className={`flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors ${
                privacyMasked
                  ? 'border-amber-300 bg-[#FFFBEB] text-amber-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {privacyMasked ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-amber-700" />
                  <span className="hidden sm:inline">Show ₹</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Hide ₹</span>
                </>
              )}
            </button>

            {/* Security PIN Lock Button */}
            <button
              type="button"
              onClick={handleLockButtonClick}
              title={
                appPinHash
                  ? 'Lock workspace immediately'
                  : 'Set a 4-digit security PIN to lock workspace'
              }
              className={`flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors ${
                appPinHash
                  ? 'border-indigo-200 bg-[#EEF2FF] text-indigo-900 hover:bg-indigo-100/80'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Lock className="h-3.5 w-3.5 text-indigo-700" />
              <span className="hidden xl:inline">
                {appPinHash ? 'Lock' : 'Set PIN'}
              </span>
            </button>

            {/* Cloud Account Sync */}
            <button
              type="button"
              onClick={() => {
                if (userEmail) {
                  void syncNowWithCloud();
                } else {
                  setActiveModule('reports');
                }
              }}
              title={
                userEmail
                  ? `Cloud Backup Active (${userEmail})`
                  : 'Sign in to enable multi-device cloud backup'
              }
              className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                userEmail
                  ? 'border-emerald-200 bg-[#ECFDF5] text-emerald-900 hover:bg-emerald-100/80'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  userEmail ? 'text-emerald-700' : 'text-slate-600'
                } ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
              />
              <span className="hidden md:inline whitespace-nowrap">
                {syncStatus === 'syncing'
                  ? 'Syncing...'
                  : userEmail
                    ? 'Cloud Active'
                    : 'Account Sync'}
              </span>
            </button>

            <Button
              size="sm"
              onClick={() => handleOpenQuickEntry('expense')}
              className="h-9 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>New Entry</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="mx-auto flex max-w-[1600px]">
        {/* Desktop Left Sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col justify-between border-r border-slate-200/90 bg-white p-4 lg:flex">
          <div className="space-y-4 overflow-y-auto">
            {/* Daylight Pastel Mini Net Worth Summary */}
            <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-[#EEF2FF] to-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-900">
                  Total Liquid Cash
                </p>
                <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold capitalize text-indigo-700">
                  {scopeFilter}
                </span>
              </div>
              <p className="mt-1.5 font-mono text-lg font-extrabold tabular-nums text-slate-900">
                {formatINRFromPaise(metrics.liquidCashPaise, {
                  masked: privacyMasked,
                })}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-600">
                Net Worth:{' '}
                <span className="font-mono font-semibold text-slate-800">
                  {formatINRFromPaise(metrics.netWorthPaise, {
                    masked: privacyMasked,
                  })}
                </span>
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
                    <span className="flex items-center gap-2.5 whitespace-nowrap">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{mod.label}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Security & Privacy Posture Card */}
          <div className="rounded-2xl border border-emerald-200 bg-[#ECFDF5]/70 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-950">
                Security & Protection
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="mt-1 text-[11px] text-emerald-900/80">
              {appPinHash
                ? '4-Digit App PIN Active · AES-256 Vault'
                : 'AES-256 Vault Active · PIN Optional'}
            </p>
            <div className="mt-2.5 flex gap-1.5">
              <button
                type="button"
                onClick={handleLockButtonClick}
                className="flex-1 rounded-lg border border-emerald-300 bg-white py-1.5 text-[11px] font-semibold text-emerald-900 transition-colors hover:bg-emerald-50"
              >
                {appPinHash ? 'Lock Now' : 'Set App PIN'}
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('reports')}
                className="rounded-lg border border-emerald-200 bg-white/80 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-white"
              >
                Center
              </button>
            </div>
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
                    ? 'border-indigo-300 bg-[#EEF2FF] text-indigo-950'
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

      {/* Mobile & Android 6-Slot Bottom Navigation Bar */}
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
                More Modules
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

      {/* Set 4-Digit Security PIN Modal */}
      <Dialog open={pinSetupOpen} onOpenChange={setPinSetupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable 4-Digit App Security Lock</DialogTitle>
            <DialogDescription>
              Protect your financial balances and business registers with a 4-digit PIN when stepping away from your device.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveNewPin} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Enter 4-Digit Security PIN *
              </label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                placeholder="••••"
                value={newPinValue}
                onChange={(e) =>
                  setNewPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                className="font-mono text-center text-lg tracking-widest"
              />
            </div>
            <div className="rounded-xl border border-indigo-200 bg-[#EEF2FF]/60 p-3 text-xs text-indigo-950">
              <div className="flex items-center gap-2 font-semibold">
                <KeyRound className="h-4 w-4 text-indigo-700" />
                <span>Instant One-Click Lock</span>
              </div>
              <p className="mt-1 text-slate-600">
                Once configured, click the <strong>Lock</strong> button in the top bar anytime to lock the screen immediately.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPinSetupOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={newPinValue.replace(/\D/g, '').length !== 4}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Activate Security PIN
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Global Quick Entry Dialog */}
      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Cashbook Entry</DialogTitle>
            <DialogDescription>
              Record income or expense and automatically update your linked bank or cash balance.
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
                className={`rounded-xl border py-2.5 text-xs font-bold transition-colors ${
                  quickType === 'cash_in'
                    ? 'border-emerald-300 bg-[#ECFDF5] text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                + Cash In (Income)
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickType('expense');
                  setQuickCategory('Business Expense');
                }}
                className={`rounded-xl border py-2.5 text-xs font-bold transition-colors ${
                  quickType === 'expense'
                    ? 'border-rose-300 bg-[#FFF1F2] text-rose-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                - Cash Out (Expense)
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
                Deposit / Debit Account
              </label>
              <select
                value={quickAccountId || accounts[0]?.id || ''}
                onChange={(e) => setQuickAccountId(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                {accounts.length === 0 && (
                  <option value="">Unlinked (General Cashbook)</option>
                )}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (
                    {formatINRFromPaise(a.balance_paise, {
                      masked: privacyMasked,
                    })}
                    )
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Description / Remarks
              </label>
              <Input
                placeholder="Add invoice reference or party name..."
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
              <Button type="submit">Save Transaction</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
