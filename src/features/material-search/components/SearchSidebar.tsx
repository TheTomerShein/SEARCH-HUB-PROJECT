import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, CircularProgress, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useRecoilState } from 'recoil';
import {
  searchCriteriaState,
  activeSearchFieldsState,
  searchSubmittedState,
} from '../state/search.state';
import { useSearchFieldsQuery } from '../hooks/useMaterialSearch';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { MaterialSearchFilters, defaultCriteria } from './MaterialSearchFilters';
import { SavedSearches, type ApplySavedSearchPayload } from './SavedSearches';
import { SearchCriteria, fieldKey } from '../types/material';

function criteriaFingerprint(c: SearchCriteria): string {
  try {
    return JSON.stringify(c, Object.keys(c).sort());
  } catch {
    return String(Math.random());
  }
}

/**
 * Resolve visible criteria fields from config + active keys.
 * Preserves saved key order; matches fieldKey() or bare fieldName.
 */
function resolveVisibleSearchFields<T extends { tableName: string; fieldName: string }>(
  searchFields: T[],
  activeSearchFields: string[] | null,
): T[] {
  if (!activeSearchFields) return searchFields;

  const byKey = new Map(searchFields.map((f) => [fieldKey(f), f]));
  const byName = new Map(searchFields.map((f) => [f.fieldName.toUpperCase(), f]));
  const out: T[] = [];
  const seen = new Set<string>();

  for (const raw of activeSearchFields) {
    const f =
      byKey.get(raw) ??
      byName.get(raw.toUpperCase()) ??
      // last segment of "TABLE-FIELD" style keys
      byName.get(raw.includes('-') ? raw.slice(raw.lastIndexOf('-') + 1).toUpperCase() : '');
    if (!f) continue;
    const k = fieldKey(f);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}

export function SearchSidebar({ centered = false }: { centered?: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [appliedCriteria, setAppliedCriteria] = useRecoilState(searchCriteriaState);
  const [activeSearchFields, setActiveSearchFields] = useRecoilState(activeSearchFieldsState);
  const [searchSubmitted, setSearchSubmitted] = useRecoilState(searchSubmittedState);

  const [draftCriteria, setDraftCriteria] = useState<SearchCriteria>(appliedCriteria);
  /** Bumps when a saved search is applied → remount filter form with new values/fields. */
  const [formEpoch, setFormEpoch] = useState(0);

  useEffect(() => {
    setDraftCriteria(appliedCriteria);
  }, [appliedCriteria]);

  const isDirty =
    searchSubmitted &&
    criteriaFingerprint(draftCriteria) !== criteriaFingerprint(appliedCriteria);

  const isFetchingCount = useIsFetching({
    queryKey: ['materials', 'search', 'infinite'],
    predicate: (q) => q.state.data === undefined && q.state.fetchStatus === 'fetching',
  });
  const isSearchBusy = searchSubmitted && isFetchingCount > 0;
  const { data: searchFields, isLoading: isFieldsLoading } = useSearchFieldsQuery();

  const visibleFields = useMemo(() => {
    if (!searchFields) return undefined;
    return resolveVisibleSearchFields(searchFields, activeSearchFields);
  }, [searchFields, activeSearchFields]);

  const handleApplySaved = useCallback(
    (payload: ApplySavedSearchPayload) => {
      // 1) Values first (new object so React always sees a change)
      setDraftCriteria({ ...payload.criteria });

      // 2) Field visibility (when saved snapshot included it)
      if (payload.searchFieldKeys !== undefined) {
        setActiveSearchFields(
          payload.searchFieldKeys == null ? null : [...payload.searchFieldKeys],
        );
      }

      // 3) Force MaterialSearchFilters remount so every input re-binds
      setFormEpoch((n) => n + 1);
    },
    [setActiveSearchFields],
  );

  const handleSearch = () => {
    setAppliedCriteria(draftCriteria);
    setSearchSubmitted(true);
  };

  const handleClear = () => {
    void queryClient.cancelQueries({ queryKey: ['materials', 'search', 'infinite'] });
    setDraftCriteria(defaultCriteria);
    setAppliedCriteria(defaultCriteria);
    setSearchSubmitted(false);
    setFormEpoch((n) => n + 1);
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
      <Box
        sx={{
          width: { xs: '85vw', sm: 300 },
          borderLeft: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 2, pt: 2, pb: 1, flexShrink: 0 }}>
          <SavedSearches
            currentCriteria={draftCriteria}
            currentSearchFieldKeys={activeSearchFields}
            onApplySaved={handleApplySaved}
          />
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
            <Typography
              variant="subtitle2"
              fontWeight={800}
              color="text.primary"
              sx={{ fontFamily: '"Heebo", "Segoe UI", system-ui, sans-serif' }}
            >
              {t('materialSearch.filters.title')}
            </Typography>
            {isDirty && (
              <span className="mdg-dirty-chip">
                {t('materialSearch.filters.dirtyDraft', 'שינויים לא הוחלו')}
              </span>
            )}
          </Box>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, px: 2, pb: 1.5, display: 'flex', flexDirection: 'column' }}>
          {visibleFields && (
            <MaterialSearchFilters
              key={`criteria-form-${formEpoch}`}
              fields={visibleFields}
              criteria={draftCriteria}
              onChange={setDraftCriteria}
              onSearch={handleSearch}
              onClear={handleClear}
              isLoading={isSearchBusy}
              grid={false}
              isDirty={isDirty}
              stickyActions
            />
          )}
        </Box>
      </Box>
    );
  }

  // ── Hero / centered mode (original first-screen look) ──────────────────
  return (
    <Box
      sx={{
        width: '100%',
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
      }}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, #4F46E5 0%, #6D28D9 50%, #7C3AED 100%)',
          px: { xs: 3, md: 5 },
          py: { xs: 3, md: 4 },
          position: 'relative',
          overflow: 'hidden',
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
        }}
      >
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0,
                }}
              >
                🔍
              </Box>
              <Typography
                variant="h5"
                fontWeight={800}
                sx={{ color: 'white', letterSpacing: '-0.5px', lineHeight: 1.2 }}
              >
                {t('app.title', 'חיפוש חומרים')}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 400, mt: 0.5 }}>
              הגדר קריטריוני חיפוש ולחץ על חיפוש לצפייה בתוצאות
            </Typography>
          </Box>
          <Box sx={{ flexShrink: 0 }}>
            <SavedSearches
              compact
              currentCriteria={draftCriteria}
              currentSearchFieldKeys={activeSearchFields}
              onApplySaved={handleApplySaved}
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: { xs: 3, md: 5 }, pt: 3.5, pb: 4 }}>
        {visibleFields && (
          <MaterialSearchFilters
            key={`criteria-form-${formEpoch}`}
            fields={visibleFields}
            criteria={draftCriteria}
            onChange={setDraftCriteria}
            onSearch={handleSearch}
            onClear={handleClear}
            isLoading={isSearchBusy}
            grid
          />
        )}
      </Box>
    </Box>
  );
}
