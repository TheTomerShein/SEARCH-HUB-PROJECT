import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSetRecoilState } from 'recoil';
import {
  searchCriteriaState,
  searchSubmittedState,
  checkedRowsState,
} from '../state/search.state';
import { defaultCriteria } from '../defaultCriteria';
import { suppressDefaultAutoSeed } from '../utils/sessionDefaultSavedSearch';

/**
 * Leave results view → empty criteria screen.
 * Always wipes applied criteria (URL + atom) so clear/F5 never re-show old filters.
 * Suppresses default auto-seed until full page reload.
 */
export function useClearSearch() {
  const queryClient = useQueryClient();
  const setCriteria = useSetRecoilState(searchCriteriaState);
  const setSearchSubmitted = useSetRecoilState(searchSubmittedState);
  const setCheckedRows = useSetRecoilState(checkedRowsState);

  return useCallback(
    (opts?: { clearSelection?: boolean }) => {
      suppressDefaultAutoSeed();
      void queryClient.cancelQueries({ queryKey: ['materials', 'search', 'infinite'] });
      setCriteria({ ...defaultCriteria });
      setSearchSubmitted(false);
      if (opts?.clearSelection !== false) {
        setCheckedRows([]);
      }
    },
    [queryClient, setCriteria, setSearchSubmitted, setCheckedRows],
  );
}
