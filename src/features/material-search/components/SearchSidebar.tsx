import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Typography, CircularProgress, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  searchCriteriaState,
  activeSearchFieldsState,
  searchSubmittedState,
  savedSearchesState,
  defaultSavedSearchIdState,
  type SavedSearch,
} from '../state/search.state';
import { useSearchFieldsQuery, useUserBranchQuery } from '../hooks/useMaterialSearch';
import { useIsFetching } from '@tanstack/react-query';
import { MaterialSearchFilters } from './MaterialSearchFilters';
import { defaultCriteria } from '../defaultCriteria';
import { SavedSearches, type ApplySavedSearchPayload } from './SavedSearches';
import { SearchCriteria, fieldKey } from '../types/material';
import { useClearSearch } from '../hooks/useClearSearch';
import { SherlokBrand } from '../../../components/SherlokBrand';
import { isDefaultAutoSeedSuppressed } from '../utils/sessionDefaultSavedSearch';
import { criteriaFingerprint } from '../utils/criteriaFingerprint';

function werksListFromCriteria(c: SearchCriteria): string[] {
  const w = c.WERKS as unknown;
  if (Array.isArray(w)) return w.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof w === 'string' && w.trim()) return [w.trim()];
  return [];
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
      byName.get(raw.includes('-') ? raw.slice(raw.lastIndexOf('-') + 1).toUpperCase() : '');
    if (!f) continue;
    const k = fieldKey(f);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}

function resolveDefaultSavedSearch(
  defaultSearchId: string,
  savedSearches: SavedSearch[],
  searchSubmitted: boolean,
): SavedSearch | null {
  if (searchSubmitted || !defaultSearchId || isDefaultAutoSeedSuppressed()) return null;
  return savedSearches.find((s) => s.id === defaultSearchId) ?? null;
}

export function SearchSidebar({ centered = false }: { centered?: boolean }) {
  const { t } = useTranslation();
  const [appliedCriteria, setAppliedCriteria] = useRecoilState(searchCriteriaState);
  const [activeSearchFields, setActiveSearchFields] = useRecoilState(activeSearchFieldsState);
  const [searchSubmitted, setSearchSubmitted] = useRecoilState(searchSubmittedState);
  const savedSearches = useRecoilValue(savedSearchesState);
  const defaultSearchId = useRecoilValue(defaultSavedSearchIdState);
  const clearSearch = useClearSearch();

  const defaultToSeed = resolveDefaultSavedSearch(defaultSearchId, savedSearches, searchSubmitted);

  // Atom already holds default criteria on load (urlSyncEffect). Draft mirrors it.
  const [draftCriteria, setDraftCriteria] = useState<SearchCriteria>(() => ({
    ...(defaultToSeed ? defaultToSeed.criteria : appliedCriteria),
  }));
  /** Bumps when a saved search is applied → remount filter form with new values/fields. */
  const [formEpoch, setFormEpoch] = useState(0);
  /**
   * Block branch WERKS injection when:
   * - default/saved active
   * - user cleared this load
   * - results/sidebar remount with existing applied criteria
   */
  const suppressWerksPrefill = useRef(
    !!defaultToSeed ||
      isDefaultAutoSeedSuppressed() ||
      searchSubmitted ||
      Object.keys(appliedCriteria).length > 0,
  );
  const didApplyDefaultFields = useRef(false);

  // Keep draft in sync with applied atom (clear, search submit, URL, default seed).
  useEffect(() => {
    setDraftCriteria(appliedCriteria);
  }, [appliedCriteria]);

  // Field visibility from default saved search on open (once per mount when seeding).
  useEffect(() => {
    if (didApplyDefaultFields.current) return;
    if (!defaultToSeed) return;
    didApplyDefaultFields.current = true;
    if (!Object.prototype.hasOwnProperty.call(defaultToSeed, 'searchFieldKeys')) return;
    setActiveSearchFields(
      defaultToSeed.searchFieldKeys == null ? null : [...defaultToSeed.searchFieldKeys],
    );
  }, [defaultToSeed, setActiveSearchFields]);

  // Pre-fill WERKS from branch API only on true blank first-open (never after clear/default/results).
  const { data: userBranch } = useUserBranchQuery();
  useEffect(() => {
    if (suppressWerksPrefill.current) return;
    if (isDefaultAutoSeedSuppressed()) return;
    if (searchSubmitted) return;
    if (defaultSearchId) return; // default owns the form this open
    const werks = userBranch?.werks?.trim();
    if (!werks) return;
    if (werksListFromCriteria(draftCriteria).length > 0) return;
    if (werksListFromCriteria(appliedCriteria).length > 0) return;

    setDraftCriteria((prev) => {
      if (werksListFromCriteria(prev).length > 0) return prev;
      return { ...prev, WERKS: [werks] };
    });
    setFormEpoch((n) => n + 1);
  }, [userBranch, draftCriteria, appliedCriteria, searchSubmitted, defaultSearchId]);

  const isDirty =
    searchSubmitted &&
    criteriaFingerprint(draftCriteria) !== criteriaFingerprint(appliedCriteria);

  const isFetchingCount = useIsFetching({
    queryKey: ['materials', 'search', 'infinite'],
    predicate: (q) => q.state.data === undefined && q.state.fetchStatus === 'fetching',
  });
  const isFetchingAny = useIsFetching({
    queryKey: ['materials', 'search', 'infinite'],
    predicate: (q) => q.state.fetchStatus === 'fetching',
  });
  const isSearchBusy =
    searchSubmitted && (isFetchingCount > 0 || (isFetchingAny > 0 && isDirty));
  const { data: searchFields, isLoading: isFieldsLoading } = useSearchFieldsQuery();

  const visibleFields = useMemo(() => {
    if (!searchFields) return undefined;
    return resolveVisibleSearchFields(searchFields, activeSearchFields);
  }, [searchFields, activeSearchFields]);

  const handleApplySaved = useCallback(
    (payload: ApplySavedSearchPayload) => {
      suppressWerksPrefill.current = true;
      setDraftCriteria({ ...payload.criteria });
      if (payload.searchFieldKeys !== undefined) {
        setActiveSearchFields(
          payload.searchFieldKeys == null ? null : [...payload.searchFieldKeys],
        );
      }
      setFormEpoch((n) => n + 1);
    },
    [setActiveSearchFields],
  );

  const handleSearch = () => {
    setAppliedCriteria(draftCriteria);
    setSearchSubmitted(true);
  };

  const handleClear = () => {
    clearSearch({ clearSelection: true });
    setDraftCriteria({ ...defaultCriteria });
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

  // ── Hero / centered mode ───────────────────────────────────────────────
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
          background: `
            radial-gradient(ellipse 80% 120% at 0% 0%, rgba(99, 102, 241, 0.14) 0%, transparent 55%),
            radial-gradient(ellipse 70% 100% at 100% 100%, rgba(59, 130, 246, 0.12) 0%, transparent 50%),
            linear-gradient(135deg, #F0F4FF 0%, #E8EEFF 40%, #EEF2FF 70%, #F5F3FF 100%)
          `,
          borderBottom: '1px solid rgba(79, 70, 229, 0.12)',
          px: { xs: 3, md: 5 },
          py: { xs: 3.5, md: 4.5 },
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
            background: 'rgba(59, 130, 246, 0.1)',
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
            background: 'rgba(99, 102, 241, 0.1)',
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
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <SherlokBrand
              size="lg"
              subtitle={t(
                'materialSearch.hero.subtitle',
                'הגדר קריטריונים ולחץ חיפוש לצפייה בתוצאות',
              )}
            />
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
