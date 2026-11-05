'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { useV2Store } from '../store/useV2Store';
import { formatINRFromPaise, rupeesToPaise } from '../engine/financialEngine';
import { CardNetwork, SphereScope } from '@/types/v2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DaylightKpiCard } from '@/components/ui/DaylightKpiCard';
import { toast } from '@/components/ui/toastStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function CreditCardsModule() {
  const {
    cards,
    accounts,
    scopeFilter,
    privacyMasked,
    addCreditCard,
    recordCardSpend,
    payCardBill,
    deleteCreditCard,
  } = useV2Store();

  const [addOpen, setAddOpen] = useState(false);
  const [spendCardId, setSpendCardId] = useState<string | null>(null);
  const [billCardId, setBillCardId] = useState<string | null>(null);

  // Add Card State
  const [cardName, setCardName] = useState('');
  const [bankName, setBankName] = useState('');
  const [last4, setLast4] = useState('');
  const [network, setNetwork] = useState<CardNetwork>('visa');
  const [limitRupees, setLimitRupees] = useState('');
  const [utilizedRupees, setUtilizedRupees] = useState('0');
  const [statementDay, setStatementDay] = useState('18');
  const [dueDay, setDueDay] = useState('5');
  const [scope, setScope] = useState<SphereScope>('business');

  // Spend State
  const [spendRupees, setSpendRupees] = useState('');
  const [spendCategory, setSpendCategory] = useState('Business Procurement');
  const [spendNote, setSpendNote] = useState('');

  // Bill Pay State
  const [billRupees, setBillRupees] = useState('');
  const [billFromAccountId, setBillFromAccountId] = useState(
    accounts[0]?.id || ''
  );

  const visibleCards = cards.filter((c) =>
    scopeFilter === 'all' ? true : c.scope === scopeFilter
  );

  const totalLimitPaise = visibleCards.reduce(
    (s, c) => s + c.credit_limit_paise,
    0
  );
  const totalUtilizedPaise = visibleCards.reduce(
    (s, c) => s + c.utilized_paise,
    0
  );
  const totalAvailablePaise = Math.max(0, totalLimitPaise - totalUtilizedPaise);
  const overallUtilPct =
    totalLimitPaise > 0
      ? Math.round((totalUtilizedPaise / totalLimitPaise) * 100)
      : 0;

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim()) return;
    await addCreditCard({
      card_name: cardName.trim(),
      bank_name: bankName.trim() || 'Bank Card',
      last4: last4.trim() || '0000',
      network,
      credit_limit_paise: rupeesToPaise(limitRupees || '100000'),
      utilized_paise: rupeesToPaise(utilizedRupees || '0'),
      statement_day: Number(statementDay) || 18,
      due_day: Number(dueDay) || 5,
      scope,
    });
    setCardName('');
    setBankName('');
    setLast4('');
    setLimitRupees('');
    setUtilizedRupees('0');
    setAddOpen(false);
    toast.success('Credit Card Added', `${cardName.trim()} registered`);
  };

  const handleSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spendCardId) return;
    const paise = rupeesToPaise(spendRupees);
    if (paise <= 0) return;

    await recordCardSpend({
      cardId: spendCardId,
      amountPaise: paise,
      category: spendCategory.trim(),
      note: spendNote.trim(),
    });
    setSpendCardId(null);
    setSpendRupees('');
    setSpendNote('');
    toast.success(
      'Card Spend Recorded',
      `₹${Number(spendRupees).toLocaleString('en-IN')} added to outstanding bill`
    );
  };

  const handlePayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billCardId) return;
    const paise = rupeesToPaise(billRupees);
    if (paise <= 0) return;

    await payCardBill({
      cardId: billCardId,
      amountPaise: paise,
      fromAccountId: billFromAccountId || accounts[0]?.id || '',
    });
    setBillCardId(null);
    setBillRupees('');
    toast.success(
      'Card Bill Paid',
      `₹${Number(billRupees).toLocaleString('en-IN')} paid from bank account`
    );
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-[#FFF1F2] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-900">
            Credit Lines & Statement Cycles
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
            Credit Cards & Utilization
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Monitor credit limits, statement billing dates, and settle monthly card bills directly from your bank accounts.
          </p>
        </div>

        <Button variant="rose" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Credit Card
        </Button>
      </div>

      {/* 3-Card Daylight KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DaylightKpiCard
          title="Current Card Liabilities"
          paise={totalUtilizedPaise}
          icon={CreditCard}
          accent="rose"
          badgeText={`${overallUtilPct}% Used`}
          badgeVariant={overallUtilPct > 70 ? 'danger' : overallUtilPct > 30 ? 'warning' : 'neutral'}
          subtitle={`Across ${visibleCards.length} credit lines`}
          ratioBar={{
            primaryPct: overallUtilPct,
            primaryLabel: 'Utilization Ratio',
            secondaryLabel: overallUtilPct > 70 ? 'High Debt' : 'Healthy Guardrail',
          }}
        />

        <DaylightKpiCard
          title="Available Credit Headroom"
          paise={totalAvailablePaise}
          icon={CreditCard}
          accent="emerald"
          badgeText="Spending Power"
          badgeVariant="success"
          subtitle="Unutilized sanctioned credit"
        />

        <DaylightKpiCard
          title="Total Sanctioned Limit"
          paise={totalLimitPaise}
          icon={CreditCard}
          accent="indigo"
          badgeText={`${visibleCards.length} Cards`}
          subtitle="Combined bank credit lines"
        />
      </div>

      {/* Cards Grid */}
      {visibleCards.length === 0 ? (
        <div className="glass-card rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-rose-500" />
          <h2 className="mt-3 text-base font-bold text-slate-900">
            No credit cards configured
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Add your business or personal credit cards to track statement dates, utilization ratio, and bill settlements.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {visibleCards.map((card) => {
            const avail = Math.max(
              0,
              card.credit_limit_paise - card.utilized_paise
            );
            const ratio =
              card.credit_limit_paise > 0
                ? Math.min(
                    100,
                    Math.round(
                      (card.utilized_paise / card.credit_limit_paise) * 100
                    )
                  )
                : 0;
            const healthLabel =
              ratio <= 30
                ? 'Optimal (<30%)'
                : ratio <= 65
                  ? 'Moderate'
                  : 'High Utilization';

            return (
              <div
                key={card.id}
                className="glass-card glass-card-hover flex flex-col justify-between border border-slate-200/80 border-t-2 border-t-rose-500/80 p-6 shadow-2xs transition-all hover:border-rose-300/80"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border border-rose-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-900">
                          {card.network}
                        </span>
                        <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-600">
                          {card.scope}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            ratio <= 30
                              ? 'bg-emerald-100 text-emerald-900'
                              : ratio <= 65
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {healthLabel}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-bold text-slate-900">
                        {card.card_name}
                      </h3>
                      <p className="font-mono text-xs text-slate-600">
                        {card.bank_name} · •••• •••• •••• {card.last4}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteCreditCard(card.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-600"
                      title="Delete Card"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Utilization Bar */}
                  <div className="mt-5">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        Utilized:{' '}
                        <strong className="font-mono text-rose-800">
                          {formatINRFromPaise(card.utilized_paise, {
                            masked: privacyMasked,
                          })}
                        </strong>{' '}
                        ({ratio}%)
                      </span>
                      <span className="font-mono text-slate-600">
                        Available:{' '}
                        {formatINRFromPaise(avail, { masked: privacyMasked })}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ratio > 70
                            ? 'bg-rose-500'
                            : ratio > 30
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-rose-200/60 pt-4">
                  <div className="text-xs text-slate-600">
                    Statement:{' '}
                    <strong className="text-slate-800">
                      Day {card.statement_day}
                    </strong>{' '}
                    · Due:{' '}
                    <strong className="text-rose-800">
                      Day {card.due_day}
                    </strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSpendCardId(card.id);
                        setSpendRupees('');
                      }}
                    >
                      <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
                      Record Spend
                    </Button>
                    <Button
                      size="sm"
                      variant="emerald"
                      disabled={card.utilized_paise <= 0}
                      onClick={() => {
                        setBillCardId(card.id);
                        setBillRupees(String(card.utilized_paise / 100));
                        setBillFromAccountId(accounts[0]?.id || '');
                      }}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Pay Bill
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
              Configure credit limit, statement day, and due day.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCard} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Card Name *
                </label>
                <Input
                  required
                  placeholder="e.g. HDFC Infinia / ICICI Amazon Pay"
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
                  placeholder="4821"
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
                  Total Credit Limit (₹) *
                </label>
                <Input
                  type="number"
                  required
                  placeholder="300000"
                  value={limitRupees}
                  onChange={(e) => setLimitRupees(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Current Unbilled / Utilized (₹)
                </label>
                <Input
                  type="number"
                  placeholder="0"
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="rose">
                Save Credit Card
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Card Spend Modal */}
      <Dialog
        open={Boolean(spendCardId)}
        onOpenChange={(o) => !o && setSpendCardId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Credit Card Spend</DialogTitle>
            <DialogDescription>
              Increases card utilization and logs the purchase in your Cashbook.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSpend} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Purchase Amount (₹) *
              </label>
              <Input
                type="number"
                step="0.01"
                required
                placeholder="4500"
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
                Merchant / Note
              </label>
              <Input
                placeholder="AWS Cloud / Flight Ticket / Vendor Supplies"
                value={spendNote}
                onChange={(e) => setSpendNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSpendCardId(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="rose">
                Record Spend
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay Card Bill Modal */}
      <Dialog
        open={Boolean(billCardId)}
        onOpenChange={(o) => !o && setBillCardId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle Credit Card Statement Bill</DialogTitle>
            <DialogDescription>
              Debits your selected bank account and restores your card credit limit.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePayBill} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Bill Payment Amount (₹) *
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
                value={billFromAccountId}
                onChange={(e) => setBillFromAccountId(e.target.value)}
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
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBillCardId(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="emerald">
                Pay Bill Now
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
