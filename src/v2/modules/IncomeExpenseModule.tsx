'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useV2Store } from '../store/useV2Store';
import { formatINRFromPaise, rupeesToPaise } from '../engine/financialEngine';
import { LedgerEntryType, PaymentMode, SphereScope } from '@/types/v2';
import { Button } from '@/components/ui/button';
import { DaylightKpiCard } from '@/components/ui/DaylightKpiCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toastStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function IncomeExpenseModule() {
  const {
    entries,
    accounts,
    scopeFilter,
    searchQuery,
    privacyMasked,
    addLedgerEntry,
    deleteLedgerEntry,
  } = useV2Store();

  const [typeFilter, setTypeFilter] = useState<'all' | LedgerEntryType>('all');
  const [modeFilter, setModeFilter] = useState<'all' | PaymentMode>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [entryType, setEntryType] = useState<'cash_in' | 'expense'>('expense');
  const [amountRupees, setAmountRupees] = useState('');
  const [category, setCategory] = useState('Operations & Supplies');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [note, setNote] = useState('');
  const [scope, setScope] = useState<SphereScope>('business');

  const filtered = useMemo(() => {
    const q = (localSearch || searchQuery).trim().toLowerCase();
    return entries
      .filter((e) => (scopeFilter === 'all' ? true : e.scope === scopeFilter))
      .filter((e) => (typeFilter === 'all' ? true : e.entry_type === typeFilter))
      .filter((e) =>
        modeFilter === 'all' ? true : e.payment_mode === modeFilter
      )
      .filter((e) =>
        !q
          ? true
          : e.note.toLowerCase().includes(q) ||
            e.category.toLowerCase().includes(q)
      );
  }, [entries, scopeFilter, typeFilter, modeFilter, localSearch, searchQuery]);

  const totalIn = filtered
    .filter((e) => e.entry_type === 'cash_in')
    .reduce((s, e) => s + e.amount_paise, 0);
  const totalOut = filtered
    .filter((e) => e.entry_type !== 'cash_in' && e.entry_type !== 'transfer')
    .reduce((s, e) => s + e.amount_paise, 0);
  const netSurplus = totalIn - totalOut;

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = rupeesToPaise(amountRupees);
    if (paise <= 0) return;

    await addLedgerEntry({
      entry_type: entryType,
      amount_paise: paise,
      category: category.trim() || 'General',
      payment_mode: paymentMode,
      account_id: accountId || accounts[0]?.id,
      note: note.trim() || `${category} (${paymentMode.toUpperCase()})`,
      entry_date: new Date().toISOString(),
      scope,
    });

    setAmountRupees('');
    setNote('');
    setModalOpen(false);
    toast.success(
      entryType === 'cash_in' ? 'Cash In Recorded' : 'Expense Recorded',
      `₹${Number(amountRupees).toLocaleString('en-IN')} added to cashbook`
    );
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Type', 'Category', 'Narration', 'Mode', 'Scope', 'Amount_INR'];
    const rows = filtered.map((tx) => [
      new Date(tx.entry_date).toISOString().slice(0, 10),
      tx.entry_type,
      `"${(tx.category || '').replace(/"/g, '""')}"`,
      `"${(tx.note || '').replace(/"/g, '""')}"`,
      tx.payment_mode.toUpperCase(),
      tx.scope,
      (tx.amount_paise / 100).toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `record-book-cashbook-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.info('Export Completed', `Downloaded CSV with ${filtered.length} entries`);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sky-900">
            Double-Entry Cashbook
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
            Cashbook & Expense Journal
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Every voucher automatically updates your linked bank or cash balance and P&L statements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
          >
            <Download className="mr-1.5 h-4 w-4 text-slate-600" />
            Export CSV
          </Button>
          <Button
            variant="emerald"
            onClick={() => {
              setEntryType('cash_in');
              setCategory('Sales & Revenue');
              setAccountId(accounts[0]?.id || '');
              setModalOpen(true);
            }}
          >
            <ArrowDownLeft className="mr-1.5 h-4 w-4" />
            Record Cash In
          </Button>
          <Button
            variant="rose"
            onClick={() => {
              setEntryType('expense');
              setCategory('Operations & Supplies');
              setAccountId(accounts[0]?.id || '');
              setModalOpen(true);
            }}
          >
            <ArrowUpRight className="mr-1.5 h-4 w-4" />
            Record Expense
          </Button>
        </div>
      </div>

      {/* 3-Card Daylight KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DaylightKpiCard
          title="Filtered Inflow"
          paise={totalIn}
          icon={ArrowDownLeft}
          accent="emerald"
          badgeText="Receipts"
          badgeVariant="success"
          subtitle="Sales, refunds & capital inward"
        />

        <DaylightKpiCard
          title="Filtered Outflow"
          paise={totalOut}
          icon={ArrowUpRight}
          accent="rose"
          badgeText="Spend"
          badgeVariant="danger"
          subtitle="Operating expenses & purchases"
        />

        <DaylightKpiCard
          title="Net Cashflow Surplus"
          paise={Math.abs(netSurplus)}
          icon={ArrowDownLeft}
          accent={netSurplus >= 0 ? 'indigo' : 'rose'}
          badgeText={netSurplus >= 0 ? 'Surplus' : 'Deficit'}
          badgeVariant={netSurplus >= 0 ? 'success' : 'danger'}
          subtitle={netSurplus >= 0 ? 'Inflow exceeds expenses' : 'Burn exceeds revenue'}
        />
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs backdrop-blur-sm lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          <SegmentedControl<'all' | LedgerEntryType>
            options={[
              { id: 'all', label: 'All', count: entries.length },
              { id: 'cash_in', label: 'Cash In' },
              { id: 'expense', label: 'Expenses' },
              { id: 'card_spend', label: 'Card Spends' },
              { id: 'transfer', label: 'Transfers' },
            ]}
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            layoutId="cashbook-entry-type-segmented"
            size="sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={modeFilter}
            onChange={(e) =>
              setModeFilter(e.target.value as 'all' | PaymentMode)
            }
            className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700"
          >
            <option value="all">All Payment Modes</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank Transfer</option>
            <option value="cash">Physical Cash</option>
            <option value="card">Card</option>
          </select>

          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter category or note..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Category & Narration</th>
                <th className="px-4 py-3.5">Account / Mode</th>
                <th className="px-4 py-3.5">Sphere</th>
                <th className="px-4 py-3.5 text-right">Amount (₹)</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-xs text-slate-500"
                  >
                    No transactions match your current filter. Click &ldquo;Record Cash In&rdquo; or &ldquo;Record Expense&rdquo; above.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const isIn = tx.entry_type === 'cash_in';
                  const isTransfer = tx.entry_type === 'transfer';
                  const linkedAcc = accounts.find(
                    (a) => a.id === tx.account_id
                  );
                  return (
                    <tr
                      key={tx.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-600">
                        {new Date(tx.entry_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">
                          {tx.note}
                        </p>
                        <p className="text-xs text-slate-500">{tx.category}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-700">
                          {tx.payment_mode}
                        </span>
                        {linkedAcc && (
                          <span className="ml-1.5 text-xs text-slate-500">
                            · {linkedAcc.name}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs capitalize text-slate-600">
                        {tx.scope}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3.5 text-right font-mono text-sm font-bold tabular-nums ${
                          isIn
                            ? 'text-emerald-700'
                            : isTransfer
                              ? 'text-sky-700'
                              : 'text-rose-700'
                        }`}
                      >
                        {isIn ? '+' : isTransfer ? '' : '-'}
                        {formatINRFromPaise(tx.amount_paise, {
                          masked: privacyMasked,
                        })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => deleteLedgerEntry(tx.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Delete Entry & Reverse Account Balance"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Voucher Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {entryType === 'cash_in'
                ? 'Record Cash In / Income'
                : 'Record Expense / Cash Out'}
            </DialogTitle>
            <DialogDescription>
              Automatically updates the selected bank or cash account balance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEntry} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEntryType('cash_in');
                  setCategory('Sales & Revenue');
                }}
                className={`rounded-xl border py-2 text-xs font-bold ${
                  entryType === 'cash_in'
                    ? 'border-emerald-300 bg-[#ECFDF5] text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                + Cash In (Revenue)
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntryType('expense');
                  setCategory('Operations & Supplies');
                }}
                className={`rounded-xl border py-2 text-xs font-bold ${
                  entryType === 'expense'
                    ? 'border-rose-300 bg-[#FFF1F2] text-rose-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                - Expense (Outflow)
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Amount (₹) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="2500"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Category *
                </label>
                <Input
                  required
                  placeholder="e.g. Wholesale Sales, Logistics, Rent"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) =>
                    setPaymentMode(e.target.value as PaymentMode)
                  }
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="upi">UPI</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Physical Cash</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Linked Account
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  {accounts.length === 0 && (
                    <option value="">General Cashbook</option>
                  )}
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Sphere
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as SphereScope)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="business">Business</option>
                  <option value="personal">Personal</option>
                  <option value="family">Family</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Narration / Description
              </label>
              <Input
                placeholder="Party name, bill number, or voucher details..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                <Plus className="mr-1.5 h-4 w-4" />
                Save Voucher
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
