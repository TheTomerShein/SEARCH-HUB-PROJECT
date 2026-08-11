import type { TFunction } from 'i18next';
import { Material, OutputFieldDefinition, getRowFieldValue } from '../types/material';
import { formatFieldValueAsString } from './formatFieldValue';

/**
 * Column header for Excel: Hebrew label, never bare technical fieldName when a
 * description exists.
 *
 * - i18n key (`materialSearch.…`) → translated Hebrew
 * - API already sends Hebrew text → use as-is (do not pass fieldName as defaultValue —
 *   i18next would return MATNR etc. when the “key” is missing)
 */
export function fieldExportHeader(
  field: Pick<OutputFieldDefinition, 'hebrewDesc' | 'fieldName'>,
  t: TFunction,
): string {
  const desc = (field.hebrewDesc ?? '').trim();
  const technical = (field.fieldName ?? '').trim();

  if (!desc) return technical || '—';

  // Looks like an i18n key path used by mock / UI catalog
  if (desc.startsWith('materialSearch.') || desc.includes('.')) {
    const translated = String(t(desc, { defaultValue: '' }));
    if (translated) return translated;
  }

  // Real API: hebrewDesc is already human-readable (often Hebrew)
  const asKey = String(t(desc, { defaultValue: desc }));
  if (asKey && asKey !== technical) return asKey;

  return desc || technical || '—';
}

/** Map material rows → plain objects for xlsx (selected columns, Hebrew headers). */
export function projectRowsForExport(
  rows: Material[],
  fields: OutputFieldDefinition[],
  t: TFunction,
): Record<string, string | number | boolean>[] {
  // Precompute headers so order is stable and we de-dupe identical labels
  const headers = fields.map((f) => fieldExportHeader(f, t));
  const uniqueHeaders = headers.map((h, i) => {
    const dupCount = headers.slice(0, i).filter((x) => x === h).length;
    return dupCount > 0 ? `${h} (${fields[i].fieldName})` : h;
  });

  return rows.map((row) => {
    const rec = row as unknown as Record<string, unknown>;
    const out: Record<string, string | number | boolean> = {};
    fields.forEach((field, i) => {
      const header = uniqueHeaders[i];
      const val = getRowFieldValue(rec, field);
      if (val == null || val === '') {
        out[header] = '';
      } else if (typeof val === 'boolean') {
        out[header] = val;
      } else if (typeof val === 'number') {
        out[header] = val;
      } else {
        const formatted = formatFieldValueAsString(field, val, t);
        out[header] = formatted === '—' ? '' : formatted;
      }
    });
    return out;
  });
}
