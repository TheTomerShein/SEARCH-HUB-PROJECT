import type { TFunction } from 'i18next';
import { formatDate } from '../../../utils/formatDate';
import { Material, OutputFieldDefinition, getRowFieldValue } from '../types/material';

/** Map material rows → plain objects for xlsx (selected columns only). */
export function projectRowsForExport(
  rows: Material[],
  fields: OutputFieldDefinition[],
  t: TFunction,
): Record<string, string | number | boolean>[] {
  return rows.map((row) => {
    const rec = row as unknown as Record<string, unknown>;
    const out: Record<string, string | number | boolean> = {};
    for (const field of fields) {
      const header = String(t(field.hebrewDesc, field.fieldName));
      const val = getRowFieldValue(rec, field);
      const nameUpper = (field.fieldName ?? '').toUpperCase();

      if (val == null || val === '') {
        out[header] = '';
      } else if (field.fieldType === 'DATS' || nameUpper === 'ERSDA' || nameUpper === 'LAEDA') {
        out[header] = formatDate(String(val));
      } else if (Array.isArray(val)) {
        out[header] = val.map(String).join(', ');
      } else if (typeof val === 'boolean') {
        out[header] = val;
      } else if (typeof val === 'number' || typeof val === 'string') {
        out[header] = val;
      } else {
        out[header] = String(val);
      }
    }
    return out;
  });
}
