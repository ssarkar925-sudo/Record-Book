'use client';

import React, { useState } from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useV2Store } from '@/v2/store/useV2Store';
import {
  decryptVaultSecret,
  encryptVaultSecret,
  generateStrongSecret,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SphereScope, V2VaultItem, VaultCategory } from '@/types/v2';

export function EncryptedVaultModule() {
  const { vaultItems, scopeFilter, addVaultItem, deleteVaultItem } = useV2Store();

  const [masterPin, setMasterPin] = useState('1234');
  const [addOpen, setAddOpen] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [decryptErrors, setDecryptErrors] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Secret Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<VaultCategory>('login');
  const [username, setUsername] = useState('');
  const [plainSecret, setPlainSecret] = useState('');
  const [scope, setScope] = useState<SphereScope>('business');
  const [notes, setNotes] = useState('');

  const visibleVault = vaultItems.filter(
    (v) => scopeFilter === 'all' || v.scope === scopeFilter
  );

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !plainSecret.trim() || !masterPin.trim()) return;

    const encrypted = await encryptVaultSecret(plainSecret.trim(), masterPin.trim());
    await addVaultItem({
      title: title.trim(),
      category,
      username: username.trim(),
      cipher_text: encrypted.cipher_text,
      iv: encrypted.iv,
      salt: encrypted.salt,
      notes: notes.trim(),
      scope,
    });

    setTitle('');
    setUsername('');
    setPlainSecret('');
    setNotes('');
    setAddOpen(false);
  };

  const handleToggleReveal = async (item: V2VaultItem) => {
    if (revealedSecrets[item.id]) {
      setRevealedSecrets((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      return;
    }

    try {
      const clearText = await decryptVaultSecret(
        item.cipher_text,
        item.iv,
        item.salt,
        masterPin.trim()
      );
      setRevealedSecrets((prev) => ({ ...prev, [item.id]: clearText }));
      setDecryptErrors((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch {
      setDecryptErrors((prev) => ({
        ...prev,
        [item.id]: 'Incorrect Master Passphrase / PIN',
      }));
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Pastel Lavender Header */}
      <div className="rounded-2xl border border-indigo-200 bg-[#EEF2FF] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-800">
              Module 08 · Client-Side WebCrypto PBKDF2 + AES-GCM 256-Bit
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Zero-Knowledge Encrypted Vault
            </h1>
            <p className="mt-1 text-sm text-slate-700">
              Banking passwords, corporate GST portal credentials & card PINs are encrypted in browser memory before storage.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-1.5">
              <KeyRound className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-semibold text-slate-600">
                Active Master PIN:
              </span>
              <input
                type="password"
                value={masterPin}
                onChange={(e) => {
                  setMasterPin(e.target.value);
                  setRevealedSecrets({});
                }}
                className="w-24 rounded border border-slate-200 px-2 py-1 font-mono text-xs text-slate-900"
                placeholder="Master PIN"
              />
            </div>
            <Button
              variant="default"
              onClick={() => setAddOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              + Encrypt New Secret
            </Button>
          </div>
        </div>
      </div>

      {/* Vault Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visibleVault.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <ShieldCheck className="mx-auto h-9 w-9 text-indigo-600" />
            <h3 className="mt-3 text-base font-bold text-slate-900">
              Your AES-256 Encrypted Vault is Ready
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Click &quot;+ Encrypt New Secret&quot; to store banking logins, GST portal passwords, or card PINs using your Master PIN.
            </p>
          </div>
        ) : (
          visibleVault.map((item) => {
            const revealed = revealedSecrets[item.id];
            const err = decryptErrors[item.id];
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-200 bg-[#EEF2FF] text-indigo-700">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {item.category.toUpperCase()} · {item.scope.toUpperCase()}
                          {item.username ? ` · ID: ${item.username}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteVaultItem(item.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {revealed ? 'Decrypted Plaintext' : 'AES-GCM Ciphertext'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleReveal(item)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {revealed ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5" /> Hide
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5" /> Decrypt
                            </>
                          )}
                        </button>
                        {revealed && (
                          <button
                            type="button"
                            onClick={() => handleCopy(item.id, revealed)}
                            className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-[#EEF2FF] px-2.5 py-1 text-xs font-semibold text-indigo-800"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {copiedId === item.id ? 'Copied!' : 'Copy'}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 truncate font-mono text-sm font-bold text-slate-900">
                      {revealed ? revealed : `•••••••••••••••• (${item.cipher_text.slice(0, 18)}...)`}
                    </p>
                    {err && (
                      <p className="mt-1 text-xs font-semibold text-rose-600">
                        {err}
                      </p>
                    )}
                  </div>
                </div>

                {item.notes && (
                  <p className="mt-3 text-xs text-slate-500">{item.notes}</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Encrypt New Secret Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encrypt Credential in AES-256 Vault</DialogTitle>
            <DialogDescription>
              Encrypted locally using WebCrypto PBKDF2 (100,000 iterations) with your active Master PIN ({masterPin}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSecret} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Credential Title *
              </label>
              <Input
                required
                placeholder="HDFC NetBanking Corporate Login"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as VaultCategory)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="login">Portal Login</option>
                  <option value="bank_pin">Bank / Transaction PIN</option>
                  <option value="card_pin">Credit / Debit Card PIN</option>
                  <option value="secret_note">Private Key / Recovery Phrase</option>
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
                Username / Customer ID
              </label>
              <Input
                placeholder="CUST884920"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Secret Password / PIN *
                </label>
                <button
                  type="button"
                  onClick={() => setPlainSecret(generateStrongSecret(16))}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  <RefreshCw className="h-3 w-3" /> Generate Strong Secret
                </button>
              </div>
              <Input
                required
                placeholder="Enter secret to encrypt..."
                value={plainSecret}
                onChange={(e) => setPlainSecret(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Notes
              </label>
              <Input
                placeholder="Rotated quarterly"
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
              <Button type="submit">Encrypt & Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
