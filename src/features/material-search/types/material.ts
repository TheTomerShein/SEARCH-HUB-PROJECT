export type MaterialType = 'ROH' | 'HALB' | 'FERT' | 'HAWA';

export type IndustrySector = 'M' | 'C' | 'P' | 'E'; // Mechanical, Chemical, Pharmaceutical, Electronics

export type BaseUnitOfMeasure = 'PC' | 'KG' | 'L' | 'M' | 'M2' | 'M3';

export interface Material {
  MATNR: string;              // Material Number (key)
  MAKTX: string;              // Material Description (short, Hebrew)
  LONG_TEXT: string;          // Long Description (Hebrew)
  MTART: MaterialType;        // Material Type
  MBRSH: IndustrySector;      // Industry Sector
  MEINS: BaseUnitOfMeasure;   // Base Unit of Measure
  LVORM: boolean;             // Deletion Flag (Status)
  ERSDA: string;              // Created On Date (ISO string: YYYY-MM-DD)
  ERNAM: string;              // Created By
  LAEDA: string;              // Last Changed On Date (ISO string: YYYY-MM-DD)
  AENAM: string;              // Last Changed By
  WERKS?: string[];           // Plant Assignments (optional for backward compatibility)
  /** Mock / extended output columns (optional) */
  MATKL?: string;
  SPART?: string;
  BRGEW?: string;
  NTGEW?: string;
  GEWEI?: string;
  VOLUM?: string;
  VOLEH?: string;
  BSTME?: string;
  /** Display helper when row is plant-level or joined plants string */
  WERKS_DISP?: string;
}

export interface SearchCriteria {
  MATNR?: string;
  MAKTX?: string;             // Search description (contains)
  MTART?: MaterialType[];
  MBRSH?: IndustrySector[];
  MEINS?: BaseUnitOfMeasure[];
  ERSDA_START?: string;       // Created date range start (YYYY-MM-DD)
  ERSDA_END?: string;         // Created date range end (YYYY-MM-DD)
  LVORM?: boolean;            // Show deleted items (false by default)
  WERKS?: string[];           // Selected plants
  WERKS_LOGIC?: 'OR' | 'AND'; // Logic for matching plants

  /** OData-style page offset — number of records to skip. */
  $skip?: number;
  /** OData-style page size — max number of records to return. */
  $top?: number;

  /** Dynamic criteria keys from field config (real API). */
  [key: string]: string | number | boolean | string[] | undefined;
}

/**
 * One filter clause for POST /api/materials/search.
 * Wire format uses snake_case as expected by the backend.
 */
export interface SearchFilterClause {
  table_name: string;
  field_name: string;
  operator: string;
  values: string[];
}

/**
 * Body for POST /api/materials/search (real API).
 * UI still uses flat SearchCriteria; HTTP layer maps via buildSearchRequest().
 */
export interface MaterialSearchRequest {
  skip: number;
  top: number;
  filters: SearchFilterClause[];
}

export interface SearchResult {
  materials: Material[];
  /** Total number of records that match the filter (before paging). */
  totalCount: number;
  /** True when there are more pages after this one (skip + page.length < totalCount). */
  hasMore: boolean;
}

/** Code + Hebrew description (detail API coded fields). */
export type CodeWithHeDesc = {
  code: string;
  description_he: string;
};

/** Plant / branch ref on detail API. */
export type BranchRef = {
  werks: string;
  name?: string;
};

/**
 * Full material detail — GET /api/materials/:id
 * Wire format: snake_case (real backend + mock).
 */
export interface MaterialDetail {
  matnr: string;
  maktx: string;
  zzmaterial_type: CodeWithHeDesc;
  managing_branch: BranchRef | null;
  using_branches: BranchRef[];
  meins: CodeWithHeDesc;
  global_status: CodeWithHeDesc;
  matkl: CodeWithHeDesc;
  created_by: string;
  /** YYYY-MM-DD */
  created_at: string;
  changed_by: string;
  /** YYYY-MM-DD */
  changed_at: string;
  /** Open change-request number, or null if none */
  change_request: string | null;
}

/**
 * Response shape for GET /api/materials/fields.
 * Contains all metadata needed to render the search sidebar and results table.
 */
export interface FieldsConfig {
  /** Fields to render in the search/filter sidebar */
  inputFields: SearchFieldDefinition[];
  /** Columns to render in the results table */
  outputFields: OutputFieldDefinition[];
}

export interface FieldOption {
  label: string;
  value: string | number;
}

/** Field metadata from GET /api/materials/fields */
export interface SearchFieldDefinition {
  fieldLength: number;
  fieldName: string;
  fieldType: string;
  hebrewDesc: string;
  mandt: string;
  tableName: string;
  /** UI-only: option list for multi-select filters (mock / enriched clients) */
  options?: FieldOption[];
}

export interface OutputFieldDefinition {
  fieldLength: number;
  fieldName: string;
  fieldType: string;
  hebrewDesc: string;
  mandt: string;
  tableName: string;
}

/** Stable UI identity — unique when same fieldName exists on multiple tables. Not an API key. */
export function fieldKey(field: { tableName: string; fieldName: string }): string {
  const table = (field.tableName ?? '').trim() || '_';
  const name = (field.fieldName ?? '').trim() || '_';
  return `${table}-${name}`;
}

/**
 * Search-result property name from backend:
 *   tableName lowercase + fieldName with first letter upper, rest lower.
 *   e.g. MARA + MATNR → maraMatnr, MARC + WERKS → marcWerks
 */
export function apiResultPropName(tableName: string, fieldName: string): string {
  const table = (tableName ?? '').trim().toLowerCase();
  const name = (fieldName ?? '').trim();
  if (!name) return table;
  return `${table}${name.charAt(0).toUpperCase()}${name.slice(1).toLowerCase()}`;
}

/**
 * Read a field from a search-result row.
 * Prefers API camelCase (maraMatnr); falls back to bare fieldName (mock).
 */
export function getRowFieldValue(
  row: Record<string, unknown> | null | undefined,
  field: { tableName: string; fieldName: string },
): unknown {
  if (!row) return undefined;
  const apiKey = apiResultPropName(field.tableName, field.fieldName);
  if (Object.prototype.hasOwnProperty.call(row, apiKey) && row[apiKey] !== undefined) {
    return row[apiKey];
  }
  const bare = field.fieldName;
  if (Object.prototype.hasOwnProperty.call(row, bare) && row[bare] !== undefined) {
    return row[bare];
  }
  // case-insensitive bare match (MATNR / matnr)
  const upper = bare.toUpperCase();
  for (const k of Object.keys(row)) {
    if (k.toUpperCase() === upper) return row[k];
  }
  return undefined;
}

/** Material number from a result row (API maraMatnr or mock MATNR). */
export function getRowMatnr(
  row: Record<string, unknown> | null | undefined,
  matnrField?: { tableName: string; fieldName: string } | null,
): string {
  if (!row) return '';
  if (matnrField) {
    const v = getRowFieldValue(row, matnrField);
    if (v != null && String(v) !== '') return String(v);
  }
  const v =
    row.MATNR ??
    row.maraMatnr ??
    row.matnr ??
    getRowFieldValue(row, { tableName: 'MARA', fieldName: 'MATNR' });
  return v != null ? String(v) : '';
}

/** Unit separator — not used in SAP MATNR/WERKS; joins composite row ids. */
const RESULT_ROW_ID_SEP = '\u001f';

/**
 * Plant key for one result row (API may emit one row per MATNR+WERKS).
 * string / single-element array → that plant; multi-plant on one row → sorted join.
 */
function getRowWerksKey(
  row: Record<string, unknown> | Material | null | undefined,
): string {
  if (!row) return '';
  const rec = row as Record<string, unknown>;
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

/**
 * Stable selection id for a results-table row.
 * Same MATNR with different plants → different ids (fixes multi-WERKS multi-select).
 */
export function getResultRowId(row: Record<string, unknown> | Material | null | undefined): string {
  if (!row) return '';
  const rec = row as Record<string, unknown>;
  const matnr = getRowMatnr(rec);
  if (!matnr) return '';
  const plant = getRowWerksKey(rec);
  return plant ? `${matnr}${RESULT_ROW_ID_SEP}${plant}` : matnr;
}

/** MATNR portion of a getResultRowId() value (compare / copy helpers). */
export function matnrFromResultRowId(rowId: string): string {
  const i = rowId.indexOf(RESULT_ROW_ID_SEP);
  return i === -1 ? rowId : rowId.slice(0, i);
}

/**
 * Keep first occurrence of each fieldName (case-insensitive).
 * Safety net only — criteria values are keyed by bare fieldName.
 */
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

/** Pick first defined string from camelCase / UPPER / Pascal API variants. */
function pickStr(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return '';
}

function pickNum(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
}

/** ABAP single-letter types → UI fieldType used by MaterialSearchFilters. */
const ABAP_TYPE: Record<string, string> = {
  C: 'CHAR',
  N: 'NUMC',
  D: 'DATS',
  P: 'QUAN',
  F: 'QUAN',
  I: 'NUMC',
  T: 'CHAR',
  X: 'BOOLEAN',
};

function normalizeFieldType(raw: string): string {
  const t = raw.trim();
  if (!t) return 'CHAR';
  const upper = t.toUpperCase();
  if (ABAP_TYPE[upper]) return ABAP_TYPE[upper];
  // already CHAR / MULTI_SELECT / WERKS_SELECTOR / boolean / date / string ...
  return t;
}

function normalizeField(raw: unknown): SearchFieldDefinition & OutputFieldDefinition {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const fieldName = pickStr(r, 'fieldName', 'FIELDNAME', 'FieldName', 'name', 'NAME');
  const tableName = pickStr(r, 'tableName', 'TABLENAME', 'TableName', 'table', 'TABLE');
  const fieldType = normalizeFieldType(
    pickStr(r, 'fieldType', 'FIELDTYPE', 'FieldType', 'type', 'TYPE') || 'CHAR',
  );
  const hebrewDesc = pickStr(r, 'hebrewDesc', 'HEBREWDESC', 'HebrewDesc', 'label', 'LABEL', 'description', 'DESCRIPTION') || fieldName;
  const fieldLength = pickNum(r, 'fieldLength', 'FIELDLENGTH', 'FieldLength', 'length', 'LENGTH');
  const mandt = pickStr(r, 'mandt', 'MANDT', 'Mandt') || '100';
  const options = (r.options ?? r.OPTIONS ?? r.Options) as FieldOption[] | undefined;

  return {
    fieldName,
    tableName,
    fieldType,
    hebrewDesc,
    fieldLength,
    mandt,
    ...(Array.isArray(options) ? { options } : {}),
  };
}

function asFieldArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  // OData-style { results: [...] }
  if (value && typeof value === 'object' && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: unknown[] }).results;
  }
  return [];
}

/**
 * Normalize GET /api/materials/fields payload.
 * Handles casing variants, OData wrappers, ABAP type letters.
 * Prevents all fields collapsing to React key "undefined-undefined"
 * when API uses FIELDNAME/TABLENAME instead of camelCase.
 */
export function normalizeFieldsConfig(raw: unknown): FieldsConfig {
  const root = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const body = (root.d && typeof root.d === 'object' ? root.d : root) as Record<string, unknown>;

  const inputRaw = asFieldArray(
    body.inputFields ?? body.InputFields ?? body.INPUTFIELDS ?? body.input_fields,
  );
  const outputRaw = asFieldArray(
    body.outputFields ?? body.OutputFields ?? body.OUTPUTFIELDS ?? body.output_fields,
  );

  return {
    inputFields: inputRaw.map(normalizeField),
    outputFields: outputRaw.map(normalizeField),
  };
}

export interface CompareFieldSelector {
  tableName: string;
  fieldName: string;
}

export interface CompareRequest {
  materials: string[]; // List of MATNRs to compare
  fields: CompareFieldSelector[]; // List of fields to return
}
