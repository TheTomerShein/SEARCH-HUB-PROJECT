import type { TFunction } from 'i18next';
import { OutputFieldDefinition } from '../../types/material';
import { formatFieldValueAsString } from '../../utils/formatFieldValue';

export type FormatResultCellOptions = {
  /** MATNR chip only: copy number; must stop row click (detail dialog). */
  onCopyMatnr?: (matnr: string) => void;
};

/**
 * Format one results-table cell.
 * Hot path: plain strings / light DOM. React only for MATNR chip.
 */
export function formatResultCell(
  field: OutputFieldDefinition,
  val: unknown,
  t: TFunction,
  options?: FormatResultCellOptions,
): React.ReactNode {
  const nameUpper = (field.fieldName ?? '').toUpperCase();

  if (nameUpper === 'MATNR') {
    const matnr = val != null && val !== '' ? String(val) : '';
    if (!matnr) return '—';

    return (
      <button
        type="button"
        className="mdg-matnr-chip"
        onClick={(e) => {
          e.stopPropagation();
          const el = e.currentTarget;
          el.classList.add('mdg-matnr-chip--copied');
          window.setTimeout(() => el.classList.remove('mdg-matnr-chip--copied'), 700);
          options?.onCopyMatnr?.(matnr);
        }}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') e.stopPropagation();
        }}
        title={t('materialSearch.actions.copyMatnr', 'לחץ להעתקת מספר חומר')}
        aria-label={t('materialSearch.actions.copyMatnrWithValue', {
          matnr,
          defaultValue: `העתק מספר חומר ${matnr}`,
        })}
      >
        {matnr}
      </button>
    );
  }

  return formatFieldValueAsString(field, val, t);
}
