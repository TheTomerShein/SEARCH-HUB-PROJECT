import { atom, AtomEffect } from 'recoil';
import { SearchCriteria } from '../types/material';
import { applyCriteriaToUrl, criteriaFromSearchParams } from '../utils/criteriaUrlCodec';

// --- Types ---
export interface SavedSearch {
  id: string;
  name: string;
  criteria: SearchCriteria;
  /**
   * Criteria-sidebar field keys (`fieldKey()` / activeSearchFieldsState) visible when this was saved.
   * - string[] = only those fields
   * - null = show all (same as activeSearchFields null)
   * - omitted (old saves) = do not change field visibility on apply
   */
  searchFieldKeys?: string[] | null;
}

// --- Effects ---

/** LS-backed default saved search, if any (used at first paint to beat stale URL). */
function readDefaultSavedSearch(): SavedSearch | null {
  try {
    const rawId = window.localStorage.getItem('materialDefaultSavedSearchId');
    if (rawId == null) return null;
    const id = JSON.parse(rawId) as string;
    if (!id) return null;
    const rawList = window.localStorage.getItem('materialSavedSearches');
    if (rawList == null) return null;
    const list = JSON.parse(rawList) as SavedSearch[];
    return list.find((s) => s.id === id) ?? null;
  } catch {
    return null;
  }
}

/**
 * Criteria ↔ URL. On full page load:
 * - If user has a starred default saved search → seed atom with that criteria
 *   and strip stale query params so F5 shows the default form, not last search.
 * - Else hydrate from URL (shareable links / no default).
 * Form draft starts from this atom; Select matches by fingerprint.
 */
const urlSyncEffect: AtomEffect<SearchCriteria> = ({ setSelf, onSet }) => {
  if (typeof window !== 'undefined') {
    const fromUrl = criteriaFromSearchParams(new URLSearchParams(window.location.search));
    const defaultSaved = readDefaultSavedSearch();

    if (fromUrl) {
      // URL has actual criteria (shareable link or F5). This takes precedence over default saved search.
      setSelf(fromUrl);
    } else if (defaultSaved) {
      // No URL criteria, but we have a default saved search.
      setSelf({ ...defaultSaved.criteria });
      // Keep URL clean of previous session filters (default is LS, not share link).
      const clean = new URL(window.location.href);
      applyCriteriaToUrl(clean, null);
      if (clean.search !== window.location.search) {
        window.history.replaceState({}, '', clean.toString());
      }
    }

    onSet((newValue, _, isReset) => {
      const newUrl = new URL(window.location.href);
      if (isReset) {
        applyCriteriaToUrl(newUrl, null);
      } else {
        applyCriteriaToUrl(newUrl, newValue);
      }
      window.history.replaceState({}, '', newUrl.toString());
    });
  }
};

const localStorageEffect = <T>(key: string): AtomEffect<T> => ({ setSelf, onSet }) => {
  if (typeof window !== 'undefined') {
    const savedValue = window.localStorage.getItem(key);
    if (savedValue != null) {
      try {
        setSelf(JSON.parse(savedValue));
      } catch (e) {
        console.error(`Failed to parse ${key} from localStorage`, e);
      }
    }

    onSet((newValue, _, isReset) => {
      if (isReset) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(newValue));
      }
    });
  }
};

// --- Recoil State ---

export const searchCriteriaState = atom<SearchCriteria>({
  key: 'materialSearchCriteria',
  default: {},
  effects: [urlSyncEffect],
});

export const savedSearchesState = atom<SavedSearch[]>({
  key: 'materialSavedSearches',
  default: [],
  effects: [localStorageEffect<SavedSearch[]>('materialSavedSearches')],
});

/**
 * Which user saved search is pre-filled on dashboard open (fill only).
 * Empty string = none. localStorage: materialDefaultSavedSearchId
 */
export const defaultSavedSearchIdState = atom<string>({
  key: 'materialDefaultSavedSearchId',
  default: '',
  effects: [localStorageEffect<string>('materialDefaultSavedSearchId')],
});

const submitOnUrlEffect: AtomEffect<boolean> = ({ setSelf }) => {
  if (typeof window !== 'undefined') {
    const fromUrl = criteriaFromSearchParams(new URLSearchParams(window.location.search));
    if (fromUrl && Object.keys(fromUrl).length > 0) {
      setSelf(true);
    }
  }
};

/**
 * User has explicitly submitted a search this session.
 * Always false on full page load/refresh so we open the criteria screen.
 * If a default saved search exists, URL criteria are stripped and the form
 * is seeded from that default (see urlSyncEffect + SearchSidebar).
 */
export const searchSubmittedState = atom<boolean>({
  key: 'searchSubmitted',
  default: false,
  effects: [submitOnUrlEffect],
});

/**
 * Detail-panel selection: getResultRowId (MATNR, or MATNR+plant).
 * Parsed into matnr/werks before GET /api/materials/:id?werks=...
 * Recoil key kept as selectedMaterialNumber for session stability.
 */
export const selectedResultRowIdState = atom<string | null>({
  key: 'selectedMaterialNumber',
  default: null,
});

/**
 * active*Fields null:
 * - Before useInitDefaultFields: not seeded yet (treat as show-all until seed).
 * - After seed / settings "all" (mock): show all fields.
 * Prefer string[] after first visit when product defaults apply.
 */
export const activeSearchFieldsState = atom<string[] | null>({
  key: 'activeSearchFields',
  default: null,
});

const urlSyncArrayEffect = (paramName: string): AtomEffect<string[] | null> => ({ setSelf, onSet }) => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const val = params.get(paramName);
    if (val) setSelf(val.split(','));

    onSet((newValue, _, isReset) => {
      const newUrl = new URL(window.location.href);
      if (isReset || !newValue || newValue.length === 0) newUrl.searchParams.delete(paramName);
      else newUrl.searchParams.set(paramName, newValue.join(','));
      window.history.replaceState({}, '', newUrl.toString());
    });
  }
};

/**
 * Selected output column keys **in display/export order**.
 * URL `f` overrides; else localStorage per browser user.
 * null = not set yet (seeded by useInitDefaultFields).
 */
export const activeOutputFieldsState = atom<string[] | null>({
  key: 'activeOutputFields',
  default: null,
  effects: [
    ({ setSelf, onSet }) => {
      if (typeof window === 'undefined') return;
      const LS = 'materialActiveOutputFields';
      const fromUrl = new URLSearchParams(window.location.search).get('f');
      if (!fromUrl) {
        const raw = window.localStorage.getItem(LS);
        if (raw != null) {
          try {
            const parsed = JSON.parse(raw) as unknown;
            if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
              setSelf(parsed as string[]);
            }
          } catch {
            /* ignore bad cache */
          }
        }
      }
      onSet((newValue, _, isReset) => {
        if (isReset || newValue == null || newValue.length === 0) {
          window.localStorage.removeItem(LS);
        } else {
          window.localStorage.setItem(LS, JSON.stringify(newValue));
        }
      });
    },
    urlSyncArrayEffect('f'),
  ],
});

export const activeCompareFieldsState = atom<string[] | null>({
  key: 'activeCompareFields',
  default: null,
  effects: [urlSyncArrayEffect('c')],
});

/**
 * Result-row selection ids (getResultRowId: MATNR, or MATNR+plant).
 * Not the same as selectedResultRowIdState (detail panel).
 * Reset to [] when filters are cleared.
 */
export const checkedRowsState = atom<string[]>({
  key: 'checkedRows',
  default: [],
});

/** Lightweight list metrics for TopBar (avoids second infinite-query observer). */
export interface SearchListMeta {
  loadedCount: number;
  totalCount: number;
  isFetchingNextPage: boolean;
  hasData: boolean;
}

export const searchListMetaState = atom<SearchListMeta>({
  key: 'searchListMeta',
  default: {
    loadedCount: 0,
    totalCount: 0,
    isFetchingNextPage: false,
    hasData: false,
  },
});

/**
 * Controls whether the Compare Mode full-screen dialog is open.
 * Set to true when the user clicks the "Compare" button in the TopBar
 * (requires 2–4 checked rows).
 */
export const compareModeOpenState = atom<boolean>({
  key: 'compareModeOpen',
  default: false,
});

/**
 * Criteria panel in results view (sidebar on lg+, drawer on smaller).
 * true = visible; false = full-width results table.
 */
export const criteriaPanelOpenState = atom<boolean>({
  key: 'criteriaPanelOpen',
  default: true,
});
