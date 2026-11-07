'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Command,
  CreditCard,
  Eye,
  EyeOff,
  FileSpreadsheet,
  HandCoins,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Wallet,
  X,
} from 'lucide-react';
import { useV2Store } from '@/v2/store/useV2StoreEdge';
import { formatINRFromPaise } from '@/v2/engine/financialEngine';
import { ModuleId } from '@/types/v2';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickEntry: (defaultType?: 'cash_in' | 'expense') => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky';
  action: () => void;
}

interface CommandGroup {
  groupName: string;
  items: CommandItem[];
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenQuickEntry,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    setActiveModule,
    togglePrivacyMask,
    privacyMasked,
    lockApp,
    appPinHash,
    loadSampleWorkspaceData,
    accounts,
    entries,
    dues,
    notes,
  } = useV2Store();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K listener handled in parent, but handle arrow navigation here
  const groups: CommandGroup[] = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Quick Financial Actions
    const actionItems: CommandItem[] = [
      {
        id: 'action-income',
        title: 'Record Cash In (Income)',
        subtitle: 'Add sales, revenue or bank receipt',
        badge: '+₹ Inward',
        icon: ArrowDownLeft,
        accent: 'emerald',
        action: () => {
          onClose();
          onOpenQuickEntry('cash_in');
        },
      },
      {
        id: 'action-expense',
        title: 'Record Expense (Outflow)',
        subtitle: 'Log business purchase, salary or vendor bill',
        badge: '−₹ Outward',
        icon: ArrowUpRight,
        accent: 'rose',
        action: () => {
          onClose();
          onOpenQuickEntry('expense');
        },
      },
      {
        id: 'action-mask',
        title: privacyMasked ? 'Reveal Currency Balances' : 'Mask Currency Balances',
        subtitle: '1-click stealth mode for public screens',
        badge: 'Privacy',
        icon: privacyMasked ? EyeOff : Eye,
        accent: 'amber',
        action: () => {
          onClose();
          togglePrivacyMask();
        },
      },
      {
        id: 'action-lock',
        title: appPinHash ? 'Lock Workspace Immediately' : 'Configure Security PIN',
        subtitle: 'Protects financial records with 4-digit PIN',
        badge: 'Security',
        icon: Lock,
        accent: 'indigo',
        action: () => {
          onClose();
          if (appPinHash) {
            lockApp();
          } else {
            setActiveModule('reports');
          }
        },
      },
      {
        id: 'action-sample',
        title: 'Load Demo / Sample Business Data',
        subtitle: 'Populate workspace with real-world Indian SME accounts',
        badge: 'Demo',
        icon: Sparkles,
        accent: 'sky',
        action: () => {
          onClose();
          void loadSampleWorkspaceData();
        },
      },
    ];

    // 2. Navigation Modules
    const navItems: CommandItem[] = [
      {
        id: 'nav-overview',
        title: 'Executive Command Center',
        subtitle: 'Portfolio liquidity, net worth & cashflow velocity',
        badge: 'Alt+1',
        icon: Wallet,
        accent: 'indigo',
        action: () => {
          onClose();
          setActiveModule('overview');
        },
      },
      {
        id: 'nav-bank',
        title: 'Bank & Cash Accounts',
        subtitle: `Manage ${accounts.length} liquid accounts & contra transfers`,
        badge: 'Alt+2',
        icon: Building2,
        accent: 'emerald',
        action: () => {
          onClose();
          setActiveModule('bank');
        },
      },
      {
        id: 'nav-expenses',
        title: 'Cashbook & Ledger Journal',
        subtitle: 'Double-entry vouchers & search',
        badge: 'Alt+3',
        icon: ArrowUpRight,
        accent: 'sky',
        action: () => {
          onClose();
          setActiveModule('expenses');
        },
      },
      {
        id: 'nav-dues',
        title: 'Customer & Vendor Udhar (Dues)',
        subtitle: 'Market receivables, supplier bills & WhatsApp reminders',
        badge: 'Alt+4',
        icon: HandCoins,
        accent: 'amber',
        action: () => {
          onClose();
          setActiveModule('dues');
        },
      },
      {
        id: 'nav-cards',
        title: 'Credit Cards & Billing Cycles',
        subtitle: 'Card limits, utilization ratios & bill pay',
        badge: 'Alt+5',
        icon: CreditCard,
        accent: 'rose',
        action: () => {
          onClose();
          setActiveModule('cards');
        },
      },
      {
        id: 'nav-sheets',
        title: 'Business Registers (Sheets)',
        subtitle: 'Custom GST invoices, stock grids & spreadsheets',
        badge: 'Alt+6',
        icon: FileSpreadsheet,
        accent: 'sky',
        action: () => {
          onClose();
          setActiveModule('sheets');
        },
      },
      {
        id: 'nav-notes',
        title: 'Smart Notes & Rupee Tasks',
        subtitle: 'Auto-summed checklists & reminders',
        badge: 'Alt+7',
        icon: StickyNote,
        accent: 'amber',
        action: () => {
          onClose();
          setActiveModule('notes');
        },
      },
      {
        id: 'nav-vault',
        title: 'Zero-Knowledge Encrypted Vault',
        subtitle: 'AES-256 PINs, bank credentials & recovery phrases',
        badge: 'Alt+8',
        icon: Lock,
        accent: 'indigo',
        action: () => {
          onClose();
          setActiveModule('vault');
        },
      },
      {
        id: 'nav-reports',
        title: 'Reports, Security & Cloud Sync',
        subtitle: 'P&L analysis, audit log & Supabase sync',
        badge: 'Alt+9',
        icon: ShieldCheck,
        accent: 'emerald',
        action: () => {
          onClose();
          setActiveModule('reports');
        },
      },
    ];

    // 3. Search matching Parties
    const partyItems: CommandItem[] = dues
      .filter((d) => !q || d.party_name.toLowerCase().includes(q) || (d.phone && d.phone.includes(q)))
      .slice(0, 4)
      .map((d) => ({
        id: `party-${d.id}`,
        title: d.party_name,
        subtitle: `${d.direction === 'receivable' ? 'To Receive' : 'To Pay'}: ${formatINRFromPaise(
          Math.max(0, d.total_amount_paise - d.paid_amount_paise),
          { masked: privacyMasked }
        )} · Due ${new Date(d.due_date).toLocaleDateString('en-IN')}`,
        badge: d.direction === 'receivable' ? 'Customer' : 'Supplier',
        icon: HandCoins,
        accent: d.direction === 'receivable' ? 'amber' : 'rose',
        action: () => {
          onClose();
          setActiveModule('dues');
        },
      }));

    // 4. Search matching Transactions
    const txItems: CommandItem[] = entries
      .filter((e) => !q || e.note.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
      .slice(0, 4)
      .map((e) => ({
        id: `tx-${e.id}`,
        title: e.note || e.category,
        subtitle: `${e.category} · ${e.payment_mode.toUpperCase()} · ${new Date(e.entry_date).toLocaleDateString('en-IN')}`,
        badge: `${e.entry_type === 'cash_in' ? '+' : '−'}${formatINRFromPaise(e.amount_paise, {
          masked: privacyMasked,
        })}`,
        icon: e.entry_type === 'cash_in' ? ArrowDownLeft : ArrowUpRight,
        accent: e.entry_type === 'cash_in' ? 'emerald' : 'rose',
        action: () => {
          onClose();
          setActiveModule('expenses');
        },
      }));

    // 5. Search matching Notes
    const noteItems: CommandItem[] = notes
      .filter((n) => !n.is_trashed && (!q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)))
      .slice(0, 3)
      .map((n) => ({
        id: `note-${n.id}`,
        title: n.title,
        subtitle: `${n.checklist_items.length} checklist items · Priority ${n.priority}`,
        badge: 'Note',
        icon: StickyNote,
        accent: 'amber',
        action: () => {
          onClose();
          setActiveModule('notes');
        },
      }));

    const result: CommandGroup[] = [];

    const filteredActions = actionItems.filter(
      (a) => !q || a.title.toLowerCase().includes(q) || a.subtitle?.toLowerCase().includes(q)
    );
    if (filteredActions.length > 0) {
      result.push({ groupName: 'Quick Actions', items: filteredActions });
    }

    if (q && partyItems.length > 0) {
      result.push({ groupName: 'Parties & Udhar Khata', items: partyItems });
    }

    if (q && txItems.length > 0) {
      result.push({ groupName: 'Ledger Transactions', items: txItems });
    }

    if (q && noteItems.length > 0) {
      result.push({ groupName: 'Smart Notes', items: noteItems });
    }

    const filteredNav = navItems.filter(
      (n) => !q || n.title.toLowerCase().includes(q) || n.subtitle?.toLowerCase().includes(q)
    );
    if (filteredNav.length > 0) {
      result.push({ groupName: 'Navigation Jump', items: filteredNav });
    }

    return result;
  }, [
    query,
    privacyMasked,
    appPinHash,
    accounts,
    entries,
    dues,
    notes,
    onClose,
    onOpenQuickEntry,
    togglePrivacyMask,
    lockApp,
    setActiveModule,
    loadSampleWorkspaceData,
  ]);

  const flatItems = useMemo(
    () => groups.flatMap((g) => g.items),
    [groups]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (flatItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % (flatItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        flatItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  let runningIndex = 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
        {/* Daylight Ambient Backdrop Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/15 backdrop-blur-md"
        />

        {/* Floating Daylight Glass Command Center */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="glass-panel relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-2xl"
          onKeyDown={handleKeyDown}
        >
          {/* Search Header */}
          <div className="flex items-center border-b border-slate-200/80 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400 shrink-0 mr-3" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search actions, parties, transactions, or type module name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                <Command className="h-3 w-3" /> K
              </span>
            )}
          </div>

          {/* Results List */}
          <div className="max-h-[380px] overflow-y-auto p-2 space-y-3">
            {groups.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No matching results found for &ldquo;{query}&rdquo;.
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.groupName} className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group.groupName}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const itemIdx = runningIndex++;
                      const isSelected = selectedIndex === itemIdx;
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-all ${
                            isSelected
                              ? 'border border-indigo-200/90 bg-indigo-50/90 text-indigo-950 shadow-2xs'
                              : 'border border-transparent text-slate-700 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                                item.accent === 'emerald'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : item.accent === 'rose'
                                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                                    : item.accent === 'amber'
                                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                                      : item.accent === 'sky'
                                        ? 'border-sky-200 bg-sky-50 text-sky-700'
                                        : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-slate-900">
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p className="truncate text-[11px] text-slate-500">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {item.badge && (
                              <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-600 shadow-2xs">
                                {item.badge}
                              </span>
                            )}
                            {isSelected && (
                              <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Keyboard Footer Guide */}
          <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/80 px-4 py-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-mono shadow-2xs">
                  ↑
                </kbd>
                <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-mono shadow-2xs">
                  ↓
                </kbd>{' '}
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-mono shadow-2xs">
                  ↵
                </kbd>{' '}
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-mono shadow-2xs">
                  esc
                </kbd>{' '}
                Dismiss
              </span>
            </div>
            <span className="font-semibold text-slate-400">Record Book Spotlight</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
