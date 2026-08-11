import { Box, Chip } from '@mui/material';
import { useRecoilState } from 'recoil';
import { searchCriteriaState } from '../state/search.state';
import { useSearchFieldsQuery } from '../hooks/useMaterialSearch';
import { useTranslation } from 'react-i18next';
import { SearchCriteria } from '../types/material';
import { formatDateChip } from '../../../utils/formatDate';

export function ActiveFilterChips() {
  const { t } = useTranslation();
  const [criteria, setCriteria] = useRecoilState(searchCriteriaState);
  const { data: searchFields } = useSearchFieldsQuery();

  if (!searchFields) return null;

  const chips: JSX.Element[] = [];

  const addChip = (key: string, label: string, onRemove: () => void) => {
    chips.push(
      <Chip 
        key={key}
        label={label}
        onDelete={onRemove}
        size="small"
        color="primary"
        variant="outlined"
        sx={{ bgcolor: 'background.paper', fontWeight: 500 }}
      />
    );
  };

  // Group dates if needed
  if (criteria.ERSDA_START || criteria.ERSDA_END) {
    const startRaw = criteria.ERSDA_START || '';
    const endRaw = criteria.ERSDA_END || '';

    const start = formatDateChip(startRaw);
    const end = formatDateChip(endRaw);
    
    let labelText = '';
    if (start && end) labelText = start === end ? start : `${start} - ${end}`;
    else if (start) labelText = `מ-${start}`;
    else if (end) labelText = `עד ${end}`;

    const fieldDef = searchFields.find(f => f.fieldName === 'ERSDA_START' || f.fieldName === 'ERSDA');
    const fieldLabel = fieldDef ? t(fieldDef.hebrewDesc) : t('materialSearch.results.columns.createdOn', 'תאריך יצירה');
    
    addChip('ERSDA_RANGE', `${fieldLabel}: ${labelText}`, () => {
      setCriteria(prev => {
        const next = { ...prev };
        delete next.ERSDA_START;
        delete next.ERSDA_END;
        return next;
      });
    });
  }

  // Iterate over other criteria
  Object.entries(criteria).forEach(([key, value]) => {
    if (key === 'ERSDA_START' || key === 'ERSDA_END') return; // Handled above
    // Keep AND/OR (e.g. WERKS_LOGIC) for backend only — not user-facing chips
    if (key.endsWith('_LOGIC') || key.startsWith('$')) return;
    if (value === undefined || value === null || value === '') return;

    const fieldDef = searchFields.find(f => f.fieldName === key);
    const fieldLabel = fieldDef ? t(fieldDef.hebrewDesc) : key;

    if (Array.isArray(value)) {
      if (value.length === 0) return;
      value.forEach(val => {
        let displayVal = val;
        if (fieldDef?.options) {
          const opt = fieldDef.options.find(o => o.value === val);
          if (opt) displayVal = t(opt.label);
        }
        addChip(`${key}-${val}`, `${fieldLabel}: ${displayVal}`, () => {
          setCriteria(prev => {
            const next = { ...prev };
            if (Array.isArray(next[key as keyof SearchCriteria])) {
              (next as any)[key] = (next[key as keyof SearchCriteria] as any[]).filter(v => v !== val);
              if ((next as any)[key].length === 0) delete (next as any)[key];
            }
            return next;
          });
        });
      });
    } else {
      let displayVal = value;
      if (typeof value === 'boolean') {
        displayVal = value ? t('common.yes', 'כן') : t('common.no', 'לא');
      }
      addChip(key, `${fieldLabel}: ${displayVal}`, () => {
        setCriteria(prev => {
          const next = { ...prev };
          delete (next as any)[key];
          return next;
        });
      });
    }
  });

  if (chips.length === 0) return null;

  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 1, 
      flexWrap: 'wrap', 
      px: 2, 
      py: 1.5, 
      borderBottom: 1,
      borderColor: 'divider',
      bgcolor: 'background.default',
      alignItems: 'center'
    }}>
      {chips}
    </Box>
  );
}
