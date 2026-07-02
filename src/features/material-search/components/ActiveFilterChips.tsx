import { Box, Chip } from '@mui/material';
import { useRecoilState } from 'recoil';
import { searchCriteriaState } from '../state/search.state';
import { useSearchFieldsQuery } from '../hooks/useMaterialSearch';
import { useTranslation } from 'react-i18next';
import { SearchCriteria } from '../types/material';

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
    
    // ponytail: Format date from YYYYMMDD to human-readable DD/MM/YYYY for RTL Hebrew UI
    const formatDateForChip = (dateStr: string) => {
      if (dateStr.length === 8) {
        return `${dateStr.slice(6, 8)}/${dateStr.slice(4, 6)}/${dateStr.slice(0, 4)}`;
      }
      return dateStr;
    };

    const start = formatDateForChip(startRaw);
    const end = formatDateForChip(endRaw);
    
    let labelText = '';
    if (start && end) labelText = start === end ? start : `${start} - ${end}`;
    else if (start) labelText = `מ-${start}`;
    else if (end) labelText = `עד ${end}`;

    const fieldDef = searchFields.find(f => f.field_name === 'ERSDA_START' || f.field_name === 'ERSDA');
    const fieldLabel = fieldDef ? t(fieldDef.hebrew_desc) : t('materialSearch.results.columns.createdOn', 'תאריך יצירה');
    
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
    if (value === undefined || value === null || value === '') return;
    if (key === 'LVORM' && value === false) return; // Default state, no chip

    const fieldDef = searchFields.find(f => f.field_name === key);
    const fieldLabel = fieldDef ? t(fieldDef.hebrew_desc) : key;

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
    } else if (key === 'LVORM' && value === true) {
      addChip(key, `${fieldLabel}: ${t('materialSearch.details.deleted', 'מחוקים')}`, () => {
        setCriteria(prev => ({ ...prev, LVORM: false }));
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
