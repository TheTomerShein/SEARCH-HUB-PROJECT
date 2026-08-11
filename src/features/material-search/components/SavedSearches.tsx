import { useState, useEffect, useRef, useCallback } from 'react';
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
  Typography,
  Tooltip,
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
import {
  shouldAutoApplyDefaultSavedSearch,
  markDefaultSavedSearchApplied,
} from '../utils/sessionDefaultSavedSearch';

/** Payload applied to the criteria form (values + optional field visibility). */
export type ApplySavedSearchPayload = {
  criteria: SearchCriteria;
  /** undefined = leave current field visibility; null = all fields; string[] = those keys */
  searchFieldKeys?: string[] | null;
};

/** Stable compare — ignores key insertion order (JSON.stringify alone is flaky). */
function criteriaFingerprint(c: SearchCriteria | undefined | null): string {
  if (!c) return '';
  try {
    return JSON.stringify(c, Object.keys(c).sort());
  } catch {
    return '';
  }
}

type Props = {
  compact?: boolean;
  currentCriteria?: SearchCriteria;
  /** Current criteria-field visibility (for save + selection match). */
  currentSearchFieldKeys?: string[] | null;
  /** Fill form + remount parent; never runs search. */
  onApplySaved: (payload: ApplySavedSearchPayload) => void;
};

export function SavedSearches({
  compact = false,
  currentCriteria,
  currentSearchFieldKeys = null,
  onApplySaved,
}: Props) {
  const { t } = useTranslation();
  const searchSubmitted = useRecoilValue(searchSubmittedState);
  const [savedSearches, setSavedSearches] = useRecoilState(savedSearchesState);
  const [defaultSearchId, setDefaultSearchId] = useRecoilState(defaultSavedSearchIdState);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  /** Highlight user default on first open (criteria pre-filled by SearchSidebar). */
  const [selectedSearchId, setSelectedSearchId] = useState<string>(() => {
    if (searchSubmitted || !defaultSearchId) return '';
    return savedSearches.some((s) => s.id === defaultSearchId) ? defaultSearchId : '';
  });
  const didApplyDefault = useRef(false);
  /** Fingerprint of selected saved criteria — only clear select when draft diverges. */
  const selectedCriteriaFp = useRef<string>(
    (() => {
      if (searchSubmitted || !defaultSearchId) return '';
      const s = savedSearches.find((x) => x.id === defaultSearchId);
      return s ? criteriaFingerprint(s.criteria) : '';
    })(),
  );

  const defaultSearch = savedSearches.find((s) => s.id === defaultSearchId) ?? null;

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
      selectedCriteriaFp.current = criteriaFingerprint(search.criteria);
      setSelectedSearchId(search.id);
    },
    [onApplySaved],
  );

  // Auto-apply starred default only once per full page load (not when returning from results).
  useEffect(() => {
    if (didApplyDefault.current) return;
    if (searchSubmitted || !shouldAutoApplyDefaultSavedSearch()) {
      didApplyDefault.current = true;
      return;
    }
    if (!defaultSearchId) {
      didApplyDefault.current = true;
      markDefaultSavedSearchApplied();
      return;
    }
    const search = savedSearches.find((s) => s.id === defaultSearchId);
    if (!search) {
      didApplyDefault.current = true;
      markDefaultSavedSearchApplied();
      return;
    }
    didApplyDefault.current = true;
    markDefaultSavedSearchApplied();
    applySavedSearch(search);
  }, [searchSubmitted, defaultSearchId, savedSearches, applySavedSearch]);

  // Keep Select on the default while draft still matches that saved criteria.
  // (Field-visibility races used to clear selection even when values were correct.)
  useEffect(() => {
    if (!selectedSearchId || !currentCriteria) return;
    const active = savedSearches.find((s) => s.id === selectedSearchId);
    if (!active) {
      setSelectedSearchId('');
      selectedCriteriaFp.current = '';
      return;
    }
    const draftFp = criteriaFingerprint(currentCriteria);
    const savedFp = criteriaFingerprint(active.criteria);
    if (draftFp !== savedFp && draftFp !== selectedCriteriaFp.current) {
      setSelectedSearchId('');
      selectedCriteriaFp.current = '';
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
    setDialogOpen(false);
    setNewSearchName('');
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
    // Toggle: same star again clears default
    setDefaultSearchId((prev) => (prev === id ? '' : id));
  };

  // Resolve which saved search is “active” for the current form criteria
  const displaySelectedId = (() => {
    const draftFp = criteriaFingerprint(currentCriteria);
    if (selectedSearchId) {
      const sel = savedSearches.find((s) => s.id === selectedSearchId);
      if (sel) {
        const selFp = criteriaFingerprint(sel.criteria);
        if (!draftFp || draftFp === selFp || draftFp === selectedCriteriaFp.current) {
          return selectedSearchId;
        }
      }
    }
    if (defaultSearch && draftFp && draftFp === criteriaFingerprint(defaultSearch.criteria)) {
      return defaultSearch.id;
    }
    if (draftFp) {
      const match = savedSearches.find((s) => criteriaFingerprint(s.criteria) === draftFp);
      if (match) return match.id;
    }
    return '';
  })();

  const activeSavedSearch = displaySelectedId
    ? savedSearches.find((s) => s.id === displaySelectedId) ?? null
    : null;

  return (
    <Box sx={{ mb: compact ? 0 : 3, width: compact ? 'auto' : '100%' }}>
      {!compact && (
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="text.secondary">
          {t('materialSearch.savedSearches.title')}
        </Typography>
      )}

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
                color: 'primary.main',
                '&.Mui-focused': { color: 'primary.main' },
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
              compact
                ? {
                    color: '#334155',
                    bgcolor: '#fff',
                    '& .MuiSelect-select': { color: '#334155', fontWeight: activeSavedSearch ? 600 : 400 },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: displaySelectedId
                        ? 'rgba(79,70,229,0.45)'
                        : 'rgba(79,70,229,0.25)',
                    },
                    '&:hover': {
                      bgcolor: '#F8FAFC',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(79,70,229,0.45)' },
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
                  <span style={{ color: '#94A3B8' }}>
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
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{search.name}</span>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1 }}>
                    {isDefault && (
                      <StarIcon sx={{ fontSize: '1rem', color: 'warning.main', flexShrink: 0 }} />
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{search.name}</span>
                  </Box>
                  <Box sx={{ display: 'flex', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <Tooltip
                      title={
                        isDefault
                          ? t('materialSearch.savedSearches.isDefault', 'ברירת מחדל לפתיחת המסך')
                          : t('materialSearch.savedSearches.setDefault', 'הגדר כברירת מחדל בפתיחה')
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
            ...(compact
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('materialSearch.savedSearches.cancel')}</Button>
          <Button onClick={handleSaveSearch} variant="contained" disabled={!newSearchName.trim()}>
            {t('materialSearch.savedSearches.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
