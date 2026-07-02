import { useEffect, useRef } from 'react';
import { 
  Box, 
  TextField, 
  Checkbox, 
  FormControlLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useTranslation } from 'react-i18next';
import { SearchCriteria, SearchFieldDefinition } from '../types/material';
import { useDebounce } from '../../../utils/useDebounce';

export interface MaterialSearchFiltersProps {
  fields: SearchFieldDefinition[];
  criteria: SearchCriteria;
  onChange: (criteria: SearchCriteria) => void;
  onSearch: () => void;
  onClear: () => void;
  isLoading?: boolean;
  grid?: boolean;
}

export const defaultCriteria: SearchCriteria = {
  LVORM: false, // Default to not showing deleted materials
};

// ponytail: Reusable label-above-field wrapper. Avoids MUI's broken RTL notch calculation entirely.
function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          color: 'text.secondary',
          fontSize: '0.78rem',
          letterSpacing: '0.01em',
          pr: 0.25,
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

export function MaterialSearchFilters({ 
  fields, 
  criteria, 
  onChange,
  onSearch,
  onClear,
  isLoading,
  grid = false
}: MaterialSearchFiltersProps) {
  const { t } = useTranslation();
  
  const lastChangeWasTextRef = useRef(false);
  const debouncedDraft = useDebounce(criteria, 500);

  // Sync debounced changes (only if it was a text field)
  useEffect(() => {
    if (lastChangeWasTextRef.current) {
      onSearch();
      lastChangeWasTextRef.current = false;
    }
  }, [debouncedDraft, onSearch]);

  const handleTextChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    lastChangeWasTextRef.current = true;
    onChange({ ...criteria, [field]: event.target.value });
  };

  const handleSelectChange = (field: string) => (event: SelectChangeEvent<any>) => {
    lastChangeWasTextRef.current = false;
    onChange({ ...criteria, [field]: event.target.value as any });
  };

  const handleCheckboxChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    lastChangeWasTextRef.current = false;
    if (field === 'LVORM') {
      onChange({ ...criteria, [field]: !event.target.checked });
    } else {
      onChange({ ...criteria, [field]: event.target.checked });
    }
  };

  const handleLogicChange = (field: string) => (
    _event: React.MouseEvent<HTMLElement>,
    newLogic: 'OR' | 'AND' | null
  ) => {
    if (newLogic !== null) {
      lastChangeWasTextRef.current = false;
      onChange({ ...criteria, [`${field}_LOGIC`]: newLogic });
    }
  };

  const handleSearchClick = () => {
    lastChangeWasTextRef.current = false;
    onSearch();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchClick();
  };

  const inputSize = grid ? 'medium' : 'small';
  const buttonSize = grid ? 'large' : 'medium';

  return (
    <Box component="form" onSubmit={handleFormSubmit} sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <Box sx={{
        display: grid ? 'grid' : 'flex',
        flexDirection: grid ? undefined : 'column',
        gridTemplateColumns: grid ? {
          xs: '1fr',
          sm: '1fr 1fr',
          md: '1fr 1fr 1fr',
          lg: '1fr 1fr 1fr 1fr'
        } : undefined,
        gap: grid ? 3 : 2,
        width: '100%',
        maxHeight: grid ? 'calc(100vh - 320px)' : 'none',
        overflowY: grid ? 'auto' : 'visible',
        pr: grid ? 1 : 0,
        pt: grid ? 0.5 : 0,
        pl: grid ? 0 : 0,
        // Sleek scrollbar styling
        '&::-webkit-scrollbar': {
          width: '5px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#C7D2FE',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#A5B4FC',
        },
      }}>
        {fields.map((field, index) => {
          if (field.field_type === 'CHAR' || field.field_type === 'NUMC' || field.field_type === 'QUAN' || field.field_type === 'string' || field.field_type === 'number') {
            return (
              <FieldLabel key={field.field_name} label={t(field.hebrew_desc)}>
                <TextField
                  autoFocus={index === 0}
                  fullWidth
                  size={inputSize}
                  placeholder={t(field.hebrew_desc)}
                  value={(criteria as any)[field.field_name] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if ((field.field_type === 'NUMC' || field.field_type === 'QUAN') && !/^\d*$/.test(val)) {
                      return; // digits only
                    }
                    handleTextChange(field.field_name)(e);
                  }}
                  inputProps={{ maxLength: field.field_length }}
                />
              </FieldLabel>
            );
          }

          if (field.field_type === 'DATS' || field.field_type === 'date') {
            const rawVal = (criteria as any)[field.field_name] || '';
            // ponytail: using native HTML5 date input with YYYY-MM-DD to YYYYMMDD conversion. Avoids heavy date-picker library dependency.
            const displayVal = rawVal.length === 8
              ? `${rawVal.slice(0, 4)}-${rawVal.slice(4, 6)}-${rawVal.slice(6, 8)}`
              : '';
            return (
              <FieldLabel key={field.field_name} label={t(field.hebrew_desc)}>
                <TextField
                  type="date"
                  size={inputSize}
                  fullWidth
                  value={displayVal}
                  onChange={(e) => {
                    const val = e.target.value;
                    // ponytail: don't auto-trigger search while picking a date — user submits explicitly
                    lastChangeWasTextRef.current = false;
                    onChange({ ...criteria, [field.field_name]: val.replace(/-/g, '') });
                  }}
                />
              </FieldLabel>
            );
          }

          if (field.field_type === 'MULTI_SELECT' || field.field_type === 'multi-select' || field.field_type === 'select') {
            const isMulti = field.field_type === 'MULTI_SELECT' || field.field_type === 'multi-select';
            return (
              <FieldLabel key={field.field_name} label={t(field.hebrew_desc)}>
                <Select
                  multiple={isMulti}
                  value={(criteria as any)[field.field_name] || (isMulti ? [] : '')}
                  onChange={handleSelectChange(field.field_name)}
                  displayEmpty
                  size={inputSize}
                  fullWidth
                  sx={{
                    '& .MuiSelect-select': {
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }
                  }}
                  renderValue={(selected) => {
                    if (Array.isArray(selected)) {
                      if (selected.length === 0) return <span style={{ color: '#94A3B8' }}>{t(field.hebrew_desc)}</span>;
                      if (selected.length === 1) {
                        const opt = field.options?.find(o => o.value === selected[0]);
                        return opt ? t(opt.label) : selected[0];
                      }
                      return `${selected.length} נבחרו`;
                    }
                    if (!selected) return <span style={{ color: '#94A3B8' }}>{t(field.hebrew_desc)}</span>;
                    return selected as string;
                  }}
                >
                  {field.options?.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {isMulti && (
                        <Checkbox checked={((criteria as any)[field.field_name] || []).includes(opt.value as never)} />
                      )}
                      {t(opt.label)}
                    </MenuItem>
                  ))}
                </Select>
              </FieldLabel>
            );
          }

          if (field.field_type === 'WERKS_SELECTOR') {
            const currentLogic = (criteria as any)[`${field.field_name}_LOGIC`] || 'OR';
            const selectedPlants = (criteria as any)[field.field_name] || [];
            
            return (
              <Box
                key={field.field_name}
                sx={{
                  gridColumn: grid ? { xs: 'span 1', sm: 'span 2' } : undefined,
                }}
              >
                <FieldLabel label={t(field.hebrew_desc)}>
                  <Select
                    multiple
                    value={selectedPlants}
                    onChange={handleSelectChange(field.field_name)}
                    displayEmpty
                    size={inputSize}
                    fullWidth
                    sx={{
                      '& .MuiSelect-select': {
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }
                    }}
                    renderValue={(selected) => {
                      if (Array.isArray(selected)) {
                        if (selected.length === 0) return <span style={{ color: '#94A3B8' }}>{t(field.hebrew_desc)}</span>;
                        if (selected.length === 1) {
                          const opt = field.options?.find(o => o.value === selected[0]);
                          return opt ? t(opt.label) : selected[0];
                        }
                        return `${selected.length} נבחרו`;
                      }
                      return selected as string;
                    }}
                  >
                    {field.options?.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>
                        <Checkbox checked={selectedPlants.includes(opt.value as never)} />
                        {t(opt.label)}
                      </MenuItem>
                    ))}
                  </Select>

                  {/* OR/AND toggle */}
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                    <ToggleButtonGroup
                      value={currentLogic}
                      exclusive
                      onChange={handleLogicChange(field.field_name)}
                      aria-label="logic operator"
                      size="small"
                      fullWidth
                      sx={{
                        '& .MuiToggleButton-root': {
                          whiteSpace: 'nowrap',
                          fontSize: '0.72rem',
                          py: 0.4,
                          textTransform: 'none',
                          borderColor: 'divider',
                        }
                      }}
                    >
                      <ToggleButton value="OR" aria-label="match any">
                        {t('materialSearch.filters.matchAny')}
                      </ToggleButton>
                      <ToggleButton value="AND" aria-label="match all">
                        {t('materialSearch.filters.matchAll')}
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </FieldLabel>
              </Box>
            );
          }

          if (field.field_type === 'BOOLEAN' || field.field_type === 'boolean') {
            const isLvorm = field.field_name === 'LVORM';
            const isChecked = isLvorm ? !((criteria as any)[field.field_name]) : !!((criteria as any)[field.field_name]);
            
            return (
              <FormControlLabel
                key={field.field_name}
                control={
                  <Checkbox 
                    checked={isChecked} 
                    onChange={(e) => handleCheckboxChange(field.field_name)(e as any)} 
                  />
                }
                label={t(field.hebrew_desc)}
                sx={{ 
                  mt: grid ? 0 : 0,
                  display: 'flex',
                  alignItems: 'center',
                  height: grid ? 56 : undefined,
                  alignSelf: 'flex-end',
                  pl: grid ? 1 : 0
                }}
              />
            );
          }

          return null;
        })}
      </Box>

      <Box sx={{ 
        mt: grid ? 4 : 3,
        display: 'flex', 
        flexDirection: grid ? 'row' : 'column', 
        gap: grid ? 2 : 1.5,
        justifyContent: grid ? 'flex-end' : 'flex-start',
        alignItems: grid ? 'center' : 'stretch',
      }}>
        <Button 
          type="button"
          variant="outlined" 
          color="inherit" 
          fullWidth={!grid}
          size={buttonSize}
          startIcon={<ClearIcon />}
          onClick={onClear}
          disabled={isLoading}
          sx={{
            minWidth: grid ? 130 : undefined,
            color: 'text.secondary',
            borderColor: 'rgba(0,0,0,0.15)',
            '&:hover': {
              borderColor: 'rgba(0,0,0,0.3)',
              bgcolor: 'rgba(0,0,0,0.03)',
              transform: 'none',
              boxShadow: 'none',
            },
          }}
        >
          {t('materialSearch.filters.clearFilters')}
        </Button>

        <Button 
          type="submit"
          variant="contained" 
          fullWidth={!grid}
          size={buttonSize}
          startIcon={<SearchIcon />}
          disabled={isLoading}
          sx={{
            minWidth: grid ? 180 : undefined,
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
            fontWeight: 700,
            letterSpacing: '0.02em',
            fontSize: grid ? '1rem' : undefined,
            py: grid ? 1.5 : undefined,
            '&:hover': {
              background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)',
              boxShadow: '0 6px 20px rgba(79, 70, 229, 0.5)',
              transform: 'translateY(-2px)',
            },
            '&:active': {
              transform: 'translateY(0)',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {isLoading ? t('materialSearch.results.loading') : t('materialSearch.search')}
        </Button>
      </Box>
    </Box>
  );
}
