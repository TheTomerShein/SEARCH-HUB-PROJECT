import { useMemo, useState, useCallback, memo, useRef } from 'react';
import {
  Box,
  TextField,
  Checkbox,
  Chip,
  FormControlLabel,
  Select,
  MenuItem,
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
import {
  isRequiredCriteriaFieldName,
  isCriteriaValueFilled,
  getMissingRequiredCriteriaFieldNames,
  criteriaHasAllRequired,
} from '../requiredCriteriaFields';

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

/** Shared Autocomplete chrome — idle / hover / focus ladder. */
const autoSx = {
  fontFamily: HEEBO,
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  '& .MuiOutlinedInput-root': {
    bgcolor: '#F8FAFC',
    borderRadius: '10px',
    minHeight: 38,
    py: 0.25,
    fontFamily: HEEBO,
    maxWidth: '100%',
    transition: 'background-color 0.12s ease, box-shadow 0.12s ease',
    '&:hover': { bgcolor: '#F1F5F9' },
    '&.Mui-focused': {
      bgcolor: '#FFFFFF',
      boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.12)',
    },
    '& fieldset': { borderColor: '#E2E8F0', borderRadius: '10px' },
    '&:hover fieldset': { borderColor: '#CBD5E1' },
    '&.Mui-focused fieldset': { borderColor: '#4F46E5', borderWidth: '1px' },
  },
  '& .MuiAutocomplete-tag': { m: '2px', maxWidth: '100%' },
  '& .MuiAutocomplete-inputRoot': { flexWrap: 'wrap' },
} as const;

/** Required empty field — calm indigo, not error-red until submit fail */
const autoSxRequiredEmpty = {
  ...autoSx,
  '& .MuiOutlinedInput-root': {
    ...autoSx['& .MuiOutlinedInput-root'],
    bgcolor: '#F8FAFF',
    '& fieldset': {
      borderColor: 'rgba(79, 70, 229, 0.35)',
      borderRadius: '10px',
    },
    '&:hover fieldset': { borderColor: 'rgba(79, 70, 229, 0.5)' },
  },
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
 * Dialog mounts only when opened (many fields on hero would otherwise lag).
 */
const FreeSoloMultiField = memo(function FreeSoloMultiField({
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
  const openManager = useCallback(() => setManagerOpen(true), []);

  return (
    <>
      <Autocomplete
        multiple
        freeSolo
        options={EMPTY_OPTIONS}
        filterOptions={identityFilter}
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
        forcePopupIcon={false}
        sx={autoSx}
        renderTags={(tagValue, getTagProps) =>
          renderLimitedTags(
            tagValue.map(String),
            getTagProps,
            getLabel,
            openManager,
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
      {managerOpen && (
        <MultiValuesManagerDialog
          open
          onClose={() => setManagerOpen(false)}
          title={fieldTitle}
          values={values}
          getLabel={getLabel}
          onChangeValues={onChangeValues}
          t={t}
        />
      )}
    </>
  );
});

const EMPTY_OPTIONS: string[] = [];
const identityFilter = <T,>(x: T) => x;

/**
 * Multi option fields (MTART, WERKS, …): Autocomplete multiple.
 * Stores string[] of option values on criteria.
 */
const OptionsMultiField = memo(function OptionsMultiField({
  values,
  options,
  onChangeValues,
  placeholder,
  size,
  t,
  fieldTitle,
  requiredEmpty,
  error,
}: {
  values: string[];
  options: FieldOption[];
  onChangeValues: (next: string[]) => void;
  placeholder: string;
  size: 'small' | 'medium';
  t: Translate;
  fieldTitle: string;
  requiredEmpty?: boolean;
  error?: boolean;
}) {
  const [managerOpen, setManagerOpen] = useState(false);
  const openManager = useCallback(() => setManagerOpen(true), []);

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

  const fieldChrome = error
    ? {
      ...autoSx,
      '& .MuiOutlinedInput-root': {
        ...autoSx['& .MuiOutlinedInput-root'],
        bgcolor: '#FFF',
        '& fieldset': { borderColor: '#F43F5E', borderRadius: '10px' },
        '&.Mui-focused': {
          bgcolor: '#FFFFFF',
          boxShadow: '0 0 0 3px rgba(244, 63, 94, 0.12)',
        },
        '&.Mui-focused fieldset': { borderColor: '#F43F5E', borderWidth: '1px' },
      },
    }
    : requiredEmpty
      ? autoSxRequiredEmpty
      : autoSx;

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
        sx={fieldChrome}
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
            openManager,
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
      {managerOpen && (
        <MultiValuesManagerDialog
          open
          onClose={() => setManagerOpen(false)}
          title={fieldTitle}
          values={values}
          getLabel={getLabel}
          onChangeValues={onChangeValues}
          t={t}
        />
      )}
    </>
  );
});

/** Label above control — logical RTL spacing. */
function FieldLabel({
  label,
  required,
  error,
  errorText,
  children,
}: {
  label: string;
  required?: boolean;
  error?: boolean;
  errorText?: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          flexWrap: 'wrap',
          minHeight: 16,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: error ? 'error.main' : '#64748B',
            fontSize: '0.75rem',
            letterSpacing: '0.02em',
            fontFamily: HEEBO,
            lineHeight: 1.25,
          }}
        >
          {label}
          {required && (
            <Box
              component="span"
              sx={{ color: error ? 'error.main' : '#4F46E5', ms: 0.35 }}
              aria-hidden
            >
              *
            </Box>
          )}
        </Typography>
        {required && (
          <Box
            component="span"
            sx={{
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: error ? 'error.dark' : '#4F46E5',
              bgcolor: error ? 'rgba(239,68,68,0.1)' : 'rgba(79,70,229,0.1)',
              border: '1px solid',
              borderColor: error ? 'rgba(239,68,68,0.25)' : 'rgba(79,70,229,0.22)',
              borderRadius: '6px',
              px: 0.65,
              py: 0.15,
              lineHeight: 1.4,
              fontFamily: HEEBO,
            }}
          >
            חובה
          </Box>
        )}
      </Box>
      {children}
      {error && errorText && (
        <Typography variant="caption" color="error" sx={{ fontSize: '0.7rem', lineHeight: 1.3 }}>
          {errorText}
        </Typography>
      )}
    </Box>
  );
}

function shallowEqualValues(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
    return true;
  }
  return false;
}

type PatchCriteria = (patch: Record<string, unknown>) => void;

type CriteriaFieldItemProps = {
  field: SearchFieldDefinition;
  value: unknown;
  logicValue: unknown;
  index: number;
  inputSize: 'small' | 'medium';
  grid: boolean;
  showRequiredErrors: boolean;
  patchCriteria: PatchCriteria;
  t: Translate;
};

/**
 * One criteria control — memoized so typing in field A does not re-render fields B…N.
 */
const CriteriaFieldItem = memo(
  function CriteriaFieldItem({
    field,
    value,
    logicValue,
    index,
    inputSize,
    grid,
    showRequiredErrors,
    patchCriteria,
    t,
  }: CriteriaFieldItemProps) {
    const type = (field.fieldType || 'CHAR').toUpperCase();
    const isWerksField =
      type === 'WERKS_SELECTOR' || field.fieldName?.toUpperCase() === 'WERKS';
    const fieldLabel =
      isWerksField && (!field.hebrewDesc || field.hebrewDesc.toUpperCase() === 'WERKS')
        ? t('materialSearch.filters.plants')
        : t(field.hebrewDesc);
    const required = isRequiredCriteriaFieldName(field.fieldName);
    const fieldEmpty = !isCriteriaValueFilled(value);
    const fieldError = required && showRequiredErrors && fieldEmpty;
    const requiredErrorText = t('materialSearch.filters.requiredField', 'שדה חובה');
    const reqLabel = {
      required,
      error: fieldError,
      errorText: fieldError ? requiredErrorText : undefined,
    } as const;

    const setValues = useCallback(
      (next: string[]) => {
        patchCriteria({ [field.fieldName]: next });
      },
      [patchCriteria, field.fieldName],
    );

    // minWidth 0 so grid columns can shrink without clipping inputs
    const wrapSx = { minWidth: 0, width: '100%', maxWidth: '100%' };

    if (isWerksField) {
      const currentLogic = (logicValue as string) || 'OR';
      const selectedPlants = asStringList(value);
      return (
        <Box sx={wrapSx}>
          <FieldLabel label={fieldLabel} {...reqLabel}>
            <OptionsMultiField
              values={selectedPlants}
              options={field.options ?? []}
              onChangeValues={setValues}
              placeholder={fieldLabel}
              size={inputSize}
              t={t}
              fieldTitle={fieldLabel}
              requiredEmpty={required && fieldEmpty}
              error={fieldError}
            />
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75 }}>
              <ToggleButtonGroup
                value={currentLogic}
                exclusive
                onChange={(_e, newLogic: 'OR' | 'AND' | null) => {
                  if (newLogic != null) patchCriteria({ [`${field.fieldName}_LOGIC`]: newLogic });
                }}
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
        </Box>
      );
    }

    if (type === 'CHAR' || type === 'NUMC' || type === 'QUAN' || type === 'STRING' || type === 'NUMBER') {
      const vals = asStringList(value);
      return (
        <Box sx={wrapSx}>
          <FieldLabel label={t(field.hebrewDesc)} {...reqLabel}>
            <FreeSoloMultiField
              values={vals}
              onChangeValues={setValues}
              placeholder={t(field.hebrewDesc)}
              size={inputSize}
              t={t}
              digitsOnly={type === 'NUMC' || type === 'QUAN'}
              maxLength={field.fieldLength}
              autoFocus={index === 0}
              fieldTitle={t(field.hebrewDesc)}
            />
          </FieldLabel>
        </Box>
      );
    }

    if (type === 'DATS' || type === 'DATE') {
      const rawVal = typeof value === 'string' ? value : '';
      const displayVal =
        rawVal.length === 8
          ? `${rawVal.slice(0, 4)}-${rawVal.slice(4, 6)}-${rawVal.slice(6, 8)}`
          : '';
      return (
        <Box sx={wrapSx}>
          <FieldLabel label={t(field.hebrewDesc)} {...reqLabel}>
            <TextField
              type="date"
              size={inputSize}
              fullWidth
              value={displayVal}
              error={fieldError}
              onChange={(e) => {
                patchCriteria({ [field.fieldName]: e.target.value.replace(/-/g, '') });
              }}
            />
          </FieldLabel>
        </Box>
      );
    }

    if (type === 'MULTI_SELECT' || type === 'SELECT') {
      if (type === 'MULTI_SELECT') {
        const multiVals = asStringList(value);
        return (
          <Box sx={wrapSx}>
            <FieldLabel label={t(field.hebrewDesc)} {...reqLabel}>
              <OptionsMultiField
                values={multiVals}
                options={field.options ?? []}
                onChangeValues={setValues}
                placeholder={t(field.hebrewDesc)}
                size={inputSize}
                t={t}
                fieldTitle={t(field.hebrewDesc)}
              />
            </FieldLabel>
          </Box>
        );
      }

      return (
        <Box sx={wrapSx}>
          <FieldLabel label={t(field.hebrewDesc)} {...reqLabel}>
            <Select
              value={(value as string) || ''}
              onChange={(e) => patchCriteria({ [field.fieldName]: e.target.value })}
              displayEmpty
              size={inputSize}
              fullWidth
              error={fieldError}
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
        </Box>
      );
    }

    if (type === 'BOOLEAN') {
      return (
        <Box sx={wrapSx}>
          <FormControlLabel
            control={
              <Checkbox
                checked={!!value}
                onChange={(e) => patchCriteria({ [field.fieldName]: e.target.checked })}
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
        </Box>
      );
    }

    const fallbackVals = asStringList(value);
    return (
      <Box sx={wrapSx}>
        <FieldLabel label={t(field.hebrewDesc)} {...reqLabel}>
          <FreeSoloMultiField
            values={fallbackVals}
            onChangeValues={setValues}
            placeholder={t(field.hebrewDesc)}
            size={inputSize}
            t={t}
            maxLength={field.fieldLength || undefined}
            fieldTitle={t(field.hebrewDesc)}
          />
        </FieldLabel>
      </Box>
    );
  },
  (prev, next) =>
    prev.field === next.field &&
    prev.index === next.index &&
    prev.inputSize === next.inputSize &&
    prev.grid === next.grid &&
    prev.showRequiredErrors === next.showRequiredErrors &&
    prev.t === next.t &&
    prev.patchCriteria === next.patchCriteria &&
    prev.logicValue === next.logicValue &&
    shallowEqualValues(prev.value, next.value),
);

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
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);

  const missingRequired = useMemo(
    () => getMissingRequiredCriteriaFieldNames(criteria),
    [criteria],
  );
  const canSubmit = missingRequired.length === 0;

  // Stable patcher — avoids re-creating handlers for every field on each keystroke
  const criteriaRef = useRef(criteria);
  criteriaRef.current = criteria;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const patchCriteria = useCallback<PatchCriteria>((patch) => {
    onChangeRef.current({
      ...criteriaRef.current,
      ...(patch as SearchCriteria),
    });
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!criteriaHasAllRequired(criteria)) {
      setShowRequiredErrors(true);
      return;
    }
    setShowRequiredErrors(false);
    onSearch();
  };

  const inputSize = grid ? 'medium' : 'small';
  const buttonSize = grid ? 'large' : 'medium';
  // Narrow t for memo fields (stable enough within session)
  const tFn = t as Translate;

  // Hero (grid + stickyActions): height follows fields; scrolls when parent is max-capped
  const fillViewport = grid && stickyActions;

  return (
    <Box
      component="form"
      onSubmit={handleFormSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        // Fill taller criteria card; scroll fields when content exceeds
        height: fillViewport || stickyActions ? '100%' : undefined,
        maxHeight: fillViewport || stickyActions ? '100%' : undefined,
        minHeight: 0,
        flex: fillViewport ? 1 : undefined,
        overflow: fillViewport ? 'hidden' : undefined,
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
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            }
            : undefined,
          gap: grid ? { xs: 1.25, sm: 1.5, md: 1.75 } : 1.5,
          columnGap: grid ? { xs: 1.5, sm: 2, md: 2.25 } : undefined,
          rowGap: grid ? { xs: 1.5, sm: 1.75 } : undefined,
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          flex: fillViewport || stickyActions ? 1 : undefined,
          maxHeight: fillViewport
            ? undefined
            : grid
              ? 'calc(100vh - 320px)'
              : stickyActions
                ? undefined
                : 'none',
          overflowX: 'hidden',
          overflowY: fillViewport || grid || stickyActions ? 'auto' : 'visible',
          minHeight: 0,
          px: grid ? 0.5 : 0,
          py: grid ? 0.25 : 0.25,
          scrollbarGutter: fillViewport || grid || stickyActions ? 'stable' : undefined,
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: grid ? '#A5B4FC' : '#cbd5e1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: grid ? '#818CF8' : '#94A3B8',
          },
          '& .MuiAutocomplete-root, & .MuiFormControl-root, & .MuiTextField-root': {
            maxWidth: '100%',
          },
          '& .MuiOutlinedInput-root': {
            maxWidth: '100%',
          },
        }}
      >
        {fields.map((f, i) => (
          <CriteriaFieldItem
            key={fieldKey(f)}
            field={f}
            value={(criteria as Record<string, unknown>)[f.fieldName]}
            logicValue={(criteria as Record<string, unknown>)[`${f.fieldName}_LOGIC`]}
            index={i}
            inputSize={inputSize}
            grid={grid}
            showRequiredErrors={showRequiredErrors}
            patchCriteria={patchCriteria}
            t={tFn}
          />
        ))}
      </Box>

      <Box
        sx={{
          mt: stickyActions || fillViewport ? 0.5 : grid ? 3 : 2.5,
          pt: stickyActions || fillViewport ? 1.5 : 0,
          display: 'flex',
          flexDirection: grid ? 'row' : 'column',
          gap: grid ? 2 : 1.25,
          justifyContent: grid ? 'flex-end' : 'flex-start',
          alignItems: grid ? 'center' : 'stretch',
          flexShrink: 0,
          overflow: 'visible',
          px: grid ? 1.5 : 0,
          ...(stickyActions || fillViewport
            ? {
              position: 'relative',
              bgcolor: fillViewport ? 'rgba(255,255,255,0.98)' : 'background.paper',
              pb: 1.25,
              zIndex: 2,
              // Soft dock — no hard divider (user preference)
              boxShadow: fillViewport
                ? '0 -10px 24px -12px rgba(15, 23, 42, 0.08)'
                : undefined,
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
                height: 40,
                color: '#64748B',
                borderColor: '#E2E8F0',
                bgcolor: '#F8FAFC',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#CBD5E1',
                  bgcolor: '#F1F5F9',
                  color: '#334155',
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
                : !canSubmit
                  ? t(
                    'materialSearch.filters.requiredBeforeSearch',
                    'יש למלא את שדות החובה לפני חיפוש',
                  )
                  : t('materialSearch.search', 'חיפוש')
            }
            arrow
            placement="top"
          >
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                // Padding so FAB ring/shadow is not clipped by card overflow
                p: 1,
                m: -0.5,
                lineHeight: 0,
                overflow: 'visible',
              }}
            >
              <Fab
                type="submit"
                color="primary"
                className={isLoading ? 'mdg-search-fab--busy' : undefined}
                aria-label={t('materialSearch.search', 'חיפוש')}
                aria-busy={isLoading || undefined}
                disabled={isLoading}
                sx={{
                  width: 60,
                  height: 60,
                  flexShrink: 0,
                  background: 'linear-gradient(145deg, #6366F1 0%, #4F46E5 45%, #7C3AED 100%)',
                  boxShadow: !canSubmit && !isLoading
                    ? '0 8px 22px rgba(79, 70, 229, 0.28), 0 0 0 5px rgba(245, 158, 11, 0.18)'
                    : '0 8px 22px rgba(79, 70, 229, 0.35), 0 0 0 5px rgba(79, 70, 229, 0.1)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.15s ease',
                  opacity: !canSubmit && !isLoading ? 0.88 : 1,
                  '&:hover': {
                    background: 'linear-gradient(145deg, #4F46E5 0%, #4338CA 50%, #6D28D9 100%)',
                    boxShadow:
                      '0 12px 28px rgba(79, 70, 229, 0.42), 0 0 0 6px rgba(79, 70, 229, 0.12)',
                    transform: isLoading ? 'none' : 'translateY(-2px) scale(1.03)',
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
            </Box>
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
              opacity: !canSubmit && !isLoading ? 0.85 : 1,
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
