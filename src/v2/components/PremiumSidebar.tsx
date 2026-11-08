'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  ArrowLeftRight,
  HandCoins,
  CreditCard,
  FileSpreadsheet,
  StickyNote,
  Lock,
  ShieldCheck,
  MoreHorizontal,
  X,
  ChevronRight,
  ChevronLeft,
  Zap,
  BarChart2,
  TrendingUp,
  Shield,
  Database,
  Settings,
  HelpCircle,
  Bell,
  Moon,
  Sun,
  Globe,
  Key,
  Users,
  Archive,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Eye,
  EyeOff,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import { useV2Store } from '../store/useV2StoreEdge';
import { ModuleId, SphereScope } from '@/types/v2';
import { formatINRFromPaise } from '../engine/financialEngine';
import { computeOverviewMetrics } from '../engine/financialEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { PremiumModal } from '@/components/ui/PremiumModal';
import { TabularNums } from '@/components/ui/TabularNums';
import { toast } from '@/components/ui/toastStore';

export interface NavModuleItem {
  id: ModuleId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'teal' | 'violet' | 'pink';
  shortcutKey: string;
  description: string;
}

export interface NavSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavModuleItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Treasury & Liquidity',
    icon: BarChart2,
    items: [
      {
        id: 'overview',
        label: 'Executive Command',
        shortLabel: 'Overview',
        icon: LayoutDashboard,
        accentColor: 'indigo',
        shortcutKey: '1',
        description: 'Net worth, liquidity & portfolio command center',
      },
      {
        id: 'bank',
        label: 'Bank & Cash Accounts',
        shortLabel: 'Bank',
        icon: Building2,
        accentColor: 'emerald',
        shortcutKey: '2',
        description: 'Savings, current, cash drawers & self-transfers',
      },
      {
        id: 'expenses',
        label: 'Cashbook & Expenses',
        shortLabel: 'Cashbook',
        icon: ArrowLeftRight,
        accentColor: 'sky',
        shortcutKey: '3',
        description: 'Income, expenses, transfers & category analytics',
      },
    ],
  },
  {
    title: 'Commercial Operations',
    icon: TrendingUp,
    items: [
      {
        id: 'dues',
        label: 'Customer & Vendor Udhar',
        shortLabel: 'Dues',
        icon: HandCoins,
        accentColor: 'amber',
        shortcutKey: '4',
        description: 'Receivables, payables & settlement tracking',
      },
      {
        id: 'cards',
        label: 'Credit Cards & Limits',
        shortLabel: 'Cards',
        icon: CreditCard,
        accentColor: 'rose',
        shortcutKey: '5',
        description: 'Billing cycles, utilization & spend tracking',
      },
      {
        id: 'sheets',
        label: 'Business Registers',
        shortLabel: 'Registers',
        icon: FileSpreadsheet,
        accentColor: 'teal',
        shortcutKey: '6',
        description: 'Custom GST, stock, payroll spreadsheets',
      },
    ],
  },
  {
    title: 'Productivity & Vault',
    icon: Shield,
    items: [
      {
        id: 'notes',
        label: 'Daily Notes & Rupee Tasks',
        shortLabel: 'Notes',
        icon: StickyNote,
        accentColor: 'amber',
        shortcutKey: '7',
        description: 'Auto-summed checklists & ledger posting',
      },
      {
        id: 'vault',
        label: 'Zero-Knowledge Vault',
        shortLabel: 'Vault',
        icon: Lock,
        accentColor: 'violet',
        shortcutKey: '8',
        description: 'AES-256 encrypted PINs, passwords & secrets',
      },
      {
        id: 'reports',
        label: 'Security, Audit & Sync',
        shortLabel: 'Security',
        icon: ShieldCheck,
        accentColor: 'emerald',
        shortcutKey: '9',
        description: 'PIN lock, backup, P&L & cloud sync',
      },
    ],
  },
];

const ALL_MODULES = NAV_SECTIONS.flatMap((s) => s.items);

interface PremiumSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PremiumSidebar({ isOpen, onClose }: PremiumSidebarProps) {
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
    syncNowWithCloud,
    hydrateFromStorageAndCloud,
  } = useV2Store();

  const [collapsed, setCollapsed] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickType, setQuickType] = useState<'cash_in' | 'expense'>('expense');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickCategory, setQuickCategory] = useState('General Entry');
  const [quickMode, setQuickMode] = useState<'cash' | 'upi' | 'bank' | 'card'>('upi');
  const [quickAccountId, setQuickAccountId] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [newPinValue, setNewPinValue] = useState('');
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const metrics = computeOverviewMetrics({
    accounts,
    entries,
    dues,
    cards,
    scope: scopeFilter,
  });

  const activeMeta = ALL_MODULES.find((m) => m.id === activeModule) || ALL_MODULES[0];

  const handleOpenQuickEntry = (defaultType: 'cash_in' | 'expense' = 'expense') => {
    setQuickType(defaultType);
    setQuickCategory(defaultType === 'cash_in' ? 'Sales & Revenue' : 'Business Expense');
    setQuickAccountId(accounts[0]?.id || '');
    setQuickOpen(true);
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = Math.round(parseFloat(quickAmount || '0') * 100);
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

  // Keyboard shortcuts
  useEffect(() => {
    if (isAppLocked) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) return;

      // Alt+1-9 for module switching
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        if (ALL_MODULES[idx]) {
          setActiveModule(ALL_MODULES[idx].id);
        }
      }
      // Ctrl/Cmd+K for command palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
      // Ctrl/Cmd+/ for shortcuts help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
      // Ctrl/Cmd+B to toggle sidebar collapse
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAppLocked, setActiveModule]);

  const sidebarVariants = {
    open: { width: collapsed ? '72px' : '280px', opacity: 1, x: 0 },
    closed: { width: '0px', opacity: 0, x: -20 },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        initial={false}
        animate={isOpen ? 'open' : 'closed'}
        exit="closed"
        variants={sidebarVariants}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="fixed inset-y-0 left-0 z-50 flex flex-col bg-white/95 backdrop-blur-xl border-r border-slate-200/80 overflow-hidden lg:relative lg:z-30 lg:border-r lg:bg-white/95"
        style={{ width: collapsed ? '72px' : '280px' }}
        aria-label="Navigation sidebar"
      >
        {/* Collapse/Expand Trigger */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 shadow-lg transition-all hover:border-indigo-300 hover:bg-indigo-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 lg:hidden"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5 text-slate-600" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            )}
          </motion.div>
        </button>

        {/* Overlay for mobile */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
        )}

        <div className="flex flex-col h-full overflow-hidden">
          {/* Header / Brand */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/80 shrink-0">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className={collapsed ? 'hidden' : 'flex-1 min-w-0'}
            >
              <button
                type="button"
                onClick={() => setActiveModule('overview')}
                className="flex items-center gap-2.5 text-left group w-full"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-[#EEF2FF] font-mono text-xs font-extrabold text-indigo-700 shadow-2xs transition-colors group-hover:bg-indigo-100">
                  RB
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-sm font-bold tracking-tight text-slate-900">
                    Record Book
                  </span>
                  <span className="block truncate text-[10px] font-medium text-slate-500">
                    {activeMeta.shortLabel}
                  </span>
                </div>
              </button>
            </motion.div>

            {/* Collapsed brand */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: collapsed ? 1 : 0 }}
              className={collapsed ? 'flex items-center justify-center' : 'hidden'}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-200 bg-[#EEF2FF] font-mono text-xs font-extrabold text-indigo-700 shadow-2xs">
                RB
              </div>
            </motion.div>

            {/* Mobile close */}
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Net Worth Mini Card */}
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="p-4 border-b border-slate-200/60"
            >
              <div className="glass-card border border-indigo-100/90 bg-gradient-to-b from-indigo-50/50 via-white to-white p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900">
                    Total Liquid Cash
                  </span>
                  <span className="rounded-md border border-indigo-200/60 bg-white px-1.5 py-0.5 text-[10px] font-bold capitalize text-indigo-700 shadow-2xs">
                    {scopeFilter}
                  </span>
                </div>
                <TabularNums
                  className="mt-1 font-mono text-xl font-extrabold tracking-tight text-slate-900"
                  value={metrics.liquidCashPaise}
                  masked={privacyMasked}
                />
                <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500">
                  <span>Net Worth:</span>
                  <TabularNums
                    value={metrics.netWorthPaise}
                    masked={privacyMasked}
                    className="font-mono font-semibold text-slate-800"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Navigation Sections */}
          <nav aria-label="Workspace Modules" className="flex-1 overflow-y-auto p-4 space-y-5">
            {NAV_SECTIONS.map((section, sectionIndex) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + sectionIndex * 0.05, duration: 0.3 }}
                className="space-y-2"
                onMouseEnter={() => setHoveredSection(section.title)}
                onMouseLeave={() => setHoveredSection(null)}
              >
                <div className="flex items-center gap-2 px-2">
                  <section.icon
                    className={`h-4 w-4 shrink-0 ${
                      hoveredSection === section.title
                        ? 'text-indigo-600'
                        : 'text-slate-400'
                    } transition-colors`}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </span>
                </div>

                <div className="space-y-1">
                  {section.items.map((mod, modIndex) => {
                    const Icon = mod.icon;
                    const isActive = activeModule === mod.id;

                    let badgeCount: number | null = null;
                    let badgeColor = 'slate';
                    if (mod.id === 'dues') {
                      badgeCount = dues.filter(
                        (d) =>
                          (scopeFilter === 'all' || d.scope === scopeFilter) &&
                          d.status !== 'settled'
                      ).length;
                      badgeColor = 'amber';
                    } else if (mod.id === 'notes') {
                      badgeCount = notes.filter(
                        (n) => !n.is_trashed && !n.is_archived
                      ).length;
                      badgeColor = 'indigo';
                    } else if (mod.id === 'vault') {
                      // could show locked items count
                    }

                    const accentColors: Record<string, string> = {
                      indigo: 'indigo',
                      emerald: 'emerald',
                      amber: 'amber',
                      rose: 'rose',
                      sky: 'sky',
                      teal: 'teal',
                      violet: 'violet',
                      pink: 'pink',
                    };

                    const accent = accentColors[mod.accentColor] || 'indigo';

                    return (
                      <motion.button
                        key={mod.id}
                        type="button"
                        onClick={() => {
                          setActiveModule(mod.id);
                          onClose();
                        }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.02 * modIndex, duration: 0.2 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all duration-200 ${
                          isActive
                            ? `border border-${accent}-200/90 bg-${accent}-50/90 text-${accent}-900 shadow-2xs`
                            : 'border border-transparent text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                        }`}
                        style={{ '--accent-color': accent }}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              isActive
                                ? `text-${accent}-600`
                                : 'text-slate-400 group-hover:text-slate-600'
                            }`}
                          />
                          {!collapsed && (
                            <span className="truncate">{mod.label}</span>
                          )}
                        </span>

                        {!collapsed && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {badgeCount !== null && badgeCount > 0 && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                  badgeColor === 'amber'
                                    ? 'bg-amber-100 text-amber-800'
                                    : badgeColor === 'indigo'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-slate-200/80 text-slate-600'
                                }`}
                              >
                                {badgeCount}
                              </motion.span>
                            )}
                            <span className="hidden font-mono text-[10px] text-slate-400 group-hover:inline">
                              Alt+{mod.shortcutKey}
                            </span>
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </nav>

          {/* Bottom: Security & Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="p-4 border-t border-slate-200/80 shrink-0"
          >
            {!collapsed ? (
              <div className="space-y-3">
                {/* Security Card */}
                <div className="glass-card border border-emerald-200/80 bg-[#ECFDF5]/50 p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-950">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          userEmail ? 'bg-emerald-500' : 'bg-slate-400'
                        } pulse-dot`}
                      />
                      Security & Sync
                    </span>
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-900/80">
                    {appPinHash
                      ? '4-Digit PIN Lock Active · AES-256'
                      : 'AES-256 Vault Active · PIN Optional'}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleLockButtonClick}
                      className="flex-1 rounded-lg border border-emerald-300/80 bg-white py-2 text-[11px] font-semibold text-emerald-900 shadow-2xs transition-colors hover:bg-emerald-50"
                    >
                      {appPinHash ? 'Lock Now' : 'Set App PIN'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveModule('reports')}
                      className="rounded-lg border border-emerald-200 bg-white/80 px-3 py-2 text-[11px] font-semibold text-emerald-800 hover:bg-white"
                    >
                      Center
                    </button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenQuickEntry('cash_in')}
                    className="glass-card glass-card-hover flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 text-left transition-all"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-100 text-emerald-700">
                      <Plus className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-900">Cash In</p>
                      <p className="text-[10px] text-emerald-700">Record income</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenQuickEntry('expense')}
                    className="glass-card glass-card-hover flex items-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50/50 p-3 text-left transition-all"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-100 text-rose-700">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-rose-900">Expense</p>
                      <p className="text-[10px] text-rose-700">Record spend</p>
                    </div>
                  </button>
                </div>

                {/* Keyboard Shortcuts Hint */}
                <details className="mt-3">
                  <summary className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 cursor-pointer">
                    <Filter className="h-3.5 w-3.5" />
                    Shortcuts
                  </summary>
                  <div className="mt-2 space-y-1.5 text-[10px] text-slate-500">
                    <div className="flex justify-between"><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono">Alt+1-9</kbd><span>Switch Module</span></div>
                    <div className="flex justify-between"><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono">⌘K</kbd><span>Command Palette</span></div>
                    <div className="flex justify-between"><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono">⌘/</kbd><span>Show Shortcuts</span></div>
                    <div className="flex justify-between"><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono">⌘B</kbd><span>Toggle Sidebar</span></div>
                    <div className="flex justify-between"><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono">Esc</kbd><span>Close Modal</span></div>
                  </div>
                </details>
              </div>
            ) : (
              // Collapsed version - just icons with tooltips
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleLockButtonClick}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50/50 text-emerald-700 transition-colors hover:bg-emerald-100/50"
                  title={appPinHash ? 'Lock workspace' : 'Set PIN'}
                >
                  <Lock className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenQuickEntry('cash_in')}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50/50 text-emerald-700 transition-colors hover:bg-emerald-100/50"
                  title="Cash In"
                >
                  <Plus className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenQuickEntry('expense')}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50/50 text-rose-700 transition-colors hover:bg-rose-100/50"
                  title="Expense"
                >
                  <ArrowUpRight className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/50 text-slate-600 transition-colors hover:bg-slate-100/50"
                  title="Settings"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </motion.aside>

      {/* Modals */}
      {/* Command Palette */}
      {commandOpen && (
        <CommandPalette
          isOpen={commandOpen}
          onClose={() => setCommandOpen(false)}
          onOpenQuickEntry={handleOpenQuickEntry}
        />
      )}

      {/* Quick Entry Modal */}
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
                onChange={(e) => setQuickMode(e.target.value as 'cash' | 'upi' | 'bank' | 'card')}
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
                  {formatINRFromPaise(a.balance_paise, { masked: privacyMasked })}
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

      {/* PIN Setup Modal */}
      {pinSetupOpen && (
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
                <Key className="h-4 w-4 text-indigo-700" />
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
                <Check className="mr-1.5 h-4 w-4" />
                Activate Security PIN
              </Button>
            </div>
          </form>
        </PremiumModal>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <PremiumModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          title="Settings & Preferences"
          description="Manage your workspace, security, sync, and appearance settings."
          size="lg"
          variant="sheet"
          side="right"
        >
          <div className="space-y-6">
            <div className="border-b border-slate-200/60 pb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Appearance</h3>
              <div className="mt-3 space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Privacy Mask</span>
                  <button
                    type="button"
                    onClick={togglePrivacyMask}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      privacyMasked
                        ? 'bg-indigo-600'
                        : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={privacyMasked}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        privacyMasked ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
                <p className="text-xs text-slate-500 ml-12">
                  Mask all currency amounts on screen for shoulder-surfing protection
                </p>
              </div>
            </div>

            <div className="border-b border-slate-200/60 pb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Security</h3>
              <div className="mt-3 space-y-3">
                <button
                  type="button"
                  onClick={handleLockButtonClick}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {appPinHash ? 'Change App PIN' : 'Set App PIN'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {appPinHash
                          ? 'Update your 4-digit security PIN'
                          : 'Enable 4-digit PIN to lock the app instantly'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModule('reports')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Security Center</p>
                      <p className="text-xs text-slate-500">Audit log, backup, sync & vault settings</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="border-b border-slate-200/60 pb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Data & Sync</h3>
              <div className="mt-3 space-y-3">
                <button
                  type="button"
                  onClick={() => syncNowWithCloud()}
                  disabled={!userEmail || syncStatus === 'syncing'}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
                      <RefreshCw className={`h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Sync with Cloud</p>
                      <p className="text-xs text-slate-500">
                        {syncStatus === 'syncing'
                          ? 'Syncing...'
                          : userEmail
                          ? 'Last synced: ' + (new Date().toLocaleString())
                          : 'Sign in to enable cloud backup'}
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModule('reports')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700">
                      <Database className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Export / Import Backup</p>
                      <p className="text-xs text-slate-500">Full JSON workspace backup & restore</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Help & About</h3>
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setShortcutsOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
                      <HelpCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Keyboard Shortcuts</p>
                      <p className="text-xs text-slate-500">View all available hotkeys</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </button>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Record Book V2</p>
                      <p className="text-xs text-slate-500">Version 2.0.0 · Daylight Edition</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PremiumModal>
      )}

      {/* Shortcuts Help Modal */}
      {shortcutsOpen && (
        <PremiumModal
          open={shortcutsOpen}
          onOpenChange={setShortcutsOpen}
          title="Keyboard Shortcuts"
          description="Speed up your workflow with these hotkeys."
          size="md"
          variant="dialog"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Navigation</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">Alt+1</kbd><span>Overview</span></div>
                  <div className="flex justify-between"><kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">Alt+2</kbd><span>Bank & Cash</span></div>
                  <div className="flex justify-between"><kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">Alt+3</kbd><span>Cashbook</span></div>
                  <div className="flex justify-between"><kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">Alt+4</kbd><span>Dues</span></div>
                  <div className="flex justify-between"><kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">Alt+5</kbd><span>Cards</span></div>
                  <div className="flex justify-between"><kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">Alt+6</kbd><span>Registers</span></div>
                  <div className="flex justify-between"><kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">Alt+7</kbd><span>Notes</span></div>
                  <div className="flex justify-between"><kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">Alt+8</kbd><span>Vault</span></div>
                  <div className="flex justify-between"><kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">Alt+9</kbd><span>Security</span></div>
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Global Actions</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">⌘K</kbd><span>Command Palette</span></div>
                  <div className="flex justify-between"><kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">⌘/</kbd><span>Shortcuts Help</span></div>
                  <div className="flex justify-between"><kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">⌘B</kbd><span>Toggle Sidebar</span></div>
                  <div className="flex justify-between"><kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">Esc</kbd><span>Close Modal/Drawer</span></div>
                  <div className="flex justify-between"><kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">0-9</kbd><span>PIN Entry (when locked)</span></div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Quick Entry (from anywhere)</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">⌘N</kbd><span>New Expense</span></div>
                <div className="flex justify-between"><kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">⌘⇧N</kbd><span>New Cash In</span></div>
              </div>
            </div>
          </div>
        </PremiumModal>
      )}
    </AnimatePresence>
  );
}