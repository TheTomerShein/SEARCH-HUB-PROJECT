import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { Save as SaveIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useRecoilState } from 'recoil';
import { searchCriteriaState, savedSearchesState, searchSubmittedState } from '../state/search.state';
import { SearchCriteria } from '../types/material';

export function SavedSearches({ compact = false, currentCriteria }: { compact?: boolean, currentCriteria?: SearchCriteria }) {
  const { t } = useTranslation();
  const [criteria, setCriteria] = useRecoilState(searchCriteriaState);
  const [, setSearchSubmitted] = useRecoilState(searchSubmittedState);
  const [savedSearches, setSavedSearches] = useRecoilState(savedSearchesState);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [selectedSearchId, setSelectedSearchId] = useState<string>('');

  // Sync selectedSearchId with criteria changes
  useEffect(() => {
    if (selectedSearchId) {
      const activeSearch = savedSearches.find(s => s.id === selectedSearchId);
      const criteriaToCheck = currentCriteria || criteria;
      if (!activeSearch || JSON.stringify(activeSearch.criteria) !== JSON.stringify(criteriaToCheck)) {
        setSelectedSearchId('');
      }
    }
  }, [criteria, currentCriteria, selectedSearchId, savedSearches]);

  const handleSaveSearch = () => {
    if (!newSearchName.trim()) return;

    const newSearch = {
      id: Date.now().toString(),
      name: newSearchName.trim(),
      criteria: { ...(currentCriteria || criteria) },
    };

    setSavedSearches((prev) => [...prev, newSearch]);
    setSelectedSearchId(newSearch.id);
    setDialogOpen(false);
    setNewSearchName('');
  };

  const handleApplySearch = (id: string) => {
    if (!id) return;
    const search = savedSearches.find((s) => s.id === id);
    if (search) {
      setCriteria(search.criteria);
      setSearchSubmitted(true);
      setSelectedSearchId(id);
    }
  };

  const handleDeleteSearch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    if (selectedSearchId === id) {
      setSelectedSearchId('');
    }
  };

  return (
    <Box sx={{ mb: compact ? 0 : 3, width: compact ? 'auto' : '100%' }}>
      {!compact && (
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="text.secondary">
          {t('materialSearch.savedSearches.title')}
        </Typography>
      )}

      <Box sx={{ 
        display: 'flex', 
        flexDirection: compact ? 'row' : 'column', 
        gap: 1.5,
        alignItems: 'center',
        width: '100%'
      }}>
        {savedSearches.length > 0 && (
          <FormControl sx={{ minWidth: compact ? 200 : '100%', flex: 1 }} size="small">
            <Select
              value={selectedSearchId}
              onChange={(e) => handleApplySearch(e.target.value as string)}
              displayEmpty
              sx={compact ? {
                color: 'rgba(255,255,255,0.9)',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.35)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.7)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.9)' },
                '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                bgcolor: 'rgba(255,255,255,0.1)',
              } : {}}
              renderValue={(selected) => {
                if (!selected) {
                  return <span style={{ color: compact ? 'rgba(255,255,255,0.55)' : '#94A3B8' }}>{t('materialSearch.savedSearches.select')}</span>;
                }
                const search = savedSearches.find(s => s.id === selected);
                return search ? search.name : '';
              }}
            >
              <MenuItem value="" disabled>
                <span style={{ color: '#94A3B8' }}>{t('materialSearch.savedSearches.select')}</span>
              </MenuItem>
              {savedSearches.map((search) => (
                <MenuItem key={search.id} value={search.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{search.name}</span>
                  <IconButton
                    size="small"
                    onClick={(e) => handleDeleteSearch(search.id, e)}
                    sx={{ mr: -1 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </MenuItem>
              ))}
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
            ...(compact ? {
              color: 'rgba(255,255,255,0.9)',
              borderColor: 'rgba(255,255,255,0.4)',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.8)',
                bgcolor: 'rgba(255,255,255,0.12)',
                transform: 'none',
                boxShadow: 'none',
              },
            } : {}),
          }}
        >
          {t('materialSearch.savedSearches.saveCurrent')}
        </Button>
      </Box>

      {/* Save Dialog */}
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
