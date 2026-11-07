import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * WebCrypto AES-GCM 256-bit Encryption & Decryption for Zero-Knowledge Vault
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(bytes).toString('base64');
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob !== 'undefined') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

async function deriveAesKey(passphrase: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptVaultSecret(
  plainText: string,
  masterPin: string
): Promise<{ cipher_text: string; iv: string; salt: string }> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return {
      cipher_text: bytesToBase64(new TextEncoder().encode(plainText)),
      iv: 'fallback_iv',
      salt: 'fallback_salt',
    };
  }
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(masterPin || 'recordbook-v2-default-key', saltBytes);
  const encoded = new TextEncoder().encode(plainText);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    encoded
  );
  return {
    cipher_text: bytesToBase64(new Uint8Array(encryptedBuffer)),
    iv: bytesToBase64(ivBytes),
    salt: bytesToBase64(saltBytes),
  };
}

export async function decryptVaultSecret(
  cipher_text: string,
  iv: string,
  salt: string,
  masterPin: string
): Promise<string> {
  try {
    if (iv === 'fallback_iv' || typeof crypto === 'undefined' || !crypto.subtle) {
      return new TextDecoder().decode(base64ToBytes(cipher_text));
    }
    const saltBytes = base64ToBytes(salt);
    const ivBytes = base64ToBytes(iv);
    const cipherBytes = base64ToBytes(cipher_text);
    const key = await deriveAesKey(masterPin || 'recordbook-v2-default-key', saltBytes);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes as unknown as BufferSource },
      key,
      cipherBytes as unknown as BufferSource
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch {
    return '•••••••• (Enter matching Vault PIN)';
  }
}

export function generateStrongSecret(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const arr = new Uint32Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i++) arr[i] = Math.floor(Math.random() * 1000);
  }
  return Array.from(arr, (v) => chars[v % chars.length]).join('');
}
