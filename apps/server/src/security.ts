import { createHash, randomBytes, randomUUID } from 'node:crypto';

export function createAccessKey(): string {
  return `qm_${randomBytes(24).toString('base64url')}`;
}

export function hashAccessKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll('-', '')}`;
}

export function createSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'meeting';
  return `${base}-${randomBytes(3).toString('hex')}`;
}
