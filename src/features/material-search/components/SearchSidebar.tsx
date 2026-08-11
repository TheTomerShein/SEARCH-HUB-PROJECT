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
} from '../state/search.state';
import { useSearchFieldsQuery, useUserBranchQuery } from '../hooks/useMaterialSearch';
import { useIsFetching } from '@tanstack/react-query';
import { MaterialSearchFilters } from './MaterialSearchFilters';
import { defaultCriteria } from '../defaultCriteria';
import { SavedSearches, type ApplySavedSearchPayload } from './SavedSearches';
import { SearchCriteria, fieldKey } from '../types/material';
import { useClearSearch } from '../hooks/useClearSearch';
import { SherlokBrand } from '../../../components/SherlokBrand';
import {
  shouldAutoApplyDefaultSavedSearch,
  markDefaultSavedSearchApplied,
} from '../utils/sessionDefaultSavedSearch';

function criteriaFingerprint(c: SearchCriteria): string {
  try {
    return JSON.stringify(c, Object.keys(c).sort());
  } catch {
    return '';
  }
}

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
  const [appliedCriteria, setAppliedCriteria] = useRecoilState(searchCriteriaState);
  const [activeSearchFields, setActiveSearchFields] = useRecoilState(activeSearchFieldsState);
  const [searchSubmitted, setSearchSubmitted] = useRecoilState(searchSubmittedState);
  const savedSearches = useRecoilValue(savedSearchesState);
  const defaultSearchId = useRecoilValue(defaultSavedSearchIdState);
  const clearSearch = useClearSearch();

  /**
   * Starred default — only for first paint of this page load.
   * Returning from results remounts this component; do not re-seed default then.
   */
  const userDefaultSearch = useMemo(() => {
    if (searchSubmitted || !defaultSearchId) return null;
    if (!shouldAutoApplyDefaultSavedSearch()) return null;
    return savedSearches.find((s) => s.id === defaultSearchId) ?? null;
  }, [searchSubmitted, defaultSearchId, savedSearches]);

  const [draftCriteria, setDraftCriteria] = useState<SearchCriteria>(() => {
    if (userDefaultSearch) {
      markDefaultSavedSearchApplied();
      return { ...userDefaultSearch.criteria };
    }
    // Returning from results: keep last applied criteria (not empty + default)
    return { ...appliedCriteria };
  });
  /** Bumps when a saved search is applied → remount filter form with new values/fields. */
  const [formEpoch, setFormEpoch] = useState(0);
  const didApplyUserDefaultFields = useRef(false);
  /** Skip first applied→draft sync so user default seed is not wiped by atom default. */
  const skipAppliedSyncOnce = useRef(!!userDefaultSearch);

  // Once the user has searched (or landed with results), never auto-apply default again.
  useEffect(() => {
    if (searchSubmitted) markDefaultSavedSearchApplied();
  }, [searchSubmitted]);

  useEffect(() => {
    if (skipAppliedSyncOnce.current) {
      skipAppliedSyncOnce.current = false;
      return;
    }
    setDraftCriteria(appliedCriteria);
  }, [appliedCriteria]);

  // Field visibility from default saved search — only when we actually seeded it this load.
  useEffect(() => {
    if (didApplyUserDefaultFields.current) return;
    didApplyUserDefaultFields.current = true;
    if (!userDefaultSearch) return;
    if (!Object.prototype.hasOwnProperty.call(userDefaultSearch, 'searchFieldKeys')) return;
    setActiveSearchFields(
      userDefaultSearch.searchFieldKeys == null
        ? null
        : [...userDefaultSearch.searchFieldKeys],
    );
  }, [userDefaultSearch, setActiveSearchFields]);

  // Pre-fill WERKS from GET /api/user/branch when form has no plant yet
  // (does not override URL criteria or a saved search that already sets WERKS).
  const { data: userBranch } = useUserBranchQuery();
  useEffect(() => {
    const werks = userBranch?.werks?.trim();
    if (!werks) return;
    if (werksListFromCriteria(draftCriteria).length > 0) return;
    if (werksListFromCriteria(appliedCriteria).length > 0) return;

    setDraftCriteria((prev) => {
      if (werksListFromCriteria(prev).length > 0) return prev;
      return { ...prev, WERKS: [werks] };
    });
    setFormEpoch((n) => n + 1);
  }, [userBranch, draftCriteria, appliedCriteria]);

  const isDirty =
    searchSubmitted &&
    criteriaFingerprint(draftCriteria) !== criteriaFingerprint(appliedCriteria);

  // First page (or new criteria key) with no cached data yet — mock delay or real API
  const isFetchingCount = useIsFetching({
    queryKey: ['materials', 'search', 'infinite'],
    predicate: (q) => q.state.data === undefined && q.state.fetchStatus === 'fetching',
  });
  // Any in-flight search (incl. background refetch of current criteria)
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
    clearSearch({ clearSelection: true });
    setDraftCriteria(defaultCriteria);
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
          // Soft blue–indigo wash (same family as primary #4F46E5), not plain white
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
