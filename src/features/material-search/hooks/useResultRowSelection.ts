import { useCallback, useMemo } from 'react';
import { useRecoilState } from 'recoil';
import { checkedRowsState } from '../state/search.state';
import { Material, getResultRowId } from '../types/material';

/**
 * Checkbox selection over result rows by stable row id (MATNR + plant when present).
 * Same material on multiple plants can be selected independently.
 */
export function useResultRowSelection(items: Material[]) {
  const [checkedRows, setCheckedRows] = useRecoilState(checkedRowsState);
  const checkedSet = useMemo(() => new Set(checkedRows), [checkedRows]);

  const itemIds = useMemo(() => items.map((m) => getResultRowId(m)).filter(Boolean), [items]);

  const allChecked = itemIds.length > 0 && itemIds.every((id) => checkedSet.has(id));
  const someChecked = !allChecked && itemIds.some((id) => checkedSet.has(id));

  const handleToggleCheck = useCallback(
    (rowId: string) => {
      if (!rowId) return;
      setCheckedRows((prev) =>
        prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId],
      );
    },
    [setCheckedRows],
  );

  const handleSelectAll = useCallback(() => {
    if (allChecked) {
      const visibleIds = new Set(itemIds);
      setCheckedRows((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      const toAdd = itemIds.filter((id) => !checkedSet.has(id));
      setCheckedRows((prev) => [...prev, ...toAdd]);
    }
  }, [allChecked, itemIds, checkedSet, setCheckedRows]);

  const clearSelection = useCallback(() => {
    setCheckedRows([]);
  }, [setCheckedRows]);

  return {
    checkedRows,
    checkedSet,
    allChecked,
    someChecked,
    handleToggleCheck,
    handleSelectAll,
    clearSelection,
  };
}
