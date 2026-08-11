import type { Material } from './domain';

/** Stable UI identity — unique when same fieldName exists on multiple tables. */
export function fieldKey(field: { tableName: string; fieldName: string }): string {
  const table = (field.tableName ?? '').trim() || '_';
  const name = (field.fieldName ?? '').trim() || '_';
  return `${table}-${name}`;
}

/**
 * Search-result property name from backend:
 *   tableName lowercase + fieldName with first letter upper, rest lower.
 *   e.g. MARA + MATNR → maraMatnr
 */
export function apiResultPropName(tableName: string, fieldName: string): string {
  const table = (tableName ?? '').trim().toLowerCase();
  const name = (fieldName ?? '').trim();
  if (!name) return table;
  return `${table}${name.charAt(0).toUpperCase()}${name.slice(1).toLowerCase()}`;
}

/**
 * Read a field from a search-result row.
 * Prefers API camelCase (maraMatnr); falls back to bare fieldName (mock / normalized).
 */
type RowLike = Record<string, unknown> | Material | null | undefined;

function asRec(row: RowLike): Record<string, unknown> | null {
  if (!row) return null;
  return row as unknown as Record<string, unknown>;
}

export function getRowFieldValue(
  row: RowLike,
  field: { tableName: string; fieldName: string },
): unknown {
  const rec = asRec(row);
  if (!rec) return undefined;
  const apiKey = apiResultPropName(field.tableName, field.fieldName);
  if (Object.prototype.hasOwnProperty.call(rec, apiKey) && rec[apiKey] !== undefined) {
    return rec[apiKey];
  }
  const bare = field.fieldName;
  if (Object.prototype.hasOwnProperty.call(rec, bare) && rec[bare] !== undefined) {
    return rec[bare];
  }
  const upper = bare.toUpperCase();
  for (const k of Object.keys(rec)) {
    if (k.toUpperCase() === upper) return rec[k];
  }
  return undefined;
}

export function getRowMatnr(
  row: RowLike,
  matnrField?: { tableName: string; fieldName: string } | null,
): string {
  const rec = asRec(row);
  if (!rec) return '';
  if (matnrField) {
    const v = getRowFieldValue(rec, matnrField);
    if (v != null && String(v) !== '') return String(v);
  }
  const v =
    rec.MATNR ??
    rec.maraMatnr ??
    rec.matnr ??
    getRowFieldValue(rec, { tableName: 'MARA', fieldName: 'MATNR' });
  return v != null ? String(v) : '';
}

/** Unit separator — not used in SAP MATNR/WERKS; joins composite row ids. */
const RESULT_ROW_ID_SEP = '\u001f';

function getRowWerksKey(row: RowLike): string {
  const rec = asRec(row);
  if (!rec) return '';
  const v =
    rec.WERKS ??
    rec.marcWerks ??
    rec.werks ??
    getRowFieldValue(rec, { tableName: 'MARC', fieldName: 'WERKS' });
  if (v == null || v === '') return '';
  if (Array.isArray(v)) {
    const parts = v.map(String).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return [...parts].sort().join(',');
  }
  return String(v).trim();
}

/** Stable selection id: same MATNR + different plants → different ids. */
export function getResultRowId(row: RowLike): string {
  const matnr = getRowMatnr(row);
  if (!matnr) return '';
  const plant = getRowWerksKey(row);
  return plant ? `${matnr}${RESULT_ROW_ID_SEP}${plant}` : matnr;
}

export function matnrFromResultRowId(rowId: string): string {
  const i = rowId.indexOf(RESULT_ROW_ID_SEP);
  return i === -1 ? rowId : rowId.slice(0, i);
}

export function werksFromResultRowId(rowId: string): string {
  const i = rowId.indexOf(RESULT_ROW_ID_SEP);
  return i === -1 ? '' : rowId.slice(i + RESULT_ROW_ID_SEP.length);
}

/** Keep first occurrence of each fieldName (case-insensitive). Criteria keyed by bare name. */
export function dedupeFieldsByName<T extends { fieldName: string }>(fields: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const f of fields) {
    const name = (f.fieldName ?? '').trim().toUpperCase();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(f);
  }
  return out;
}

/** Fallback MATNR column when fields config omits it. */
export const FALLBACK_MATNR_FIELD = {
  fieldName: 'MATNR',
  tableName: 'MARA',
  fieldType: 'CHAR',
  fieldLength: 40,
  hebrewDesc: 'materialSearch.results.columns.materialNumber',
  mandt: '',
} as const;
