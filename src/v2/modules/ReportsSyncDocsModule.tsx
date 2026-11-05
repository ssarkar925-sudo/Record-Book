'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Download,
  Eye,
  EyeOff,
  FileBarChart2,
  KeyRound,
  Lock,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react';
import { useV2Store } from '../store/useV2Store';
import {
  computeOverviewMetrics,
  formatINRFromPaise,
} from '../engine/financialEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ReportsSyncDocsModule() {
  const {
    accounts,
    entries,
    dues,
    cards,
    notes,
    sheets,
    vaultItems,
    scopeFilter,
    userEmail,
    syncStatus,
    lastSyncedAt,
    privacyMasked,
    appPinHash,
    securityAuditLog,
    togglePrivacyMask,
    setAppSecurityPin,
    removeAppSecurityPin,
    lockApp,
    logSecurityEvent,
    syncNowWithCloud,
    signInWithSupabase,
    signUpWithSupabase,
    signOutSupabase,
    exportFullBackupJson,
    importFullBackupJson,
    loadSampleWorkspaceData,
    clearAllWorkspaceData,
  } = useV2Store();

  const [activeTab, setActiveTab] = useState<'pnl' | 'security' | 'backup'>(
    'pnl'
  );

  // Security PIN Configuration State
  const [pinInput, setPinInput] = useState('');
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  // Cloud Account Sign-In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Backup Import State
  const [importJsonText, setImportJsonText] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

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

  // Category-wise P&L breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { cashIn: number; cashOut: number }>();
    for (const tx of entries) {
      if (scopeFilter !== 'all' && tx.scope !== scopeFilter) continue;
      if (tx.entry_type === 'transfer') continue;
      const cur = map.get(tx.category) || { cashIn: 0, cashOut: 0 };
      if (tx.entry_type === 'cash_in') {
        cur.cashIn += tx.amount_paise;
      } else {
        cur.cashOut += tx.amount_paise;
      }
      map.set(tx.category, cur);
    }
    return Array.from(map.entries()).map(([category, vals]) => ({
      category,
      ...vals,
      net: vals.cashIn - vals.cashOut,
    }));
  }, [entries, scopeFilter]);

  const handleSaveSecurityPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pinInput.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length !== 4) {
      setPinMessage('Please enter a 4-digit numeric PIN.');
      return;
    }
    setAppSecurityPin(cleaned);
    setPinInput('');
    setPinMessage('4-Digit App Security PIN activated.');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthMessage(null);
    const res =
      authMode === 'signin'
        ? await signInWithSupabase(email, password)
        : await signUpWithSupabase(email, password);
    setAuthBusy(false);

    if (!res.ok) {
      setAuthMessage(res.error || 'Authentication failed');
    } else {
      setAuthMessage(
        authMode === 'signin'
          ? 'Signed in and synchronized your cloud workspace.'
          : 'Account created and cloud backup enabled.'
      );
      setPassword('');
    }
  };

  const handleDownloadJsonBackup = () => {
    const raw = exportFullBackupJson();
    logSecurityEvent(
      'Encrypted Backup Exported',
      'Downloaded full JSON workspace backup'
    );
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `record-book-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPnlCsv = () => {
    const headers = ['Category', 'Cash_In_INR', 'Outflow_INR', 'Net_Position_INR'];
    const rows = categoryBreakdown.map((r) => [
      `"${r.category.replace(/"/g, '""')}"`,
      (r.cashIn / 100).toFixed(2),
      (r.cashOut / 100).toFixed(2),
      (r.net / 100).toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `record-book-pnl-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const netOperatingSurplus =
    metrics.totalIncomePaise - metrics.totalExpensePaise;

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-900">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            Statements, Security & Backup
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
            Reports, Security & Cloud Backup
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Inspect Profit & Loss statements, configure your 4-digit App Lock PIN, audit security events, and manage backups.
          </p>
        </div>

        {/* 3-Tab Switcher */}
        <div className="flex shrink-0 items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1 whitespace-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('pnl')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              activeTab === 'pnl'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileBarChart2 className="h-3.5 w-3.5 text-indigo-600" />
            <span>P&L Statements</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              activeTab === 'security'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Security & Privacy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              activeTab === 'backup'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cloud className="h-3.5 w-3.5 text-sky-600" />
            <span>Cloud & Backup</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FINANCIAL P&L REPORTS */}
      {activeTab === 'pnl' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-[#ECFDF5] to-white p-5 shadow-2xs">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Gross Cash Inflow
              </p>
              <p className="mt-2 font-mono text-2xl font-extrabold text-emerald-950">
                {formatINRFromPaise(metrics.totalIncomePaise, {
                  masked: privacyMasked,
                })}
              </p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-[#FFF1F2] to-white p-5 shadow-2xs">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-900">
                Total Outflow & Spend
              </p>
              <p className="mt-2 font-mono text-2xl font-extrabold text-rose-950">
                {formatINRFromPaise(metrics.totalExpensePaise, {
                  masked: privacyMasked,
                })}
              </p>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-[#EFF6FF] to-white p-5 shadow-2xs">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-900">
                Net Operating Surplus
              </p>
              <p
                className={`mt-2 font-mono text-2xl font-extrabold ${
                  netOperatingSurplus >= 0
                    ? 'text-emerald-800'
                    : 'text-rose-800'
                }`}
              >
                {formatINRFromPaise(netOperatingSurplus, {
                  showSign: true,
                  masked: privacyMasked,
                })}
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-[#EEF2FF] to-white p-5 shadow-2xs">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Closing Net Worth
              </p>
              <p className="mt-2 font-mono text-2xl font-extrabold text-slate-900">
                {formatINRFromPaise(metrics.netWorthPaise, {
                  masked: privacyMasked,
                })}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Category-Wise Profit & Loss Statement
                </h2>
                <p className="text-xs text-slate-500">
                  Aggregated inflows and outflows across all recorded vouchers
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPnlCsv}
                disabled={categoryBreakdown.length === 0}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export Statement CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3 text-right">Cash Inflow (₹)</th>
                    <th className="px-5 py-3 text-right">Outflow / Spend (₹)</th>
                    <th className="px-5 py-3 text-right">Net Impact (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryBreakdown.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-8 text-center text-xs text-slate-500"
                      >
                        No category entries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    categoryBreakdown.map((row) => (
                      <tr key={row.category} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {row.category}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-emerald-700">
                          {formatINRFromPaise(row.cashIn, {
                            masked: privacyMasked,
                          })}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-rose-700">
                          {formatINRFromPaise(row.cashOut, {
                            masked: privacyMasked,
                          })}
                        </td>
                        <td
                          className={`px-5 py-3 text-right font-mono font-bold ${
                            row.net >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {formatINRFromPaise(row.net, {
                            showSign: true,
                            masked: privacyMasked,
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SECURITY & PRIVACY CENTER */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left 6 Columns: 4-Digit App PIN Lock & Privacy Masking */}
          <div className="space-y-6 lg:col-span-6">
            {/* 4-Digit App Security Lock Card */}
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-[#EEF2FF] to-white p-6 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-200 bg-white text-indigo-700 shadow-2xs">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      4-Digit Workspace Security PIN
                    </h2>
                    <p className="text-xs text-slate-600">
                      {appPinHash
                        ? 'Status: Active — Your workspace can be locked anytime with 1 click.'
                        : 'Status: Not Set — Configure a 4-digit PIN to enable instant screen lock.'}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                    appPinHash
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {appPinHash ? 'PIN Active' : 'Optional'}
                </span>
              </div>

              <form onSubmit={handleSaveSecurityPin} className="mt-5 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    {appPinHash
                      ? 'Update 4-Digit Security PIN'
                      : 'Create 4-Digit Security PIN'}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="Enter 4 digits (e.g. 4829)"
                      value={pinInput}
                      onChange={(e) =>
                        setPinInput(
                          e.target.value.replace(/\D/g, '').slice(0, 4)
                        )
                      }
                      className="bg-white font-mono tracking-widest"
                    />
                    <Button
                      type="submit"
                      disabled={pinInput.replace(/\D/g, '').length !== 4}
                    >
                      {appPinHash ? 'Update PIN' : 'Enable PIN'}
                    </Button>
                  </div>
                </div>

                {pinMessage && (
                  <p className="text-xs font-semibold text-emerald-800">
                    {pinMessage}
                  </p>
                )}

                {appPinHash && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button
                      type="button"
                      variant="emerald"
                      size="sm"
                      onClick={lockApp}
                    >
                      <Lock className="mr-1.5 h-3.5 w-3.5" />
                      Lock Workspace Now
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        removeAppSecurityPin();
                        setPinMessage('App Security PIN removed.');
                      }}
                    >
                      <Unlock className="mr-1.5 h-3.5 w-3.5" />
                      Disable PIN Lock
                    </Button>
                  </div>
                )}
              </form>
            </div>

            {/* Privacy Stealth Mode & Zero-Knowledge Encryption Summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
              <h3 className="text-base font-bold text-slate-900">
                Screen Privacy & Data Protection Controls
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Built-in safeguards when operating your Record Book in public or shared spaces.
              </p>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Public Screen Balance Masking (₹ ••••••)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Hides all account balances, net worth, and voucher amounts across every screen.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={privacyMasked ? 'amber' : 'outline'}
                    onClick={togglePrivacyMask}
                  >
                    {privacyMasked ? (
                      <>
                        <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                        Masked (Show ₹)
                      </>
                    ) : (
                      <>
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Mask Balances
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-[#ECFDF5]/60 p-4">
                  <div>
                    <p className="text-xs font-bold text-emerald-950">
                      AES-256-GCM Password & PIN Vault
                    </p>
                    <p className="text-[11px] text-emerald-900/80">
                      {vaultItems.length} encrypted credentials · PBKDF2 100,000-iteration key derivation
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-2xs">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right 6 Columns: Security Activity Audit Log */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs lg:col-span-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Security Activity Audit Log
                </h2>
                <p className="text-xs text-slate-500">
                  Chronological record of security locks, vault decryptions, and account reconciliations
                </p>
              </div>
              <ShieldAlert className="h-5 w-5 text-indigo-600" />
            </div>

            {securityAuditLog.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <p className="text-xs font-semibold text-slate-700">
                  No security events logged in this session yet
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Events appear automatically when you toggle Privacy Stealth, configure your PIN, unlock Vault items, or export backups.
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
                {securityAuditLog.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{evt.action}</p>
                      <p className="text-[11px] text-slate-600">{evt.detail}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-slate-500">
                      {new Date(evt.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CLOUD ACCOUNT & DATA BACKUP */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Multi-Device Cloud Account Sync */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Multi-Device Cloud Account
                </h2>
                <p className="text-xs text-slate-500">
                  Sign in with your email and password to keep your books synchronized across Web and Mobile.
                </p>
              </div>
              <Cloud className="h-5 w-5 text-indigo-600" />
            </div>

            {userEmail ? (
              <div className="mt-5 space-y-4 rounded-xl border border-emerald-200 bg-[#ECFDF5] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Connected Account
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {userEmail}
                    </p>
                    <p className="text-xs text-slate-600">
                      Status: {syncStatus.toUpperCase()}
                      {lastSyncedAt ? ` · Last synced ${lastSyncedAt}` : ''}
                    </p>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="emerald"
                    onClick={() => void syncNowWithCloud()}
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Sync Now
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void signOutSupabase()}
                  >
                    <LogOut className="mr-1.5 h-3.5 w-3.5" />
                    Sign Out
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className={`rounded-xl border py-2 text-xs font-bold ${
                      authMode === 'signin'
                        ? 'border-indigo-300 bg-[#EEF2FF] text-indigo-950'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className={`rounded-xl border py-2 text-xs font-bold ${
                      authMode === 'signup'
                        ? 'border-indigo-300 bg-[#EEF2FF] text-indigo-950'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                <Input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  type="password"
                  required
                  placeholder="Account password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {authMessage && (
                  <p className="rounded-lg bg-slate-100 p-2.5 text-xs font-medium text-slate-800">
                    {authMessage}
                  </p>
                )}

                <Button type="submit" disabled={authBusy} className="w-full">
                  {authBusy
                    ? 'Connecting...'
                    : authMode === 'signin'
                      ? 'Sign In & Sync Workspace'
                      : 'Create Cloud Account'}
                </Button>
              </form>
            )}
          </div>

          {/* Local JSON Backup Export, Restore & Workspace Utilities */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900">
              Data Backup & Workspace Utilities
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Export a complete offline backup file (`JSON`) of your accounts, cashbook, dues, cards, notes, and registers.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleDownloadJsonBackup}>
                <Download className="mr-1.5 h-4 w-4" />
                Download Backup (.json)
              </Button>
              <Button
                variant="outline"
                onClick={() => void loadSampleWorkspaceData()}
                className="border-indigo-200 bg-[#EEF2FF]/60 text-indigo-900 hover:bg-indigo-100"
              >
                <Sparkles className="mr-1.5 h-4 w-4 text-indigo-700" />
                Load Sample Business Data
              </Button>
              <Button
                variant="outline"
                onClick={() => void clearAllWorkspaceData()}
                className="border-rose-200 bg-[#FFF1F2]/60 text-rose-900 hover:bg-rose-100"
              >
                <Trash2 className="mr-1.5 h-4 w-4 text-rose-700" />
                Reset Workspace to ₹0
              </Button>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Restore Workspace from Backup JSON
              </label>
              <textarea
                rows={4}
                placeholder='Paste exported backup JSON here...'
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
              {importFeedback && (
                <p className="mt-1 text-xs font-medium text-indigo-700">
                  {importFeedback}
                </p>
              )}
              <Button
                size="sm"
                className="mt-2"
                onClick={() => {
                  const res = importFullBackupJson(importJsonText);
                  if (res.ok) {
                    logSecurityEvent(
                      'Workspace Backup Restored',
                      'Restored workspace records from JSON backup'
                    );
                  }
                  setImportFeedback(
                    res.ok
                      ? 'Backup restored successfully.'
                      : res.error || 'Invalid backup file'
                  );
                }}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Restore Backup
              </Button>
            </div>

            {/* Workspace Inventory Summary */}
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-center text-xs">
              <div>
                <p className="font-mono font-bold text-slate-900">
                  {accounts.length}
                </p>
                <p className="text-[11px] text-slate-500">Accounts</p>
              </div>
              <div>
                <p className="font-mono font-bold text-slate-900">
                  {entries.length}
                </p>
                <p className="text-[11px] text-slate-500">Transactions</p>
              </div>
              <div>
                <p className="font-mono font-bold text-slate-900">
                  {dues.length + cards.length + notes.length + sheets.length}
                </p>
                <p className="text-[11px] text-slate-500">Records & Notes</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
