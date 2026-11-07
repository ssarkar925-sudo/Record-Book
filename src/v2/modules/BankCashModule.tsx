'use client';

import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Building2,
  Check,
  Copy,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useV2Store } from '../store/useV2StoreEdge';
import { formatINRFromPaise, rupeesToPaise } from '../engine/financialEngine';
import { AnimatedCurrency } from '../components/AnimatedCurrency';
import { AccountType, SphereScope, V2Account } from '@/types/v2';
import { Button } from '@/components/ui/button';
import { DaylightKpiCard } from '@/components/ui/DaylightKpiCard';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toastStore';
import { PremiumModal } from '@/components/ui/PremiumModal';

export function BankCashModule() {
  const {
    accounts,
    scopeFilter,
    privacyMasked,
    addAccount,
    updateAccount,
    deleteAccount,
    transferBetweenAccounts,
    logSecurityEvent,
  } = useV2Store();

  const [addOpen, setAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<V2Account | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Account Form State
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('savings');
  const [last4, setLast4] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [balanceRupees, setBalanceRupees] = useState('');
  const [scope, setScope] = useState<SphereScope>('business');
  const [notes, setNotes] = useState('');

  // Edit / Reconcile Account State
  const [editName, setEditName] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editBalanceRupees, setEditBalanceRupees] = useState('');
  const [editIfsc, setEditIfsc] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Transfer State
  const [fromId, setFromId] = useState(accounts[0]?.id || '');
  const [toId, setToId] = useState(accounts[1]?.id || '');
  const [transferRupees, setTransferRupees] = useState('');
  const [transferNote, setTransferNote] = useState('');

  const visibleAccounts = accounts.filter((a) =>
    scopeFilter === 'all' ? true : a.scope === scopeFilter
  );

  const totalLiquidPaise = visibleAccounts.reduce(
    (sum, a) => sum + a.balance_paise,
    0
  );
  const bankOnlyPaise = visibleAccounts
    .filter((a) => a.account_type !== 'cash')
    .reduce((sum, a) => sum + a.balance_paise, 0);
  const cashOnlyPaise = visibleAccounts
    .filter((a) => a.account_type === 'cash')
    .reduce((sum, a) => sum + a.balance_paise, 0);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addAccount({
      name: name.trim(),
      bank_name:
        bankName.trim() ||
        (accountType === 'cash' ? 'Physical Cash' : 'Bank Account'),
      account_type: accountType,
      account_number_last4:
        last4.trim() || (accountType === 'cash' ? 'CASH' : '0000'),
      ifsc: ifsc.trim().toUpperCase(),
      balance_paise: rupeesToPaise(balanceRupees || '0'),
      is_default: accounts.length === 0,
      scope,
      notes: notes.trim(),
    });
    logSecurityEvent('Account Added', `Created account ${name.trim()}`);
    toast.success('Account Created', `${name.trim()} added to your treasury`);
    setName('');
    setBankName('');
    setLast4('');
    setIfsc('');
    setBalanceRupees('');
    setNotes('');
    setAddOpen(false);
  };

  const openEditModal = (acc: V2Account) => {
    setEditTarget(acc);
    setEditName(acc.name);
    setEditBankName(acc.bank_name || '');
    setEditBalanceRupees(String(acc.balance_paise / 100));
    setEditIfsc(acc.ifsc || '');
    setEditNotes(acc.notes || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editName.trim()) return;
    const nextPaise = rupeesToPaise(editBalanceRupees || '0');
    await updateAccount(editTarget.id, {
      name: editName.trim(),
      bank_name: editBankName.trim(),
      balance_paise: nextPaise,
      ifsc: editIfsc.trim().toUpperCase(),
      notes: editNotes.trim(),
    });
    logSecurityEvent(
      'Account Balance Reconciled',
      `Updated ${editName.trim()} balance`
    );
    toast.success('Account Updated', `${editName.trim()} balance updated`);
    setEditTarget(null);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountPaise = rupeesToPaise(transferRupees);
    if (!fromId || !toId || fromId === toId || amountPaise <= 0) return;
    await transferBetweenAccounts({
      fromAccountId: fromId,
      toAccountId: toId,
      amountPaise,
      note: transferNote.trim(),
      scope: scopeFilter === 'all' ? 'business' : scopeFilter,
    });
    logSecurityEvent(
      'Contra Transfer Completed',
      `Transferred ₹${transferRupees} between accounts`
    );
    toast.success('Transfer Successful', `₹${Number(transferRupees).toLocaleString('en-IN')} transferred`);
    setTransferRupees('');
    setTransferNote('');
    setTransferOpen(false);
  };

  const handleCopyIfsc = (id: string, code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(code);
      setCopiedId(id);
      toast.info('IFSC Copied', code);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            Treasury & Liquidity
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
            Bank & Cash Accounts
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Manage savings accounts, business current accounts, physical cash drawers (Galla), and self-transfers.
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
            disabled={accounts.length < 2}
          >
            <ArrowLeftRight className="mr-1.5 h-4 w-4 text-indigo-600" />
            Self / Contra Transfer
          </Button>
          <Button variant="emerald" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Bank or Cash Account
          </Button>
        </div>
      </div>

      {/* 3-Column Liquidity Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DaylightKpiCard
          title="Combined Liquid Treasury"
          paise={totalLiquidPaise}
          icon={Building2}
          accent="emerald"
          badgeText={`${visibleAccounts.length} Accounts`}
          badgeVariant="success"
          subtitle="All Bank + Cash Drawer funds"
          ratioBar={{
            primaryPct:
              totalLiquidPaise > 0
                ? Math.round((bankOnlyPaise / totalLiquidPaise) * 100)
                : 100,
            primaryLabel: 'Bank Share',
            secondaryLabel: `${totalLiquidPaise > 0 ? Math.round((bankOnlyPaise / totalLiquidPaise) * 100) : 0}%`,
          }}
        />

        <DaylightKpiCard
          title="Total in Bank Accounts"
          paise={bankOnlyPaise}
          icon={Building2}
          accent="indigo"
          badgeText={`${visibleAccounts.filter((a) => a.account_type !== 'cash').length} Banks`}
          subtitle="Savings, Current & OD Accounts"
        />

        <DaylightKpiCard
          title="Physical Cash in Hand"
          paise={cashOnlyPaise}
          icon={Wallet}
          accent="amber"
          badgeText={`${visibleAccounts.filter((a) => a.account_type === 'cash').length} Cash Box`}
          badgeVariant="warning"
          subtitle="Store counter & petty cash drawers"
        />
      </div>

      {/* Account Cards Grid */}
      {visibleAccounts.length === 0 ? (
        <div className="glass-card rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-emerald-600" />
          <h2 className="mt-3 text-base font-bold text-slate-900">
            No bank or cash accounts in this view
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Add your primary business current account, personal savings account, or physical cash drawer to track real-time balances.
          </p>
          <Button
            variant="emerald"
            size="sm"
            className="mt-4"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add First Account
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleAccounts.map((acc) => {
            const isCash = acc.account_type === 'cash';
            const topAccent = isCash
              ? 'border-t-2 border-t-amber-500/80'
              : acc.account_type === 'current'
                ? 'border-t-2 border-t-indigo-500/80'
                : 'border-t-2 border-t-emerald-500/80';

            return (
              <div
                key={acc.id}
                className={`glass-card glass-card-hover flex flex-col justify-between border border-slate-200/80 p-5 shadow-2xs transition-all ${topAccent}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-800 shadow-2xs">
                        {isCash ? (
                          <Wallet className="h-5 w-5 text-amber-600" />
                        ) : (
                          <Building2 className="h-5 w-5 text-indigo-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          {acc.name}
                        </h3>
                        <p className="text-xs text-slate-600">
                          {acc.bank_name || 'Account'} ·{' '}
                          <span className="font-mono">
                            ••{acc.account_number_last4 || '0000'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(acc)}
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-indigo-700"
                        title="Edit or Reconcile Account Balance"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAccount(acc.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        title="Delete Account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Available Balance
                    </p>
                    <p className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-slate-900">
                      {formatINRFromPaise(acc.balance_paise, {
                        showDecimals: true,
                        masked: privacyMasked,
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-700">
                      {acc.account_type}
                    </span>
                    <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
                      {acc.scope}
                    </span>
                  </div>

                  {acc.ifsc ? (
                    <button
                      type="button"
                      onClick={() => handleCopyIfsc(acc.id, acc.ifsc!)}
                      className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-800 hover:bg-indigo-50"
                      title="Copy IFSC Code"
                    >
                      <span>{acc.ifsc}</span>
                      {copiedId === acc.id ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-indigo-500" />
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openEditModal(acc)}
                      className="text-[11px] font-semibold text-indigo-700 hover:underline"
                    >
                      Reconcile Balance
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Account Modal - Premium */}
      <PremiumModal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Bank or Cash Account"
        description="Create a new bank account, digital wallet, or physical cash register."
        size="md"
        variant="dialog"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Account Display Name *
              </label>
              <Input
                required
                placeholder="e.g. HDFC Business Current"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Bank / Institution Name
              </label>
              <Input
                placeholder="e.g. HDFC Bank / Cash Drawer"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Account Type
              </label>
              <select
                value={accountType}
                onChange={(e) =>
                  setAccountType(e.target.value as AccountType)
                }
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                <option value="savings">Savings Bank</option>
                <option value="current">Current / Business</option>
                <option value="cash">Physical Cash (Galla)</option>
                <option value="od">Overdraft / CC</option>
                <option value="wallet">UPI / Wallet</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Last 4 Digits
              </label>
              <Input
                maxLength={4}
                placeholder="4821"
                value={last4}
                onChange={(e) => setLast4(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                IFSC Code (Optional)
              </label>
              <Input
                placeholder="HDFC0001204"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Opening Balance (₹) *
              </label>
              <Input
                type="number"
                step="0.01"
                required
                placeholder="25000"
                value={balanceRupees}
                onChange={(e) => setBalanceRupees(e.target.value)}
              />
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
              Notes
            </label>
            <Input
              placeholder="Primary settlement account, branch note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="emerald">
              Save Account
            </Button>
          </div>
        </form>
      </PremiumModal>

      {/* Reconcile / Edit Account Modal - Premium */}
      <PremiumModal
        open={Boolean(editTarget)}
        onOpenChange={(o) => !o && setEditTarget(null)}
        title="Edit & Reconcile Account"
        description="Update account details or reconcile the current balance with your actual bank statement."
        size="md"
        variant="dialog"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Account Name *
              </label>
              <Input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Bank / Institution
              </label>
              <Input
                value={editBankName}
                onChange={(e) => setEditBankName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Current Statement Balance (₹) *
              </label>
              <Input
                type="number"
                step="0.01"
                required
                value={editBalanceRupees}
                onChange={(e) => setEditBalanceRupees(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                IFSC Code
              </label>
              <Input
                value={editIfsc}
                onChange={(e) => setEditIfsc(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Notes
            </label>
            <Input
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditTarget(null)}
            >
              Cancel
            </Button>
            <Button type="submit">Update Account</Button>
          </div>
        </form>
      </PremiumModal>

      {/* Self / Contra Transfer Modal - Premium */}
      <PremiumModal
        open={transferOpen}
        onOpenChange={setTransferOpen}
        title="Self / Contra Account Transfer"
        description="Move funds between bank accounts and physical cash drawers without inflating revenue or expense totals."
        size="md"
        variant="dialog"
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                To Account (Credit)
              </label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
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
              Transfer Remarks
            </label>
            <Input
              placeholder="e.g. Cash withdrawal for store counter float"
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTransferOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Execute Transfer</Button>
          </div>
        </form>
      </PremiumModal>
    </div>
  );
}
