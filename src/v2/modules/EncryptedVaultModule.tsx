'use client';

import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useV2Store } from '../store/useV2StoreEdge';
import { evaluateSecretStrength } from '../engine/financialEngine';
import { SphereScope, V2VaultItem } from '@/types/v2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { toast } from '@/components/ui/toastStore';
import { PremiumModal } from '@/components/ui/PremiumModal';

async function deriveVaultKey(passphrase: string, saltHex: string) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  const saltBytes = new Uint8Array(
    saltHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || [1, 2, 3, 4]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((b) => parseInt(b, 16)));
}

export function EncryptedVaultModule() {
  const {
    vaultItems,
    scopeFilter,
    addVaultItem,
    deleteVaultItem,
    logSecurityEvent,
  } = useV2Store();

  const [masterPin, setMasterPin] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | V2VaultItem['category']
  >('all');
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});
  const [decryptErrors, setDecryptErrors] = useState<Record<string, string>>(
    {}
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<V2VaultItem['category']>('bank_pin');
  const [usernameHint, setUsernameHint] = useState('');
  const [secretPlaintext, setSecretPlaintext] = useState('');
  const [scope, setScope] = useState<SphereScope>('personal');

  // Auto-clear decrypted secrets after 15 seconds for security
  useEffect(() => {
    const keys = Object.keys(decryptedMap);
    if (keys.length === 0) return;
    const timer = setTimeout(() => {
      setDecryptedMap({});
    }, 15000);
    return () => clearTimeout(timer);
  }, [decryptedMap]);

  const visibleVault = vaultItems
    .filter((v) => (scopeFilter === 'all' ? true : v.scope === scopeFilter))
    .filter((v) =>
      categoryFilter === 'all' ? true : v.category === categoryFilter
    );

  const strength = evaluateSecretStrength(secretPlaintext);

  const generateStrongSecret = () => {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    const arr = new Uint32Array(16);
    window.crypto.getRandomValues(arr);
    const out = Array.from(arr, (n) => chars[n % chars.length]).join('');
    setSecretPlaintext(out);
  };

  const handleEncryptAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !secretPlaintext.trim() || !masterPin.trim()) return;

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const saltHex = bytesToHex(salt);
    const ivHex = bytesToHex(iv);

    const key = await deriveVaultKey(masterPin, saltHex);
    const encoded = new TextEncoder().encode(secretPlaintext);
    const cipherBuf = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    const ciphertextHex = bytesToHex(new Uint8Array(cipherBuf));

    await addVaultItem({
      title: title.trim(),
      category,
      username: usernameHint.trim(),
      cipher_text: ciphertextHex,
      iv: ivHex,
      salt: saltHex,
      scope,
    });

    logSecurityEvent(
      'Vault Secret Encrypted',
      `Stored ${title.trim()} (${category.replace('_', ' ')})`
    );
    toast.success('Credential Encrypted', `${title.trim()} secured with AES-256`);

    setTitle('');
    setUsernameHint('');
    setSecretPlaintext('');
    setAddOpen(false);
  };

  const handleToggleDecrypt = async (item: V2VaultItem) => {
    if (decryptedMap[item.id]) {
      const copy = { ...decryptedMap };
      delete copy[item.id];
      setDecryptedMap(copy);
      return;
    }

    if (!masterPin.trim()) {
      setDecryptErrors((prev) => ({
        ...prev,
        [item.id]: 'Enter your Master Passphrase above first.',
      }));
      toast.warning('Passphrase Required', 'Enter your Session Master Passphrase');
      return;
    }

    try {
      const key = await deriveVaultKey(masterPin, item.salt);
      const iv = hexToBytes(item.iv);
      const cipherBytes = hexToBytes(item.cipher_text);
      const plainBuf = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        key,
        cipherBytes as BufferSource
      );
      const plainText = new TextDecoder().decode(plainBuf);
      setDecryptedMap((prev) => ({ ...prev, [item.id]: plainText }));
      setDecryptErrors((prev) => ({ ...prev, [item.id]: '' }));
      logSecurityEvent(
        'Vault Secret Decrypted',
        `Revealed ${item.title} (auto-hides in 15s)`
      );
      toast.info('Secret Revealed', `${item.title} visible (auto-hides in 15s)`);
    } catch {
      setDecryptErrors((prev) => ({
        ...prev,
        [item.id]: 'Incorrect Master Passphrase for this item.',
      }));
      logSecurityEvent(
        'Failed Vault Decryption',
        `Incorrect passphrase attempt for ${item.title}`
      );
      toast.error('Decryption Failed', 'Incorrect Master Passphrase');
    }
  };

  const handleCopySecret = (id: string, val: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(val);
      setCopiedId(id);
      toast.info('Copied to Clipboard', 'Confidential secret copied');
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-indigo-800">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-700" />
            AES-256 Zero-Knowledge Security
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
            Password & PIN Vault
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Your netbanking passwords, corporate card PINs, and recovery keys are encrypted on your device before saving.
          </p>
        </div>

        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Encrypt New Credential
        </Button>
      </div>

      {/* Master Passphrase Bar */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-[#EEF2FF] to-white p-5 shadow-2xs">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-white text-indigo-700 shadow-2xs">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Session Master Passphrase
              </h2>
              <p className="text-xs text-slate-600">
                Required in-memory to encrypt new secrets or unlock existing vault items. Revealed secrets auto-hide after 15 seconds.
              </p>
            </div>
          </div>

          <div className="w-full md:w-80">
            <Input
              type="password"
              placeholder="Enter Session Master Passphrase..."
              value={masterPin}
              onChange={(e) => setMasterPin(e.target.value)}
              className="bg-white"
            />
          </div>
        </div>
      </div>

      {/* Category Filter Segmented Control */}
      <div className="flex flex-wrap items-center gap-1.5">
        <SegmentedControl<'all' | V2VaultItem['category']>
          options={[
            { id: 'all', label: 'All', count: vaultItems.length },
            { id: 'bank_pin', label: 'Bank & UPI PINs' },
            { id: 'card_pin', label: 'Card PINs' },
            { id: 'login', label: 'Portal Logins' },
            { id: 'secret_note', label: 'Recovery Keys' },
          ]}
          value={categoryFilter}
          onChange={(val) => setCategoryFilter(val)}
          layoutId="vault-category-segmented"
          size="sm"
        />
      </div>

      {/* Vault Cards Grid */}
      {visibleVault.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Lock className="mx-auto h-8 w-8 text-indigo-500" />
          <p className="mt-2 text-sm font-bold text-slate-800">
            No encrypted credentials in this category
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Enter a Session Master Passphrase above and click &ldquo;Encrypt New Credential&rdquo; to store sensitive PINs or passwords.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleVault.map((item) => {
            const revealed = decryptedMap[item.id];
            const err = decryptErrors[item.id];
            return (
              <div
                key={item.id}
                className="glass-card glass-card-hover flex flex-col justify-between border border-slate-200/80 border-t-2 border-t-indigo-500/80 p-5 shadow-2xs transition-all hover:border-indigo-300"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-md border border-indigo-200 bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-900">
                        {item.category.replace('_', ' ')}
                      </span>
                      <h3 className="mt-2 text-base font-bold text-slate-900">
                        {item.title}
                      </h3>
                      {item.username && (
                        <p className="text-xs text-slate-500">
                          ID / Hint: {item.username}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteVaultItem(item.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Delete Vault Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs">
                    {revealed ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-emerald-800 break-all">
                          {revealed}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopySecret(item.id, revealed)}
                          className="shrink-0 rounded-md border border-emerald-200 bg-white px-2 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-50"
                        >
                          {copiedId === item.id ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400">
                        AES-256 •••• {item.cipher_text.slice(0, 14)}…
                      </span>
                    )}
                  </div>

                  {err && (
                    <p className="mt-1.5 text-xs font-medium text-rose-600">
                      {err}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[11px] font-medium capitalize text-slate-500">
                    {revealed ? 'Auto-hides in 15s' : `Sphere: ${item.scope}`}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleDecrypt(item)}
                  >
                    {revealed ? (
                      <>
                        <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                        Hide Secret
                      </>
                    ) : (
                      <>
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Unlock & View
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Encrypted Secret Modal - Premium */}
      <PremiumModal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Encrypt & Store Credential"
        description="Encrypted locally in your browser using AES-256-GCM before storage."
        size="md"
        variant="dialog"
      >
        <form onSubmit={handleEncryptAndSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Master Passphrase (Used to Encrypt) *
            </label>
            <Input
              type="password"
              required
              placeholder="Enter Master Passphrase..."
              value={masterPin}
              onChange={(e) => setMasterPin(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Credential Title *
              </label>
              <Input
                required
                placeholder="e.g. HDFC Corporate NetBanking"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                <option value="bank_pin">Bank / UPI PIN</option>
                <option value="card_pin">Credit / Debit Card PIN</option>
                <option value="login">Portal Login Password</option>
                <option value="secret_note">Recovery Seed / Key</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Username / Customer ID Hint
              </label>
              <Input
                placeholder="e.g. Cust ID: 884120"
                value={usernameHint}
                onChange={(e) => setUsernameHint(e.target.value)}
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
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Secret PIN / Password *
              </label>
              <button
                type="button"
                onClick={generateStrongSecret}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline"
              >
                <Sparkles className="h-3 w-3" />
                Generate Strong Key
              </button>
            </div>
            <Input
              type="password"
              required
              placeholder="Plaintext secret to encrypt..."
              value={secretPlaintext}
              onChange={(e) => setSecretPlaintext(e.target.value)}
            />
            {secretPlaintext && (
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Encryption Strength:</span>
                <span
                  className={`font-bold ${
                    strength.color === 'emerald'
                      ? 'text-emerald-700'
                      : strength.color === 'sky'
                        ? 'text-sky-700'
                        : strength.color === 'amber'
                          ? 'text-amber-700'
                          : 'text-rose-700'
                  }`}
                >
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              <Lock className="mr-1.5 h-3.5 w-3.5" />
              Encrypt & Save
            </Button>
          </div>
        </form>
      </PremiumModal>
    </div>
  );
}
