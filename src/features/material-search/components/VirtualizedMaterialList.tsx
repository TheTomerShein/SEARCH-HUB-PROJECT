import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Box, LinearProgress, Snackbar, Alert } from '@mui/material';
import { FixedSizeList as List, type ListOnScrollProps } from 'react-window';
import { useTranslation } from 'react-i18next';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import {
  searchCriteriaState,
  selectedMaterialNumberState,
  activeOutputFieldsState,
  searchSubmittedState,
  searchListMetaState,
} from '../state/search.state';
import { useMaterialSearchInfiniteQuery, useOutputFieldsQuery } from '../hooks/useMaterialSearch';
import { useElementSize } from '../hooks/useElementSize';
import { useResultRowSelection } from '../hooks/useResultRowSelection';
import { getResultRowId } from '../types/material';
import { resolveOutputColumns } from '../utils/resolveOutputColumns';
import {
  estimateScrollMinWidthPx,
  findMatnrField,
  scrollFieldsOnly,
  PIN_STRIP_WIDTH,
  ROW_HEIGHT,
} from '../utils/columnLayout';
import { useToast } from '../../../hooks/useToast';
import {
  MaterialResultRow,
  type MaterialResultItemData,
} from './resultList/MaterialResultRow';
import { MaterialResultHeader } from './resultList/MaterialResultHeader';
import { MaterialResultFooter } from './resultList/MaterialResultFooter';
import {
  MaterialListSkeleton,
  MaterialListError,
  MaterialListEmpty,
} from './resultList/MaterialListStates';

export function VirtualizedMaterialList() {
  const { t } = useTranslation();
  const criteria = useRecoilValue(searchCriteriaState);
  const activeOutputFields = useRecoilValue(activeOutputFieldsState);
  const searchSubmitted = useRecoilValue(searchSubmittedState);
  const setListMeta = useSetRecoilState(searchListMetaState);
  const { data, isLoading, isError, error, refetch, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useMaterialSearchInfiniteQuery(criteria, searchSubmitted);
  const { data: allOutputFields } = useOutputFieldsQuery();

  const outputFields = useMemo(
    () => resolveOutputColumns(allOutputFields, activeOutputFields),
    [allOutputFields, activeOutputFields],
  );

  const matnrField = useMemo(() => findMatnrField(outputFields), [outputFields]);
  const bodyFields = useMemo(() => scrollFieldsOnly(outputFields), [outputFields]);
  const pinColumns = useMemo(
    () =>
      matnrField
        ? [matnrField]
        : [
            {
              fieldName: 'MATNR',
              tableName: 'MARA',
              fieldType: 'CHAR',
              fieldLength: 40,
              hebrewDesc: 'materialSearch.results.columns.materialNumber',
              mandt: '',
            },
          ],
    [matnrField],
  );

  const setSelectedId = useSetRecoilState(selectedMaterialNumberState);
  /** Shared list viewport height (both pin + scroll lists). */
  const [listViewportRef, listSize] = useElementSize();
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const pinListRef = useRef<List>(null);
  const scrollListRef = useRef<List>(null);
  const syncingScroll = useRef(false);
  const { open: toastOpen, message: toastMessage, severity: toastSeverity, showToast, setOpen: setToastOpen } =
    useToast();

  const items = useMemo(() => data?.pages.flatMap((p) => p.materials) ?? [], [data?.pages]);
  const rowIds = useMemo(() => items.map((m) => getResultRowId(m)), [items]);
  const totalCount = data?.pages[0]?.totalCount ?? 0;
  const loadedCount = items.length;

  useEffect(() => {
    setListMeta({
      loadedCount,
      totalCount,
      isFetchingNextPage,
      hasData: !!data?.pages,
    });
  }, [loadedCount, totalCount, isFetchingNextPage, data?.pages, setListMeta]);

  useEffect(() => {
    if (!searchSubmitted) {
      setListMeta({
        loadedCount: 0,
        totalCount: 0,
        isFetchingNextPage: false,
        hasData: false,
      });
    }
  }, [searchSubmitted, setListMeta]);

  const {
    checkedRows,
    checkedSet,
    allChecked,
    someChecked,
    handleToggleCheck,
    handleSelectAll,
    clearSelection,
  } = useResultRowSelection(items);

  const handleSelectId = useCallback(
    (id: string) => {
      setSelectedId(id);
    },
    [setSelectedId],
  );

  const handleCopyMatnr = useCallback(
    async (matnr: string) => {
      try {
        await navigator.clipboard.writeText(matnr);
        showToast(
          t('materialSearch.actions.matnrCopied', { matnr, defaultValue: `הועתק: ${matnr}` }),
        );
      } catch (err) {
        console.error('Failed to copy material number', err);
        showToast(t('materialSearch.actions.copyFailed', 'ההעתקה נכשלה'), 'error');
      }
    },
    [t, showToast],
  );

  const scrollBothTo = useCallback((index: number) => {
    pinListRef.current?.scrollToItem(index, 'smart');
    scrollListRef.current?.scrollToItem(index, 'smart');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (items.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = Math.min(prev + 1, items.length - 1);
          scrollBothTo(next);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          scrollBothTo(next);
          return next;
        });
      } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < items.length) {
        e.preventDefault();
        handleSelectId(items[focusedIndex].MATNR);
      } else if (e.key === ' ' && focusedIndex >= 0 && focusedIndex < items.length) {
        e.preventDefault();
        handleToggleCheck(rowIds[focusedIndex] || getResultRowId(items[focusedIndex]));
      } else if (e.key === 'Escape') {
        setFocusedIndex(-1);
      }
    },
    [items, rowIds, focusedIndex, handleSelectId, handleToggleCheck, scrollBothTo],
  );

  const handleItemsRendered = useCallback(
    ({ visibleStopIndex }: { visibleStopIndex: number }) => {
      if (hasNextPage && !isFetchingNextPage && visibleStopIndex >= items.length - 10) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, items.length, fetchNextPage],
  );

  const makeScrollHandler = useCallback(
    (source: 'pin' | 'scroll') =>
      ({ scrollOffset, scrollUpdateWasRequested }: ListOnScrollProps) => {
        if (scrollUpdateWasRequested || syncingScroll.current) return;
        syncingScroll.current = true;
        const other = source === 'pin' ? scrollListRef : pinListRef;
        other.current?.scrollTo(scrollOffset);
        requestAnimationFrame(() => {
          syncingScroll.current = false;
        });
      },
    [],
  );

  const handleHover = useCallback((index: number) => {
    setHoveredIndex(index);
  }, []);

  const pinItemData = useMemo(
    (): MaterialResultItemData => ({
      mode: 'pin',
      items,
      rowIds,
      focusedIndex,
      hoveredIndex,
      onHover: handleHover,
      onSelect: handleSelectId,
      t,
      columns: pinColumns,
      checkedSet,
      onToggleCheck: handleToggleCheck,
      onCopyMatnr: handleCopyMatnr,
    }),
    [
      items,
      rowIds,
      focusedIndex,
      hoveredIndex,
      handleHover,
      handleSelectId,
      t,
      pinColumns,
      checkedSet,
      handleToggleCheck,
      handleCopyMatnr,
    ],
  );

  const scrollItemData = useMemo(
    (): MaterialResultItemData => ({
      mode: 'scroll',
      items,
      rowIds,
      focusedIndex,
      hoveredIndex,
      onHover: handleHover,
      onSelect: handleSelectId,
      t,
      columns: bodyFields,
      checkedSet,
      onToggleCheck: handleToggleCheck,
      onCopyMatnr: handleCopyMatnr,
    }),
    [
      items,
      rowIds,
      focusedIndex,
      hoveredIndex,
      handleHover,
      handleSelectId,
      t,
      bodyFields,
      checkedSet,
      handleToggleCheck,
      handleCopyMatnr,
    ],
  );

  const scrollMinWidth = useMemo(() => estimateScrollMinWidthPx(bodyFields), [bodyFields]);
  const listHeight = listSize.height;

  if (isLoading && !data) return <MaterialListSkeleton />;
  if (isError) return <MaterialListError error={error} onRetry={() => refetch()} />;

  return (
    <Box
      role="table"
      className="mdg-results-shell"
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        m: 0,
        borderRadius: 0,
        border: 'none',
        borderTop: '1px solid #E2E8F0',
      }}
    >
      {items.length === 0 ? (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', flexDirection: 'row', flexShrink: 0 }}>
            <Box className="mdg-result-pin-strip" sx={{ width: PIN_STRIP_WIDTH }}>
              <MaterialResultHeader
                mode="pin"
                columns={pinColumns}
                allChecked={false}
                someChecked={false}
                disabled
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <MaterialResultHeader mode="scroll" columns={bodyFields} />
            </Box>
          </Box>
          <MaterialListEmpty />
        </Box>
      ) : (
        <Box className="mdg-results-body">
          {/* Frozen checkbox + MATNR */}
          <Box className="mdg-result-pin-strip" sx={{ width: PIN_STRIP_WIDTH }}>
            <MaterialResultHeader
              mode="pin"
              columns={pinColumns}
              allChecked={allChecked}
              someChecked={someChecked}
              onSelectAll={handleSelectAll}
              disabled={items.length === 0}
            />
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                outline: 'none',
                bgcolor: '#fff',
                '&:focus, &:focus-visible': { outline: 'none' },
              }}
              tabIndex={0}
              onKeyDown={handleKeyDown}
            >
              {listHeight > 0 && (
                <List
                  ref={pinListRef}
                  className="mdg-list-noscroll"
                  height={listHeight}
                  itemCount={items.length}
                  itemSize={ROW_HEIGHT}
                  width={PIN_STRIP_WIDTH}
                  itemData={pinItemData}
                  overscanCount={8}
                  style={{
                    direction: 'rtl',
                    overflowX: 'hidden',
                    background: '#fff',
                  }}
                  onScroll={makeScrollHandler('pin')}
                >
                  {MaterialResultRow}
                </List>
              )}
            </Box>
          </Box>

          {/* Horizontally scrolling columns */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowX: 'auto',
                overflowY: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                sx={{
                  /* width 100% fills screen; minWidth enables H-scroll when many cols */
                  width: '100%',
                  minWidth: scrollMinWidth,
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <MaterialResultHeader mode="scroll" columns={bodyFields} />
                <Box
                  ref={listViewportRef}
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    position: 'relative',
                    outline: 'none',
                    width: '100%',
                    bgcolor: '#fff',
                  }}
                >
                  {listHeight > 0 && (
                    <List
                      ref={scrollListRef}
                      height={listHeight}
                      itemCount={items.length}
                      itemSize={ROW_HEIGHT}
                      width="100%"
                      itemData={scrollItemData}
                      overscanCount={8}
                      style={{
                        direction: 'rtl',
                        overflowX: 'hidden',
                        background: '#fff',
                      }}
                      onItemsRendered={handleItemsRendered}
                      onScroll={makeScrollHandler('scroll')}
                    >
                      {MaterialResultRow}
                    </List>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      <Box sx={{ height: 2, flexShrink: 0, overflow: 'hidden' }}>
        {isFetchingNextPage && (
          <LinearProgress
            variant="indeterminate"
            sx={{
              height: 2,
              bgcolor: 'transparent',
              '& .MuiLinearProgress-bar': { bgcolor: 'primary.light' },
            }}
          />
        )}
      </Box>

      <MaterialResultFooter
        loadedCount={loadedCount}
        totalCount={totalCount}
        checkedCount={checkedRows.length}
        showCounts={!!data}
        onClearSelection={clearSelection}
      />

      <Snackbar
        open={toastOpen}
        autoHideDuration={2000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setToastOpen(false)} severity={toastSeverity} sx={{ width: '100%' }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
