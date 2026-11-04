'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Plus,
  ShoppingBag,
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
import { CardNetwork, SphereScope, V2CreditCard } from '@/types/v2';

export function CreditCardsModule() {
  const {
    cards,
    accounts,
    scopeFilter,
    addCreditCard,
    recordCardSpend,
    payCardBill,
    deleteCreditCard,
  } = useV2Store();

  const [addOpen, setAddOpen] = useState(false);
  const [spendTarget, setSpendTarget] = useState<V2CreditCard | null>(null);
  const [billTarget, setBillTarget] = useState<V2CreditCard | null>(null);

  // New Card State
  const [cardName, setCardName] = useState('');
  const [bankName, setBankName] = useState('');
  const [last4, setLast4] = useState('');
  const [network, setNetwork] = useState<CardNetwork>('visa');
  const [limitRupees, setLimitRupees] = useState('300000');
  const [utilizedRupees, setUtilizedRupees] = useState('0');
  const [statementDay, setStatementDay] = useState('15');
  const [dueDay, setDueDay] = useState('5');
  const [scope, setScope] = useState<SphereScope>('business');

  // Spend State
  const [spendRupees, setSpendRupees] = useState('');
  const [spendCategory, setSpendCategory] = useState('Cloud & Vendor Purchase');
  const [spendNote, setSpendNote] = useState('');

  // Bill Pay State
  const [billRupees, setBillRupees] = useState('');
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');

  const visibleCards = cards.filter(
    (c) => scopeFilter === 'all' || c.scope === scopeFilter
  );

  const totalLimitPaise = visibleCards.reduce(
    (sum, c) => sum + c.credit_limit_paise,
    0
  );
  const totalUtilizedPaise = visibleCards.reduce(
    (sum, c) => sum + c.utilized_paise,
    0
  );

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim()) return;
    await addCreditCard({
      card_name: cardName.trim(),
      bank_name: bankName.trim() || 'Bank',
      last4: last4.trim() || '8899',
      network,
      credit_limit_paise: rupeesToPaise(limitRupees),
      utilized_paise: rupeesToPaise(utilizedRupees || '0'),
      statement_day: Number(statementDay) || 15,
      due_day: Number(dueDay) || 5,
      scope,
    });
    setCardName('');
    setBankName('');
    setLast4('');
    setAddOpen(false);
  };

  const handleRecordSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spendTarget) return;
    const paise = rupeesToPaise(spendRupees);
    if (paise <= 0) return;
    await recordCardSpend({
      cardId: spendTarget.id,
      amountPaise: paise,
      category: spendCategory,
      note: spendNote,
    });
    setSpendRupees('');
    setSpendNote('');
    setSpendTarget(null);
  };

  const handlePayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billTarget) return;
    const paise = rupeesToPaise(billRupees);
    if (paise <= 0) return;
    await payCardBill({
      cardId: billTarget.id,
      amountPaise: paise,
      fromAccountId: fromAccountId || accounts[0]?.id,
    });
    setBillRupees('');
    setBillTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Pastel Rose Header */}
      <div className="rounded-2xl border border-rose-200 bg-[#FFF1F2] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-800">
              Module 05 · Credit Line Utilization & Statement Cycle
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Credit Cards Portfolio
            </h1>
            <p className="mt-1 text-sm text-slate-700">
              Total Utilized:{' '}
              <span className="font-mono font-bold text-rose-800">
                {formatINRFromPaise(totalUtilizedPaise)}
              </span>{' '}
              of{' '}
              <span className="font-mono font-semibold text-slate-900">
                {formatINRFromPaise(totalLimitPaise)}
              </span>{' '}
              Available Credit Line
            </p>
          </div>
          <Button
            variant="default"
            onClick={() => setAddOpen(true)}
            className="gap-2 bg-rose-700 text-white hover:bg-rose-800"
          >
            <Plus className="h-4 w-4" />
            + Add Credit Card
          </Button>
        </div>
      </div>

      {/* Cards Grid */}
      {visibleCards.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <CreditCard className="mx-auto h-9 w-9 text-rose-600" />
          <h3 className="mt-3 text-base font-bold text-slate-900">
            No credit cards tracked in this sphere yet
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Add your business or personal credit cards to monitor statement dates, credit limits, and utilization ratios.
          </p>
          <div className="mt-4 flex justify-center">
            <Button
              onClick={() => setAddOpen(true)}
              className="gap-2 bg-rose-700 text-white hover:bg-rose-800"
            >
              <Plus className="h-4 w-4" />
              <span>Add First Credit Card</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {visibleCards.map((card) => {
            const utilPct =
              card.credit_limit_paise > 0
                ? Math.min(
                    100,
                    Math.round(
                      (card.utilized_paise / card.credit_limit_paise) * 100
                    )
                  )
                : 0;
            const availablePaise = Math.max(
              0,
              card.credit_limit_paise - card.utilized_paise
            );

            return (
              <div
                key={card.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 bg-[#FFF1F2] text-rose-700">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          {card.card_name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {card.bank_name} · •••• {card.last4} ·{' '}
                          {card.network.toUpperCase()} · {card.scope}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteCreditCard(card.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Utilization Bar (Single-Elevation Hairline Divider) */}
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">
                        Current Statement Utilized
                      </span>
                      <span className="font-mono font-bold tabular-nums text-slate-800">
                        {utilPct}% Utilized
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-rose-800">
                      {formatINRFromPaise(card.utilized_paise)}
                    </p>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          utilPct > 50
                            ? 'bg-rose-600'
                            : utilPct > 25
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                        }`}
                        style={{ width: `${utilPct}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between font-mono text-[11px] tabular-nums text-slate-500">
                      <span>Available: {formatINRFromPaise(availablePaise)}</span>
                      <span>
                        Limit: {formatINRFromPaise(card.credit_limit_paise)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                  <span className="text-xs text-slate-500">
                    Statement: Day {card.statement_day} · Due: Day {card.due_day}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSpendTarget(card)}
                      className="gap-1.5"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>+ Card Spend</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="emerald"
                      disabled={card.utilized_paise <= 0}
                      onClick={() => {
                        setBillTarget(card);
                        setBillRupees((card.utilized_paise / 100).toString());
                      }}
                      className="gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Pay Bill</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Card Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credit Card</DialogTitle>
            <DialogDescription>
              Track credit limits, utilization ratios, statement dates, and bill settlements.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCard} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Card Name *
                </label>
                <Input
                  required
                  placeholder="HDFC Infinia / Regalia"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Issuing Bank
                </label>
                <Input
                  placeholder="HDFC Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Last 4 Digits
                </label>
                <Input
                  maxLength={4}
                  placeholder="8842"
                  value={last4}
                  onChange={(e) => setLast4(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Network
                </label>
                <select
                  value={network}
                  onChange={(e) => setNetwork(e.target.value as CardNetwork)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="visa">Visa</option>
                  <option value="mastercard">Mastercard</option>
                  <option value="rupay">RuPay</option>
                  <option value="amex">Amex</option>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Total Credit Limit (₹)
                </label>
                <Input
                  type="number"
                  value={limitRupees}
                  onChange={(e) => setLimitRupees(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Current Utilized Balance (₹)
                </label>
                <Input
                  type="number"
                  value={utilizedRupees}
                  onChange={(e) => setUtilizedRupees(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Statement Day (1-28)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={statementDay}
                  onChange={(e) => setStatementDay(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Payment Due Day (1-28)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Credit Card</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Spend Modal */}
      <Dialog
        open={Boolean(spendTarget)}
        onOpenChange={(o) => !o && setSpendTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Spend · {spendTarget?.card_name}</DialogTitle>
            <DialogDescription>
              Increases card utilized balance and logs a card spend entry in the ledger.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordSpend} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Purchase Amount (₹) *
              </label>
              <Input
                type="number"
                step="0.01"
                required
                placeholder="3500"
                value={spendRupees}
                onChange={(e) => setSpendRupees(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Category
              </label>
              <Input
                value={spendCategory}
                onChange={(e) => setSpendCategory(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Merchant / Description
              </label>
              <Input
                placeholder="AWS Cloud / Airline Ticket"
                value={spendNote}
                onChange={(e) => setSpendNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSpendTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Record Spend</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay Bill Modal */}
      <Dialog
        open={Boolean(billTarget)}
        onOpenChange={(o) => !o && setBillTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Credit Card Bill · {billTarget?.card_name}</DialogTitle>
            <DialogDescription>
              Deducts payment from your chosen bank account and clears card utilization.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePayBill} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Payment Amount (₹) *
              </label>
              <Input
                type="number"
                step="0.01"
                required
                value={billRupees}
                onChange={(e) => setBillRupees(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Pay From Bank Account
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatINRFromPaise(a.balance_paise)})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBillTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Pay Bill & Update Ledger</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
