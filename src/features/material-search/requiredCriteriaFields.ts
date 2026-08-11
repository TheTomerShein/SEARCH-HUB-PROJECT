import type { SearchCriteria } from './types/material';
import { fieldKey } from './types/material';

/**
 * Frontend-only required search criteria (SAP bare field names).
 *
 * Edit this list to require more fields later — no backend change needed.
 * Matching is case-insensitive on `fieldName` (e.g. WERKS, MATNR).
 *
 * @example
 * export const REQUIRED_CRITERIA_FIELD_NAMES = ['WERKS', 'MATNR'] as const;
 */
export const REQUIRED_CRITERIA_FIELD_NAMES = ['WERKS'] as const;

export type RequiredCriteriaFieldName =
  (typeof REQUIRED_CRITERIA_FIELD_NAMES)[number] | string;

/** True if a criteria value counts as filled for required checks. */
export function isCriteriaValueFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return !Number.isNaN(value);
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) {
    return value.some((v) => {
      if (v == null) return false;
      if (typeof v === 'string') return v.trim().length > 0;
      return true;
    });
  }
  return false;
}

/** Bare field names from the required list that are empty on `criteria`. */
export function getMissingRequiredCriteriaFieldNames(
  criteria: SearchCriteria | undefined | null,
  requiredNames: readonly string[] = REQUIRED_CRITERIA_FIELD_NAMES,
): string[] {
  const c = criteria ?? {};
  const missing: string[] = [];
  for (const name of requiredNames) {
    const upper = name.toUpperCase();
    // Prefer exact key, then case-insensitive match on criteria keys
    let value: unknown = (c as Record<string, unknown>)[name];
    if (value === undefined) {
      const key = Object.keys(c).find((k) => k.toUpperCase() === upper);
      value = key != null ? (c as Record<string, unknown>)[key] : undefined;
    }
    if (!isCriteriaValueFilled(value)) missing.push(name.toUpperCase());
  }
  return missing;
}

export function criteriaHasAllRequired(
  criteria: SearchCriteria | undefined | null,
  requiredNames: readonly string[] = REQUIRED_CRITERIA_FIELD_NAMES,
): boolean {
  return getMissingRequiredCriteriaFieldNames(criteria, requiredNames).length === 0;
}

export function isRequiredCriteriaFieldName(
  fieldName: string | undefined | null,
  requiredNames: readonly string[] = REQUIRED_CRITERIA_FIELD_NAMES,
): boolean {
  if (!fieldName) return false;
  const upper = fieldName.toUpperCase();
  return requiredNames.some((n) => n.toUpperCase() === upper);
}

/**
 * Ensure required criteria fields stay visible even if user hid them in settings.
 * Preserves active order; appends any missing required fields from config.
 */
export function ensureRequiredCriteriaFieldsVisible<
  T extends { tableName: string; fieldName: string },
>(
  allSearchFields: T[],
  visibleFields: T[],
  requiredNames: readonly string[] = REQUIRED_CRITERIA_FIELD_NAMES,
): T[] {
  if (requiredNames.length === 0) return visibleFields;
  const visibleKeys = new Set(visibleFields.map((f) => fieldKey(f)));
  const byName = new Map(allSearchFields.map((f) => [f.fieldName.toUpperCase(), f]));
  const out = [...visibleFields];
  for (const name of requiredNames) {
    const f = byName.get(name.toUpperCase());
    if (!f) continue;
    const k = fieldKey(f);
    if (visibleKeys.has(k)) continue;
    visibleKeys.add(k);
    out.push(f);
  }
  return out;
}

/** fieldKey() values for every required criteria field present in config. */
export function requiredCriteriaFieldKeys(
  searchFields: { tableName: string; fieldName: string }[],
  requiredNames: readonly string[] = REQUIRED_CRITERIA_FIELD_NAMES,
): string[] {
  const byName = new Map(searchFields.map((f) => [f.fieldName.toUpperCase(), f]));
  const keys: string[] = [];
  for (const name of requiredNames) {
    const f = byName.get(name.toUpperCase());
    if (f) keys.push(fieldKey(f));
  }
  return keys;
}

/**
 * Force required criteria field keys into the active-search key list.
 * Used when applying field-settings draft / clear-all.
 */
export function ensureRequiredCriteriaKeys(
  keys: string[] | null | undefined,
  searchFields: { tableName: string; fieldName: string }[],
  requiredNames: readonly string[] = REQUIRED_CRITERIA_FIELD_NAMES,
): string[] {
  const required = requiredCriteriaFieldKeys(searchFields, requiredNames);
  if (required.length === 0) return keys ?? searchFields.map(fieldKey);
  const base = keys ?? searchFields.map(fieldKey);
  const set = new Set(base);
  const out = [...base];
  for (const k of required) {
    if (set.has(k)) continue;
    set.add(k);
    out.push(k);
  }
  return out;
}

export function isLockedCriteriaFieldKey(
  key: string,
  lockedKeys: readonly string[],
): boolean {
  return lockedKeys.includes(key);
}
