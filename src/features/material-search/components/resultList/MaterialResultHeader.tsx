import { Checkbox, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { OutputFieldDefinition, fieldKey } from '../../types/material';
import { headerClassName, HEADER_HEIGHT } from '../../utils/columnLayout';

type Props = {
  mode: 'pin' | 'scroll';
  /** Scroll columns only, or [matnr] for pin. */
  columns: OutputFieldDefinition[];
  allChecked?: boolean;
  someChecked?: boolean;
  onSelectAll?: () => void;
  disabled?: boolean;
};

export function MaterialResultHeader({
  mode,
  columns,
  allChecked = false,
  someChecked = false,
  onSelectAll,
  disabled,
}: Props) {
  const { t } = useTranslation();

  if (mode === 'pin') {
    const matnrField = columns[0];
    return (
      <div
        className="mdg-result-header mdg-result-header--pin"
        role="rowgroup"
        style={{ width: '100%', height: HEADER_HEIGHT }}
      >
        <div role="columnheader" className="mdg-result-check">
          <Tooltip title={allChecked ? 'בטל בחירת הכל' : 'בחר הכל'}>
            <span>
              <Checkbox
                size="small"
                checked={allChecked}
                indeterminate={someChecked}
                onChange={onSelectAll}
                disabled={disabled}
                sx={{ p: 0.75 }}
                inputProps={{ 'aria-label': 'Select all rows' }}
              />
            </span>
          </Tooltip>
        </div>
        <div
          role="columnheader"
          className="mdg-result-header-cell mdg-col-matnr mdg-col-matnr--pinned"
        >
          <span className="mdg-result-header-label">
            {matnrField ? t(matnrField.hebrewDesc) : t('materialSearch.results.columns.materialNumber')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mdg-result-header mdg-result-header--scroll"
      role="rowgroup"
      style={{ height: HEADER_HEIGHT }}
    >
      {columns.map((field) => (
        <div key={fieldKey(field)} role="columnheader" className={headerClassName(field)}>
          <span className="mdg-result-header-label">{t(field.hebrewDesc)}</span>
        </div>
      ))}
      <div className="mdg-result-open-hint" aria-hidden />
    </div>
  );
}
