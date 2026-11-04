'use client';

import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Building2,
  Landmark,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useV2Store } from '@/v2/store/useV2Store';
import {
  formatINRFromPaise,
  rupeesToPaise,
} from '@/v2/engine/financialEngine';
import { AnimatedCurrency } from '@/v2/components/AnimatedCurrency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AccountType, SphereScope } from '@/types/v2';

export function BankCashModule() {
  const {
    accounts,
    scopeFilter,
    addAccount,
    deleteAccount,
    transferBetweenAccounts,
  } = useV2Store();

  const [addOpen, setAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  // Add Account Form State
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('savings');
  const [last4, setLast4] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [openingRupees, setOpeningRupees] = useState('');
  const [scope, setScope] = useState<SphereScope>('business');
  const [notes, setNotes] = useState('');

  // Transfer Form State
  const [fromId, setFromId] = useState(accounts[0]?.id || '');
  const [toId, setToId] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [transferRupees, setTransferRupees] = useState('');
  const [transferNote, setTransferNote] = useState('');

  const visibleAccounts = accounts.filter(
    (a) => scopeFilter === 'all' || a.scope === scopeFilter
  );

  const totalLiquidPaise = visibleAccounts.reduce(
    (sum, a) => sum + a.balance_paise,
    0
  );

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addAccount({
      name: name.trim(),
      bank_name: bankName.trim() || 'Bank / Cash',
      account_type: accountType,
      account_number_last4: last4.trim() || '0000',
      ifsc: ifsc.trim().toUpperCase(),
      balance_paise: rupeesToPaise(openingRupees || '0'),
      is_default: accounts.length === 0,
      scope,
      notes: notes.trim(),
    });
    setName('');
    setBankName('');
    setLast4('');
    setIfsc('');
    setOpeningRupees('');
    setNotes('');
    setAddOpen(false);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = rupeesToPaise(transferRupees);
    if (!fromId || !toId || fromId === toId || paise <= 0) return;
    await transferBetweenAccounts({
      fromAccountId: fromId,
      toAccountId: toId,
      amountPaise: paise,
      note: transferNote.trim(),
      scope: 'business',
    });
    setTransferRupees('');
    setTransferNote('');
    setTransferOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Pastel Mint Header */}
      <div className="rounded-2xl border border-emerald-200 bg-[#ECFDF5] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Module 02 · Liquid Treasury & Cash Drawer
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Bank Accounts & Cash Float
            </h1>
            <p className="mt-1 text-sm text-emerald-900/80">
              Total Combined Liquidity:{' '}
              <AnimatedCurrency
                valuePaise={totalLiquidPaise}
                className="font-bold text-emerald-950"
              />
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => {
                setFromId(accounts[0]?.id || '');
                setToId(accounts[1]?.id || accounts[0]?.id || '');
                setTransferOpen(true);
              }}
              className="gap-2 border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-50"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Self Transfer (Contra)
            </Button>
            <Button
              variant="default"
              onClick={() => setAddOpen(true)}
              className="gap-2 bg-emerald-700 hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              + Add Account
            </Button>
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleAccounts.map((acc) => {
          const isCash = acc.account_type === 'cash';
          return (
            <div
              key={acc.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-emerald-300"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                        isCash
                          ? 'border-amber-200 bg-[#FFFBEB] text-amber-700'
                          : 'border-emerald-200 bg-[#ECFDF5] text-emerald-700'
                      }`}
                    >
                      {isCash ? (
                        <Wallet className="h-5 w-5" />
                      ) : (
                        <Landmark className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {acc.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {acc.bank_name || 'Account'} · ••{acc.account_number_last4 || 'CASH'} ·{' '}
                        {acc.account_type.toUpperCase()} · {acc.scope.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteAccount(acc.id)}
                    title="Delete Account"
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Current Cleared Balance
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
                    {formatINRFromPaise(acc.balance_paise)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span>{acc.ifsc ? `IFSC: ${acc.ifsc}` : 'Direct Cash Register'}</span>
                <span>{acc.notes || 'Active Ledger Account'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Account Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank or Cash Account</DialogTitle>
            <DialogDescription>
              Create a new bank account, UPI wallet, OD/CC limit, or physical cash drawer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Account Display Name *
              </label>
              <Input
                required
                placeholder="e.g., ICICI Business Current or Counter Cash"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Account Type
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="savings">Savings Account</option>
                  <option value="current">Current Account</option>
                  <option value="cash">Physical Cash (Galla)</option>
                  <option value="upi">UPI Lite / Wallet</option>
                  <option value="od_cc">Overdraft / CC</option>
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
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Bank Name
                </label>
                <Input
                  placeholder="HDFC / SBI"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Last 4 Digits
                </label>
                <Input
                  maxLength={4}
                  placeholder="4829"
                  value={last4}
                  onChange={(e) => setLast4(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  IFSC Code
                </label>
                <Input
                  placeholder="HDFC0001204"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Opening Balance (₹) *
              </label>
              <Input
                type="number"
                step="0.01"
                required
                placeholder="50000"
                value={openingRupees}
                onChange={(e) => setOpeningRupees(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Notes / Purpose
              </label>
              <Input
                placeholder="Primary settlement account"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Account</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Self Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atomic Self-Transfer (Contra Entry)</DialogTitle>
            <DialogDescription>
              Move funds between bank accounts and cash drawer with automatic double-entry balance updates.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  From Account (Debit)
                </label>
                <select
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
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
                  To Account (Credit)
                </label>
                <select
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatINRFromPaise(a.balance_paise)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Transfer Amount (₹) *
              </label>
              <Input
                type="number"
                step="0.01"
                required
                placeholder="10000"
                value={transferRupees}
                onChange={(e) => setTransferRupees(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Reference / Narration
              </label>
              <Input
                placeholder="ATM Cash Withdrawal for Store Drawer"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setTransferOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Execute Transfer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
