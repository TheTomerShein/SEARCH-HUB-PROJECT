import type { SearchCriteria } from '../types/material';

/** Deep stable JSON for criteria equality (key order / array-safe). */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export function criteriaFingerprint(c: SearchCriteria | undefined | null): string {
  if (!c) return '';
  try {
    return stableStringify(c);
  } catch {
    return '';
  }
}

export function isEmptyCriteria(c: SearchCriteria | undefined | null): boolean {
  if (!c) return true;
  return Object.keys(c).length === 0;
}
