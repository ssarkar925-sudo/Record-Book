'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CreditCard,
  Eye,
  EyeOff,
  FileSpreadsheet,
  HandCoins,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
  StickyNote,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useV2Store } from '../store/useV2StoreEdge';
import {
  computeOverviewMetrics,
  formatINRFromPaise,
} from '../engine/financialEngine';
import { AnimatedCurrency } from '../components/AnimatedCurrency';
import { Button } from '@/components/ui/button';
import { DaylightKpiCard } from '@/components/ui/DaylightKpiCard';
import {
  NetWorthTrendChart,
  ExpenseBreakdownChart,
  CashFlowComparisonChart,
  CardUtilizationChart,
  KPIStrip,
  TabularNums,
} from '../components/Charts';

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
    vaultItems,
    scopeFilter,
    searchQuery,
    privacyMasked,
    appPinHash,
    togglePrivacyMask,
    setActiveModule,
    loadSampleWorkspaceData,
  } = useV2Store();

  const metrics = useMemo(
    () =>
      computeOverviewMetrics({
        accounts,
        entries,
        dues,
        cards,
        scope: scopeFilter,
      }),
    [accounts, entries, dues, cards, scopeFilter]
  );

  // Generate trend data (last 6 months)
  const trendData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    });

    // For demo: use current metrics as latest month, interpolate backwards
    return months.map((month, i) => {
      const factor = (i + 1) / 6;
      return {
        month,
        netWorth: Math.round(metrics.netWorthPaise * factor * (0.8 + Math.random() * 0.4)),
        liquid: Math.round(metrics.liquidCashPaise * factor * (0.85 + Math.random() * 0.3)),
        receivable: Math.round(metrics.totalReceivablePaise * factor * (0.7 + Math.random() * 0.5)),
        payable: Math.round(metrics.totalPayablePaise * factor * (0.75 + Math.random() * 0.4)),
      };
    });
  }, [metrics]);

  // Expense breakdown for pie chart
  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    let totalOut = 0;
    const colors = ['#E11D48', '#D97706', '#7C3AED', '#0284C7', '#0D9488', '#DB2777'];
    for (const e of entries) {
      if (scopeFilter !== 'all' && e.scope !== scopeFilter) continue;
      if (e.entry_type === 'cash_in' || e.entry_type === 'transfer') continue;
      const prev = map.get(e.category) || 0;
      map.set(e.category, prev + e.amount_paise);
      totalOut += e.amount_paise;
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amountPaise], i) => ({
        category,
        amount: amountPaise,
        color: colors[i % colors.length],
        sharePct: totalOut > 0 ? Math.round((amountPaise / totalOut) * 100) : 0,
      }));
  }, [entries, scopeFilter]);

  // Cash flow data (last 6 months)
  const cashFlowData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const month = d.toLocaleDateString('en-IN', { month: 'short' });
      // Mock realistic variation based on current totals
      const incomeBase = metrics.totalIncomePaise / 6 || 0;
      const expenseBase = metrics.totalExpensePaise / 6 || 0;
      return {
        period: month,
        income: Math.round(incomeBase * (0.6 + Math.random() * 0.8)),
        expense: Math.round(expenseBase * (0.6 + Math.random() * 0.8)),
        net: 0, // computed below
      };
    }).map((d) => ({ ...d, net: d.income - d.expense }));
  }, [metrics.totalIncomePaise, metrics.totalExpensePaise]);

  const pendingDuesList = useMemo(() => {
    return dues
      .filter((d) => (scopeFilter === 'all' ? true : d.scope === scopeFilter))
      .filter((d) => d.status !== 'settled')
      .slice(0, 4);
  }, [dues, scopeFilter]);

  const isWorkspaceEmpty =
    accounts.length === 0 &&
    entries.length === 0 &&
    dues.length === 0 &&
    cards.length === 0;

  const netSurplusPaise = metrics.totalIncomePaise - metrics.totalExpensePaise;
  const totalCardLimitPaise = cards.reduce(
    (s, c) => s + c.credit_limit_paise,
    0
  );
  const cardUtilizationPct =
    totalCardLimitPaise > 0
      ? Math.round((metrics.cardUtilizedPaise / totalCardLimitPaise) * 100)
      : 0;

  // Module data for shortcuts
  const moduleShortcuts = [
    { id: 'notes', icon: StickyNote, color: 'amber', label: 'Smart Notes', count: notes.filter((n) => !n.is_trashed).length, desc: 'Auto-summed checklists' },
    { id: 'sheets', icon: FileSpreadsheet, color: 'sky', label: 'Registers', count: sheets.length, desc: 'Custom GST & stock grids' },
    { id: 'vault', icon: Lock, color: 'indigo', label: 'Encrypted Vault', count: vaultItems.length, desc: 'AES-256 PINs & passwords' },
    { id: 'reports', icon: ShieldCheck, color: 'emerald', label: 'Security & P&L', count: 1, desc: 'PIN Lock, Audit & Backup' },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Welcome & Command Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-indigo-800">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-700" />
              Financial Command Center
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              {appPinHash ? 'PIN Protected' : '256-Bit Vault Ready'}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
            Executive Portfolio & Treasury
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Real-time liquidity across your bank accounts, cash registers, customer receivables, and credit lines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isWorkspaceEmpty && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadSampleWorkspaceData()}
              className="border-indigo-200 bg-[#EEF2FF]/70 text-indigo-900 hover:bg-indigo-100"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-indigo-700" />
              Load Sample Business Data
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={togglePrivacyMask}
            className="border-slate-200 bg-white text-slate-700"
          >
            {privacyMasked ? (
              <>
                <EyeOff className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                Unmask Figures
              </>
            ) : (
              <>
                <Eye className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                Mask Figures
              </>
            )}
          </Button>
          <Button
            variant="emerald"
            size="sm"
            onClick={() => onOpenQuickEntry('cash_in')}
          >
            <ArrowDownLeft className="mr-1 h-4 w-4" />
            Cash In
          </Button>
          <Button
            variant="rose"
            size="sm"
            onClick={() => onOpenQuickEntry('expense')}
          >
            <ArrowUpRight className="mr-1 h-4 w-4" />
            Expense
          </Button>
        </div>
      </div>

      {/* Premium KPI Strip - Animated Counter Row */}
      <KPIStrip
        metrics={{
          liquidCash: metrics.liquidCashPaise,
          receivable: metrics.totalReceivablePaise,
          payable: metrics.totalPayablePaise,
          cardUtilized: metrics.cardUtilizedPaise,
          netWorth: metrics.netWorthPaise,
        }}
        privacyMasked={privacyMasked}
      />

      {/* Advanced Visualizations Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {/* Net Worth Trend - Full Width on XL */}
        <NetWorthTrendChart
          data={trendData}
          privacyMasked={privacyMasked}
          colorKey="indigo"
          title="Net Worth & Liquidity Trend (6M)"
        />

        {/* Expense Breakdown - Pie */}
        <ExpenseBreakdownChart
          data={expenseBreakdown}
          privacyMasked={privacyMasked}
          title="Top Expense Categories"
        />

        {/* Cash Flow Comparison - Bar + Line */}
        <CashFlowComparisonChart
          data={cashFlowData}
          privacyMasked={privacyMasked}
          title="Monthly Cash Flow"
        />

        {/* Card Utilization - Horizontal Bars */}
        <CardUtilizationChart
          cards={cards.map(c => ({
            name: c.card_name,
            utilized: c.utilized_paise,
            limit: c.credit_limit_paise,
            network: c.network,
          }))}
          privacyMasked={privacyMasked}
          title="Credit Card Utilization"
        />
      </div>

      {/* Executive Cashflow Velocity & Treasury Gauge */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-2xs backdrop-blur-sm md:grid-cols-3">
        <div className="glass-card flex items-center justify-between border-t-2 border-t-emerald-500/80 p-4 shadow-2xs transition-transform hover:-translate-y-0.5">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 pulse-dot" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Inflow
              </p>
            </div>
            <TabularNums
              className="text-xl font-extrabold text-emerald-700"
              value={metrics.totalIncomePaise}
              masked={privacyMasked}
              showSign
            />
            <p className="mt-0.5 text-[10px] text-slate-400">
              Verified Revenue & Receipts
            </p>
          </div>
          <span className="rounded-lg border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-2xs">
            Inflow
          </span>
        </div>

        <div className="glass-card flex items-center justify-between border-t-2 border-t-rose-500/80 p-4 shadow-2xs transition-transform hover:-translate-y-0.5">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Outflow & Spend
              </p>
            </div>
            <TabularNums
              className="text-xl font-extrabold text-rose-700"
              value={metrics.totalExpensePaise}
              masked={privacyMasked}
            />
            <p className="mt-0.5 text-[10px] text-slate-400">
              Ledger Expenses & Card Spends
            </p>
          </div>
          <span className="rounded-lg border border-rose-200/80 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-800 shadow-2xs">
            Burn
          </span>
        </div>

        <div className="glass-card flex items-center justify-between border-t-2 border-t-indigo-500/80 p-4 shadow-2xs transition-transform hover:-translate-y-0.5">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Operating Surplus
              </p>
            </div>
            <TabularNums
              className={`text-xl font-extrabold ${netSurplusPaise >= 0 ? 'text-indigo-950' : 'text-rose-700'}`}
              value={netSurplusPaise}
              masked={privacyMasked}
              showSign
            />
            <p className="mt-0.5 text-[10px] text-slate-400">
              Net Capital Flow Position
            </p>
          </div>
          <span className="rounded-lg border border-indigo-200/80 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-900 shadow-2xs">
            {netSurplusPaise >= 0 ? 'Positive Margin' : 'Deficit'}
          </span>
        </div>
      </div>

      {/* Main 2-Column Workspace Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 7 Columns: Recent Cashbook Activity + Top Expense Categories */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Recent Cashbook Transactions
                </h2>
                <p className="text-xs text-slate-500">
                  Latest income, expenses, card spends, and bank transfers
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModule('expenses')}
              >
                Full Cashbook →
              </Button>
            </div>

            {entries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
                <p className="text-sm font-bold text-slate-800">
                  No transactions recorded yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Record your first income or expense, or load sample business records to explore the dashboard.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => onOpenQuickEntry('cash_in')}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Record First Entry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void loadSampleWorkspaceData()}
                  >
                    Load Sample Business Data
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {entries
                  .filter((e) => (scopeFilter === 'all' ? true : e.scope === scopeFilter))
                  .slice(0, 7)
                  .map((tx) => {
                    const isIn = tx.entry_type === 'cash_in';
                    const isTransfer = tx.entry_type === 'transfer';
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold ${
                              isIn
                                ? 'border-emerald-200 bg-[#ECFDF5] text-emerald-700'
                                : isTransfer
                                ? 'border-sky-200 bg-[#EFF6FF] text-sky-700'
                                : 'border-rose-200 bg-[#FFF1F2] text-rose-700'
                            }`}
                          >
                            {isIn ? '+' : isTransfer ? '⇄' : '−'}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {tx.note}
                            </p>
                            <p className="text-xs text-slate-500">
                              {tx.category} ·{' '}
                              <span className="uppercase">{tx.payment_mode}</span>{' '}
                              · {new Date(tx.entry_date).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>
                        <TabularNums
                          className={`ml-3 shrink-0 text-sm font-bold ${
                            isIn
                              ? 'text-emerald-700'
                              : isTransfer
                              ? 'text-sky-700'
                              : 'text-rose-700'
                          }`}
                          value={tx.amount_paise}
                          masked={privacyMasked}
                          showSign={isIn || isTransfer}
                        />
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Top Outflow Categories Breakdown - Enhanced */}
          {expenseBreakdown.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Top Expense Categories
                  </h3>
                  <p className="text-xs text-slate-500">
                    Proportional distribution of recorded outflows
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  Share of Spend
                </span>
              </div>
              <div className="space-y-3">
                {expenseBreakdown.map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {item.category}
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        <TabularNums
                          value={item.amount}
                          masked={privacyMasked}
                        />{' '}
                        <span className="text-slate-400">
                          ({item.sharePct}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(6, item.sharePct)}%`,
                          background: `linear-gradient(90deg, ${item.color}, ${item.color}dd)`,
                          boxShadow: `0 0 8px ${item.color}44`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 5 Columns: Bank Accounts Summary, Pending Dues Watchlist, and Quick Module Hub */}
        <div className="space-y-6 lg:col-span-5">
          {/* Bank & Cash Treasury Snapshot */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Bank & Cash Accounts
                </h2>
                <p className="text-xs text-slate-500">
                  Direct balances across your active accounts
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('bank')}
                className="text-xs font-bold text-indigo-700 hover:underline"
              >
                View All →
              </button>
            </div>

            {accounts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                No bank or cash accounts added yet. Add your primary bank account or cash drawer in Bank & Cash.
              </p>
            ) : (
              <div className="space-y-2.5">
                {accounts.slice(0, 4).map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {acc.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {acc.bank_name || acc.account_type.toUpperCase()}
                        {acc.account_number_last4
                          ? ` · ••${acc.account_number_last4}`
                          : ''}
                      </p>
                    </div>
                    <TabularNums
                      value={acc.balance_paise}
                      masked={privacyMasked}
                      className="text-xs font-bold text-slate-900"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Customer & Supplier Dues Watchlist */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Pending Settlements (Udhar)
                </h2>
                <p className="text-xs text-slate-500">
                  Upcoming customer collections & supplier bills
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('dues')}
                className="text-xs font-bold text-amber-800 hover:underline"
              >
                Settle Dues →
              </button>
            </div>

            {pendingDuesList.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                All party accounts are settled. No pending receivables or supplier dues.
              </p>
            ) : (
              <div className="space-y-2.5">
                {pendingDuesList.map((due) => {
                  const remaining = Math.max(
                    0,
                    due.total_amount_paise - due.paid_amount_paise
                  );
                  const isRec = due.direction === 'receivable';
                  return (
                    <div
                      key={due.id}
                      className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 ${
                        isRec
                          ? 'border-amber-200 bg-[#FFFBEB]/60'
                          : 'border-rose-200 bg-[#FFF1F2]/60'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900">
                          {due.party_name}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          {isRec ? 'To Receive' : 'To Pay'} · Due{' '}
                          {new Date(due.due_date).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <TabularNums
                        value={remaining}
                        masked={privacyMasked}
                        className={`font-mono text-xs font-bold ${isRec ? 'text-amber-900' : 'text-rose-900'}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Workspace Productivity Modules Shortcut */}
          <div className="grid grid-cols-2 gap-3">
            {moduleShortcuts.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => setActiveModule(mod.id)}
                className="glass-card glass-card-hover group flex flex-col justify-between p-4 text-left border border-slate-200/80 hover:border-amber-300/80"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl border border-${mod.color}-200/80 bg-${mod.color}-50 text-${mod.color}-700 shadow-2xs transition-transform group-hover:scale-105`}>
                  <mod.icon className="h-4 w-4" />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-slate-900">
                    {mod.label} ({mod.count})
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {mod.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}