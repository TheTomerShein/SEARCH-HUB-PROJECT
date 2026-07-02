import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { searchCriteriaState, activeSearchFieldsState, searchSubmittedState } from '../state/search.state';
import { useSearchFieldsQuery } from '../hooks/useMaterialSearch';
import { useIsFetching } from '@tanstack/react-query';
import { MaterialSearchFilters, defaultCriteria } from './MaterialSearchFilters';
import { SavedSearches } from './SavedSearches';
import { SearchCriteria } from '../types/material';

export function SearchSidebar({ centered = false }: { centered?: boolean }) {
  const { t } = useTranslation();
  const [appliedCriteria, setAppliedCriteria] = useRecoilState(searchCriteriaState);
  const activeSearchFields = useRecoilValue(activeSearchFieldsState);

  const setSearchSubmitted = useSetRecoilState(searchSubmittedState);

  const [draftCriteria, setDraftCriteria] = useState<SearchCriteria>(appliedCriteria);

  useEffect(() => {
    setDraftCriteria(appliedCriteria);
  }, [appliedCriteria]);

  const isFetchingCount = useIsFetching({ queryKey: ['materials', 'search', 'infinite'] });
  const isFetching = isFetchingCount > 0;
  const { data: searchFields, isLoading: isFieldsLoading } = useSearchFieldsQuery();

  const handleSearch = () => {
    setAppliedCriteria(draftCriteria);
    setSearchSubmitted(true);
  };

  const handleClear = () => {
    setDraftCriteria(defaultCriteria);
    setAppliedCriteria(defaultCriteria);
    setSearchSubmitted(false);
  };

  if (isFieldsLoading) {
    return (
      <Box sx={{ width: centered ? '100%' : { xs: '85vw', sm: 300 }, p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  // ── Sidebar mode (after search submitted) ──────────────────────────────
  if (!centered) {
    return (
      <Box sx={{
        width: { xs: '85vw', sm: 300 },
        p: 2,
        borderLeft: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflowY: 'auto',
      }}>
        <SavedSearches currentCriteria={draftCriteria} />
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {t('materialSearch.filters.title')}
        </Typography>
        {searchFields && (
          <MaterialSearchFilters
            fields={activeSearchFields ? searchFields.filter(f => activeSearchFields.includes(f.field_name)) : searchFields}
            criteria={draftCriteria}
            onChange={setDraftCriteria}
            onSearch={handleSearch}
            onClear={handleClear}
            isLoading={isFetching}
            grid={false}
          />
        )}
      </Box>
    );
  }

  // ── Hero / centered mode (initial search screen) ───────────────────────
  return (
    <Box sx={{
      width: '100%',
      // Glassmorphic card
      bgcolor: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 4,
      border: '1px solid rgba(255,255,255,0.9)',
      boxShadow: `
        0 4px 6px -1px rgba(79, 70, 229, 0.05),
        0 20px 40px -8px rgba(79, 70, 229, 0.12),
        0 0 0 1px rgba(79, 70, 229, 0.06)
      `,
      overflow: 'hidden',
    }}>

      {/* ── Card hero header ──────────────────────────────────────────── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #6D28D9 50%, #7C3AED 100%)',
        px: { xs: 3, md: 5 },
        py: { xs: 3, md: 4 },
        position: 'relative',
        overflow: 'hidden',
        // Decorative circles
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -40,
          left: -40,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -60,
          right: 60,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none',
        },
      }}>
        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          {/* Title + subtitle */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
              {/* Icon badge */}
              <Box sx={{
                width: 40, height: 40,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem',
                flexShrink: 0,
              }}>
                🔍
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ color: 'white', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                {t('app.title', 'חיפוש חומרים')}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 400, mt: 0.5 }}>
              הגדר קריטריוני חיפוש ולחץ על חיפוש לצפייה בתוצאות
            </Typography>
          </Box>

          {/* Saved searches — top right in header */}
          <Box sx={{ flexShrink: 0 }}>
            <SavedSearches compact currentCriteria={draftCriteria} />
          </Box>
        </Box>
      </Box>

      {/* ── Filters body ─────────────────────────────────────────────── */}
      <Box sx={{ px: { xs: 3, md: 5 }, pt: 3.5, pb: 4 }}>
        {searchFields && (
          <MaterialSearchFilters
            fields={activeSearchFields ? searchFields.filter(f => activeSearchFields.includes(f.field_name)) : searchFields}
            criteria={draftCriteria}
            onChange={setDraftCriteria}
            onSearch={handleSearch}
            onClear={handleClear}
            isLoading={isFetching}
            grid
          />
        )}
      </Box>
    </Box>
  );
}
