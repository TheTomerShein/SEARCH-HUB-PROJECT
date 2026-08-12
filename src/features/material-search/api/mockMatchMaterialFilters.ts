import { Material, SearchFilterClause } from '../types/material';

/**
 * Resolve the material property a filter clause targets.
 * Range UI fields ERSDA_START / ERSDA_END → material.ERSDA.
 */
function materialValue(m: Material, fieldName: string): unknown {
  const name = (fieldName ?? '').trim();
  const upper = name.toUpperCase();
  const rec = m as unknown as Record<string, unknown>;

  if (upper.endsWith('_START') || upper.endsWith('_END')) {
    const base = name.replace(/_START$/i, '').replace(/_END$/i, '');
    return rec[base] ?? rec[base.toUpperCase()];
  }

  if (upper === 'WERKS') return m.WERKS;

  if (rec[name] !== undefined) return rec[name];
  if (rec[upper] !== undefined) return rec[upper];
  for (const k of Object.keys(rec)) {
    if (k.toUpperCase() === upper) return rec[k];
  }
  return undefined;
}

function asString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

function normDate(v: string): string {
  return v.replace(/-/g, '');
}

/** SAP-style CP: *foo*, foo*, *foo, or plain contains. */
function matchCp(haystack: string, pattern: string): boolean {
  const h = haystack.toLowerCase();
  const p = pattern.trim().toLowerCase();
  if (!p) return true;
  if (p.endsWith('*') && p.startsWith('*') && p.length > 1) {
    return h.includes(p.slice(1, -1));
  }
  if (p.endsWith('*')) return h.startsWith(p.slice(0, -1));
  if (p.startsWith('*')) return h.endsWith(p.slice(1));
  return h.includes(p);
}

/**
 * Evaluate one SearchFilterClause against a domain Material (mock / in-memory).
 * Same operators produced by buildSearchRequest.
 */
function matchFilterClause(m: Material, clause: SearchFilterClause): boolean {
  const op = (clause.operator ?? 'EQ').toUpperCase();
  const values = clause.values ?? [];
  const raw = materialValue(m, clause.field_name);

  if (op === 'OR' || op === 'AND') {
    // Plant multi-match
    const plants = Array.isArray(raw) ? raw.map(String) : raw != null ? [String(raw)] : [];
    if (values.length === 0) return true;
    if (op === 'OR') return values.some((v) => plants.includes(v));
    return values.every((v) => plants.includes(v));
  }

  if (op === 'IN') {
    if (values.length === 0) return true;
    if (Array.isArray(raw)) {
      return raw.some((v) => values.includes(String(v)));
    }
    return values.includes(asString(raw));
  }

  if (op === 'GE' || op === 'LE') {
    if (values.length === 0 || raw == null || raw === '') return true;
    const left = normDate(asString(raw));
    const right = normDate(values[0]);
    return op === 'GE' ? left >= right : left <= right;
  }

  if (op === 'CP') {
    if (values.length === 0) return true;
    const hay = asString(raw);
    // MAKTX often should also match LONG_TEXT
    if (clause.field_name.toUpperCase() === 'MAKTX') {
      const long = asString(m.LONG_TEXT);
      return values.some((p) => matchCp(hay, p) || matchCp(long, p));
    }
    return values.some((p) => matchCp(hay, p));
  }

  // EQ (default) — boolean-ish + string
  if (values.length === 0) return true;
  if (typeof raw === 'boolean') {
    const wantTrue = values.some((v) => v === 'true' || v === 'X' || v === '1');
    const wantFalse = values.some((v) => v === 'false' || v === '' || v === '0');
    if (wantTrue && raw) return true;
    if (wantFalse && !raw) return true;
    return values.includes(asString(raw));
  }
  return values.includes(asString(raw));
}

/**
 * Mock-only: evaluate filter clauses against an in-memory Material row.
 * All clauses must match (AND).
 */
export function mockMatchesMaterialFilters(m: Material, filters: SearchFilterClause[]): boolean {
  for (const clause of filters) {
    if (!matchFilterClause(m, clause)) return false;
  }
  return true;
}
