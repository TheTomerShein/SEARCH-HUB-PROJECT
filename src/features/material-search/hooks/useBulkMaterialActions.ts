import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecoilValue } from 'recoil';
import { useQueryClient } from '@tanstack/react-query';
import {
  searchCriteriaState,
  checkedRowsState,
  activeOutputFieldsState,
  searchListMetaState,
} from '../state/search.state';
import {
  getSearchInfiniteQueryKey,
  useOutputFieldsQuery,
  type SearchInfiniteData,
} from './useMaterialSearch';
import { fetchAllMaterials } from '../api/materialService';
import { Material, getResultRowId, getRowMatnr } from '../types/material';
import { resolveOutputColumns } from '../utils/resolveOutputColumns';
import { projectRowsForExport } from '../utils/projectRowsForExport';
import { useToast } from '../../../hooks/useToast';

/** Shared export / copy MATNR actions for TopBar (selection or full list). */
export function useBulkMaterialActions() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const criteria = useRecoilValue(searchCriteriaState);
  const checkedRows = useRecoilValue(checkedRowsState);
  const activeOutputFields = useRecoilValue(activeOutputFieldsState);
  const listMeta = useRecoilValue(searchListMetaState);
  const { data: allOutputFields } = useOutputFieldsQuery();
  const { open, message, severity, showToast, setOpen, hideToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const hasSelection = checkedRows.length > 0;
  const exportColumns = useMemo(
    () => resolveOutputColumns(allOutputFields, activeOutputFields) ?? null,
    [allOutputFields, activeOutputFields],
  );

  const readCachedSearch = useCallback((): SearchInfiniteData | undefined => {
    return queryClient.getQueryData<SearchInfiniteData>(getSearchInfiniteQueryKey(criteria));
  }, [queryClient, criteria]);

  const resolveRows = useCallback(async (): Promise<Material[]> => {
    const cached = readCachedSearch();
    if (!cached?.pages) return [];
    if (hasSelection) {
      const checkedSet = new Set(checkedRows);
      return cached.pages
        .flatMap((p) => p.materials)
        .filter((m) => checkedSet.has(getResultRowId(m)));
    }
    const { $skip: _s, $top: _t, ...baseCriteria } = criteria;
    return fetchAllMaterials(baseCriteria);
  }, [readCachedSearch, hasSelection, checkedRows, criteria]);

  const handleCopyMaterials = useCallback(async () => {
    if (!listMeta.hasData) return;
    setIsCopying(true);
    try {
      const rows = await resolveRows();
      if (rows.length === 0) return;
      const matnrs = [...new Set(rows.map((m) => getRowMatnr(m)).filter(Boolean))];
      await navigator.clipboard.writeText(matnrs.join('\n'));
      showToast(t('materialSearch.actions.materialsCopied', 'החומרים הועתקו ללוח בהצלחה!'));
    } catch (error) {
      console.error('Failed to copy materials', error);
      showToast(t('materialSearch.actions.copyFailed', 'ההעתקה נכשלה'), 'error');
    } finally {
      setIsCopying(false);
    }
  }, [listMeta.hasData, resolveRows, t, showToast]);

  const handleExport = useCallback(async () => {
    if (!listMeta.hasData) return;
    setIsExporting(true);
    try {
      const rows = await resolveRows();
      if (rows.length === 0) return;
      // Always project with field defs → Hebrew headers (never raw MATNR keys)
      if (!exportColumns?.length) {
        showToast(
          t('materialSearch.actions.exportFailed', 'הייצוא נכשל'),
          'error',
        );
        return;
      }
      const sheetRows = projectRowsForExport(rows, exportColumns, t);
      const xlsx = await import('xlsx');
      const worksheet = xlsx.utils.json_to_sheet(sheetRows);
      // Hebrew UI → open sheet right-to-left in Excel
      worksheet['!views'] = [{ rightToLeft: true, state: 'normal' }];
      const workbook = xlsx.utils.book_new();
      workbook.Workbook = workbook.Workbook || {};
      workbook.Workbook.Views = [{ RTL: true }];
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Materials');
      xlsx.writeFile(
        workbook,
        hasSelection ? `materials_selected_${checkedRows.length}.xlsx` : 'materials_export.xlsx',
      );
      showToast(t('materialSearch.actions.exportDone', 'הייצוא הושלם בהצלחה!'));
    } catch (error) {
      console.error('Failed to export materials', error);
      showToast(t('materialSearch.actions.exportFailed', 'הייצוא נכשל'), 'error');
    } finally {
      setIsExporting(false);
    }
  }, [listMeta.hasData, resolveRows, exportColumns, t, hasSelection, checkedRows.length, showToast]);

  /** Unique MATNRs: selection if any, else full result set (pages all results). */
  const resolveMatnrs = useCallback(async (): Promise<string[]> => {
    const rows = await resolveRows();
    return [...new Set(rows.map((m) => getRowMatnr(m)).filter(Boolean))];
  }, [resolveRows]);

  const isBusyPage = !hasSelection && listMeta.isFetchingNextPage;
  const isExportDisabled = listMeta.loadedCount === 0 || isExporting || isBusyPage;
  const isCopyDisabled = listMeta.loadedCount === 0 || isCopying || isBusyPage;
  /** Transfer/export of “all” needs full list — block while still paging in. */
  const isBulkAllDisabled = listMeta.loadedCount === 0 || isBusyPage;

  return {
    open,
    message,
    severity,
    showToast,
    setOpen,
    hideToast,
    hasSelection,
    checkedCount: checkedRows.length,
    isExporting,
    isCopying,
    isExportDisabled,
    isCopyDisabled,
    isBulkAllDisabled,
    handleExport,
    handleCopyMaterials,
    resolveMatnrs,
    listMeta,
  };
}
