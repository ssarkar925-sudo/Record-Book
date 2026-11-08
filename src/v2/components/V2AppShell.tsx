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
import { useV2Store } from '@/v2/store/useV2StoreEdge';
import {
  computeOverviewMetrics,
  formatINRFromPaise,
  rupeesToPaise,
} from '@/v2/engine/financialEngine';
import { ModuleId, PaymentMode, SphereScope } from '@/types/v2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { DaylightToastContainer } from '@/components/ui/DaylightToast';
import { toast } from '@/components/ui/toastStore';
import { PremiumSidebar } from '@/v2/components/PremiumSidebar';
import { PremiumModal } from '@/components/ui/PremiumModal';
import { LayoutErrorBoundary } from '@/v2/components/ui/ErrorBoundary';

import { OverviewModule } from '@/v2/modules/OverviewModule';
import { BankCashModule } from '@/v2/modules/BankCashModule';
import { IncomeExpenseModule } from '@/v2/modules/IncomeExpenseModule';
import { DuesUdharModule } from '@/v2/modules/DuesUdharModule';
import { CreditCardsModule } from '@/v2/modules/CreditCardsModule';
import { SheetsRegistersModule } from '@/v2/modules/SheetsRegistersModule';
import { DailyNotesModule } from '@/v2/modules/DailyNotesModule';
import { EncryptedVaultModule } from '@/v2/modules/EncryptedVaultModule';
import { ReportsSyncDocsModule } from '@/v2/modules/ReportsSyncDocsModule';

const ALL_MODULES: ModuleId[] = [
  'overview',
  'bank',
  'expenses',
  'dues',
  'cards',
  'sheets',
  'notes',
  'vault',
  'reports',
];

// Mobile Bottom Bar Priority Order: Overview, Bank, Expenses, Dues, Cards, More
const MOBILE_PRIMARY_IDS: ModuleId[] = [
  'overview',
  'bank',
  'expenses',
  'dues',
  'cards',
];

const MOBILE_MORE_IDS: ModuleId[] = ['notes', 'sheets', 'vault', 'reports'];

export function V2AppShell() {
  const {
    activeModule,
    scopeFilter,
    searchQuery,
    accounts,
    entries,
    dues,
    cards,
    notes,
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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
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
      if (ALL_MODULES.includes(rawHash)) {
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
    toast.success(
      quickType === 'cash_in' ? 'Payment Received' : 'Expense Recorded',
      `₹${(paise / 100).toLocaleString('en-IN')} added to financial ledger`
    );
  };

  const handleLockButtonClick = () => {
    if (appPinHash) {
      setUnlockPinInput('');
      setUnlockError(false);
      lockApp();
      toast.info('Record Book Locked', 'Enter security PIN to resume');
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
    toast.success('Security PIN Set', 'App locked with 4-digit PIN protection');
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
        toast.success('Access Granted', 'Welcome back to Record Book');
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

  // Global Ctrl+K / Cmd+K Spotlight Command Palette Listener
  useEffect(() => {
    if (isAppLocked) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAppLocked]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased">
      {/* Full-Screen Daylight Security Lock Overlay */}
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
      <header className="sticky top-0 z-30 h-16 border-b border-slate-200/90 bg-white/95 backdrop-blur-md lg:pl-72">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
          {/* Zone 1: Brand Wordmark & Contextual Module Breadcrumb */}
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white/95 text-slate-600 shadow-2xs transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
              aria-label="Open navigation menu"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5 text-left group">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-[#EEF2FF] font-mono text-xs font-extrabold text-indigo-700 shadow-2xs transition-colors group-hover:bg-indigo-100">
                RB
              </div>
              <div className="hidden sm:block">
                <span className="block text-sm font-bold tracking-tight text-slate-900">
                  Record Book
                </span>
              </div>
            </div>
          </div>

          {/* Zone 2: Sphere Scope Selector + Global Search */}
          <div className="hidden items-center gap-3 md:flex flex-1 justify-center">
            <SegmentedControl<'all' | SphereScope>
              options={[
                { id: 'all', label: 'All' },
                { id: 'business', label: 'Business' },
                { id: 'personal', label: 'Personal' },
                { id: 'family', label: 'Family' },
              ]}
              value={scopeFilter}
              onChange={(val) => setScopeFilter(val)}
              layoutId="header-scope-selector"
              size="sm"
            />

            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="group relative flex h-9 w-52 lg:w-64 items-center rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 text-xs text-slate-500 shadow-2xs transition-all hover:border-indigo-300 hover:bg-white text-left"
              title="Open Spotlight Command Palette (Ctrl+K / Cmd+K)"
            >
              <Search className="mr-2 h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
              <span className="truncate">Search records or actions...</span>
              <kbd className="pointer-events-none ml-auto rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 shadow-2xs group-hover:text-slate-600 shrink-0">
                Ctrl+K
              </kbd>
            </button>
          </div>

          {/* Zone 3: Privacy Mask Toggle + Security Lock + Cloud Sync + Primary CTA */}
          <div className="flex items-center gap-2 lg:pr-4">
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
      <div className="mx-auto flex max-w-[1600px] lg:pl-72">
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

          <AnimatePresence>
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              <LayoutErrorBoundary>
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
              </LayoutErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Premium Sidebar (Desktop) */}
      <PremiumSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile & Android 6-Slot Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-6 gap-1">
          {MOBILE_PRIMARY_IDS.map((modId) => {
            const moduleLabels: Record<ModuleId, string> = {
              overview: 'Overview',
              bank: 'Bank',
              expenses: 'Cashbook',
              dues: 'Dues',
              cards: 'Cards',
              sheets: 'Registers',
              notes: 'Notes',
              vault: 'Vault',
              reports: 'Security',
            };
            const icons: Record<string, React.ComponentType<{ className?: string }>> = {
              overview: LayoutDashboard,
              bank: Building2,
              expenses: ArrowLeftRight,
              dues: HandCoins,
              cards: CreditCard,
              sheets: FileSpreadsheet,
              notes: StickyNote,
              vault: Lock,
              reports: ShieldCheck,
            };
            const Comp = icons[modId] || LayoutDashboard;
            const isActive = activeModule === modId;
            return (
              <button
                key={modId}
                type="button"
                onClick={() => {
                  setActiveModule(modId);
                }}
                className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[11px] font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#EEF2FF] text-indigo-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Comp className="h-4 w-4" />
                <span className="mt-0.5 truncate">{moduleLabels[modId] || modId}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[11px] font-semibold transition-colors ${
              MOBILE_MORE_IDS.includes(activeModule)
                ? 'bg-[#EEF2FF] text-indigo-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="mt-0.5">More</span>
          </button>
        </div>
      </nav>

      {/* Set 4-Digit Security PIN Modal */}
      <PremiumModal
        open={pinSetupOpen}
        onOpenChange={setPinSetupOpen}
        title="Enable 4-Digit App Security Lock"
        description="Protect your financial balances and business registers with a 4-digit PIN when stepping away from your device."
        size="sm"
        variant="dialog"
      >
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
      </PremiumModal>

      {/* Global Quick Entry Dialog - using PremiumModal */}
      <PremiumModal
        open={quickOpen}
        onOpenChange={setQuickOpen}
        title="New Cashbook Entry"
        description="Record income or expense and automatically update your linked bank or cash balance."
        size="md"
        variant="dialog"
      >
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
      </PremiumModal>

      {/* Spotlight Command Center (Ctrl+K / Cmd+K) */}
      <CommandPalette
        isOpen={commandOpen}
        onClose={() => setCommandOpen(false)}
        onOpenQuickEntry={handleOpenQuickEntry}
      />

      {/* Modern Daylight Toast Feedback System */}
      <DaylightToastContainer />
    </div>
  );
}
