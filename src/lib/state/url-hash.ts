import type { InputValues } from '@/lib/engine';

function base64UrlEncode(s: string): string {
  return Buffer.from(s, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64').toString('utf-8');
}

export function encodeInputs(inputs: InputValues): string {
  return base64UrlEncode(JSON.stringify(inputs));
}

export function decodeInputs(hash: string): InputValues {
  if (!hash) return {};
  try {
    const parsed = JSON.parse(base64UrlDecode(hash));
    return typeof parsed === 'object' && parsed !== null ? (parsed as InputValues) : {};
  } catch {
    return {};
  }
}
