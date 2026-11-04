'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Cloud,
  CreditCard,
  Database,
  HandCoins,
  RotateCcw,
  StickyNote,
  TrendingUp,
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
    userEmail,
    setActiveModule,
    loadSampleWorkspaceData,
    clearAllWorkspaceData,
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
    .slice(0, 7);

  const activeNotes = notes.filter(
    (n) =>
      !n.is_trashed &&
      !n.is_archived &&
      (scopeFilter === 'all' || n.scope === scopeFilter)
  );

  const pendingDues = dues.filter(
    (d) =>
      d.status !== 'settled' &&
      (scopeFilter === 'all' || d.scope === scopeFilter)
  );

  const utilizationPct =
    metrics.cardLimitPaise > 0
      ? Math.round((metrics.cardUtilizedPaise / metrics.cardLimitPaise) * 100)
      : 0;

  const totalFlowPaise = metrics.totalIncomePaise + metrics.totalExpensePaise;
  const inflowSharePct =
    totalFlowPaise > 0
      ? Math.round((metrics.totalIncomePaise / totalFlowPaise) * 100)
      : 50;
  const netCashflowPaise = metrics.totalIncomePaise - metrics.totalExpensePaise;

  const isWorkspaceEmpty =
    accounts.length === 0 &&
    entries.length === 0 &&
    dues.length === 0 &&
    cards.length === 0 &&
    notes.length === 0;

  return (
    <div className="space-y-6">
      {/* Executive Daylight Header */}
      <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-r from-[#EEF2FF] via-[#F8FAFC] to-[#ECFDF5] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-800">
              <span>Daylight Wealth Ledger</span>
              <span aria-hidden="true">·</span>
              <span>
                Scope:{' '}
                {scopeFilter === 'all'
                  ? 'All Spheres'
                  : scopeFilter.charAt(0).toUpperCase() + scopeFilter.slice(1)}
              </span>
              {userEmail && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-emerald-800">{userEmail}</span>
                </>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Executive Financial Position
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Integer-paise precision across Bank & Cash accounts, double-entry
              cashbook, customer receivables, credit lines, and auto-calculated ₹
              notes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap shrink-0">
            <Button
              variant="emerald"
              size="sm"
              onClick={() => onOpenQuickEntry('cash_in')}
              className="gap-1.5 whitespace-nowrap"
            >
              <ArrowDownLeft className="h-4 w-4" />
              <span>Record Cash In</span>
            </Button>
            <Button
              variant="rose"
              size="sm"
              onClick={() => onOpenQuickEntry('expense')}
              className="gap-1.5 whitespace-nowrap"
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>Record Expense</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveModule('notes')}
              className="gap-1.5 bg-white whitespace-nowrap"
            >
              <StickyNote className="h-4 w-4 text-amber-600" />
              <span>₹ Notes ({activeNotes.length})</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Production Data Onboarding / Workspace Data Controls */}
      {isWorkspaceEmpty ? (
        <div className="rounded-2xl border border-emerald-200 bg-[#ECFDF5]/75 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Clean Production Workspace Ready (₹0.00)
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Start adding your real bank accounts and transactions, sign in to
                your Supabase V2 cloud workspace, or load a sample dataset to
                explore all 9 modules.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap shrink-0">
              <Button
                variant="default"
                size="sm"
                onClick={() => setActiveModule('bank')}
                className="gap-1.5 bg-emerald-700 text-white hover:bg-emerald-800 whitespace-nowrap"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Add Bank / Cash Account</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadSampleWorkspaceData()}
                className="gap-1.5 border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-50 whitespace-nowrap"
              >
                <Database className="h-3.5 w-3.5 text-indigo-600" />
                <span>Load Sample Data</span>
              </Button>
              {!userEmail && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveModule('reports')}
                  className="gap-1.5 bg-white text-slate-800 whitespace-nowrap"
                >
                  <Cloud className="h-3.5 w-3.5 text-sky-600" />
                  <span>Cloud Sign In</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">
              Active Workspace Data
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {accounts.length} Accounts
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {entries.length} Vouchers
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {pendingDues.length} Open Dues
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{cards.length} Cards</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void clearAllWorkspaceData()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Workspace to ₹0</span>
            </button>
          </div>
        </div>
      )}

      {/* 4 Single-Elevation Pastel KPI Cards (24px padding, tabular-nums) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-indigo-200 bg-[#EEF2FF]/75 p-6"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-950">
              01. Net Worth Position
            </span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-3 font-mono text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
            <AnimatedCurrency valuePaise={metrics.netWorthPaise} />
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Liquid Treasury + Receivables − Payables & Card Dues
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          onClick={() => setActiveModule('bank')}
          className="cursor-pointer rounded-2xl border border-emerald-200 bg-[#ECFDF5]/85 p-6 transition-colors hover:border-emerald-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-950">
              02. Liquid Bank & Cash
            </span>
            <Building2 className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-3 font-mono text-2xl font-bold tabular-nums text-emerald-950 sm:text-3xl">
            <AnimatedCurrency valuePaise={metrics.liquidCashPaise} />
          </div>
          <p className="mt-2 text-xs text-emerald-800">
            Across {accounts.length} active accounts · Open Treasury →
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onClick={() => setActiveModule('dues')}
          className="cursor-pointer rounded-2xl border border-amber-200 bg-[#FFFBEB]/90 p-6 transition-colors hover:border-amber-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-950">
              03. Receivables (You Get)
            </span>
            <HandCoins className="h-4 w-4 text-amber-700" />
          </div>
          <div className="mt-3 font-mono text-2xl font-bold tabular-nums text-amber-950 sm:text-3xl">
            <AnimatedCurrency valuePaise={metrics.totalReceivablePaise} />
          </div>
          <p className="mt-2 font-mono text-xs tabular-nums text-amber-900">
            Payables (You Give): {formatINRFromPaise(metrics.totalPayablePaise)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          onClick={() => setActiveModule('cards')}
          className="cursor-pointer rounded-2xl border border-rose-200 bg-[#FFF1F2]/85 p-6 transition-colors hover:border-rose-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-950">
              04. Credit Card Utilized
            </span>
            <CreditCard className="h-4 w-4 text-rose-700" />
          </div>
          <div className="mt-3 font-mono text-2xl font-bold tabular-nums text-rose-950 sm:text-3xl">
            <AnimatedCurrency valuePaise={metrics.cardUtilizedPaise} />
          </div>
          <p className="mt-2 font-mono text-xs tabular-nums text-rose-900">
            {utilizationPct}% of {formatINRFromPaise(metrics.cardLimitPaise)} limit
          </p>
        </motion.div>
      </div>

      {/* Cashflow Ratio & Liquidity Strip */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Period Cashflow Velocity & Net Operating Surplus
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>
                Gross Inflow:{' '}
                <strong className="font-mono tabular-nums text-emerald-700">
                  +{formatINRFromPaise(metrics.totalIncomePaise)}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Gross Outflow:{' '}
                <strong className="font-mono tabular-nums text-rose-700">
                  -{formatINRFromPaise(metrics.totalExpensePaise)}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Net Cashflow:{' '}
                <strong
                  className={`font-mono tabular-nums ${
                    netCashflowPaise >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {netCashflowPaise >= 0 ? '+' : ''}
                  {formatINRFromPaise(netCashflowPaise)}
                </strong>
              </span>
            </div>
          </div>
          <span className="font-mono text-xs font-semibold tabular-nums text-slate-600">
            Inflow Ratio: {inflowSharePct}%
          </span>
        </div>
        <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="bg-emerald-600 transition-all duration-300"
            style={{ width: `${inflowSharePct}%` }}
          />
          <div
            className="bg-rose-500 transition-all duration-300"
            style={{ width: `${100 - inflowSharePct}%` }}
          />
        </div>
      </div>

      {/* Main Split Grid: Recent Transactions (Left 7 cols) + Active Notes & Module Directory (Right 5 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Recent Double-Entry Ledger Stream */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recent Ledger Journal
              </h2>
              <p className="text-xs text-slate-500">
                Double-entry vouchers synchronized with bank & cash registers
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveModule('expenses')}
              className="gap-1 text-indigo-600 whitespace-nowrap"
            >
              <span>Full Journal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="mt-2 divide-y divide-slate-100">
            {filteredEntries.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-slate-600">
                  No ledger entries recorded for this sphere yet.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Record your first revenue inflow or expense voucher to populate
                  the journal.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="emerald"
                    onClick={() => onOpenQuickEntry('cash_in')}
                  >
                    + Log First Cash In
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void loadSampleWorkspaceData()}
                  >
                    Load Sample Dataset
                  </Button>
                </div>
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const isInflow = entry.entry_type === 'cash_in';
                const isTransfer = entry.entry_type === 'transfer';
                const acc = accounts.find((a) => a.id === entry.account_id);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-3.5 transition-colors hover:bg-slate-50/60"
                  >
                    <div className="min-w-0 pr-4">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {entry.category}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span className="truncate">{entry.note}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">
                          {entry.payment_mode.toUpperCase()}
                        </span>
                        {acc && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{acc.name}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{entry.scope}</span>
                      </div>
                    </div>
                    <div
                      className={`shrink-0 font-mono text-sm font-bold tabular-nums ${
                        isInflow
                          ? 'text-emerald-700'
                          : isTransfer
                            ? 'text-sky-700'
                            : 'text-rose-700'
                      }`}
                    >
                      {isInflow ? '+' : isTransfer ? '⇄ ' : '-'}
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
          <div className="rounded-2xl border border-amber-200 bg-[#FFFBEB]/65 p-6">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-4">
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
                className="whitespace-nowrap"
              >
                Open Notes
              </Button>
            </div>

            <div className="mt-4 divide-y divide-amber-200/50">
              {activeNotes.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-600">
                  No active ₹ checklists yet. Click &quot;Open Notes&quot; to
                  create a live auto-summing note.
                </div>
              ) : (
                activeNotes.slice(0, 3).map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setActiveModule('notes')}
                    className="cursor-pointer py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {note.title}
                      </p>
                      <span className="font-mono text-xs font-bold tabular-nums text-amber-900">
                        {formatINRFromPaise(note.calculated_total_paise)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {note.checklist_items.filter((i) => i.checked).length} of{' '}
                      {note.checklist_items.length} tasks settled · {note.scope}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 9-Module Quick Navigator */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-bold text-slate-900">
              Workspace Modules
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Direct navigation across all financial registers
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {(
                [
                  {
                    id: 'bank',
                    label: 'Bank & Cash',
                    count: `${accounts.length} Acc`,
                    bg: 'bg-[#ECFDF5] border-emerald-200 text-emerald-950 hover:border-emerald-300',
                  },
                  {
                    id: 'dues',
                    label: 'Dues & Udhar',
                    count: `${pendingDues.length} Open`,
                    bg: 'bg-[#FFFBEB] border-amber-200 text-amber-950 hover:border-amber-300',
                  },
                  {
                    id: 'cards',
                    label: 'Credit Cards',
                    count: `${cards.length} Cards`,
                    bg: 'bg-[#FFF1F2] border-rose-200 text-rose-950 hover:border-rose-300',
                  },
                  {
                    id: 'sheets',
                    label: 'Custom Sheets',
                    count: `${sheets.length} Sheets`,
                    bg: 'bg-[#EFF6FF] border-sky-200 text-sky-950 hover:border-sky-300',
                  },
                  {
                    id: 'vault',
                    label: 'AES-256 Vault',
                    count: 'Encrypted',
                    bg: 'bg-[#EEF2FF] border-indigo-200 text-indigo-950 hover:border-indigo-300',
                  },
                  {
                    id: 'reports',
                    label: 'Sync & Docs',
                    count: 'Cloud V2',
                    bg: 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300',
                  },
                ] as { id: ModuleId; label: string; count: string; bg: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left transition-colors ${item.bg}`}
                >
                  <span className="text-xs font-bold whitespace-nowrap">
                    {item.label}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums opacity-80">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
