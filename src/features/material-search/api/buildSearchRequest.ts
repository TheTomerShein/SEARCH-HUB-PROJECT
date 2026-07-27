import {
  MaterialSearchRequest,
  SearchCriteria,
  SearchFieldDefinition,
  SearchFilterClause,
} from '../types/material';

const PAGING_KEYS = new Set(['$skip', '$top', 'skip', 'top']);

function isLogicKey(key: string): boolean {
  return key.endsWith('_LOGIC');
}

function isEmptyValue(value: unknown): boolean {
  if (value == null || value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/** Normalize any criteria value to string[] for the API. */
function toFilterValues(value: unknown): string[] {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === 'boolean') return [value ? 'true' : 'false'];
  return [String(value)];
}

/**
 * Pick operator from field metadata + criteria key.
 * - range start → GE, range end → LE
 * - multi-select / plants → IN (plants use OR/AND when WERKS_LOGIC set)
 * - boolean / number → EQ
 * - text → CP (contains pattern)
 */
function resolveOperator(
  fieldName: string,
  fieldType: string | undefined,
  criteria: SearchCriteria,
): string {
  const upper = fieldName.toUpperCase();
  if (upper.endsWith('_START')) return 'GE';
  if (upper.endsWith('_END')) return 'LE';

  const type = (fieldType ?? '').toUpperCase();

  if (type === 'WERKS_SELECTOR' || upper === 'WERKS') {
    const logic = criteria.WERKS_LOGIC ?? criteria[`${fieldName}_LOGIC`];
    return logic === 'AND' ? 'AND' : 'OR';
  }

  if (
    type === 'MULTI_SELECT' ||
    type === 'MULTI-SELECT' ||
    type === 'SELECT'
  ) {
    return 'IN';
  }

  if (type === 'BOOLEAN' || type === 'BOOL') return 'EQ';
  if (type === 'NUMC' || type === 'QUAN' || type === 'NUMBER' || type === 'INT') return 'EQ';
  if (type === 'DATS' || type === 'DATE') return 'EQ';

  // CHAR / string / default
  return 'CP';
}

/**
 * Map UI SearchCriteria → POST body:
 * { skip, top, filters: [{ table_name, field_name, operator, values }] }
 */
export function buildSearchRequest(
  criteria: SearchCriteria,
  inputFields: SearchFieldDefinition[],
  defaultTop = 200,
): MaterialSearchRequest {
  const byName = new Map(
    inputFields.map((f) => [(f.fieldName ?? '').toUpperCase(), f]),
  );

  const filters: SearchFilterClause[] = [];
  const raw = criteria as Record<string, unknown>;

  for (const [key, value] of Object.entries(raw)) {
    if (PAGING_KEYS.has(key) || isLogicKey(key)) continue;
    if (isEmptyValue(value)) continue;
    // Default UI state LVORM=false — do not send unless user opts in (true)
    if (key.toUpperCase() === 'LVORM' && value === false) continue;

    const field = byName.get(key.toUpperCase());
    const table_name = field?.tableName ?? '';
    const field_name = field?.fieldName ?? key;
    const operator = resolveOperator(key, field?.fieldType, criteria);
    const values = toFilterValues(value);
    if (values.length === 0) continue;

    filters.push({ table_name, field_name, operator, values });
  }

  return {
    skip: typeof criteria.$skip === 'number' ? criteria.$skip : 0,
    top: typeof criteria.$top === 'number' ? criteria.$top : defaultTop,
    filters,
  };
}
