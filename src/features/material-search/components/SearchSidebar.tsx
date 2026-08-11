import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Typography, CircularProgress, Divider, IconButton, Tooltip } from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  searchCriteriaState,
  activeSearchFieldsState,
  searchSubmittedState,
  savedSearchesState,
  defaultSavedSearchIdState,
  criteriaPanelOpenState,
  type SavedSearch,
} from '../state/search.state';
import { useSearchFieldsQuery } from '../hooks/useMaterialSearch';
import { useIsFetching } from '@tanstack/react-query';
import { MaterialSearchFilters } from './MaterialSearchFilters';
import { defaultCriteria } from '../defaultCriteria';
import { SavedSearches, type ApplySavedSearchPayload } from './SavedSearches';
import { SearchCriteria, fieldKey } from '../types/material';
import { useClearSearch } from '../hooks/useClearSearch';
import { SherlokBrand } from '../../../components/SherlokBrand';
import { isDefaultAutoSeedSuppressed } from '../utils/sessionDefaultSavedSearch';
import { criteriaFingerprint } from '../utils/criteriaFingerprint';
import {
  criteriaHasAllRequired,
  ensureRequiredCriteriaFieldsVisible,
} from '../requiredCriteriaFields';

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
  const setCriteriaPanelOpen = useSetRecoilState(criteriaPanelOpenState);
  const clearSearch = useClearSearch();

  const defaultToSeed = resolveDefaultSavedSearch(defaultSearchId, savedSearches, searchSubmitted);

  // Atom already holds default criteria on load (urlSyncEffect). Draft mirrors it.
  const [draftCriteria, setDraftCriteria] = useState<SearchCriteria>(() => ({
    ...(defaultToSeed ? defaultToSeed.criteria : appliedCriteria),
  }));
  /** Bumps when a saved search is applied → remount filter form with new values/fields. */
  const [formEpoch, setFormEpoch] = useState(0);
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

  const isDirty =
    searchSubmitted &&
    criteriaFingerprint(draftCriteria) !== criteriaFingerprint(appliedCriteria);

  // Avoid isFetching observers on hero (centered) — they re-render all filters for no reason
  const isFetchingCount = useIsFetching({
    queryKey: ['materials', 'search', 'infinite'],
    predicate: (q) =>
      searchSubmitted && q.state.data === undefined && q.state.fetchStatus === 'fetching',
  });
  const isFetchingAny = useIsFetching({
    queryKey: ['materials', 'search', 'infinite'],
    predicate: (q) => searchSubmitted && q.state.fetchStatus === 'fetching',
  });
  const isSearchBusy =
    searchSubmitted && (isFetchingCount > 0 || (isFetchingAny > 0 && isDirty));
  const { data: searchFields, isLoading: isFieldsLoading } = useSearchFieldsQuery();

  const visibleFields = useMemo(() => {
    if (!searchFields) return undefined;
    const resolved = resolveVisibleSearchFields(searchFields, activeSearchFields);
    // Required fields (e.g. WERKS) always stay visible even if hidden in settings
    return ensureRequiredCriteriaFieldsVisible(searchFields, resolved);
  }, [searchFields, activeSearchFields]);

  const handleCriteriaChange = useCallback((next: SearchCriteria) => {
    setDraftCriteria(next);
  }, []);

  const handleApplySaved = useCallback(
    (payload: ApplySavedSearchPayload) => {
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

  const handleSearch = useCallback(() => {
    // Frontend-only required fields (see requiredCriteriaFields.ts)
    if (!criteriaHasAllRequired(draftCriteria)) return;
    setAppliedCriteria(draftCriteria);
    setSearchSubmitted(true);
  }, [draftCriteria, setAppliedCriteria, setSearchSubmitted]);

  const handleClear = useCallback(() => {
    clearSearch({ clearSelection: true });
    setDraftCriteria({ ...defaultCriteria });
    setFormEpoch((n) => n + 1);
  }, [clearSearch]);

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
        <Box sx={{ px: 2, pt: 1.5, pb: 1, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
            <Tooltip title={t('materialSearch.filters.hidePanel', 'הסתר סינון — טבלה מלאה')}>
              <IconButton
                size="small"
                onClick={() => setCriteriaPanelOpen(false)}
                id="hide-criteria-panel-btn"
                aria-label={t('materialSearch.filters.hidePanelShort', 'הסתר סינון')}
                sx={{ color: 'text.secondary' }}
              >
                <ChevronRight fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
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
              onChange={handleCriteriaChange}
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

  // ── Hero / centered — polished criteria card ─────────────────────────
  return (
    <Box
      className="mdg-criteria-card"
      sx={{
        width: '100%',
        height: 'auto',
        // Compact height — still roomy enough for fields
        minHeight: { xs: '50%', sm: '54%', md: '58%' },
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 2.5,
        border: '1px solid rgba(226, 232, 240, 0.95)',
        boxShadow: `
          0 1px 2px rgba(15, 23, 42, 0.04),
          0 12px 28px -8px rgba(79, 70, 229, 0.1),
          0 0 0 1px rgba(79, 70, 229, 0.05)
        `,
        overflow: 'hidden',
      }}
    >
      {/* Brand strip — indigo palette (not white), Sherlok + saved searches */}
      <Box
        className="mdg-criteria-brand-bar"
        sx={{
          flexShrink: 0,
          // Theme indigo ladder — deep, not white
          background: `
            radial-gradient(ellipse 90% 120% at 100% 0%, rgba(129, 140, 248, 0.35) 0%, transparent 55%),
            radial-gradient(ellipse 70% 100% at 0% 100%, rgba(124, 58, 237, 0.28) 0%, transparent 50%),
            linear-gradient(125deg, #312E81 0%, #3730A3 28%, #4F46E5 62%, #6366F1 100%)
          `,
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          px: { xs: 2, md: 3 },
          py: { xs: 1.5, md: 1.75 },
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 45%, rgba(15,23,42,0.12) 100%)',
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
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <SherlokBrand
              size="md"
              onDark
              subtitle={t(
                'materialSearch.hero.subtitle',
                'הגדר קריטריונים ולחץ חיפוש לצפייה בתוצאות',
              )}
            />
          </Box>
          <Box sx={{ flexShrink: 0 }}>
            <SavedSearches
              compact
              surface="brand"
              currentCriteria={draftCriteria}
              currentSearchFieldKeys={activeSearchFields}
              onApplySaved={handleApplySaved}
            />
          </Box>
        </Box>
      </Box>

      {/* Body: fills min-height; fields scroll when content exceeds */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 2, sm: 2.5, md: 3 },
          pt: 1.5,
          pb: 1.25,
          overflow: 'hidden',
          bgcolor: '#FFFFFF',
        }}
      >
        {visibleFields && (
          <MaterialSearchFilters
            key={`criteria-form-${formEpoch}`}
            fields={visibleFields}
            criteria={draftCriteria}
            onChange={handleCriteriaChange}
            onSearch={handleSearch}
            onClear={handleClear}
            isLoading={isSearchBusy}
            grid
            stickyActions
          />
        )}
      </Box>
    </Box>
  );
}
