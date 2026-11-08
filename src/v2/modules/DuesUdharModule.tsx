'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  HandCoins,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useV2Store } from '../store/useV2StoreEdge';
import { formatINRFromPaise, rupeesToPaise } from '../engine/financialEngine';
import { DueDirection, SphereScope, V2PartyDue } from '@/types/v2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DaylightKpiCard } from '@/components/ui/DaylightKpiCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { toast } from '@/components/ui/toastStore';
import { PremiumModal } from '@/components/ui/PremiumModal';

export function DuesUdharModule() {
  const {
    dues,
    accounts,
    scopeFilter,
    privacyMasked,
    addPartyDue,
    settlePartyDue,
    deletePartyDue,
  } = useV2Store();

  const [addOpen, setAddOpen] = useState(false);
  const [settleTargetId, setSettleTargetId] = useState<string | null>(null);
  const [tabFilter, setTabFilter] = useState<
    'all' | 'receivable' | 'payable' | 'settled'
  >('all');
  const [partySearch, setPartySearch] = useState('');

  // Add Due Form
  const [partyName, setPartyName] = useState('');
  const [phone, setPhone] = useState('');
  const [partyType, setPartyType] = useState<V2PartyDue['party_type']>('customer');
  const [direction, setDirection] = useState<DueDirection>('receivable');
  const [totalRupees, setTotalRupees] = useState('');
  const [paidRupees, setPaidRupees] = useState('0');
  const [dueDate, setDueDate] = useState('2026-11-15');
  const [scope, setScope] = useState<SphereScope>('business');
  const [notes, setNotes] = useState('');

  // Settle Modal Form
  const [payRupees, setPayRupees] = useState('');
  const [payAccountId, setPayAccountId] = useState(accounts[0]?.id || '');
  const [payMode, setPayMode] = useState<'upi' | 'bank' | 'cash'>('upi');
  const [payRemark, setPayRemark] = useState('');

  const scopeDues = useMemo(
    () =>
      dues.filter((d) =>
        scopeFilter === 'all' ? true : d.scope === scopeFilter
      ),
    [dues, scopeFilter]
  );

  const visibleDues = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    return scopeDues
      .filter((d) => {
        if (tabFilter === 'settled') return d.status === 'settled';
        if (tabFilter === 'receivable')
          return d.direction === 'receivable' && d.status !== 'settled';
        if (tabFilter === 'payable')
          return d.direction === 'payable' && d.status !== 'settled';
        return true;
      })
      .filter((d) =>
        !q
          ? true
          : d.party_name.toLowerCase().includes(q) ||
            (d.phone || '').toLowerCase().includes(q) ||
            (d.notes || '').toLowerCase().includes(q)
      );
  }, [scopeDues, tabFilter, partySearch]);

  const receivableTotal = scopeDues
    .filter((d) => d.direction === 'receivable' && d.status !== 'settled')
    .reduce(
      (s, d) => s + Math.max(0, d.total_amount_paise - d.paid_amount_paise),
      0
    );

  const payableTotal = scopeDues
    .filter((d) => d.direction === 'payable' && d.status !== 'settled')
    .reduce(
      (s, d) => s + Math.max(0, d.total_amount_paise - d.paid_amount_paise),
      0
    );

  const netPosition = receivableTotal - payableTotal;

  const handleCreateDue = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalPaise = rupeesToPaise(totalRupees);
    const paidPaise = rupeesToPaise(paidRupees || '0');
    if (!partyName.trim() || totalPaise <= 0) return;

    await addPartyDue({
      party_name: partyName.trim(),
      phone: phone.trim(),
      party_type: partyType,
      direction,
      total_amount_paise: totalPaise,
      paid_amount_paise: Math.min(totalPaise, paidPaise),
      due_date: dueDate,
      scope,
      notes: notes.trim(),
    });

    setPartyName('');
    setPhone('');
    setTotalRupees('');
    setPaidRupees('0');
    setNotes('');
    setAddOpen(false);
    toast.success(
      direction === 'receivable' ? 'Customer Due Added' : 'Supplier Bill Added',
      `${partyName.trim()} saved`
    );
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleTargetId) return;
    const paise = rupeesToPaise(payRupees);
    if (paise <= 0) return;

    await settlePartyDue({
      dueId: settleTargetId,
      payAmountPaise: paise,
      accountId: payAccountId || accounts[0]?.id,
      paymentMode: payMode,
      remark: payRemark.trim(),
    });

    setSettleTargetId(null);
    setPayRupees('');
    setPayRemark('');
    toast.success('Payment Settled', `₹${Number(payRupees).toLocaleString('en-IN')} updated`);
  };

  const targetDue = dues.find((d) => d.id === settleTargetId);

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-[#FFFBEB] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-900">
            Party Khata & Credit Ledger
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
            Customer & Supplier Dues (Udhar)
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Track pending customer collections and supplier bills with partial or full settlement directly to your bank or cash account.
          </p>
        </div>

        <Button variant="amber" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Party Due / Udhar
        </Button>
      </div>

      {/* 3-Card Daylight KPI Summary Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DaylightKpiCard
          title="To Collect (Receivables)"
          paise={receivableTotal}
          icon={HandCoins}
          accent="amber"
          badgeText={`${dues.filter((d) => d.direction === 'receivable' && d.status !== 'settled').length} Pending`}
          badgeVariant="warning"
          subtitle="Customer market credit (Udhar)"
        />

        <DaylightKpiCard
          title="To Pay (Vendor Payables)"
          paise={payableTotal}
          icon={HandCoins}
          accent="rose"
          badgeText={`${dues.filter((d) => d.direction === 'payable' && d.status !== 'settled').length} Bills`}
          badgeVariant="danger"
          subtitle="Vendor credit & supplier dues"
        />

        <DaylightKpiCard
          title="Net Credit Position"
          paise={Math.abs(netPosition)}
          icon={HandCoins}
          accent={netPosition >= 0 ? 'emerald' : 'rose'}
          badgeText={netPosition >= 0 ? 'Net Receivable' : 'Net Payable'}
          badgeVariant={netPosition >= 0 ? 'success' : 'danger'}
          subtitle={netPosition >= 0 ? 'Customers owe you more than you owe' : 'Payables exceed receivables'}
        />
      </div>

      {/* Filter Tabs + Party Search */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs backdrop-blur-sm sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          <SegmentedControl<'all' | 'receivable' | 'payable' | 'settled'>
            options={[
              { id: 'all', label: 'All Parties', count: dues.length },
              {
                id: 'receivable',
                label: 'To Receive',
                count: dues.filter((d) => d.direction === 'receivable' && d.status !== 'settled').length,
              },
              {
                id: 'payable',
                label: 'To Pay',
                count: dues.filter((d) => d.direction === 'payable' && d.status !== 'settled').length,
              },
              {
                id: 'settled',
                label: 'Settled',
                count: dues.filter((d) => d.status === 'settled').length,
              },
            ]}
            value={tabFilter}
            onChange={(val) => setTabFilter(val)}
            layoutId="dues-filter-segmented"
            size="sm"
          />
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search party name or phone..."
            value={partySearch}
            onChange={(e) => setPartySearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Party Cards Grid */}
      {visibleDues.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <HandCoins className="mx-auto h-8 w-8 text-amber-600" />
          <h2 className="mt-3 text-base font-bold text-slate-900">
            No party records in this view
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Record customer credit (Udhar) or supplier invoices to track due dates and partial payments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visibleDues.map((due) => {
            const remaining = Math.max(
              0,
              due.total_amount_paise - due.paid_amount_paise
            );
            const paidPct =
              due.total_amount_paise > 0
                ? Math.min(
                    100,
                    Math.round(
                      (due.paid_amount_paise / due.total_amount_paise) * 100
                    )
                  )
                : 0;
            const isReceivable = due.direction === 'receivable';

            return (
              <div
                key={due.id}
                className={`glass-card glass-card-hover flex flex-col justify-between p-5 border shadow-2xs transition-all ${
                  due.status === 'settled'
                    ? 'border-emerald-200/90 border-t-2 border-t-emerald-500 bg-emerald-50/20'
                    : isReceivable
                      ? 'border-slate-200/80 border-t-2 border-t-amber-500 hover:border-amber-300'
                      : 'border-slate-200/80 border-t-2 border-t-rose-500 hover:border-rose-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {due.party_name}
                        </h3>
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                          {due.party_type}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                            due.status === 'settled'
                              ? 'bg-emerald-100 text-emerald-800'
                              : isReceivable
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {due.status === 'settled'
                            ? 'Settled'
                            : isReceivable
                              ? 'To Receive'
                              : 'To Pay'}
                        </span>
                      </div>

                      {due.phone && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Phone className="h-3 w-3" /> {due.phone}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => deletePartyDue(due.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Delete Party Record"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Collection Progress Bar */}
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>Settlement Progress ({paidPct}%)</span>
                      <span>
                        Due: {new Date(due.due_date).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          due.status === 'settled'
                            ? 'bg-emerald-500'
                            : isReceivable
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                        }`}
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-slate-400">
                      Remaining Balance
                    </p>
                    <p className="font-mono text-xl font-extrabold tabular-nums text-slate-900">
                      {formatINRFromPaise(remaining, { masked: privacyMasked })}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Total: {formatINRFromPaise(due.total_amount_paise, { masked: privacyMasked })} · Settled: {formatINRFromPaise(due.paid_amount_paise, { masked: privacyMasked })}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {due.phone && isReceivable && remaining > 0 && (() => {
                      const cleanPhone = due.phone.replace(/\D/g, '').replace(/^91/, '');
                      return (
                        <a
                          href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                            `Namaste ${due.party_name}, this is a gentle reminder regarding your pending balance of ${formatINRFromPaise(
                              remaining
                            )} in Record Book. Thank you!`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                          title="Send WhatsApp Payment Reminder"
                        >
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      );
                    })()}

                    {remaining > 0 ? (
                      <Button
                        size="sm"
                        variant={isReceivable ? 'emerald' : 'default'}
                        onClick={() => {
                          setSettleTargetId(due.id);
                          setPayRupees(String(remaining / 100));
                          setPayAccountId(accounts[0]?.id || '');
                        }}
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        {isReceivable ? 'Receive' : 'Pay Bill'}
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Fully Settled
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Due Modal - Premium */}
      <PremiumModal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="New Party Credit / Udhar Entry"
        description="Record a customer receivable or supplier payable invoice."
        size="md"
        variant="dialog"
      >
        <form onSubmit={handleCreateDue} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setDirection('receivable');
                setPartyType('customer');
              }}
              className={`rounded-xl border py-2 text-xs font-bold ${
                direction === 'receivable'
                  ? 'border-amber-300 bg-[#FFFBEB] text-amber-950'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              To Receive (Customer Udhar)
            </button>
            <button
              type="button"
              onClick={() => {
                setDirection('payable');
                setPartyType('supplier');
              }}
              className={`rounded-xl border py-2 text-xs font-bold ${
                direction === 'payable'
                  ? 'border-rose-300 bg-[#FFF1F2] text-rose-950'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              To Pay (Supplier Bill)
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Party / Business Name *
              </label>
              <Input
                required
                placeholder="e.g. Sharma Wholesale Mart"
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Total Invoice Amount (₹) *
              </label>
              <Input
                type="number"
                step="0.01"
                required
                placeholder="25000"
                value={totalRupees}
                onChange={(e) => setTotalRupees(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Advance Paid (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={paidRupees}
                onChange={(e) => setPaidRupees(e.target.value)}
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
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Invoice Reference / Notes
            </label>
            <Input
              placeholder="Invoice #INV-104 or dispatch note..."
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
            <Button type="submit" variant="amber">
              Save Party Record
            </Button>
          </div>
        </form>
      </PremiumModal>

      {/* Settle Due Modal - Premium */}
      <PremiumModal
        open={Boolean(settleTargetId)}
        onOpenChange={(o) => !o && setSettleTargetId(null)}
        title={`Settle Balance — ${targetDue?.party_name}`}
        description="Posts a corresponding Cashbook entry and updates your selected bank or cash account."
        size="md"
        variant="dialog"
      >
        <form onSubmit={handleSettle} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Settlement Amount (₹) *
            </label>
            <Input
              type="number"
              step="0.01"
              required
              value={payRupees}
              onChange={(e) => setPayRupees(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Payment Mode
              </label>
              <select
                value={payMode}
                onChange={(e) => setPayMode(e.target.value as any)}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                <option value="upi">UPI</option>
                <option value="bank">Bank Transfer</option>
                <option value="cash">Physical Cash</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Deposit / Debit Account
              </label>
              <select
                value={payAccountId}
                onChange={(e) => setPayAccountId(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Settlement Remark
            </label>
            <Input
              placeholder="UTR / UPI reference or receipt note..."
              value={payRemark}
              onChange={(e) => setPayRemark(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSettleTargetId(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="emerald">
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Confirm Settlement
            </Button>
          </div>
        </form>
      </PremiumModal>
    </div>
  );
}
