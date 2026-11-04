'use client';

import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Search,
  Trash2,
} from 'lucide-react';
import { useV2Store } from '@/v2/store/useV2Store';
import {
  formatINRFromPaise,
  rupeesToPaise,
} from '@/v2/engine/financialEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LedgerEntryType, PaymentMode, SphereScope } from '@/types/v2';

export function IncomeExpenseModule() {
  const {
    entries,
    accounts,
    scopeFilter,
    searchQuery,
    addLedgerEntry,
    deleteLedgerEntry,
  } = useV2Store();

  const [typeFilter, setTypeFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | PaymentMode>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // New Entry State
  const [entryType, setEntryType] = useState<LedgerEntryType>('expense');
  const [amountRupees, setAmountRupees] = useState('');
  const [category, setCategory] = useState('Inventory & Stock');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [scope, setScope] = useState<SphereScope>('business');
  const [note, setNote] = useState('');

  const combinedQuery = (localSearch || searchQuery).toLowerCase().trim();

  const filteredEntries = entries.filter((e) => {
    if (scopeFilter !== 'all' && e.scope !== scopeFilter) return false;
    if (typeFilter === 'inflow' && e.entry_type !== 'cash_in') return false;
    if (typeFilter === 'outflow' && e.entry_type === 'cash_in') return false;
    if (modeFilter !== 'all' && e.payment_mode !== modeFilter) return false;
    if (
      combinedQuery &&
      !e.category.toLowerCase().includes(combinedQuery) &&
      !e.note.toLowerCase().includes(combinedQuery)
    ) {
      return false;
    }
    return true;
  });

  const totalInPaise = filteredEntries
    .filter((e) => e.entry_type === 'cash_in')
    .reduce((sum, e) => sum + e.amount_paise, 0);

  const totalOutPaise = filteredEntries
    .filter((e) => e.entry_type !== 'cash_in' && e.entry_type !== 'transfer')
    .reduce((sum, e) => sum + e.amount_paise, 0);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = rupeesToPaise(amountRupees);
    if (paise <= 0) return;

    await addLedgerEntry({
      entry_type: entryType,
      amount_paise: paise,
      category: category.trim() || 'General Entry',
      payment_mode: paymentMode,
      account_id: accountId || accounts[0]?.id,
      note: note.trim() || category.trim(),
      entry_date: new Date().toISOString(),
      scope,
    });

    setAmountRupees('');
    setNote('');
    setModalOpen(false);
  };

  const handleExportCsv = () => {
    const header = [
      'Date',
      'Type',
      'Category',
      'Mode',
      'Scope',
      'Amount_INR',
      'Narration',
    ];
    const rows = filteredEntries.map((e) => [
      e.entry_date.slice(0, 10),
      e.entry_type,
      `"${e.category.replace(/"/g, '""')}"`,
      e.payment_mode,
      e.scope,
      (e.amount_paise / 100).toFixed(2),
      `"${e.note.replace(/"/g, '""')}"`,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `record_book_v2_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Pastel Sky Header */}
      <div className="rounded-2xl border border-sky-200 bg-[#EFF6FF] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-sky-800">
              03. Double-Entry Cashbook & Expense Journal
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Income & Expense Ledger
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Total Cash In:{' '}
              <span className="font-mono font-bold tabular-nums text-emerald-700">
                +{formatINRFromPaise(totalInPaise)}
              </span>{' '}
              · Total Outflow:{' '}
              <span className="font-mono font-bold tabular-nums text-rose-700">
                -{formatINRFromPaise(totalOutPaise)}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={handleExportCsv}
              className="gap-2 bg-white whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="emerald"
              onClick={() => {
                setEntryType('cash_in');
                setCategory('Sales & Revenue');
                setModalOpen(true);
              }}
              className="gap-1.5 whitespace-nowrap"
            >
              <ArrowDownLeft className="h-4 w-4" />
              <span>+ Cash In</span>
            </Button>
            <Button
              variant="rose"
              onClick={() => {
                setEntryType('expense');
                setCategory('Business Expense');
                setModalOpen(true);
              }}
              className="gap-1.5 whitespace-nowrap"
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>- Add Expense</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Bar (Type + Payment Mode + Search) */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {(
              [
                { id: 'all', label: `All (${filteredEntries.length})` },
                { id: 'inflow', label: 'Cash In' },
                { id: 'outflow', label: 'Outflow' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  typeFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {(
              [
                { id: 'all', label: 'All Modes' },
                { id: 'upi', label: 'UPI' },
                { id: 'bank', label: 'Bank' },
                { id: 'cash', label: 'Cash' },
                { id: 'card', label: 'Card' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModeFilter(m.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  modeFilter === m.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Filter category or narration..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* High-Density Ledger Table (Zero Row Dot Scatter, Tabular Numerals) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Category & Narration</th>
                <th className="px-5 py-3.5">Account & Mode</th>
                <th className="px-5 py-3.5">Scope</th>
                <th className="px-5 py-3.5 text-right">Amount (₹)</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No matching transactions found. Click &quot;+ Cash In&quot;
                    or &quot;- Add Expense&quot; to log an entry.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const isInflow = entry.entry_type === 'cash_in';
                  const isTransfer = entry.entry_type === 'transfer';
                  const acc = accounts.find((a) => a.id === entry.account_id);
                  return (
                    <tr
                      key={entry.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs tabular-nums text-slate-500">
                        {entry.entry_date.slice(0, 10)}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">
                          {entry.category}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {entry.note}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-600">
                        {acc ? acc.name : 'Direct Ledger'} ·{' '}
                        <span className="font-mono font-semibold uppercase">
                          {entry.payment_mode}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-500">
                        {entry.scope}
                      </td>
                      <td
                        className={`whitespace-nowrap px-5 py-3.5 text-right font-mono font-bold tabular-nums ${
                          isInflow
                            ? 'text-emerald-700'
                            : isTransfer
                              ? 'text-sky-700'
                              : 'text-rose-700'
                        }`}
                      >
                        {isInflow ? '+' : isTransfer ? '⇄ ' : '-'}
                        {formatINRFromPaise(entry.amount_paise)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => deleteLedgerEntry(entry.id)}
                          title="Delete & Reverse Account Impact"
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
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

      {/* Add Ledger Entry Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {entryType === 'cash_in'
                ? 'Record Cash In / Revenue'
                : 'Record Expense / Cash Out'}
            </DialogTitle>
            <DialogDescription>
              Automatically updates the selected bank or cash drawer balance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEntry} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEntryType('cash_in')}
                className={`rounded-xl border py-2.5 text-xs font-bold transition-colors ${
                  entryType === 'cash_in'
                    ? 'border-emerald-300 bg-[#ECFDF5] text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                + Cash In (Revenue)
              </button>
              <button
                type="button"
                onClick={() => setEntryType('expense')}
                className={`rounded-xl border py-2.5 text-xs font-bold transition-colors ${
                  entryType !== 'cash_in'
                    ? 'border-rose-300 bg-[#FFF1F2] text-rose-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                - Expense / Outflow
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
                placeholder="2500"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Category *
                </label>
                <Input
                  required
                  placeholder="Wholesale Sales / Logistics"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
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
                  <option value="bank">Bank NEFT / RTGS</option>
                  <option value="cash">Physical Cash</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Linked Account
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Sphere Scope
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
                Narration / Voucher Note
              </label>
              <Input
                placeholder="Invoice # or counterparty details"
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
              <Button type="submit">Post Ledger Entry</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
