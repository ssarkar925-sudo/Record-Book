'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  HandCoins,
  ShieldCheck,
  StickyNote,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useV2Store } from '@/v2/store/useV2Store';
import {
  computeOverviewMetrics,
  formatINRFromPaise,
} from '@/v2/engine/financialEngine';
import { AnimatedCurrency } from '@/v2/components/AnimatedCurrency';
import { Button } from '@/components/ui/button';
import { ModuleId } from '@/types/v2';

interface OverviewModuleProps {
  onOpenQuickEntry: (defaultType?: 'cash_in' | 'expense') => void;
}

export function OverviewModule({ onOpenQuickEntry }: OverviewModuleProps) {
  const {
    accounts,
    entries,
    dues,
    cards,
    notes,
    sheets,
    scopeFilter,
    setActiveModule,
  } = useV2Store();

  const metrics = computeOverviewMetrics({
    accounts,
    entries,
    dues,
    cards,
    scope: scopeFilter,
  });

  const filteredEntries = entries
    .filter((e) => scopeFilter === 'all' || e.scope === scopeFilter)
    .slice(0, 6);

  const activeNotes = notes.filter(
    (n) => !n.is_trashed && !n.is_archived && (scopeFilter === 'all' || n.scope === scopeFilter)
  );

  const pendingDues = dues.filter(
    (d) => d.status !== 'settled' && (scopeFilter === 'all' || d.scope === scopeFilter)
  );

  const utilizationPct =
    metrics.cardLimitPaise > 0
      ? Math.round((metrics.cardUtilizedPaise / metrics.cardLimitPaise) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Daylight Pastel Header Banner */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-[#EEF2FF] via-[#F8FAFC] to-[#ECFDF5] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
              V2 Daylight Wealth Command · Scope: {scopeFilter.toUpperCase()}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Executive Financial Overview
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Real-time integer-paise ledger Position, Bank Liquidity, Udhar & Credit Utilization.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="emerald"
              onClick={() => onOpenQuickEntry('cash_in')}
              className="gap-2"
            >
              <ArrowDownLeft className="h-4 w-4" />
              + Cash In / Income
            </Button>
            <Button
              variant="rose"
              onClick={() => onOpenQuickEntry('expense')}
              className="gap-2"
            >
              <ArrowUpRight className="h-4 w-4" />
              - Record Expense
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveModule('notes')}
              className="gap-2"
            >
              <StickyNote className="h-4 w-4 text-amber-600" />
              Smart ₹ Notes ({activeNotes.length})
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Top Pastel KPI Cards (Max 3 data points per card, 24px padding) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-indigo-200 bg-[#EEF2FF]/70 p-6"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-900">
              Net Worth Position
            </span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
            <AnimatedCurrency valuePaise={metrics.netWorthPaise} />
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Liquid + Receivables − Payables & Card Dues
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => setActiveModule('bank')}
          className="cursor-pointer rounded-2xl border border-emerald-200 bg-[#ECFDF5]/80 p-6 transition-colors hover:border-emerald-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
              Liquid Bank & Cash
            </span>
            <Building2 className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-950 sm:text-3xl">
            <AnimatedCurrency valuePaise={metrics.liquidCashPaise} />
          </div>
          <p className="mt-2 text-xs text-emerald-800">
            Across {accounts.length} active accounts · View Register →
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setActiveModule('dues')}
          className="cursor-pointer rounded-2xl border border-amber-200 bg-[#FFFBEB]/85 p-6 transition-colors hover:border-amber-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-900">
              Pending Receivables (You Get)
            </span>
            <HandCoins className="h-4 w-4 text-amber-700" />
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-950 sm:text-3xl">
            <AnimatedCurrency valuePaise={metrics.totalReceivablePaise} />
          </div>
          <p className="mt-2 text-xs text-amber-800">
            Payables (You Give): {formatINRFromPaise(metrics.totalPayablePaise)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => setActiveModule('cards')}
          className="cursor-pointer rounded-2xl border border-rose-200 bg-[#FFF1F2]/80 p-6 transition-colors hover:border-rose-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-900">
              Credit Card Utilized
            </span>
            <CreditCard className="h-4 w-4 text-rose-700" />
          </div>
          <div className="mt-3 text-2xl font-bold text-rose-950 sm:text-3xl">
            <AnimatedCurrency valuePaise={metrics.cardUtilizedPaise} />
          </div>
          <p className="mt-2 text-xs text-rose-800">
            {utilizationPct}% of {formatINRFromPaise(metrics.cardLimitPaise)} total limit
          </p>
        </motion.div>
      </div>

      {/* Main Split Grid: Recent Transactions (Left 7 cols) + Module Shortcuts & Active Notes (Right 5 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Recent Double-Entry Ledger Stream */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recent Ledger Activity
              </h2>
              <p className="text-xs text-slate-500">
                Income: {formatINRFromPaise(metrics.totalIncomePaise)} · Outflow:{' '}
                {formatINRFromPaise(metrics.totalExpensePaise)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveModule('expenses')}
              className="gap-1 text-indigo-600"
            >
              Full Journal <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {filteredEntries.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                No ledger entries recorded for this sphere yet.
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const isInflow = entry.entry_type === 'cash_in';
                const acc = accounts.find((a) => a.id === entry.account_id);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-3.5 first:pt-1 last:pb-1"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isInflow
                              ? 'bg-emerald-600'
                              : entry.entry_type === 'transfer'
                              ? 'bg-sky-600'
                              : 'bg-rose-600'
                          }`}
                        />
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {entry.category}
                        </p>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {entry.note} · {entry.payment_mode.toUpperCase()}
                        {acc ? ` · ${acc.name}` : ''} · {entry.scope.toUpperCase()}
                      </p>
                    </div>
                    <div
                      className={`shrink-0 font-mono text-sm font-bold tabular-nums ${
                        isInflow
                          ? 'text-emerald-700'
                          : entry.entry_type === 'transfer'
                          ? 'text-sky-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {isInflow ? '+' : entry.entry_type === 'transfer' ? '⇄ ' : '-'}
                      {formatINRFromPaise(entry.amount_paise)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Live ₹ Checklist Notes + Suite Directory */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-2xl border border-amber-200 bg-[#FFFBEB]/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Daily ₹ Checklists & Notes
                </h2>
                <p className="text-xs text-slate-600">
                  Auto-parsed ₹ amounts from active checklists
                </p>
              </div>
              <Button
                variant="amber"
                size="sm"
                onClick={() => setActiveModule('notes')}
              >
                Open Notes
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {activeNotes.slice(0, 2).map((note) => (
                <div
                  key={note.id}
                  onClick={() => setActiveModule('notes')}
                  className="cursor-pointer rounded-xl border border-amber-200/80 bg-white p-3.5 transition-colors hover:border-amber-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {note.title}
                    </p>
                    <span className="font-mono text-xs font-bold tabular-nums text-amber-800">
                      {formatINRFromPaise(note.calculated_total_paise)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {note.checklist_items.filter((i) => i.checked).length} of{' '}
                    {note.checklist_items.length} tasks settled ·{' '}
                    {note.scope.toUpperCase()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 9-Module Quick Navigator */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              All 9 Workspace Modules
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {(
                [
                  { id: 'bank', label: 'Bank & Cash', count: `${accounts.length} Acc`, bg: 'bg-[#ECFDF5] border-emerald-200 text-emerald-950' },
                  { id: 'dues', label: 'Dues & Udhar', count: `${pendingDues.length} Open`, bg: 'bg-[#FFFBEB] border-amber-200 text-amber-950' },
                  { id: 'cards', label: 'Credit Cards', count: `${cards.length} Cards`, bg: 'bg-[#FFF1F2] border-rose-200 text-rose-950' },
                  { id: 'sheets', label: 'Custom Sheets', count: `${sheets.length} Sheets`, bg: 'bg-[#EFF6FF] border-sky-200 text-sky-950' },
                  { id: 'vault', label: 'AES-256 Vault', count: 'Zero-Knowledge', bg: 'bg-[#EEF2FF] border-indigo-200 text-indigo-950' },
                  { id: 'reports', label: 'Sync & Docs', count: 'PRD + SQL V2', bg: 'bg-slate-50 border-slate-200 text-slate-900' },
                ] as { id: ModuleId; label: string; count: string; bg: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left transition-transform active:scale-[0.99] ${item.bg}`}
                >
                  <span className="text-xs font-bold">{item.label}</span>
                  <span className="font-mono text-[11px] opacity-75">{item.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
