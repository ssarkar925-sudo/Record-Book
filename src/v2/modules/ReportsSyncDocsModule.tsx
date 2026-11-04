'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileCode2,
  FileText,
  GitBranch,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { useV2Store } from '@/v2/store/useV2Store';
import {
  clearCustomSupabaseConfig,
  getSupabaseV2Client,
  saveCustomSupabaseConfig,
  V2_GITHUB_REPO_URL,
  V2_PRODUCTION_SUPABASE_PUBLISHABLE_KEY,
  V2_PRODUCTION_SUPABASE_URL,
  verifyV2SchemaTablesExist,
} from '@/v2/supabaseClient';
import {
  V2_DOCS_COLLECTION,
  V2_SQL_SCHEMA_CONTENT,
} from '@/v2/docs';
import { formatINRFromPaise } from '@/v2/engine/financialEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ReportsSyncDocsModule() {
  const {
    entries,
    accounts,
    dues,
    cards,
    userEmail,
    syncStatus,
    lastSyncedAt,
    syncError,
    syncNowWithCloud,
    signInWithSupabase,
    signUpWithSupabase,
    signOutSupabase,
    exportFullBackupJson,
    importFullBackupJson,
  } = useV2Store();

  const [activeSubTab, setActiveSubTab] = useState<
    'supabase' | 'docs' | 'reports'
  >('supabase');
  const [selectedDocId, setSelectedDocId] = useState<string>('sql');
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedGit, setCopiedGit] = useState(false);
  const [copiedVercelEnv, setCopiedVercelEnv] = useState(false);

  // Supabase Connection & Schema Verification State
  const supaInfo = getSupabaseV2Client();
  const [customUrl, setCustomUrl] = useState(supaInfo.config.url);
  const [customAnonKey, setCustomAnonKey] = useState(supaInfo.config.anonKey);
  const [schemaCheck, setSchemaCheck] = useState<{
    checking: boolean;
    tablesReady: boolean;
    message: string;
  }>({
    checking: true,
    tablesReady: false,
    message: 'Checking v2_* tables on xelxvojazyscbounzajs.supabase.co...',
  });

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [importText, setImportText] = useState('');

  const runSchemaVerification = async () => {
    setSchemaCheck((prev) => ({ ...prev, checking: true }));
    const res = await verifyV2SchemaTablesExist();
    setSchemaCheck({
      checking: false,
      tablesReady: res.tablesReady,
      message: res.message,
    });
  };

  useEffect(() => {
    void runSchemaVerification();
  }, []);

  // Category Breakdown Aggregation
  const categoryTotals = entries.reduce<
    Record<string, { inPaise: number; outPaise: number }>
  >((acc, e) => {
    if (!acc[e.category]) {
      acc[e.category] = { inPaise: 0, outPaise: 0 };
    }
    if (e.entry_type === 'cash_in') {
      acc[e.category].inPaise += e.amount_paise;
    } else if (e.entry_type !== 'transfer') {
      acc[e.category].outPaise += e.amount_paise;
    }
    return acc;
  }, {});

  const handleSaveCustomSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim() || !customAnonKey.trim()) return;
    saveCustomSupabaseConfig(customUrl.trim(), customAnonKey.trim());
    setAuthMessage(
      `Saved Supabase V2 connection (${customUrl.trim()}). Checking V2 tables...`
    );
    await runSchemaVerification();
    await syncNowWithCloud();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signInWithSupabase(authEmail, authPassword);
    setAuthMessage(
      res.ok
        ? 'Signed in and synchronized with V2 Cloud Workspace!'
        : `Sign-in error: ${res.error}`
    );
  };

  const handleSignUp = async () => {
    const res = await signUpWithSupabase(authEmail, authPassword);
    setAuthMessage(
      res.ok
        ? 'Cloud account created! You can now sign in across Web and Android.'
        : `Sign-up error: ${res.error}`
    );
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(V2_SQL_SCHEMA_CONTENT);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {}
  };

  const gitCommandsText = `git init
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin ${V2_GITHUB_REPO_URL}
git add .
git commit -m "feat: fresh Record Book V2 daylight suite + Supabase V2"
git push -u origin main --force`;

  const vercelEnvText = `NEXT_PUBLIC_SUPABASE_URL=${V2_PRODUCTION_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${V2_PRODUCTION_SUPABASE_PUBLISHABLE_KEY}`;

  const handleCopyGit = async () => {
    try {
      await navigator.clipboard.writeText(gitCommandsText);
      setCopiedGit(true);
      setTimeout(() => setCopiedGit(false), 2500);
    } catch {}
  };

  const handleCopyVercelEnv = async () => {
    try {
      await navigator.clipboard.writeText(vercelEnvText);
      setCopiedVercelEnv(true);
      setTimeout(() => setCopiedVercelEnv(false), 2500);
    } catch {}
  };

  const handleDownloadBackup = () => {
    const json = exportFullBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `record_book_v2_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = () => {
    if (!importText.trim()) return;
    const res = importFullBackupJson(importText);
    setAuthMessage(
      res.ok
        ? 'Successfully restored V2 JSON backup!'
        : `Restore failed: ${res.error}`
    );
    if (res.ok) setImportText('');
  };

  const activeDoc =
    V2_DOCS_COLLECTION.find((d) => d.id === selectedDocId) ||
    V2_DOCS_COLLECTION[0];

  return (
    <div className="space-y-6">
      {/* Pastel Header */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-[#EEF2FF] via-[#EFF6FF] to-[#ECFDF5] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-800">
              Module 09 · GitHub + Supabase V2 + Vercel Production Command
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Cloud Sync, GitHub & Vercel Hub
            </h1>
            <p className="mt-1 text-sm text-slate-700">
              Connected to{' '}
              <span className="font-mono font-semibold text-indigo-900">
                xelxvojazyscbounzajs.supabase.co
              </span>{' '}
              &{' '}
              <span className="font-mono font-semibold text-slate-900">
                ssarkar925-sudo/Record-Book
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'supabase', label: 'Supabase V2 + GitHub + Vercel', icon: Cloud },
                { id: 'docs', label: 'PRD, Design & V2 SQL Docs', icon: FileText },
                { id: 'reports', label: 'Financial Reports & Backup', icon: Database },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${
                    activeSubTab === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TAB 1: SUPABASE V2 + GITHUB + VERCEL HUB */}
      {activeSubTab === 'supabase' && (
        <div className="space-y-6">
          {/* Step 1: Supabase V2 Schema Status Banner */}
          <div
            className={`rounded-2xl border p-6 ${
              schemaCheck.tablesReady
                ? 'border-emerald-200 bg-[#ECFDF5]'
                : 'border-amber-200 bg-[#FFFBEB]'
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      schemaCheck.tablesReady ? 'bg-emerald-600' : 'bg-amber-600'
                    }`}
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {schemaCheck.tablesReady
                      ? 'Supabase V2 Database Tables Ready'
                      : 'Step 1 Required: Run V2 SQL Schema in New Supabase Project'}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {schemaCheck.message}
                </p>
                <p className="mt-1 font-mono text-xs text-slate-600">
                  Endpoint: {V2_PRODUCTION_SUPABASE_URL}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant="amber"
                  onClick={handleCopySql}
                  className="gap-1.5 border border-amber-300 bg-white text-amber-950"
                >
                  <Copy className="h-4 w-4" />
                  {copiedSql ? 'Copied V2 SQL Script!' : '1. Copy V2 SQL Script'}
                </Button>
                <a
                  href="https://supabase.com/dashboard/project/xelxvojazyscbounzajs/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800"
                >
                  <span>2. Open Supabase SQL Editor</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <Button
                  variant="outline"
                  onClick={runSchemaVerification}
                  className="gap-1.5 bg-white"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${
                      schemaCheck.checking ? 'animate-spin' : ''
                    }`}
                  />
                  Verify Tables
                </Button>
              </div>
            </div>
          </div>

          {/* 2-Column Grid: Supabase Credentials + Cloud Auth */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Active Supabase V2 Project
                </h2>
                <span className="font-mono text-xs font-semibold text-emerald-700">
                  Pre-Configured ✓
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Bound directly to your new Supabase project (`xelxvojazyscbounzajs`).
              </p>

              <form onSubmit={handleSaveCustomSupabase} className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Supabase Project URL
                  </label>
                  <Input
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Supabase Publishable / Anon Key
                  </label>
                  <Input
                    value={customAnonKey}
                    onChange={(e) => setCustomAnonKey(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit">Save & Re-Verify</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      clearCustomSupabaseConfig();
                      setCustomUrl(V2_PRODUCTION_SUPABASE_URL);
                      setCustomAnonKey(V2_PRODUCTION_SUPABASE_PUBLISHABLE_KEY);
                      setAuthMessage(
                        'Reset to default V2 production credentials (xelxvojazyscbounzajs).'
                      );
                    }}
                  >
                    Reset to Default V2
                  </Button>
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Multi-Device Cloud Account (Web + Android)
                </h2>
                <span className="font-mono text-xs font-semibold text-indigo-700">
                  {syncStatus.toUpperCase()}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Sign in with the same email on Web and Android for real-time auto-sync.
              </p>

              {userEmail ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-emerald-200 bg-[#ECFDF5] p-4">
                    <p className="text-xs font-semibold text-emerald-900">
                      Signed in as: <span className="font-bold">{userEmail}</span>
                    </p>
                    <p className="mt-1 text-xs text-emerald-800">
                      Last reconciled: {lastSyncedAt || 'Just now'} · Realtime WebSocket active.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="emerald"
                      onClick={() => syncNowWithCloud()}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reconcile All Devices Now
                    </Button>
                    <Button variant="outline" onClick={() => signOutSupabase()}>
                      Sign Out
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSignIn} className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="ssarkar925@gmail.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit">Sign In & Sync V2</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSignUp}
                    >
                      Create Cloud Account
                    </Button>
                  </div>
                </form>
              )}

              {(authMessage || syncError) && (
                <div className="mt-4 rounded-xl border border-indigo-200 bg-[#EEF2FF] p-3 text-xs font-medium text-indigo-950">
                  {authMessage || syncError}
                </div>
              )}
            </div>
          </div>

          {/* GitHub & Vercel Deployment Cards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    New GitHub Repository Push Commands
                  </h3>
                </div>
                <Button size="sm" variant="outline" onClick={handleCopyGit} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  {copiedGit ? 'Copied!' : 'Copy Git Commands'}
                </Button>
              </div>
              <p className="mt-1 font-mono text-xs text-indigo-700">
                {V2_GITHUB_REPO_URL}
              </p>
              <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-mono text-xs text-slate-800">
                {gitCommandsText}
              </pre>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  New Vercel Project Environment Variables
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyVercelEnv}
                  className="gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedVercelEnv ? 'Copied!' : 'Copy Vercel Env'}
                </Button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Import <code className="font-mono text-slate-800">ssarkar925-sudo/Record-Book</code> on Vercel and paste these variables:
              </p>
              <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-mono text-xs text-slate-800">
                {vercelEnvText}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRD, DESIGN SYSTEM, ARCHITECTURE & V2 SQL SCHEMA */}
      {activeSubTab === 'docs' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-2.5 lg:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Engineering Specifications
              </p>
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectedDocId('sql')}
                  className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                    selectedDocId === 'sql'
                      ? 'border-emerald-300 bg-[#ECFDF5] text-emerald-950'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-xs font-bold">
                    Runnable PostgreSQL V2 Schema
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-emerald-700">
                    /supabase_schema_v2.sql
                  </p>
                </button>
                {V2_DOCS_COLLECTION.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                      selectedDocId === doc.id
                        ? 'border-indigo-300 bg-[#EEF2FF] text-indigo-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold">{doc.title}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                      {doc.fileName}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-8">
            {selectedDocId === 'sql' ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Fresh V2 PostgreSQL + Supabase RLS Schema
                    </h2>
                    <p className="text-xs text-slate-500">
                      Paste this in Supabase SQL Editor (`xelxvojazyscbounzajs`) and click Run.
                    </p>
                  </div>
                  <Button size="sm" variant="emerald" onClick={handleCopySql} className="gap-1.5">
                    <Copy className="h-3.5 w-3.5" />
                    {copiedSql ? 'Copied SQL!' : 'Copy V2 SQL Script'}
                  </Button>
                </div>
                <pre className="mt-4 max-h-[520px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800">
                  {V2_SQL_SCHEMA_CONTENT}
                </pre>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {activeDoc.title}
                    </h2>
                    <p className="font-mono text-xs text-indigo-600">
                      {activeDoc.fileName}
                    </p>
                  </div>
                  <FileCode2 className="h-5 w-5 text-indigo-600" />
                </div>
                <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-5 font-sans text-sm leading-relaxed text-slate-800">
                  {activeDoc.content}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FINANCIAL CATEGORY REPORTS & FULL JSON BACKUP */}
      {activeSubTab === 'reports' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-7">
            <h2 className="text-base font-bold text-slate-900">
              Category-Wise Cash Flow Statement
            </h2>
            <p className="text-xs text-slate-500">
              Aggregated from {entries.length} ledger vouchers, {accounts.length} accounts, {dues.length} dues, and {cards.length} cards.
            </p>
            <div className="mt-4 divide-y divide-slate-100">
              {Object.entries(categoryTotals).map(([cat, vals]) => (
                <div
                  key={cat}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span className="font-semibold text-slate-800">{cat}</span>
                  <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
                    {vals.inPaise > 0 && (
                      <span className="font-bold text-emerald-700">
                        +{formatINRFromPaise(vals.inPaise)}
                      </span>
                    )}
                    {vals.outPaise > 0 && (
                      <span className="font-bold text-rose-700">
                        -{formatINRFromPaise(vals.outPaise)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-5">
            <h2 className="text-base font-bold text-slate-900">
              Full V2 Workspace Snapshot Backup
            </h2>
            <p className="text-xs text-slate-500">
              Export or restore all 9 modules (Accounts, Ledger, Dues, Cards, Sheets, Notes, Vault) as a portable JSON file.
            </p>
            <Button
              variant="emerald"
              onClick={handleDownloadBackup}
              className="w-full gap-2"
            >
              <Download className="h-4 w-4" />
              Download Full V2 JSON Backup
            </Button>

            <div className="border-t border-slate-100 pt-4">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Paste V2 Backup JSON to Restore
              </label>
              <textarea
                rows={4}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='{"version": "2.0.0", "accounts": [...]}'
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900"
              />
              <Button
                variant="outline"
                onClick={handleRestoreBackup}
                className="mt-2 w-full gap-2"
              >
                <Upload className="h-4 w-4" />
                Restore From JSON Snapshot
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
