import { atom, AtomEffect } from 'recoil';
import { SearchCriteria } from '../types/material';

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

/**
 * Multi-value filters are written as comma-joined URL params (see onSet).
 * On restore, split them back into string[] so MATNR=X,Y → ['X','Y'] not 'X,Y'.
 * Booleans / *_LOGIC stay scalar; single values stay string (asStringList accepts both).
 */
function parseCriteriaParam(key: string, v: string): string | boolean | string[] {
  if (key.endsWith('_LOGIC')) return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v.includes(',')) {
    return v.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return v;
}

const urlSyncEffect: AtomEffect<SearchCriteria> = ({ setSelf, onSet }) => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const criteria: Record<string, string | boolean | string[]> = {};
    params.forEach((v, k) => {
      if (!['f', 'c'].includes(k)) {
        criteria[k] = parseCriteriaParam(k, v);
      }
    });
    if (Object.keys(criteria).length > 0) setSelf(criteria as SearchCriteria);

    onSet((newValue, _, isReset) => {
      const newUrl = new URL(window.location.href);
      const f = newUrl.searchParams.get('f'), c = newUrl.searchParams.get('c');
      newUrl.search = '';
      if (f) newUrl.searchParams.set('f', f);
      if (c) newUrl.searchParams.set('c', c);

      if (!isReset && newValue && !(Object.keys(newValue).length === 1 && newValue.LVORM === false)) {
        Object.entries(newValue).forEach(([k, v]) => {
          if (v != null && v !== '' && (!Array.isArray(v) || v.length > 0)) {
            newUrl.searchParams.set(k, Array.isArray(v) ? v.join(',') : String(v));
          }
        });
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
  default: {
    LVORM: false, // by default, only active materials
  },
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

/**
 * Tracks whether the user has explicitly submitted at least one search.
 *
 * When false (initial state) the search query is disabled — no network call
 * is made until the user clicks Search or types in a filter field.
 * This prevents an unwanted POST /api/materials/search on app load.
 *
 * The mock service ignores this flag and always returns data, so development
 * without a backend is unaffected.
 */
export const searchSubmittedState = atom<boolean>({
  key: 'searchSubmitted',
  default: typeof window !== 'undefined' && Array.from(new URLSearchParams(window.location.search).keys()).some(k => !['f','c'].includes(k)),
});


export const selectedMaterialNumberState = atom<string | null>({
  key: 'selectedMaterialNumber',
  default: null,
});

export const activeSearchFieldsState = atom<string[] | null>({
  key: 'activeSearchFields',
  default: null, // null means "show all fields" (not yet initialized)
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

export const activeOutputFieldsState = atom<string[] | null>({
  key: 'activeOutputFields',
  default: null, // null means "show all columns" — not encoded in URL
  effects: [urlSyncArrayEffect('f')],
});

export const activeCompareFieldsState = atom<string[] | null>({
  key: 'activeCompareFields',
  default: null,
  effects: [urlSyncArrayEffect('c')],
});

/**
 * Result-row selection ids (getResultRowId: MATNR, or MATNR+plant).
 * Not the same as selectedMaterialNumberState (detail panel).
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
 * Controls whether the search filter drawer is open on screens < lg.
 */
export const filterDrawerOpenState = atom<boolean>({
  key: 'filterDrawerOpen',
  default: false,
});
