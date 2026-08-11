import { fieldKey } from './types/material';

export {
  DEFAULT_WERKS_OPTIONS,
  DEFAULT_WERKS_LABELS,
} from './types/material';

const useRealApi = import.meta.env.VITE_USE_REAL_API === 'true';

/** Always required in results-table output columns; not removable in settings. */
export const REQUIRED_OUTPUT_FIELD_NAME = 'MATNR';

/** First-visit / reset defaults (criteria, output, compare share product set). */
export const DEFAULT_FIELD_NAMES = ['MATNR', 'WERKS', 'MATKL', 'MEINS'] as const;

export const DEFAULT_CRITERIA_FIELD_NAMES = DEFAULT_FIELD_NAMES;
export const DEFAULT_OUTPUT_FIELD_NAMES = DEFAULT_FIELD_NAMES;
export const DEFAULT_COMPARE_FIELD_NAMES = DEFAULT_FIELD_NAMES;

export function isRealApiMode(): boolean {
  return useRealApi;
}

/** Map bare field names → fieldKey() for fields present in config (order preserved). */
export function resolveFieldKeys(
  fields: { tableName: string; fieldName: string }[],
  names: readonly string[],
): string[] {
  const byName = new Map(
    fields.map((f) => [f.fieldName.toUpperCase(), f]),
  );
  const keys: string[] = [];
  for (const name of names) {
    const f = byName.get(name.toUpperCase());
    if (f) keys.push(fieldKey(f));
  }
  return keys;
}

/** fieldKey for first field matching bare name (case-insensitive), or null. */
export function findFieldKeyByName(
  fields: { tableName: string; fieldName: string }[],
  name: string,
): string | null {
  const upper = name.toUpperCase();
  const f = fields.find((x) => (x.fieldName ?? '').toUpperCase() === upper);
  return f ? fieldKey(f) : null;
}

/**
 * Ensure MATNR (required output column) is present and first in the key list.
 * If the field is missing from config, keys are returned unchanged.
 */
export function ensureMatnrInOutputKeys(
  keys: string[] | null | undefined,
  outputFields: { tableName: string; fieldName: string }[],
): string[] {
  const matnrKey = findFieldKeyByName(outputFields, REQUIRED_OUTPUT_FIELD_NAME);
  const base = keys ?? outputFields.map(fieldKey);
  if (!matnrKey) return base;
  const rest = base.filter((k) => k !== matnrKey);
  return [matnrKey, ...rest];
}
