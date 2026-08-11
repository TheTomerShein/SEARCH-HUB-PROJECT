import type { SearchCriteria } from '../types/material';

/**
 * Shared URL encode/decode for search criteria + reserved params f/c.
 * Used by Recoil urlSyncEffect and shareable-link builder.
 */

const RESERVED = new Set(['f', 'c']);

function parseCriteriaParam(key: string, v: string): string | boolean | string[] {
  if (key.endsWith('_LOGIC')) return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v.includes(',')) {
    return v.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return v;
}

/** Read criteria from current location (skips f/c). */
export function criteriaFromSearchParams(params: URLSearchParams): SearchCriteria | null {
  const criteria: Record<string, string | boolean | string[]> = {};
  params.forEach((v, k) => {
    if (!RESERVED.has(k)) {
      criteria[k] = parseCriteriaParam(k, v);
    }
  });
  return Object.keys(criteria).length > 0 ? (criteria as SearchCriteria) : null;
}

function isDefaultOnly(criteria: SearchCriteria): boolean {
  return Object.keys(criteria).length === 0;
}

/**
 * Write criteria onto a URL, preserving existing f/c unless overwritten via opts.
 * Clears other query keys first.
 */
export function applyCriteriaToUrl(
  url: URL,
  criteria: SearchCriteria | null | undefined,
  opts?: { preserveFc?: boolean; f?: string | null; c?: string | null },
): URL {
  const preserveFc = opts?.preserveFc !== false;
  const f = opts?.f !== undefined ? opts.f : preserveFc ? url.searchParams.get('f') : null;
  const c = opts?.c !== undefined ? opts.c : preserveFc ? url.searchParams.get('c') : null;

  url.search = '';
  if (f) url.searchParams.set('f', f);
  if (c) url.searchParams.set('c', c);

  if (criteria && !isDefaultOnly(criteria)) {
    Object.entries(criteria).forEach(([k, v]) => {
      if (v != null && v !== '' && (!Array.isArray(v) || v.length > 0)) {
        url.searchParams.set(k, Array.isArray(v) ? v.join(',') : String(v));
      }
    });
  }
  return url;
}
