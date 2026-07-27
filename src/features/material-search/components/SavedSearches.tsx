import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
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

/** Payload applied to the criteria form (values + optional field visibility). */
export type ApplySavedSearchPayload = {
  criteria: SearchCriteria;
  /** undefined = leave current field visibility; null = all fields; string[] = those keys */
  searchFieldKeys?: string[] | null;
};

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
  const [selectedSearchId, setSelectedSearchId] = useState<string>('');
  const didApplyDefault = useRef(false);

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

  // Each dashboard open: pre-fill user-marked default only (no built-in, no search)
  useEffect(() => {
    if (didApplyDefault.current) return;
    didApplyDefault.current = true;
    if (searchSubmitted || !defaultSearchId) return;

    const search = savedSearches.find((s) => s.id === defaultSearchId);
    if (!search) return;
    applySavedSearch(search);
  }, [searchSubmitted, defaultSearchId, savedSearches, applySavedSearch]);

  // Clear selection highlight when draft / fields diverge
  useEffect(() => {
    if (!selectedSearchId || !currentCriteria) return;
    const active = savedSearches.find((s) => s.id === selectedSearchId);
    if (!active || JSON.stringify(active.criteria) !== JSON.stringify(currentCriteria)) {
      setSelectedSearchId('');
      return;
    }
    if (Object.prototype.hasOwnProperty.call(active, 'searchFieldKeys')) {
      if (
        JSON.stringify(active.searchFieldKeys ?? null) !==
        JSON.stringify(currentSearchFieldKeys ?? null)
      ) {
        setSelectedSearchId('');
      }
    }
  }, [currentCriteria, selectedSearchId, savedSearches, currentSearchFieldKeys]);

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
    setDefaultSearchId(id);
  };

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
        <FormControl sx={{ minWidth: compact ? 200 : '100%', flex: 1 }} size="small">
          <Select
            value={selectedSearchId}
            onChange={(e) => handleApplySearch(String(e.target.value))}
            displayEmpty
            sx={
              compact
                ? {
                    color: 'rgba(255,255,255,0.9)',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '& .MuiSelect-select': { color: 'rgba(255,255,255,0.9)' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.35)' },
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.15)',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.7)' },
                    },
                    '&.Mui-focused': {
                      bgcolor: 'rgba(255,255,255,0.15)',
                      boxShadow: '0 0 0 3px rgba(255,255,255,0.2)',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.9)' },
                    },
                    '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                  }
                : {}
            }
            renderValue={(selected) => {
              if (!selected) {
                return (
                  <span style={{ color: compact ? 'rgba(255,255,255,0.55)' : '#94A3B8' }}>
                    {t('materialSearch.savedSearches.select')}
                  </span>
                );
              }
              const search = savedSearches.find((s) => s.id === selected);
              return search ? search.name : '';
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
                  color: 'rgba(255,255,255,0.9)',
                  borderColor: 'rgba(255,255,255,0.4)',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.8)',
                    bgcolor: 'rgba(255,255,255,0.12)',
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
