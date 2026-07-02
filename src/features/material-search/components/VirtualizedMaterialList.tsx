import { memo, useState, useRef, useCallback, useMemo } from 'react';
import { Box, Typography, Checkbox, Tooltip, Skeleton, Alert, Button, LinearProgress } from '@mui/material';
import { FixedSizeList as List, ListChildComponentProps, areEqual } from 'react-window';
import { useTranslation } from 'react-i18next';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  searchCriteriaState,
  selectedMaterialNumberState,
  activeOutputFieldsState,
  searchSubmittedState,
  checkedRowsState,
} from '../state/search.state';
import { useMaterialSearchInfiniteQuery, useOutputFieldsQuery } from '../hooks/useMaterialSearch';
import { Material, OutputFieldDefinition, FieldType } from '../types/material';
import { useLayoutMode } from '../hooks/useLayoutMode';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { ErrorOutline, Refresh } from '@mui/icons-material';

// ponytail: lightweight date formatter — avoids a dedicated date library
function fmtDate(raw: string | undefined): string {
  if (!raw) return '—';
  // Handles both YYYY-MM-DD and YYYYMMDD
  const s = raw.length === 8 ? `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}` : raw;
  try {
    return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(s));
  } catch { return raw; }
}

// Width reserved for the checkbox column (px)
const CHECKBOX_COL_WIDTH = 52;

// ─── Multi-sort types ────────────────────────────────────────────────────────

type SortDirection = 'asc' | 'desc';

/** A single sort key: which field and which direction. */
interface SortEntry {
  field: string;
  direction: SortDirection;
}

/** The full multi-sort state: an ordered array of sort entries. */
type MultiSort = SortEntry[];

// ─── Generic comparator ──────────────────────────────────────────────────────

/**
 * Compares two raw field values using the correct strategy for the FieldType.
 * Null/undefined values are always sorted to the end regardless of direction.
 */
function compareValues(a: unknown, b: unknown, type: FieldType | undefined): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  switch (type) {
    case 'number':
      return Number(a) - Number(b);
    case 'boolean':
      return a === b ? 0 : a ? 1 : -1;
    case 'date':
      // ISO dates (YYYY-MM-DD) sort correctly as plain strings
      return String(a).localeCompare(String(b));
    default:
      // string, select, multi-select, unknown — locale-aware (handles Hebrew)
      return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
  }
}

/**
 * Multi-key sort: applies each SortEntry in order; the next entry is only
 * consulted when the previous one produces a tie (result === 0).
 */
function sortMaterials(
  items: Material[],
  sortKeys: MultiSort,
  fieldTypeMap: Map<string, FieldType | undefined>,
): Material[] {
  if (sortKeys.length === 0) return items;

  return [...items].sort((a, b) => {
    for (const { field, direction } of sortKeys) {
      const key = field as keyof Material;
      const type = fieldTypeMap.get(field);
      const cmp = compareValues(a[key], b[key], type);
      if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

// ─── Sort header helpers ─────────────────────────────────────────────────────

function nextDirection(current: SortDirection | undefined): SortDirection | null {
  if (!current) return 'asc';
  if (current === 'asc') return 'desc';
  return null; // remove from sort
}

/** Badge showing sort priority (1-based index). */
function SortBadge({ rank }: { rank: number }) {
  return (
    <Box
      sx={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        bgcolor: 'primary.main',
        color: 'white',
        fontSize: '0.6rem',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {rank}
    </Box>
  );
}

function SortIcon({ direction }: { direction: SortDirection | undefined }) {
  if (direction === 'asc')  return <ArrowUpwardIcon  sx={{ fontSize: '0.85rem', opacity: 1 }} />;
  if (direction === 'desc') return <ArrowDownwardIcon sx={{ fontSize: '0.85rem', opacity: 1 }} />;
  return <UnfoldMoreIcon sx={{ fontSize: '0.85rem', opacity: 0.3 }} />;
}

// ─── useElementSize ──────────────────────────────────────────────────────────

function useElementSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new ResizeObserver((entries) => {
        if (entries[0]) {
          setSize({
            width: entries[0].contentRect.width,
            height: entries[0].contentRect.height,
          });
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  return [ref, size] as const;
}

// ─── Row ────────────────────────────────────────────────────────────────────

const Row = memo(({ index, style, data }: ListChildComponentProps) => {
  const item = data.items[index] as Material;
  const { selectedId: _selectedId, focusedIndex, onSelect, t, outputFields, checkedSet, onToggleCheck } = data;

  const isChecked = checkedSet.has(item.MATNR);
  const isFocused = index === focusedIndex;
  const isEven = index % 2 === 0;

  return (
    <Box
      style={style}
      onClick={() => onSelect(item.MATNR)}
      role="row"
      aria-selected={isChecked}
      sx={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'rgba(226,232,240,0.8)',
        position: 'relative',
        bgcolor: isChecked
          ? 'rgba(79, 70, 229, 0.07)'
          : isFocused
          ? 'rgba(79, 70, 229, 0.05)'
          : isEven
          ? '#FAFBFF'
          : '#FFFFFF',
        cursor: 'pointer',
        outline: isFocused ? '2px solid #4F46E5' : 'none',
        outlineOffset: -2,
        transition: 'background-color 0.1s ease, box-shadow 0.1s ease',
        // Left accent bar on hover (RTL: right side visually = left in DOM)
        '&::after': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: '20%',
          bottom: '20%',
          width: 3,
          borderRadius: '0 3px 3px 0',
          bgcolor: 'primary.main',
          opacity: 0,
          transition: 'opacity 0.15s ease',
        },
        '&:hover': {
          bgcolor: 'rgba(79, 70, 229, 0.05)',
          boxShadow: 'inset 0 0 0 1px rgba(79,70,229,0.12)',
          '&::after': { opacity: 1 },
          '& .row-open-hint': { opacity: 1 },
        },
        ...(isChecked && {
          boxShadow: 'inset 3px 0 0 #4F46E5',
        }),
      }}
    >
      {/* Checkbox cell */}
      <Box
        role="cell"
        sx={{ width: CHECKBOX_COL_WIDTH, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={(e) => { e.stopPropagation(); onToggleCheck(item.MATNR); }}
      >
        <Checkbox
          size="small"
          checked={isChecked}
          onChange={() => onToggleCheck(item.MATNR)}
          onClick={(e) => e.stopPropagation()}
          sx={{
            p: 0.75,
            color: 'text.disabled',
            '&.Mui-checked': { color: 'primary.main' },
          }}
          inputProps={{ 'aria-label': `Select ${item.MATNR}` }}
        />
      </Box>

      {/* Data cells */}
      {outputFields?.map((field: OutputFieldDefinition) => {
        const val = (item as any)[field.field_name];
        let displayVal: React.ReactNode;

        if (field.field_name === 'MATNR') {
          displayVal = (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                component="span"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  bgcolor: 'rgba(79,70,229,0.08)',
                  color: 'primary.dark',
                  px: 1,
                  py: 0.25,
                  borderRadius: '6px',
                  letterSpacing: '0.02em',
                  border: '1px solid rgba(79,70,229,0.15)',
                  flexShrink: 0,
                }}
              >
                {val}
              </Box>
            </Box>
          );
        } else if (field.field_name === 'MTART') {
          displayVal = (
            <Box component="span" sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontWeight: 500 }}>
              {t(`materialSearch.enums.materialType.${val}`)}
            </Box>
          );
        } else if (field.field_name === 'MBRSH') {
          displayVal = (
            <Box component="span" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
              {t(`materialSearch.enums.industrySector.${val}`)}
            </Box>
          );
        } else if (field.field_name === 'LVORM') {
          displayVal = (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  bgcolor: val ? 'error.main' : 'success.main',
                  boxShadow: val ? '0 0 0 2px rgba(211,47,47,0.2)' : '0 0 0 2px rgba(46,125,50,0.2)',
                }}
              />
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem', color: val ? 'error.main' : 'success.main' }}>
                {val ? t('materialSearch.details.deleted') : t('materialSearch.details.active')}
              </Typography>
            </Box>
          );
        } else if (field.field_type === 'DATS' || field.field_name === 'ERSDA' || field.field_name === 'LAEDA') {
          displayVal = (
            <Box component="span" sx={{ fontSize: '0.8rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
              {fmtDate(val)}
            </Box>
          );
        } else {
          displayVal = val ?? '—';
        }

        return (
          <Box
            key={field.field_name}
            role="cell"
            sx={{
              flex: `${field.width} ${field.width} 0%`,
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              pr: 2.5,
              fontSize: '0.8125rem',
              color: 'text.primary',
            }}
          >
            {displayVal}
          </Box>
        );
      })}

      {/* Open-detail hint icon — fades in on hover */}
      <Box
        className="row-open-hint"
        sx={{
          flexShrink: 0,
          width: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.15s ease',
          color: 'primary.light',
        }}
      >
        <OpenInNewIcon sx={{ fontSize: '0.9rem' }} />
      </Box>
    </Box>
  );
}, areEqual);

// ─── VirtualizedMaterialList ─────────────────────────────────────────────────

export function VirtualizedMaterialList() {
  const { t } = useTranslation();
  const criteria = useRecoilValue(searchCriteriaState);
  const activeOutputFields = useRecoilValue(activeOutputFieldsState);
  const searchSubmitted = useRecoilValue(searchSubmittedState);
  const { data, isLoading, isError, error, refetch, isFetchingNextPage, hasNextPage, fetchNextPage } = useMaterialSearchInfiniteQuery(criteria, searchSubmitted);
  const { data: allOutputFields } = useOutputFieldsQuery();

  const outputFields = useMemo(() => {
    if (!allOutputFields) return undefined;
    if (!activeOutputFields) return allOutputFields;
    return allOutputFields.filter(f => activeOutputFields.includes(f.field_name));
  }, [allOutputFields, activeOutputFields]);

  // Map fieldName → FieldType for the generic comparator
  const fieldTypeMap = useMemo<Map<string, FieldType | undefined>>(() => {
    const map = new Map<string, FieldType | undefined>();
    allOutputFields?.forEach(f => map.set(f.field_name, f.field_type));
    return map;
  }, [allOutputFields]);

  const [selectedId, setSelectedId] = useRecoilState(selectedMaterialNumberState);
  const [checkedRows, setCheckedRows] = useRecoilState(checkedRowsState);
  const [containerRef, size] = useElementSize();
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<List>(null);
  const { isLgUp, setDetailDrawerOpen } = useLayoutMode();

  // ── Multi-sort state ───────────────────────────────────────────────────────
  const [sortKeys, setSortKeys] = useState<MultiSort>([]);

  /**
   * Handle a column header click.
   * - Plain click  → reset to single-column sort on this field (asc → desc → off)
   * - Shift+click  → add / cycle / remove this field in the multi-sort stack
   */
  const handleColumnHeaderClick = useCallback((fieldName: string, shiftHeld: boolean) => {
    setSortKeys(prev => {
      const existingIdx = prev.findIndex(e => e.field === fieldName);

      if (shiftHeld) {
        // ── Multi-sort: add/cycle/remove ──────────────────────────────────
        if (existingIdx === -1) {
          // Not yet in sort — append as asc
          return [...prev, { field: fieldName, direction: 'asc' }];
        }
        const current = prev[existingIdx].direction;
        const next = nextDirection(current);
        if (next === null) {
          // Remove this key
          return prev.filter((_, i) => i !== existingIdx);
        }
        // Cycle direction in-place
        return prev.map((e, i) => i === existingIdx ? { ...e, direction: next } : e);
      } else {
        // ── Single sort: reset to just this field ─────────────────────────
        if (existingIdx !== -1 && prev.length === 1) {
          // Only this field is active — cycle it
          const current = prev[0].direction;
          const next = nextDirection(current);
          if (next === null) return []; // off
          return [{ field: fieldName, direction: next }];
        }
        // Different field or multi-sort active → reset to this field asc
        return [{ field: fieldName, direction: 'asc' }];
      }
    });
  }, []);

  const rawItems = data?.pages.flatMap(p => p.materials) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;
  const loadedCount = rawItems.length;

  // Apply multi-key sort — only re-runs when data or sort changes
  const items = useMemo(
    () => sortMaterials(rawItems, sortKeys, fieldTypeMap),
    [rawItems, sortKeys, fieldTypeMap]
  );

  const handleSelectId = useCallback((id: string) => {
    setSelectedId(id);
    if (!isLgUp) setDetailDrawerOpen(true);
  }, [setSelectedId, isLgUp, setDetailDrawerOpen]);

  // ── Selection helpers ──────────────────────────────────────────────────────

  const checkedSet = useMemo(() => new Set(checkedRows), [checkedRows]);

  const allChecked = items.length > 0 && items.every(m => checkedSet.has(m.MATNR));
  const someChecked = !allChecked && items.some(m => checkedSet.has(m.MATNR));

  const handleToggleCheck = useCallback((matnr: string) => {
    setCheckedRows(prev => prev.includes(matnr) ? prev.filter(id => id !== matnr) : [...prev, matnr]);
  }, [setCheckedRows]);

  const handleSelectAll = useCallback(() => {
    if (allChecked) {
      const visibleIds = new Set(items.map(m => m.MATNR));
      setCheckedRows(prev => prev.filter(id => !visibleIds.has(id)));
    } else {
      const toAdd = items.map(m => m.MATNR).filter(id => !checkedSet.has(id));
      setCheckedRows(prev => [...prev, ...toAdd]);
    }
  }, [allChecked, items, checkedSet, setCheckedRows]);

  // ── Keyboard navigation ────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => { const next = Math.min(prev + 1, items.length - 1); listRef.current?.scrollToItem(next, 'smart'); return next; });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => { const next = Math.max(prev - 1, 0); listRef.current?.scrollToItem(next, 'smart'); return next; });
    } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < items.length) {
      e.preventDefault();
      handleSelectId(items[focusedIndex].MATNR);
    } else if (e.key === ' ' && focusedIndex >= 0 && focusedIndex < items.length) {
      e.preventDefault();
      handleToggleCheck(items[focusedIndex].MATNR);
    } else if (e.key === 'Escape') {
      setFocusedIndex(-1);
    }
  }, [items, focusedIndex, handleSelectId, handleToggleCheck]);

  // ── Infinite scroll ────────────────────────────────────────────────────────

  const handleItemsRendered = useCallback(({ visibleStopIndex }: { visibleStopIndex: number }) => {
    if (hasNextPage && !isFetchingNextPage && visibleStopIndex >= items.length - 10) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, items.length, fetchNextPage]);

  const itemData = useMemo(() => ({
    items, selectedId, focusedIndex, onSelect: handleSelectId,
    t, outputFields, checkedSet, onToggleCheck: handleToggleCheck,
  }), [items, selectedId, focusedIndex, handleSelectId, t, outputFields, checkedSet, handleToggleCheck]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading && !data) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.paper' }}>
        {/* Header skeleton */}
        <Box sx={{ px: 2, py: 2, display: 'flex', gap: 2, borderBottom: '2px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
          <Skeleton variant="rounded" width={28} height={28} />
          {[120, 200, 80, 60, 80, 80, 80].map((w, i) => <Skeleton key={i} variant="rounded" width={w} height={16} />)}
        </Box>
        {/* Row skeletons — alternating shade */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <Box key={i} sx={{ px: 2, py: 1.5, display: 'flex', gap: 2, alignItems: 'center', bgcolor: i % 2 === 0 ? '#FAFBFF' : '#FFF', borderBottom: '1px solid rgba(226,232,240,0.8)' }}>
              <Skeleton variant="circular" width={22} height={22} sx={{ flexShrink: 0 }} />
              <Skeleton variant="rounded" width={90} height={22} sx={{ borderRadius: '6px' }} />
              <Skeleton variant="rounded" width={`${30 + (i % 4) * 8}%`} height={14} />
              <Skeleton variant="rounded" width={60} height={14} sx={{ ml: 'auto' }} />
              <Skeleton variant="rounded" width={50} height={20} sx={{ borderRadius: 10 }} />
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <Box sx={{ flex: 1, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, bgcolor: 'background.paper' }}>
        <ErrorOutline color="error" sx={{ fontSize: 48, opacity: 0.7 }} />
        <Typography variant="subtitle1" fontWeight="bold" color="error">
          {t('materialSearch.results.error', 'שגיאה בטעינת תוצאות החיפוש')}
        </Typography>
        <Alert severity="error" sx={{ width: '100%', maxWidth: 400, fontSize: '0.8rem' }}>
          {message}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => refetch()}
          sx={{ mt: 1 }}
        >
          {t('materialSearch.results.retry', 'נסה שוב')}
        </Button>
      </Box>
    );
  }

  return (
    <Box role="table" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.paper', boxShadow: 'inset 0 1px 0 0 rgba(226,232,240,0.5)' }}>

      <Box sx={{ flex: 1, overflowX: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ minWidth: { xs: 800, md: '100%' }, flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* ── Header row ──────────────────────────────────────────────── */}
          <Box
            role="rowgroup"
            sx={{
              display: 'flex',
              alignItems: 'center',
              background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
              borderBottom: '2px solid #E2E8F0',
              userSelect: 'none',
              position: 'sticky',
              top: 0,
              zIndex: 1,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            {/* Select-all */}
            <Box
              role="columnheader"
              sx={{ width: CHECKBOX_COL_WIDTH, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}
            >
              <Tooltip title={allChecked ? 'בטל בחירת הכל' : 'בחר הכל'}>
                <span>
                  <Checkbox
                    size="small"
                    checked={allChecked}
                    indeterminate={someChecked}
                    onChange={handleSelectAll}
                    disabled={items.length === 0}
                    sx={{ p: 0.5 }}
                    inputProps={{ 'aria-label': 'Select all rows' }}
                  />
                </span>
              </Tooltip>
            </Box>

            {/* Column headers */}
            {outputFields?.map((field) => {
              const sortIdx = sortKeys.findIndex(e => e.field === field.field_name);
              const isActive = sortIdx !== -1;
              const direction = isActive ? sortKeys[sortIdx].direction : undefined;
              const rank = isActive ? sortIdx + 1 : null;
              const showRank = sortKeys.length > 1 && isActive;

              return (
                <Tooltip
                  key={field.field_name}
                  title={
                    <Box sx={{ textAlign: 'center', fontSize: '0.75rem' }}>
                      <div>לחץ — מיין לפי עמודה זו</div>
                      <div>Shift+לחץ — הוסף לסדר מיון מרובה</div>
                    </Box>
                  }
                  enterDelay={600}
                  placement="top"
                >
                  <Box
                    role="columnheader"
                    aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
                    onClick={(e) => handleColumnHeaderClick(field.field_name, e.shiftKey)}
                    sx={{
                      flex: `${field.width} ${field.width} 0%`,
                      minWidth: 0,
                      pr: 2.5,
                      py: 1.75,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: isActive ? 'primary.main' : '#64748B',
                      transition: 'color 0.15s',
                      borderBottom: isActive ? '2px solid' : '2px solid transparent',
                      borderColor: isActive ? 'primary.main' : 'transparent',
                      '&:hover': {
                        color: 'primary.main',
                        '& .sort-icon': { opacity: 0.7 },
                      },
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                      {t(field.hebrew_desc)}
                    </span>
                    <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      <Box className="sort-icon" sx={{ display: 'flex', alignItems: 'center' }}>
                        <SortIcon direction={direction} />
                      </Box>
                      {showRank && rank !== null && <SortBadge rank={rank} />}
                    </Box>
                  </Box>
                </Tooltip>
              );
            })}

            {/* Spacer to match row-open-hint icon in rows */}
            <Box sx={{ width: 36, flexShrink: 0 }} />
          </Box>

          {/* ── Virtual list ────────────────────────────────────────────── */}
          <Box
            ref={containerRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            sx={{ flex: 1, position: 'relative', outline: 'none' }}
          >
            {items.length === 0 ? (
              <Box sx={{ p: 8, textAlign: 'center', color: 'text.disabled', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ fontSize: '2.5rem', lineHeight: 1 }}>🔍</Box>
                <Typography variant="body1" fontWeight={600} color="text.secondary">{t('materialSearch.results.empty')}</Typography>
                <Typography variant="body2" color="text.disabled">נסה לשנות את קריטריוני החיפוש</Typography>
              </Box>
            ) : (
              size.height > 0 && (
                <List
                  ref={listRef}
                  height={size.height}
                  itemCount={items.length}
                  itemSize={60}
                  width="100%"
                  itemData={itemData}
                  style={{ direction: 'rtl' }}
                  onItemsRendered={handleItemsRendered}
                >
                  {Row}
                </List>
              )
            )}
          </Box>
        </Box>
      </Box>

      {/* Infinite-load progress bar */}
      {isFetchingNextPage && (
        <LinearProgress
          variant="indeterminate"
          sx={{ height: 2, bgcolor: 'transparent', '& .MuiLinearProgress-bar': { bgcolor: 'primary.light' } }}
        />
      )}

      {/* Footer */}
      <Box sx={{
        px: 2.5, py: 1.25,
        borderTop: '1px solid #E2E8F0',
        background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {data && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ px: 1.25, py: 0.25, borderRadius: '20px', bgcolor: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.15)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.dark', fontSize: '0.75rem' }}>
                  {loadedCount.toLocaleString('he-IL')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                  / {totalCount.toLocaleString('he-IL')}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>רשומות</Typography>
            </Box>
          )}
          {checkedRows.length > 0 && (
            <Box sx={{ px: 1.25, py: 0.25, borderRadius: '20px', bgcolor: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.25)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.dark', fontSize: '0.75rem' }}>
                {checkedRows.length} נבחרו
              </Typography>
            </Box>
          )}
        </Box>

        {/* Active sort summary */}
        {sortKeys.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.7rem', flexShrink: 0 }}>ממוין לפי:</Typography>
            {sortKeys.map((entry, i) => {
              const label = allOutputFields?.find(f => f.field_name === entry.field)?.hebrew_desc ?? entry.field;
              return (
                <Box
                  key={entry.field}
                  onClick={() => setSortKeys(prev => prev.filter(e => e.field !== entry.field))}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.4,
                    px: 1, py: 0.25, borderRadius: '20px',
                    bgcolor: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)',
                    cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, color: 'primary.dark',
                    '&:hover': { bgcolor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)', color: 'error.dark' },
                    transition: 'all 0.15s',
                  }}
                  title="לחץ להסרה"
                >
                  <SortBadge rank={i + 1} />
                  <span>{t(label)}</span>
                  <SortIcon direction={entry.direction} />
                </Box>
              );
            })}
            {sortKeys.length > 1 && (
              <Typography
                variant="caption"
                onClick={() => setSortKeys([])}
                sx={{ color: 'error.main', cursor: 'pointer', fontSize: '0.7rem', textDecoration: 'underline', flexShrink: 0, '&:hover': { color: 'error.dark' } }}
              >
                נקה הכל
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
