import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSetRecoilState } from 'recoil';
import {
  searchCriteriaState,
  searchSubmittedState,
  checkedRowsState,
} from '../state/search.state';
import { defaultCriteria } from '../defaultCriteria';

/**
 * Leave results view → criteria screen.
 * Keeps last applied criteria (so default saved search does not wipe user fields).
 * Pass `resetCriteria: true` to wipe filters to product default (empty).
 */
export function useClearSearch() {
  const queryClient = useQueryClient();
  const setCriteria = useSetRecoilState(searchCriteriaState);
  const setSearchSubmitted = useSetRecoilState(searchSubmittedState);
  const setCheckedRows = useSetRecoilState(checkedRowsState);

  return useCallback(
    (opts?: { clearSelection?: boolean; resetCriteria?: boolean }) => {
      void queryClient.cancelQueries({ queryKey: ['materials', 'search', 'infinite'] });
      if (opts?.resetCriteria) {
        setCriteria({ ...defaultCriteria });
      }
      setSearchSubmitted(false);
      if (opts?.clearSelection !== false) {
        setCheckedRows([]);
      }
    },
    [queryClient, setCriteria, setSearchSubmitted, setCheckedRows],
  );
}
