import {
  DEFAULT_WERKS_OPTIONS,
  type FieldOption,
  type FieldsConfig,
  type OutputFieldDefinition,
  type SearchFieldDefinition,
} from '../types/domain';

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
  return t;
}

function normalizeField(raw: unknown): SearchFieldDefinition & OutputFieldDefinition {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const fieldName = pickStr(r, 'fieldName', 'FIELDNAME', 'FieldName', 'name', 'NAME');
  const tableName = pickStr(r, 'tableName', 'TABLENAME', 'TableName', 'table', 'TABLE');
  const fieldType = normalizeFieldType(
    pickStr(r, 'fieldType', 'FIELDTYPE', 'FieldType', 'type', 'TYPE') || 'CHAR',
  );
  const hebrewDesc =
    pickStr(r, 'hebrewDesc', 'HEBREWDESC', 'HebrewDesc', 'label', 'LABEL', 'description', 'DESCRIPTION') ||
    fieldName;
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
  if (value && typeof value === 'object' && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: unknown[] }).results;
  }
  return [];
}

function withDefaultWerksOptions(
  field: SearchFieldDefinition & OutputFieldDefinition,
): SearchFieldDefinition & OutputFieldDefinition {
  const name = (field.fieldName ?? '').toUpperCase();
  const type = (field.fieldType ?? '').toUpperCase();
  const isWerks = name === 'WERKS' || type === 'WERKS_SELECTOR';
  if (!isWerks) return field;
  if (field.options && field.options.length > 0) return field;
  return { ...field, options: DEFAULT_WERKS_OPTIONS };
}

/**
 * Normalize GET /api/materials/fields payload.
 * Handles casing variants, OData wrappers, ABAP type letters.
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
    inputFields: inputRaw.map(normalizeField).map(withDefaultWerksOptions),
    outputFields: outputRaw.map(normalizeField),
  };
}
