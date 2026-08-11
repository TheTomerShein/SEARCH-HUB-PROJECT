import type { TFunction } from 'i18next';
import { formatDate } from '../../../utils/formatDate';
import type { OutputFieldDefinition } from '../types/material';

/** Plain-string field formatting for list (non-DOM), compare, export. */
export function formatFieldValueAsString(
  field: Pick<OutputFieldDefinition, 'fieldName' | 'fieldType'>,
  val: unknown,
  t: TFunction,
  dateOpts?: Intl.DateTimeFormatOptions,
): string {
  const nameUpper = (field.fieldName ?? '').toUpperCase();

  if (nameUpper === 'MTART') {
    return String(t(`materialSearch.enums.materialType.${val}`, { defaultValue: String(val ?? '—') }));
  }
  if (nameUpper === 'MBRSH') {
    return String(t(`materialSearch.enums.industrySector.${val}`, { defaultValue: String(val ?? '—') }));
  }
  if (field.fieldType === 'DATS' || nameUpper === 'ERSDA' || nameUpper === 'LAEDA') {
    return formatDate(val != null ? String(val) : undefined, dateOpts);
  }
  if (val == null || val === '') return '—';
  if (Array.isArray(val)) return val.map(String).join(', ');
  return String(val);
}
