'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Phone,
  Plus,
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
import { DueDirection, SphereScope, V2PartyDue } from '@/types/v2';

export function DuesUdharModule() {
  const {
    dues,
    accounts,
    scopeFilter,
    addPartyDue,
    settlePartyDue,
    deletePartyDue,
  } = useV2Store();

  const [addOpen, setAddOpen] = useState(false);
  const [settleTarget, setSettleTarget] = useState<V2PartyDue | null>(null);

  // Add Due Form
  const [partyName, setPartyName] = useState('');
  const [phone, setPhone] = useState('');
  const [direction, setDirection] = useState<DueDirection>('receivable');
  const [totalRupees, setTotalRupees] = useState('');
  const [dueDate, setDueDate] = useState('2026-11-15');
  const [scope, setScope] = useState<SphereScope>('business');
  const [notes, setNotes] = useState('');

  // Settle Form
  const [settleRupees, setSettleRupees] = useState('');
  const [settleAccountId, setSettleAccountId] = useState(accounts[0]?.id || '');
  const [settleMode, setSettleMode] = useState<'upi' | 'bank' | 'cash'>('upi');
  const [settleRemark, setSettleRemark] = useState('');

  const filteredDues = dues.filter(
    (d) => scopeFilter === 'all' || d.scope === scopeFilter
  );

  const totalReceivablePaise = filteredDues
    .filter((d) => d.direction === 'receivable' && d.status !== 'settled')
    .reduce((sum, d) => sum + Math.max(0, d.total_amount_paise - d.paid_amount_paise), 0);

  const totalPayablePaise = filteredDues
    .filter((d) => d.direction === 'payable' && d.status !== 'settled')
    .reduce((sum, d) => sum + Math.max(0, d.total_amount_paise - d.paid_amount_paise), 0);

  const handleCreateDue = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = rupeesToPaise(totalRupees);
    if (!partyName.trim() || paise <= 0) return;

    await addPartyDue({
      party_name: partyName.trim(),
      phone: phone.trim(),
      party_type: direction === 'receivable' ? 'customer' : 'supplier',
      direction,
      total_amount_paise: paise,
      paid_amount_paise: 0,
      due_date: dueDate,
      scope,
      notes: notes.trim(),
    });

    setPartyName('');
    setPhone('');
    setTotalRupees('');
    setNotes('');
    setAddOpen(false);
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleTarget) return;
    const paise = rupeesToPaise(settleRupees);
    if (paise <= 0) return;

    await settlePartyDue({
      dueId: settleTarget.id,
      payAmountPaise: paise,
      accountId: settleAccountId || accounts[0]?.id,
      paymentMode: settleMode,
      remark: settleRemark.trim(),
    });

    setSettleTarget(null);
    setSettleRupees('');
    setSettleRemark('');
  };

  return (
    <div className="space-y-6">
      {/* Pastel Amber Header */}
      <div className="rounded-2xl border border-amber-200 bg-[#FFFBEB] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Module 04 · Customer Receivables & Supplier Payables
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Dues & Udhar Khata
            </h1>
            <p className="mt-1 text-sm text-slate-700">
              You Get (Receivable):{' '}
              <span className="font-mono font-bold text-emerald-700">
                {formatINRFromPaise(totalReceivablePaise)}
              </span>{' '}
              · You Give (Payable):{' '}
              <span className="font-mono font-bold text-rose-700">
                {formatINRFromPaise(totalPayablePaise)}
              </span>
            </p>
          </div>
          <Button
            variant="default"
            onClick={() => setAddOpen(true)}
            className="gap-2 bg-amber-600 text-white hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" />
            + Record Customer / Supplier Due
          </Button>
        </div>
      </div>

      {/* Dues List */}
      {filteredDues.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <h3 className="text-base font-bold text-slate-900">
            No customer receivables or supplier payables recorded
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Track pending invoices, partial settlements, and due dates across business and personal spheres.
          </p>
          <div className="mt-4 flex justify-center">
            <Button
              onClick={() => setAddOpen(true)}
              className="gap-2 bg-amber-600 text-white hover:bg-amber-700"
            >
              <Plus className="h-4 w-4" />
              <span>Record First Udhar</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredDues.map((due) => {
            const remainingPaise = Math.max(
              0,
              due.total_amount_paise - due.paid_amount_paise
            );
            const isReceivable = due.direction === 'receivable';
            const isSettled = due.status === 'settled' || remainingPaise === 0;

            return (
              <div
                key={due.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {due.party_name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {isReceivable
                          ? 'Customer Receivable (You Get)'
                          : 'Supplier Payable (You Give)'}{' '}
                        · Due: {due.due_date} · {due.scope}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deletePartyDue(due.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-[11px] text-slate-500">Total Bill</p>
                      <p className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                        {formatINRFromPaise(due.total_amount_paise)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">Settled</p>
                      <p className="font-mono text-sm font-semibold tabular-nums text-slate-700">
                        {formatINRFromPaise(due.paid_amount_paise)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-600">
                        Balance Due
                      </p>
                      <p
                        className={`font-mono text-sm font-bold tabular-nums ${
                          isSettled
                            ? 'text-slate-400'
                            : isReceivable
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                        }`}
                      >
                        {formatINRFromPaise(remainingPaise)}
                      </p>
                    </div>
                  </div>

                  {due.notes && (
                    <p className="mt-3 text-xs text-slate-600">{due.notes}</p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Phone className="h-3.5 w-3.5" />
                    {due.phone || 'No phone linked'}
                  </span>

                  {isSettled ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> Fully Settled
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant={isReceivable ? 'emerald' : 'rose'}
                      onClick={() => {
                        setSettleTarget(due);
                        setSettleRupees((remainingPaise / 100).toString());
                      }}
                    >
                      {isReceivable ? 'Receive Payment' : 'Pay Supplier'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Due Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Customer or Supplier Udhar</DialogTitle>
            <DialogDescription>
              Track receivables (You Get) and payables (You Give) with partial or full settlement links.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDue} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('receivable')}
                className={`rounded-xl border py-2.5 text-xs font-bold ${
                  direction === 'receivable'
                    ? 'border-emerald-300 bg-[#ECFDF5] text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                Customer Receivable (You Get)
              </button>
              <button
                type="button"
                onClick={() => setDirection('payable')}
                className={`rounded-xl border py-2.5 text-xs font-bold ${
                  direction === 'payable'
                    ? 'border-rose-300 bg-[#FFF1F2] text-rose-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                Supplier Payable (You Give)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Party / Business Name *
                </label>
                <Input
                  required
                  placeholder="Kalyani Traders"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Phone Number
                </label>
                <Input
                  placeholder="+91 98300 00000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Total Amount (₹) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="15000"
                  value={totalRupees}
                  onChange={(e) => setTotalRupees(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
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
                Invoice / Bill Notes
              </label>
              <Input
                placeholder="Invoice #INV-402 batch supply"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Udhar Record</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Settle Due Modal */}
      <Dialog
        open={Boolean(settleTarget)}
        onOpenChange={(o) => !o && setSettleTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Settle Due · {settleTarget?.party_name}
            </DialogTitle>
            <DialogDescription>
              Automatically posts a double-entry voucher to your ledger and updates the selected bank/cash account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSettleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Settlement Amount (₹) *
              </label>
              <Input
                type="number"
                step="0.01"
                required
                value={settleRupees}
                onChange={(e) => setSettleRupees(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Deposit / Withdraw Account
                </label>
                <select
                  value={settleAccountId}
                  onChange={(e) => setSettleAccountId(e.target.value)}
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
                  Payment Mode
                </label>
                <select
                  value={settleMode}
                  onChange={(e) =>
                    setSettleMode(e.target.value as 'upi' | 'bank' | 'cash')
                  }
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="upi">UPI</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Physical Cash</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Settlement Remark
              </label>
              <Input
                placeholder="UTR / Reference number"
                value={settleRemark}
                onChange={(e) => setSettleRemark(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSettleTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Confirm & Post to Ledger</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
