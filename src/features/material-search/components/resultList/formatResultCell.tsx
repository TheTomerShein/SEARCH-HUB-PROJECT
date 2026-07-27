import type { TFunction } from 'i18next';
import { OutputFieldDefinition } from '../../types/material';
import { formatDate } from '../../../../utils/formatDate';

export type FormatResultCellOptions = {
  /** MATNR chip only: copy number; must stop row click (detail dialog). */
  onCopyMatnr?: (matnr: string) => void;
};

/**
 * Format one results-table cell.
 * Hot path: plain strings / light DOM. React only for MATNR + status pill.
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
        aria-label={t('materialSearch.actions.copyMatnr', 'העתק מספר חומר')}
      >
        {matnr}
      </button>
    );
  }

  if (nameUpper === 'MTART') {
    return String(t(`materialSearch.enums.materialType.${val}`, { defaultValue: String(val ?? '—') }));
  }

  if (nameUpper === 'MBRSH') {
    return String(t(`materialSearch.enums.industrySector.${val}`, { defaultValue: String(val ?? '—') }));
  }

  if (nameUpper === 'LVORM') {
    const deleted =
      val === true || val === 'X' || val === 'x' || val === 'true' || val === 1 || val === '1';
    const label = deleted
      ? String(t('materialSearch.details.deleted'))
      : String(t('materialSearch.details.active'));
    return (
      <span
        className={
          deleted ? 'mdg-status-pill mdg-status-pill--deleted' : 'mdg-status-pill mdg-status-pill--active'
        }
      >
        <span className="mdg-status-dot" aria-hidden />
        {label}
      </span>
    );
  }

  if (field.fieldType === 'DATS' || nameUpper === 'ERSDA' || nameUpper === 'LAEDA') {
    return formatDate(val != null ? String(val) : undefined);
  }

  if (val == null || val === '') return '—';
  if (Array.isArray(val)) return val.map(String).join(', ');
  return String(val);
}
