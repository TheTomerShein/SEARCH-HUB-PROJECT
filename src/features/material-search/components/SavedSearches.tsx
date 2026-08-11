import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  savedSearchesState,
  searchSubmittedState,
  defaultSavedSearchIdState,
  type SavedSearch,
} from '../state/search.state';
import { SearchCriteria } from '../types/material';
import { isDefaultAutoSeedSuppressed } from '../utils/sessionDefaultSavedSearch';
import { criteriaFingerprint, isEmptyCriteria } from '../utils/criteriaFingerprint';

/** Payload applied to the criteria form (values + optional field visibility). */
export type ApplySavedSearchPayload = {
  criteria: SearchCriteria;
  /** undefined = leave current field visibility; null = all fields; string[] = those keys */
  searchFieldKeys?: string[] | null;
};

type Props = {
  compact?: boolean;
  /**
   * `brand` = controls on indigo hero strip (frosted, light text accents).
   * Only used with compact criteria-card header.
   */
  surface?: 'default' | 'brand';
  currentCriteria?: SearchCriteria;
  /** Current criteria-field visibility (for save + selection match). */
  currentSearchFieldKeys?: string[] | null;
  /** Fill form + remount parent; never runs search. */
  onApplySaved: (payload: ApplySavedSearchPayload) => void;
};

/**
 * Which saved search owns the current form — exact criteria match only.
 * Default shows because parent seeds draft before this Select mounts (fields loader).
 */
function resolveDisplaySelectedId(
  currentCriteria: SearchCriteria | undefined,
  selectedSearchId: string,
  savedSearches: SavedSearch[],
  defaultSearchId: string,
): string {
  const draftFp = criteriaFingerprint(currentCriteria);
  if (isEmptyCriteria(currentCriteria)) {
    // Empty form matches only a saved search that is also empty
    if (selectedSearchId) {
      const sel = savedSearches.find((s) => s.id === selectedSearchId);
      if (sel && isEmptyCriteria(sel.criteria)) return selectedSearchId;
    }
    if (defaultSearchId && !isDefaultAutoSeedSuppressed()) {
      const d = savedSearches.find((s) => s.id === defaultSearchId);
      if (d && isEmptyCriteria(d.criteria)) return d.id;
    }
    return '';
  }

  if (selectedSearchId) {
    const sel = savedSearches.find((s) => s.id === selectedSearchId);
    if (sel && draftFp === criteriaFingerprint(sel.criteria)) return selectedSearchId;
  }

  // Prefer default id when multiple saved share same criteria
  if (defaultSearchId) {
    const d = savedSearches.find((s) => s.id === defaultSearchId);
    if (d && draftFp === criteriaFingerprint(d.criteria)) return d.id;
  }

  const match = savedSearches.find((s) => criteriaFingerprint(s.criteria) === draftFp);
  return match?.id ?? '';
}

export function SavedSearches({
  compact = false,
  surface = 'default',
  currentCriteria,
  currentSearchFieldKeys = null,
  onApplySaved,
}: Props) {
  const onBrand = surface === 'brand';
  const { t } = useTranslation();
  const searchSubmitted = useRecoilValue(searchSubmittedState);
  const [savedSearches, setSavedSearches] = useRecoilState(savedSearchesState);
  const [defaultSearchId, setDefaultSearchId] = useRecoilState(defaultSavedSearchIdState);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  // Track user pick; default id is always available from Recoil for display.
  const [selectedSearchId, setSelectedSearchId] = useState<string>(() => {
    if (searchSubmitted || !defaultSearchId || isDefaultAutoSeedSuppressed()) return '';
    return savedSearches.some((s) => s.id === defaultSearchId) ? defaultSearchId : '';
  });
  const didBackupDefaultApply = useRef(false);

  const applySavedSearch = useCallback(
    (search: SavedSearch) => {
      const payload: ApplySavedSearchPayload = {
        criteria: { ...search.criteria },
      };
      if (Object.prototype.hasOwnProperty.call(search, 'searchFieldKeys')) {
        payload.searchFieldKeys =
          search.searchFieldKeys == null ? null : [...search.searchFieldKeys];
      }
      onApplySaved(payload);
      setSelectedSearchId(search.id);
    },
    [onApplySaved],
  );

  // Once: ensure Select highlights default when form already matches (atom seed).
  // Do not re-push default after user edits/empties fields.
  useEffect(() => {
    if (didBackupDefaultApply.current) return;
    if (searchSubmitted || isDefaultAutoSeedSuppressed()) return;
    if (!defaultSearchId) return;
    const search = savedSearches.find((s) => s.id === defaultSearchId);
    if (!search) return;

    const draftFp = criteriaFingerprint(currentCriteria);
    const savedFp = criteriaFingerprint(search.criteria);

    if (draftFp === savedFp) {
      didBackupDefaultApply.current = true;
      setSelectedSearchId(search.id);
      return;
    }
    // Only force-apply if form still empty (atom seed raced / missed)
    if (isEmptyCriteria(currentCriteria)) {
      didBackupDefaultApply.current = true;
      applySavedSearch(search);
    }
  }, [searchSubmitted, defaultSearchId, savedSearches, currentCriteria, applySavedSearch]);

  // When user edits away from the active saved snapshot → drop selection id.
  useEffect(() => {
    if (!selectedSearchId) return;
    const active = savedSearches.find((s) => s.id === selectedSearchId);
    if (!active) {
      setSelectedSearchId('');
      return;
    }
    if (criteriaFingerprint(currentCriteria) !== criteriaFingerprint(active.criteria)) {
      setSelectedSearchId('');
    }
  }, [currentCriteria, selectedSearchId, savedSearches]);

  const handleSaveSearch = () => {
    if (!newSearchName.trim() || !currentCriteria) return;

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: newSearchName.trim(),
      criteria: { ...currentCriteria },
      searchFieldKeys:
        currentSearchFieldKeys == null ? null : [...currentSearchFieldKeys],
    };

    setSavedSearches((prev) => [...prev, newSearch]);
    setSelectedSearchId(newSearch.id);
    if (saveAsDefault) setDefaultSearchId(newSearch.id);
    setDialogOpen(false);
    setNewSearchName('');
    setSaveAsDefault(false);
  };

  const handleApplySearch = (id: string) => {
    if (!id) return;
    const search = savedSearches.find((s) => s.id === id);
    if (!search) return;
    applySavedSearch(search);
  };

  const handleDeleteSearch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    if (selectedSearchId === id) setSelectedSearchId('');
    if (defaultSearchId === id) setDefaultSearchId('');
  };

  const handleSetDefault = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (defaultSearchId === id) {
      setDefaultSearchId('');
      return;
    }
    setDefaultSearchId(id);
    const search = savedSearches.find((s) => s.id === id);
    if (search) applySavedSearch(search);
  };

  const displaySelectedId = useMemo(
    () =>
      resolveDisplaySelectedId(
        currentCriteria,
        selectedSearchId,
        savedSearches,
        defaultSearchId,
      ),
    [currentCriteria, selectedSearchId, savedSearches, defaultSearchId],
  );

  const activeSavedSearch = displaySelectedId
    ? savedSearches.find((s) => s.id === displaySelectedId) ?? null
    : null;

  return (
    <Box sx={{ mb: compact ? 0 : 1.5, width: compact ? 'auto' : '100%' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: compact ? 'row' : 'column',
          gap: 1.5,
          alignItems: 'center',
          width: '100%',
        }}
      >
        {savedSearches.length > 0 && (
          <FormControl
            sx={{ minWidth: compact ? 220 : '100%', flex: 1 }}
            size="small"
            variant="outlined"
          >
            {activeSavedSearch && (
              <InputLabel
                id="saved-search-active-label"
                shrink
                sx={{
                  fontWeight: 700,
                  color: onBrand ? '#C7D2FE' : 'primary.main',
                  '&.Mui-focused': {
                    color: onBrand ? '#E0E7FF' : 'primary.main',
                  },
                }}
              >
                {t('materialSearch.savedSearches.currentLabel', 'חיפוש נוכחי')}
              </InputLabel>
            )}
            <Select
              labelId={activeSavedSearch ? 'saved-search-active-label' : undefined}
              label={
                activeSavedSearch
                  ? t('materialSearch.savedSearches.currentLabel', 'חיפוש נוכחי')
                  : undefined
              }
              value={displaySelectedId}
              onChange={(e) => handleApplySearch(String(e.target.value))}
              displayEmpty
              notched={!!activeSavedSearch}
              sx={
                compact && onBrand
                  ? {
                      // Glass indigo — matches brand strip, not stark white
                      color: '#EEF2FF',
                      bgcolor: 'rgba(30, 27, 75, 0.35)',
                      borderRadius: '10px',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                      '& .MuiSelect-select': {
                        color: '#F8FAFF',
                        fontWeight: activeSavedSearch ? 600 : 500,
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(199, 210, 254, 0.35)',
                      },
                      '&:hover': {
                        bgcolor: 'rgba(49, 46, 129, 0.45)',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(199, 210, 254, 0.55)',
                        },
                      },
                      '&.Mui-focused': {
                        bgcolor: 'rgba(49, 46, 129, 0.5)',
                        boxShadow: '0 0 0 3px rgba(165, 180, 252, 0.28)',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#A5B4FC',
                        },
                      },
                      '& .MuiSvgIcon-root': { color: '#C7D2FE' },
                    }
                  : compact
                    ? {
                        color: '#334155',
                        bgcolor: '#fff',
                        '& .MuiSelect-select': {
                          color: '#334155',
                          fontWeight: activeSavedSearch ? 600 : 400,
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: displaySelectedId
                            ? 'rgba(79,70,229,0.45)'
                            : 'rgba(79,70,229,0.25)',
                        },
                        '&:hover': {
                          bgcolor: '#F8FAFC',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(79,70,229,0.45)',
                          },
                        },
                        '&.Mui-focused': {
                          bgcolor: '#fff',
                          boxShadow: '0 0 0 3px rgba(79,70,229,0.12)',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4F46E5' },
                        },
                        '& .MuiSvgIcon-root': { color: '#64748B' },
                      }
                    : activeSavedSearch
                      ? { '& .MuiSelect-select': { fontWeight: 600 } }
                      : {}
              }
              renderValue={(selected) => {
                if (!selected) {
                  return (
                    <span style={{ color: onBrand ? 'rgba(226,232,240,0.75)' : '#94A3B8' }}>
                      {t('materialSearch.savedSearches.select')}
                    </span>
                  );
                }
                const search = savedSearches.find((s) => s.id === selected);
                if (!search) return '';
                const isDef = defaultSearchId === search.id;
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                    {isDef && (
                      <StarIcon sx={{ fontSize: '1rem', color: '#F59E0B', flexShrink: 0 }} />
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {search.name}
                    </span>
                  </Box>
                );
              }}
            >
              <MenuItem value="" disabled>
                <span style={{ color: '#94A3B8' }}>{t('materialSearch.savedSearches.select')}</span>
              </MenuItem>
              {savedSearches.map((search) => {
                const isDefault = defaultSearchId === search.id;
                return (
                  <MenuItem
                    key={search.id}
                    value={search.id}
                    sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, pr: 0.5 }}
                  >
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1 }}
                    >
                      {isDefault && (
                        <StarIcon sx={{ fontSize: '1rem', color: 'warning.main', flexShrink: 0 }} />
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {search.name}
                      </span>
                    </Box>
                    <Box sx={{ display: 'flex', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <Tooltip
                        title={
                          isDefault
                            ? t(
                                'materialSearch.savedSearches.isDefault',
                                'ברירת מחדל לפתיחת המסך',
                              )
                            : t(
                                'materialSearch.savedSearches.setDefault',
                                'הגדר כברירת מחדל בפתיחה',
                              )
                        }
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => handleSetDefault(search.id, e)}
                          aria-label="set default"
                        >
                          {isDefault ? (
                            <StarIcon fontSize="small" color="warning" />
                          ) : (
                            <StarBorderIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                      <IconButton size="small" onClick={(e) => handleDeleteSearch(search.id, e)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        )}

        <Button
          variant="outlined"
          color="primary"
          fullWidth={!compact}
          size="small"
          startIcon={<SaveIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{
            height: 40,
            whiteSpace: 'nowrap',
            ...(compact && onBrand
              ? {
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.45)',
                  bgcolor: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.75)',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    transform: 'none',
                    boxShadow: 'none',
                  },
                }
              : compact
                ? {
                    color: '#4F46E5',
                    borderColor: 'rgba(79,70,229,0.35)',
                    bgcolor: '#fff',
                    '&:hover': {
                      borderColor: '#4F46E5',
                      bgcolor: '#EEF2FF',
                      transform: 'none',
                      boxShadow: 'none',
                    },
                  }
                : {}),
          }}
        >
          {t('materialSearch.savedSearches.saveCurrent')}
        </Button>
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSaveAsDefault(false);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('materialSearch.savedSearches.saveTitle')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('materialSearch.savedSearches.nameLabel')}
            type="text"
            fullWidth
            variant="outlined"
            value={newSearchName}
            onChange={(e) => setNewSearchName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveSearch();
            }}
          />
          <FormControlLabel
            sx={{ mt: 1.5 }}
            control={
              <Checkbox
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
                size="small"
              />
            }
            label={t(
              'materialSearch.savedSearches.saveAsDefault',
              'הגדר כברירת מחדל בפתיחת המסך',
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialogOpen(false);
              setSaveAsDefault(false);
            }}
          >
            {t('materialSearch.savedSearches.cancel')}
          </Button>
          <Button onClick={handleSaveSearch} variant="contained" disabled={!newSearchName.trim()}>
            {t('materialSearch.savedSearches.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
