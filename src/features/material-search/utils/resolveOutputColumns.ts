import { ensureMatnrInOutputKeys } from '../fieldDefaults';
import { OutputFieldDefinition, fieldKey } from '../types/material';

/**
 * Columns for results table + Excel: user selection (or all), MATNR first.
 */
export function resolveOutputColumns(
  allOutputFields: OutputFieldDefinition[] | undefined | null,
  activeOutputFields: string[] | null,
): OutputFieldDefinition[] | undefined {
  if (!allOutputFields) return undefined;
  if (!activeOutputFields) return allOutputFields;
  const keys = new Set(ensureMatnrInOutputKeys(activeOutputFields, allOutputFields));
  const selected = allOutputFields.filter((f) => keys.has(fieldKey(f)));
  const matnr = selected.filter((f) => f.fieldName.toUpperCase() === 'MATNR');
  const rest = selected.filter((f) => f.fieldName.toUpperCase() !== 'MATNR');
  return [...matnr, ...rest];
}
