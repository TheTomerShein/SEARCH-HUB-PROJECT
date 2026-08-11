import { useMemo, useState, useCallback, memo } from 'react';
import {
  Box,
  TextField,
  Checkbox,
  Chip,
  FormControlLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  Tooltip,
  CircularProgress,
  Fab,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import CloseIcon from '@mui/icons-material/Close';
import CancelIcon from '@mui/icons-material/Cancel';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { useTranslation } from 'react-i18next';
import {
  SearchCriteria,
  SearchFieldDefinition,
  FieldOption,
  fieldKey,
} from '../types/material';
import {
  asStringList,
  dedupeStrings,
  handleMultiPaste,
} from './filters/multiValuePaste';

export { defaultCriteria } from '../defaultCriteria';

export interface MaterialSearchFiltersProps {
  fields: SearchFieldDefinition[];
  criteria: SearchCriteria;
  onChange: (criteria: SearchCriteria) => void;
  onSearch: () => void;
  onClear: () => void;
  isLoading?: boolean;
  grid?: boolean;
  /** Show “changes not applied” chip (sidebar after search). */
  isDirty?: boolean;
  /** Sticky action footer (sidebar layout). */
  stickyActions?: boolean;
}

const HEEBO = '"Heebo", "Segoe UI", system-ui, sans-serif';
/** Only ever mount this many Chip nodes in the field (even when focused). */
const LIMIT_TAGS = 2;

/** Narrow i18n fn — old i18next `TFunction` return type is not ReactNode-safe. */
type Translate = (key: string, defaultOrOpts?: string | Record<string, unknown>) => string;

const chipSx = {
  height: 24,
  maxWidth: 140,
  fontFamily: HEEBO,
  fontWeight: 600,
  borderRadius: '8px',
  bgcolor: 'rgba(79, 70, 229, 0.1)',
  color: '#3730A3',
  border: '1px solid rgba(99, 102, 241, 0.25)',
  '& .MuiChip-label': {
    px: 0.75,
    fontSize: '0.72rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  '& .MuiChip-deleteIcon': {
    fontSize: '1rem',
    color: 'rgba(55, 48, 163, 0.5)',
    '&:hover': { color: '#4F46E5' },
  },
} as const;

/** Overflow count chip — clickable → manager dialog. */
const moreChipSx = {
  height: 24,
  minWidth: 32,
  fontFamily: HEEBO,
  fontWeight: 700,
  borderRadius: '8px',
  bgcolor: '#F1F5F9',
  color: '#475569',
  border: '1px solid #E2E8F0',
  cursor: 'pointer',
  m: '2px',
  '&:hover': {
    bgcolor: '#E2E8F0',
    borderColor: '#CBD5E1',
  },
  '& .MuiChip-label': {
    px: 0.75,
    fontSize: '0.72rem',
  },
} as const;

const MANAGER_ROW_H = 32;
const MANAGER_LIST_H = 220;

type ManagerListData = {
  items: string[];
  getLabel: (v: string) => string;
  onRemove: (v: string) => void;
};

/** One virtualized row = chip look (only ~12 chips mounted at a time). */
const ManagerRow = memo(function ManagerRow({ index, style, data }: ListChildComponentProps) {
  const { items, getLabel, onRemove } = data as ManagerListData;
  const v = items[index];
  if (v == null) return null;
  const label = getLabel(v);
  return (
    <div style={style}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          px: 1.25,
          py: 0.25,
          boxSizing: 'border-box',
        }}
      >
        <Chip
          size="small"
          label={label}
          onDelete={() => onRemove(v)}
          deleteIcon={<CancelIcon />}
          sx={{
            ...chipSx,
            maxWidth: '100%',
            height: 26,
            flex: 1,
            justifyContent: 'space-between',
            bgcolor: '#EEF2FF',
            border: '1px solid #C7D2FE',
            borderRadius: '999px',
            boxShadow: 'none',
            '& .MuiChip-label': {
              ...chipSx['& .MuiChip-label'],
              fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: '0.75rem',
              fontWeight: 600,
              px: 1,
            },
            '& .MuiChip-deleteIcon': {
              fontSize: '1rem',
              color: '#818CF8',
              mr: 0.35,
              '&:hover': { color: '#4F46E5' },
            },
          }}
          title={label}
        />
      </Box>
    </div>
  );
});

/**
 * Virtualized manager: view / search / delete many values without freezing.
 * Opened from the +N chip on multi-value fields.
 */
function MultiValuesManagerDialog({
  open,
  onClose,
  title,
  values,
  getLabel,
  onChangeValues,
  t,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  values: string[];
  getLabel: (v: string) => string;
  onChangeValues: (next: string[]) => void;
  t: Translate;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return values;
    return values.filter((v) => {
      const label = getLabel(v).toLowerCase();
      return label.includes(q) || String(v).toLowerCase().includes(q);
    });
  }, [values, query, getLabel]);

  const removeOne = useCallback(
    (v: string) => {
      onChangeValues(values.filter((x) => String(x) !== String(v)));
    },
    [values, onChangeValues],
  );

  const clearAll = () => onChangeValues([]);

  const removeFiltered = () => {
    if (filtered.length === 0) return;
    const drop = new Set(filtered.map(String));
    onChangeValues(values.filter((x) => !drop.has(String(x))));
  };

  const listData: ManagerListData = useMemo(
    () => ({ items: filtered, getLabel, onRemove: removeOne }),
    [filtered, getLabel, removeOne],
  );

  // Reset search when reopening
  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      dir="rtl"
      keepMounted={false}
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden',
          maxWidth: 380,
          boxShadow: '0 12px 28px -8px rgba(15, 23, 42, 0.2)',
          border: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontFamily: HEEBO,
          py: 1,
          px: 1.5,
          background: 'linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 70%)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            minWidth: 28,
            height: 28,
            px: 0.75,
            borderRadius: 1.5,
            bgcolor: 'rgba(79, 70, 229, 0.12)',
            color: 'primary.dark',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.7rem',
            flexShrink: 0,
          }}
        >
          {values.length > 999 ? '999+' : values.length}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            fontWeight={800}
            noWrap
            sx={{ letterSpacing: '-0.02em', lineHeight: 1.25, fontSize: '0.9rem' }}
          >
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.68rem' }}>
            {`${t('materialSearch.filters.multiManagerCount', {
              shown: filtered.length,
              total: values.length,
              defaultValue: `${filtered.length} / ${values.length} ערכים`,
            })}${query.trim() ? ` · ${t('materialSearch.filters.multiManagerFiltered', 'מסונן')}` : ''}`}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small" aria-label="close" sx={{ p: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column', bgcolor: '#FAFBFC' }}>
        <Box sx={{ px: 1.5, pt: 1.25, pb: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('materialSearch.filters.multiManagerSearch', 'חיפוש בערכים…')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              fontFamily: HEEBO,
              '& .MuiOutlinedInput-root': {
                bgcolor: '#fff',
                borderRadius: 1.5,
                fontSize: '0.8125rem',
              },
              '& .MuiOutlinedInput-input': { py: 0.85 },
            }}
          />
        </Box>

        {filtered.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center', px: 2 }}>
            <Typography color="text.secondary" variant="caption" sx={{ fontFamily: HEEBO }}>
              {values.length === 0
                ? t('materialSearch.filters.multiManagerEmpty', 'אין ערכים')
                : t('materialSearch.filters.multiManagerNoMatch', 'לא נמצאו תוצאות')}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ px: 0.5, pb: 0.5 }}>
            <List
              height={MANAGER_LIST_H}
              width="100%"
              itemCount={filtered.length}
              itemSize={MANAGER_ROW_H}
              itemData={listData}
              overscanCount={8}
              style={{ direction: 'rtl' }}
            >
              {ManagerRow}
            </List>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 1.5,
          py: 1,
          gap: 0.75,
          flexWrap: 'wrap',
          bgcolor: '#fff',
          borderTop: '1px solid',
          borderColor: 'divider',
          minHeight: 0,
        }}
      >
        <Button
          color="error"
          variant="text"
          size="small"
          disabled={values.length === 0}
          onClick={clearAll}
          sx={{ fontFamily: HEEBO, fontSize: '0.75rem', minWidth: 0, px: 1 }}
        >
          {t('materialSearch.filters.multiManagerClearAll', 'נקה הכל')}
        </Button>
        {query.trim() && filtered.length > 0 && filtered.length < values.length && (
          <Button
            color="warning"
            variant="text"
            size="small"
            onClick={removeFiltered}
            sx={{ fontFamily: HEEBO, fontSize: '0.75rem', minWidth: 0, px: 1 }}
          >
            {t('materialSearch.filters.multiManagerClearFiltered', {
              count: filtered.length,
              defaultValue: `מחק מסוננים (${filtered.length})`,
            })}
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          size="small"
          onClick={handleClose}
          sx={{ fontFamily: HEEBO, borderRadius: 1.5, px: 1.75, fontWeight: 700, fontSize: '0.8rem' }}
        >
          {t('materialSearch.filters.multiManagerDone', 'סיום')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Shared Autocomplete chrome for multi-value fields. */
const autoSx = {
  fontFamily: HEEBO,
  '& .MuiOutlinedInput-root': {
    bgcolor: '#F8FAFC',
    borderRadius: '10px',
    py: 0.35,
    fontFamily: HEEBO,
    '&:hover': { bgcolor: '#F1F5F9' },
    '&.Mui-focused': {
      bgcolor: '#FFFFFF',
      boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.12)',
    },
    '& fieldset': { borderColor: '#E2E8F0', borderRadius: '10px' },
    '&:hover fieldset': { borderColor: '#CBD5E1' },
    '&.Mui-focused fieldset': { borderColor: '#4F46E5', borderWidth: '1px' },
  },
  '& .MuiAutocomplete-tag': { m: '2px' },
} as const;

/**
 * CRITICAL: Always render at most LIMIT_TAGS chips — even when focused.
 * +N opens virtualized manager to view/delete the rest without freezing.
 */
function renderLimitedTags(
  allValues: string[],
  getTagProps: (args: { index: number }) => Record<string, unknown>,
  getLabel: (v: string) => string,
  onOpenManager: () => void,
) {
  const shown = allValues.slice(0, LIMIT_TAGS);
  const more = allValues.length - shown.length;

  return (
    <>
      {shown.map((v, index) => {
        const { key, ...tagProps } = getTagProps({ index }) as {
          key: string;
        } & Record<string, unknown>;
        return (
          <Chip
            key={key ?? `${v}-${index}`}
            size="small"
            label={getLabel(v)}
            {...tagProps}
            sx={chipSx}
          />
        );
      })}
      {more > 0 && (
        <Chip
          size="small"
          label={`+${more}`}
          title={`${allValues.length} values — click to view / delete`}
          sx={moreChipSx}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenManager();
          }}
        />
      )}
    </>
  );
}

/**
 * Multi free-text (MATNR, etc.): Autocomplete freeSolo.
 * Enter / paste / blur; × removes visible chip; +N opens manager.
 */
function FreeSoloMultiField({
  values,
  onChangeValues,
  placeholder,
  size,
  t,
  digitsOnly,
  maxLength,
  autoFocus,
  fieldTitle,
}: {
  values: string[];
  onChangeValues: (next: string[]) => void;
  placeholder: string;
  size: 'small' | 'medium';
  t: Translate;
  digitsOnly?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  fieldTitle: string;
}) {
  const [managerOpen, setManagerOpen] = useState(false);
  const getLabel = useCallback((v: string) => v, []);

  return (
    <>
      <Autocomplete
        multiple
        freeSolo
        options={[]}
        filterOptions={(x) => x}
        value={values}
        onChange={(_, next) => {
          onChangeValues(dedupeStrings(next.map(String)));
        }}
        limitTags={-1}
        size={size}
        fullWidth
        clearOnBlur
        selectOnFocus
        handleHomeEndKeys
        openOnFocus={false}
        sx={autoSx}
        renderTags={(tagValue, getTagProps) =>
          renderLimitedTags(
            tagValue.map(String),
            getTagProps,
            getLabel,
            () => setManagerOpen(true),
          )
        }
        renderInput={(params) => (
          <TextField
            {...params}
            autoFocus={autoFocus}
            placeholder={
              values.length === 0
                ? placeholder
                : t('materialSearch.filters.chipEnterHint', 'Enter להוספה')
            }
            onPaste={(e) =>
              handleMultiPaste(e, values, onChangeValues, { digitsOnly })
            }
            inputProps={{
              ...params.inputProps,
              maxLength,
              onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                if (digitsOnly) {
                  const k = e.key;
                  const ok =
                    k.length > 1 ||
                    /[0-9]/.test(k) ||
                    e.ctrlKey ||
                    e.metaKey ||
                    e.altKey;
                  if (!ok) e.preventDefault();
                }
                if (e.key === 'Enter') e.preventDefault();
              },
            }}
          />
        )}
      />
      <MultiValuesManagerDialog
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        title={fieldTitle}
        values={values}
        getLabel={getLabel}
        onChangeValues={onChangeValues}
        t={t}
      />
    </>
  );
}

/**
 * Multi option fields (MTART, WERKS, …): Autocomplete multiple.
 * Stores string[] of option values on criteria.
 */
function OptionsMultiField({
  values,
  options,
  onChangeValues,
  placeholder,
  size,
  t,
  fieldTitle,
}: {
  values: string[];
  options: FieldOption[];
  onChangeValues: (next: string[]) => void;
  placeholder: string;
  size: 'small' | 'medium';
  t: Translate;
  fieldTitle: string;
}) {
  const [managerOpen, setManagerOpen] = useState(false);

  const byValue = useMemo(
    () => new Map(options.map((o) => [String(o.value).toUpperCase(), o])),
    [options],
  );

  const displayValue: Array<FieldOption | string> = useMemo(
    () =>
      values.map((v) => {
        const opt = byValue.get(String(v).toUpperCase());
        return opt ?? v;
      }),
    [values, byValue],
  );

  const resolveToken = useCallback(
    (token: string): string | null => {
      const tnorm = token.trim();
      if (!tnorm) return null;
      const byVal = byValue.get(tnorm.toUpperCase());
      if (byVal) return String(byVal.value);
      return tnorm;
    },
    [byValue],
  );

  const getLabel = useCallback(
    (v: string) => {
      const opt = byValue.get(String(v).toUpperCase());
      return opt ? t(opt.label) : v;
    },
    [byValue, t],
  );

  const checkedSet = useMemo(() => new Set(values.map(String)), [values]);

  return (
    <>
      <Autocomplete
        multiple
        options={options}
        value={displayValue}
        isOptionEqualToValue={(a, b) => {
          const av = typeof a === 'string' ? a : String(a.value);
          const bv = typeof b === 'string' ? b : String(b.value);
          return av === bv;
        }}
        getOptionLabel={(o) =>
          typeof o === 'string' ? o : t(o.label) || String(o.value)
        }
        onChange={(_, next) => {
          const vals = next.map((o) =>
            typeof o === 'string' ? o.trim() : String(o.value),
          );
          onChangeValues(dedupeStrings(vals));
        }}
        limitTags={-1}
        size={size}
        fullWidth
        disableCloseOnSelect
        sx={autoSx}
        renderOption={(props, option) => {
          const { key, ...rest } = props as { key?: string } & typeof props;
          const label =
            typeof option === 'string' ? option : t(option.label) || String(option.value);
          const val = typeof option === 'string' ? option : String(option.value);
          const checked = checkedSet.has(val);
          return (
            <li key={key ?? val} {...rest}>
              <Checkbox size="small" checked={checked} sx={{ mr: 1, p: 0.5 }} />
              {label}
            </li>
          );
        }}
        renderTags={(tagValue, getTagProps) =>
          renderLimitedTags(
            tagValue.map((o) => (typeof o === 'string' ? o : String(o.value))),
            getTagProps,
            getLabel,
            () => setManagerOpen(true),
          )
        }
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={values.length === 0 ? placeholder : undefined}
            onPaste={(e) =>
              handleMultiPaste(e, values, onChangeValues, { resolveToken })
            }
          />
        )}
      />
      <MultiValuesManagerDialog
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        title={fieldTitle}
        values={values}
        getLabel={getLabel}
        onChangeValues={onChangeValues}
        t={t}
      />
    </>
  );
}

/** Label above control — avoids MUI RTL notch issues. */
function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.65 }}>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          color: '#64748B',
          fontSize: '0.75rem',
          letterSpacing: '0.02em',
          pr: 0.25,
          fontFamily: HEEBO,
          lineHeight: 1.25,
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
  grid = false,
  isDirty = false,
  stickyActions = false,
}: MaterialSearchFiltersProps) {
  const { t } = useTranslation();

  const setFieldValues = (field: string, next: string[]) => {
    onChange({ ...criteria, [field]: next });
  };

  const handleSelectChange = (field: string) => (event: SelectChangeEvent<unknown>) => {
    onChange({ ...criteria, [field]: event.target.value as SearchCriteria[string] });
  };

  const handleCheckboxChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...criteria, [field]: event.target.checked });
  };

  const handleLogicChange = (field: string) => (
    _event: React.MouseEvent<HTMLElement>,
    newLogic: 'OR' | 'AND' | null,
  ) => {
    if (newLogic !== null) {
      onChange({ ...criteria, [`${field}_LOGIC`]: newLogic });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  const inputSize = grid ? 'medium' : 'small';
  const buttonSize = grid ? 'large' : 'medium';

  const renderField = (field: SearchFieldDefinition, index: number) => {
    const type = (field.fieldType || 'CHAR').toUpperCase();
    const rowKey = `${fieldKey(field)}#${index}`;
    const isWerksField =
      type === 'WERKS_SELECTOR' || field.fieldName?.toUpperCase() === 'WERKS';
    const fieldLabel =
      isWerksField && (!field.hebrewDesc || field.hebrewDesc.toUpperCase() === 'WERKS')
        ? t('materialSearch.filters.plants')
        : t(field.hebrewDesc);

    // ── WERKS: multi + OR/AND ───────────────────────────────────────────
    if (isWerksField) {
      const currentLogic = (criteria as any)[`${field.fieldName}_LOGIC`] || 'OR';
      const selectedPlants = asStringList((criteria as any)[field.fieldName]);

      return (
        <FieldLabel key={rowKey} label={fieldLabel}>
          <OptionsMultiField
            values={selectedPlants}
            options={field.options ?? []}
            onChangeValues={(next) => setFieldValues(field.fieldName, next)}
            placeholder={fieldLabel}
            size="small"
            t={t}
            fieldTitle={fieldLabel}
          />
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75 }}>
            <ToggleButtonGroup
              value={currentLogic}
              exclusive
              onChange={handleLogicChange(field.fieldName)}
              aria-label="logic operator"
              size="small"
              fullWidth
              sx={{
                '& .MuiToggleButton-root': {
                  whiteSpace: 'nowrap',
                  fontSize: '0.68rem',
                  py: 0.25,
                  minHeight: 28,
                  textTransform: 'none',
                  borderColor: 'divider',
                  fontFamily: HEEBO,
                },
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
      );
    }

    // ── Free text (MATNR, description, …): freeSolo multi chips ─────────
    if (type === 'CHAR' || type === 'NUMC' || type === 'QUAN' || type === 'STRING' || type === 'NUMBER') {
      const vals = asStringList((criteria as any)[field.fieldName]);
      return (
        <FieldLabel key={rowKey} label={t(field.hebrewDesc)}>
          <FreeSoloMultiField
            values={vals}
            onChangeValues={(next) => setFieldValues(field.fieldName, next)}
            placeholder={t(field.hebrewDesc)}
            size={inputSize}
            t={t}
            digitsOnly={type === 'NUMC' || type === 'QUAN'}
            maxLength={field.fieldLength}
            autoFocus={index === 0}
            fieldTitle={t(field.hebrewDesc)}
          />
        </FieldLabel>
      );
    }

    if (type === 'DATS' || type === 'DATE') {
      const rawVal = (criteria as any)[field.fieldName] || '';
      const displayVal =
        rawVal.length === 8
          ? `${rawVal.slice(0, 4)}-${rawVal.slice(4, 6)}-${rawVal.slice(6, 8)}`
          : '';
      return (
        <FieldLabel key={rowKey} label={t(field.hebrewDesc)}>
          <TextField
            type="date"
            size={inputSize}
            fullWidth
            value={displayVal}
            onChange={(e) => {
              const val = e.target.value;
              onChange({ ...criteria, [field.fieldName]: val.replace(/-/g, '') });
            }}
          />
        </FieldLabel>
      );
    }

    // ── MULTI_SELECT / SELECT ───────────────────────────────────────────
    if (type === 'MULTI_SELECT' || type === 'SELECT') {
      const isMulti = type === 'MULTI_SELECT';
      if (isMulti) {
        const multiVals = asStringList((criteria as any)[field.fieldName]);
        return (
          <FieldLabel key={rowKey} label={t(field.hebrewDesc)}>
            <OptionsMultiField
              values={multiVals}
              options={field.options ?? []}
              onChangeValues={(next) => setFieldValues(field.fieldName, next)}
              placeholder={t(field.hebrewDesc)}
              size={inputSize}
              t={t}
              fieldTitle={t(field.hebrewDesc)}
            />
          </FieldLabel>
        );
      }

      return (
        <FieldLabel key={rowKey} label={t(field.hebrewDesc)}>
          <Select
            value={(criteria as any)[field.fieldName] || ''}
            onChange={handleSelectChange(field.fieldName)}
            displayEmpty
            size={inputSize}
            fullWidth
            sx={{
              bgcolor: '#F8FAFC',
              borderRadius: '10px',
              '& .MuiSelect-select': {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
            }}
            renderValue={(selected) => {
              if (!selected) {
                return <span style={{ color: '#94A3B8' }}>{t(field.hebrewDesc)}</span>;
              }
              const opt = field.options?.find((o) => o.value === selected);
              return opt ? t(opt.label) : String(selected);
            }}
          >
            {field.options?.map((opt) => (
              <MenuItem key={String(opt.value)} value={opt.value}>
                {t(opt.label)}
              </MenuItem>
            ))}
          </Select>
        </FieldLabel>
      );
    }

    if (type === 'BOOLEAN') {
      return (
        <FormControlLabel
          key={rowKey}
          control={
            <Checkbox
              checked={!!((criteria as any)[field.fieldName])}
              onChange={(e) => handleCheckboxChange(field.fieldName)(e as any)}
            />
          }
          label={t(field.hebrewDesc)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            height: grid ? 56 : undefined,
            alignSelf: 'flex-end',
            pl: grid ? 1 : 0,
          }}
        />
      );
    }

    const fallbackVals = asStringList((criteria as any)[field.fieldName]);
    return (
      <FieldLabel key={rowKey} label={t(field.hebrewDesc)}>
        <FreeSoloMultiField
          values={fallbackVals}
          onChangeValues={(next) => setFieldValues(field.fieldName, next)}
          placeholder={t(field.hebrewDesc)}
          size={inputSize}
          t={t}
          maxLength={field.fieldLength || undefined}
          fieldTitle={t(field.hebrewDesc)}
        />
      </FieldLabel>
    );
  };

  return (
    <Box
      component="form"
      onSubmit={handleFormSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: stickyActions ? '100%' : undefined,
        minHeight: 0,
        fontFamily: HEEBO,
        '& .MuiTypography-root, & .MuiInputBase-root, & .MuiButton-root, & .MuiFormControlLabel-label, & .MuiToggleButton-root':
          { fontFamily: HEEBO },
      }}
    >
      <Box
        sx={{
          display: grid ? 'grid' : 'flex',
          flexDirection: grid ? undefined : 'column',
          gridTemplateColumns: grid
            ? {
                xs: '1fr',
                sm: '1fr 1fr',
                md: '1fr 1fr 1fr',
                lg: '1fr 1fr 1fr 1fr',
              }
            : undefined,
          gap: grid ? 3 : 1.75,
          width: '100%',
          flex: stickyActions ? 1 : undefined,
          maxHeight: grid ? 'calc(100vh - 320px)' : stickyActions ? undefined : 'none',
          overflowY: grid || stickyActions ? 'auto' : 'visible',
          minHeight: 0,
          pr: grid || stickyActions ? 1 : 0,
          pt: grid ? 0.5 : 0.25,
          '&::-webkit-scrollbar': { width: '5px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: grid ? '#C7D2FE' : '#cbd5e1',
            borderRadius: '3px',
          },
        }}
      >
        {fields.map((f, i) => renderField(f, i))}
      </Box>

      <Box
        sx={{
          mt: stickyActions ? 0 : grid ? 4 : 2.5,
          pt: stickyActions ? 1.5 : 0,
          display: 'flex',
          flexDirection: grid ? 'row' : 'column',
          gap: grid ? 2 : 1.25,
          justifyContent: grid ? 'flex-end' : 'flex-start',
          alignItems: grid ? 'center' : 'stretch',
          flexShrink: 0,
          ...(stickyActions
            ? {
                position: 'sticky',
                bottom: 0,
                bgcolor: 'background.paper',
                borderTop: '1px solid',
                borderColor: 'divider',
                pb: 0.5,
                zIndex: 2,
              }
            : {}),
        }}
      >
        {isDirty && !grid && (
          <span className="mdg-dirty-chip">
            {t('materialSearch.filters.dirtyDraft', 'שינויים לא הוחלו')}
          </span>
        )}
        <Button
          type="button"
          variant={grid ? 'outlined' : 'text'}
          color="inherit"
          fullWidth={!grid}
          size={buttonSize}
          startIcon={<FilterAltOffIcon />}
          onClick={onClear}
          sx={
            grid
              ? {
                  minWidth: 130,
                  color: 'text.secondary',
                  borderColor: 'rgba(0,0,0,0.15)',
                  '&:hover': {
                    borderColor: 'rgba(0,0,0,0.3)',
                    bgcolor: 'rgba(0,0,0,0.03)',
                    transform: 'none',
                    boxShadow: 'none',
                  },
                }
              : {
                  color: 'text.secondary',
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'action.hover', transform: 'none', boxShadow: 'none' },
                }
          }
        >
          {t('materialSearch.filters.clearFilters')}
        </Button>

        {grid ? (
          <Tooltip
            title={
              isLoading
                ? t('materialSearch.results.loading', 'טוען חומרים...')
                : t('materialSearch.search', 'חיפוש')
            }
            arrow
            placement="top"
          >
            <span>
              <Fab
                type="submit"
                color="primary"
                className={isLoading ? 'mdg-search-fab--busy' : undefined}
                aria-label={t('materialSearch.search', 'חיפוש')}
                aria-busy={isLoading || undefined}
                disabled={isLoading}
                sx={{
                  width: 72,
                  height: 72,
                  background: 'linear-gradient(145deg, #6366F1 0%, #4F46E5 45%, #7C3AED 100%)',
                  boxShadow:
                    '0 8px 24px rgba(79, 70, 229, 0.4), 0 0 0 6px rgba(79, 70, 229, 0.1)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    background: 'linear-gradient(145deg, #4F46E5 0%, #4338CA 50%, #6D28D9 100%)',
                    boxShadow:
                      '0 12px 32px rgba(79, 70, 229, 0.5), 0 0 0 8px rgba(79, 70, 229, 0.14)',
                    transform: isLoading ? 'none' : 'translateY(-3px) scale(1.04)',
                  },
                  '&:active': {
                    transform: 'translateY(0) scale(0.98)',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                  },
                  '&.Mui-disabled': {
                    background: 'linear-gradient(145deg, #6366F1 0%, #4F46E5 50%, #7C3AED 100%)',
                    color: '#fff',
                    opacity: 1,
                  },
                }}
              >
                {isLoading ? (
                  <CircularProgress size={30} thickness={4} sx={{ color: '#fff' }} />
                ) : (
                  <SearchIcon className="mdg-search-fab-icon" sx={{ fontSize: 36 }} />
                )}
              </Fab>
            </span>
          </Tooltip>
        ) : (
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size={buttonSize}
            startIcon={
              isLoading ? (
                <CircularProgress size={18} thickness={4} color="inherit" />
              ) : (
                <SearchIcon />
              )
            }
            disabled={isLoading}
            aria-busy={isLoading || undefined}
            sx={{
              fontWeight: 700,
              boxShadow: 'none',
              minHeight: 42,
              '&:hover': { boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)', transform: 'none' },
            }}
          >
            {isLoading ? t('materialSearch.results.loading') : t('materialSearch.search')}
          </Button>
        )}
      </Box>
    </Box>
  );
}
