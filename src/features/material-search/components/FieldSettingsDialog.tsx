import { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
  IconButton,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  SettingsBackupRestore,
  ClearAll,
  KeyboardArrowUp,
  KeyboardArrowDown,
  PushPin,
  DragIndicator,
} from '@mui/icons-material';
import { FixedSizeList as List, ListChildComponentProps, areEqual } from 'react-window';
import { useTranslation } from 'react-i18next';
import { useRecoilState } from 'recoil';
import { activeSearchFieldsState, activeOutputFieldsState, activeCompareFieldsState } from '../state/search.state';
import { useSearchFieldsQuery, useOutputFieldsQuery } from '../hooks/useMaterialSearch';
import { fieldKey } from '../types/material';
import {
  isRealApiMode,
  resolveFieldKeys,
  ensureMatnrInOutputKeys,
  findFieldKeyByName,
  REQUIRED_OUTPUT_FIELD_NAME,
  DEFAULT_CRITERIA_FIELD_NAMES,
  DEFAULT_OUTPUT_FIELD_NAMES,
  DEFAULT_COMPARE_FIELD_NAMES,
} from '../fieldDefaults';

interface FieldSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Tab to open on: 0 = search/criteria, 1 = output columns, 2 = compare */
  initialTab?: 0 | 1 | 2;
}

type FieldItem = { key: string; label: string; locked?: boolean };

const ROW_HEIGHT = 36;
const LIST_HEIGHT = 320;
const ORDER_LIST_HEIGHT = 280;

// ─── Lightweight row (native checkbox — no MUI per row) ─────────────────────

const FieldRow = memo(function FieldRow({ index, style, data }: ListChildComponentProps) {
  const { items, checkedSet, onToggle } = data as {
    items: FieldItem[];
    checkedSet: Set<string>;
    onToggle: (key: string) => void;
  };
  const item = items[index];
  if (!item) return null;
  const locked = !!item.locked;
  const checked = locked || checkedSet.has(item.key);

  return (
    <label
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        paddingInline: 4,
        cursor: locked ? 'default' : 'pointer',
        userSelect: 'none',
        boxSizing: 'border-box',
        opacity: locked ? 0.85 : 1,
      }}
      title={locked ? 'שדה חובה — לא ניתן להסרה' : undefined}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={locked}
        onChange={() => {
          if (!locked) onToggle(item.key);
        }}
        style={{
          width: 16,
          height: 16,
          accentColor: '#4F46E5',
          flexShrink: 0,
          cursor: locked ? 'not-allowed' : 'pointer',
        }}
      />
      <span
        style={{
          fontSize: '0.875rem',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: locked ? 600 : 400,
        }}
      >
        {item.label}
        {locked ? ' *' : ''}
      </span>
    </label>
  );
}, areEqual);

// ─── Virtual field list ─────────────────────────────────────────────────────

function FieldCheckList({
  items,
  checkedSet,
  onToggle,
  height = LIST_HEIGHT,
}: {
  items: FieldItem[];
  checkedSet: Set<string>;
  onToggle: (key: string) => void;
  height?: number;
}) {
  const itemData = useMemo(
    () => ({ items, checkedSet, onToggle }),
    [items, checkedSet, onToggle],
  );

  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled" sx={{ py: 4, textAlign: 'center' }}>
        —
      </Typography>
    );
  }

  return (
    <List
      height={height}
      width="100%"
      itemCount={items.length}
      itemSize={ROW_HEIGHT}
      itemData={itemData}
      style={{ direction: 'rtl' }}
    >
      {FieldRow}
    </List>
  );
}

// ─── Dialog ─────────────────────────────────────────────────────────────────

export function FieldSettingsDialog({ open, onClose, initialTab = 0 }: FieldSettingsDialogProps) {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: searchFields } = useSearchFieldsQuery();
  const { data: outputFields } = useOutputFieldsQuery();

  const [activeSearchFields, setActiveSearchFields] = useRecoilState(activeSearchFieldsState);
  const [activeOutputFields, setActiveOutputFields] = useRecoilState(activeOutputFieldsState);
  const [activeCompareFields, setActiveCompareFields] = useRecoilState(activeCompareFieldsState);

  // Draft only — Recoil untouched until Apply
  const [draftSearch, setDraftSearch] = useState<string[]>([]);
  const [draftOutput, setDraftOutput] = useState<string[]>([]);
  const [draftCompare, setDraftCompare] = useState<string[]>([]);
  const seededRef = useRef(false);

  const allSearchKeys = useMemo(
    () => (searchFields ? searchFields.map(fieldKey) : []),
    [searchFields],
  );
  const allOutputKeys = useMemo(
    () => (outputFields ? outputFields.map(fieldKey) : []),
    [outputFields],
  );

  const matnrOutputKey = useMemo(
    () => (outputFields ? findFieldKeyByName(outputFields, REQUIRED_OUTPUT_FIELD_NAME) : null),
    [outputFields],
  );

  // Seed draft + context tab when dialog opens (once per open cycle)
  useEffect(() => {
    if (!open) {
      seededRef.current = false;
      setSearchQuery('');
      return;
    }
    if (seededRef.current) return;
    if (!searchFields || !outputFields) return;

    setTabValue(initialTab);
    setDraftSearch(activeSearchFields ?? allSearchKeys);
    setDraftOutput(ensureMatnrInOutputKeys(activeOutputFields ?? allOutputKeys, outputFields));
    setDraftCompare(activeCompareFields ?? allOutputKeys);
    seededRef.current = true;
  }, [
    open,
    initialTab,
    searchFields,
    outputFields,
    activeSearchFields,
    activeOutputFields,
    activeCompareFields,
    allSearchKeys,
    allOutputKeys,
  ]);

  const searchChecked = useMemo(() => new Set(draftSearch), [draftSearch]);
  const outputChecked = useMemo(() => new Set(draftOutput), [draftOutput]);
  const compareChecked = useMemo(() => new Set(draftCompare), [draftCompare]);

  const toggleIn = useCallback((setDraft: React.Dispatch<React.SetStateAction<string[]>>, key: string) => {
    setDraft((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }, []);

  const handleSearchToggle = useCallback(
    (key: string) => toggleIn(setDraftSearch, key),
    [toggleIn],
  );
  const handleOutputToggle = useCallback(
    (key: string) => {
      if (matnrOutputKey && key === matnrOutputKey) return; // MATNR locked
      toggleIn(setDraftOutput, key);
    },
    [toggleIn, matnrOutputKey],
  );
  const handleCompareToggle = useCallback(
    (key: string) => toggleIn(setDraftCompare, key),
    [toggleIn],
  );

  const dragKeyRef = useRef<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  /** Move output column in draft order (MATNR stays first). */
  const moveOutputKey = useCallback(
    (key: string, dir: -1 | 1) => {
      if (matnrOutputKey && key === matnrOutputKey) return;
      setDraftOutput((prev) => {
        const ordered = outputFields
          ? ensureMatnrInOutputKeys(prev, outputFields)
          : prev;
        const idx = ordered.indexOf(key);
        if (idx < 0) return prev;
        const swapWith = idx + dir;
        // index 0 = MATNR — never swap into or out of pin slot via non-matnr moves
        if (swapWith < 1 || swapWith >= ordered.length) return prev;
        const next = [...ordered];
        [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
        return next;
      });
    },
    [matnrOutputKey, outputFields],
  );

  /**
   * Drag-and-drop reorder: move dragged key to target index (MATNR stays first).
   * Uses splice(from) then splice(to, 0, item) with the *original* `to` —
   * do NOT use `to - 1` when moving down (that no-ops adjacent swaps e.g. 3↔4).
   */
  const reorderOutputKey = useCallback(
    (fromKey: string, toKey: string) => {
      if (!fromKey || !toKey || fromKey === toKey) return;
      if (matnrOutputKey && fromKey === matnrOutputKey) return;
      setDraftOutput((prev) => {
        const ordered = outputFields
          ? ensureMatnrInOutputKeys(prev, outputFields)
          : [...prev];
        const from = ordered.indexOf(fromKey);
        let to = ordered.indexOf(toKey);
        if (from < 0 || to < 0) return prev;
        // Cannot place anything before / on MATNR slot
        if (matnrOutputKey && (to === 0 || toKey === matnrOutputKey)) {
          to = 1;
        }
        if (from === to) return prev;
        const next = [...ordered];
        const [item] = next.splice(from, 1);
        // After removing `from`, if we removed an item *before* `to`, the old
        // target index is already accounted for by splicing at original `to`
        // only when from > to. When from < to, `to` still lands on the right
        // slot in the shortened array (e.g. 2→3 adjacent swap works).
        const minIdx = matnrOutputKey ? 1 : 0;
        const insertAt = Math.max(minIdx, Math.min(to, next.length));
        next.splice(insertAt, 0, item);
        return outputFields ? ensureMatnrInOutputKeys(next, outputFields) : next;
      });
    },
    [matnrOutputKey, outputFields],
  );

  /** Clear all selections on the active tab (draft only). Output tab keeps MATNR. */
  const handleClearSelection = () => {
    if (tabValue === 0) setDraftSearch([]);
    else if (tabValue === 1) setDraftOutput(matnrOutputKey ? [matnrOutputKey] : []);
    else setDraftCompare([]);
  };

  const handleReset = () => {
    if (searchFields) {
      setDraftSearch(resolveFieldKeys(searchFields, DEFAULT_CRITERIA_FIELD_NAMES));
    }
    if (outputFields) {
      setDraftOutput(ensureMatnrInOutputKeys(
        resolveFieldKeys(outputFields, DEFAULT_OUTPUT_FIELD_NAMES),
        outputFields,
      ));
      setDraftCompare(resolveFieldKeys(outputFields, DEFAULT_COMPARE_FIELD_NAMES));
    }
  };

  const handleApply = () => {
    setActiveSearchFields(draftSearch);
    // Always persist ordered keys — order drives results table + Excel export
    const outputToSave = outputFields
      ? ensureMatnrInOutputKeys(draftOutput, outputFields)
      : draftOutput;
    setActiveOutputFields(outputToSave);
    if (!isRealApiMode() && draftCompare.length === allOutputKeys.length) {
      setActiveCompareFields(null);
    } else {
      setActiveCompareFields(draftCompare);
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hebrewValue = e.target.value.replace(/[^ \u0590-\u05FF\d\(\)\-\:\.]/g, '');
    setSearchQuery(hebrewValue);
  };

  const q = searchQuery.toLowerCase();

  const searchItems = useMemo<FieldItem[]>(() => {
    if (!searchFields) return [];
    return searchFields
      .map((f) => ({ key: fieldKey(f), label: t(f.hebrewDesc) }))
      .filter((item) => !q || item.label.toLowerCase().includes(q));
  }, [searchFields, t, q]);

  const outputItems = useMemo<FieldItem[]>(() => {
    if (!outputFields) return [];
    return outputFields
      .map((f) => {
        const key = fieldKey(f);
        return {
          key,
          label: t(f.hebrewDesc),
          locked: matnrOutputKey != null && key === matnrOutputKey,
        };
      })
      .filter((item) => !q || item.label.toLowerCase().includes(q));
  }, [outputFields, t, q, matnrOutputKey]);

  // Output tab: only MATNR left still counts as "cleared" for button disable
  const currentDraftCount =
    tabValue === 0
      ? draftSearch.length
      : tabValue === 1
        ? draftOutput.filter((k) => k !== matnrOutputKey).length
        : draftCompare.length;

  const tabHint =
    tabValue === 0
      ? 'בחר אילו שדות יופיעו בחלונית הסינון:'
      : tabValue === 1
        ? 'בחר עמודות וסדר אותן — הסדר חל על הטבלה ועל ייצוא לאקסל:'
        : 'בחר אילו שדות יופיעו במסך ההשוואה:';

  const labelByOutputKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const item of outputItems) m.set(item.key, item.label);
    // unfiltered labels when search hides some selected rows
    if (outputFields) {
      for (const f of outputFields) {
        const k = fieldKey(f);
        if (!m.has(k)) m.set(k, t(f.hebrewDesc));
      }
    }
    return m;
  }, [outputItems, outputFields, t]);

  const orderedOutputKeys = useMemo(
    () =>
      outputFields ? ensureMatnrInOutputKeys(draftOutput, outputFields) : draftOutput,
    [draftOutput, outputFields],
  );

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth={tabValue === 1 ? 'md' : 'sm'} fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {t('materialSearch.settings.title', 'הגדרות תצוגה')}
        <IconButton aria-label="close" onClick={handleCancel} sx={{ color: (theme) => theme.palette.grey[500] }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} aria-label="field settings tabs" centered>
            <Tab label={t('materialSearch.settings.searchFields', 'שדות לחיפוש')} />
            <Tab label={t('materialSearch.settings.outputColumns', 'עמודות לתוצאה')} />
            <Tab label={t('materialSearch.settings.compareFields', 'שדות להשוואה')} />
          </Tabs>
        </Box>

        <Box sx={{ p: 2, pb: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            placeholder="חפש שדה בעברית בלבד..."
            value={searchQuery}
            onChange={handleSearchChange}
            autoComplete="off"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {tabHint}
            </Typography>
            <Button
              size="small"
              color="inherit"
              startIcon={<ClearAll />}
              onClick={handleClearSelection}
              disabled={currentDraftCount === 0}
              sx={{ flexShrink: 0, color: 'text.secondary' }}
            >
              {t('materialSearch.settings.clearSelection', 'בטל בחירת הכל')}
            </Button>
          </Box>
        </Box>

        {tabValue === 1 ? (
          <Box
            sx={{
              px: 2,
              pb: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              alignItems: 'stretch',
            }}
          >
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 600 }}>
                {t('materialSearch.settings.chooseColumns', 'בחירת עמודות')}
              </Typography>
              <FieldCheckList
                items={outputItems}
                checkedSet={outputChecked}
                onToggle={handleOutputToggle}
                height={ORDER_LIST_HEIGHT}
              />
            </Box>
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                maxHeight: ORDER_LIST_HEIGHT + 36,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 600 }}>
                {t('materialSearch.settings.columnOrder', 'סדר עמודות')}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.75 }}>
                {t('materialSearch.settings.dragHint', 'גרור לשינוי סדר · או השתמש בחצים')}
              </Typography>
              <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                {orderedOutputKeys.length === 0 ? (
                  <Typography variant="body2" color="text.disabled" sx={{ py: 4, textAlign: 'center' }}>
                    —
                  </Typography>
                ) : (
                  orderedOutputKeys.map((key, index) => {
                    const locked = matnrOutputKey != null && key === matnrOutputKey;
                    const label = labelByOutputKey.get(key) ?? key;
                    const canUp = !locked && index > 1;
                    const canDown = !locked && index < orderedOutputKeys.length - 1 && index >= 1;
                    const isDragOver = dragOverKey === key && !locked;
                    return (
                      <Box
                        key={key}
                        draggable={!locked}
                        onDragStart={(e) => {
                          if (locked) {
                            e.preventDefault();
                            return;
                          }
                          dragKeyRef.current = key;
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', key);
                          e.currentTarget.style.opacity = '0.5';
                        }}
                        onDragEnd={(e) => {
                          e.currentTarget.style.opacity = '1';
                          dragKeyRef.current = null;
                          setDragOverKey(null);
                        }}
                        onDragOver={(e) => {
                          if (locked) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverKey !== key) setDragOverKey(key);
                        }}
                        onDragLeave={() => {
                          if (dragOverKey === key) setDragOverKey(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const from =
                            dragKeyRef.current || e.dataTransfer.getData('text/plain');
                          setDragOverKey(null);
                          dragKeyRef.current = null;
                          if (from) reorderOutputKey(from, key);
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          py: 0.35,
                          px: 0.5,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: isDragOver ? 'primary.main' : 'transparent',
                          bgcolor: locked
                            ? 'action.hover'
                            : isDragOver
                              ? 'action.selected'
                              : 'transparent',
                          cursor: locked ? 'default' : 'grab',
                          '&:active': { cursor: locked ? 'default' : 'grabbing' },
                          '&:hover': { bgcolor: locked ? 'action.hover' : 'action.hover' },
                          transition: 'border-color 0.12s ease, background-color 0.12s ease',
                        }}
                      >
                        {locked ? (
                          <PushPin sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
                        ) : (
                          <DragIndicator
                            sx={{ fontSize: 18, color: 'text.disabled', flexShrink: 0 }}
                            aria-hidden
                          />
                        )}
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ width: 20, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
                        >
                          {index + 1}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight: locked ? 600 : 400,
                            fontSize: '0.875rem',
                            pointerEvents: 'none',
                          }}
                          title={label}
                        >
                          {label}
                          {locked ? ' *' : ''}
                        </Typography>
                        <Tooltip title={t('materialSearch.settings.moveUp', 'הזז למעלה')}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={!canUp}
                              onClick={() => moveOutputKey(key, -1)}
                              aria-label="move up"
                            >
                              <KeyboardArrowUp fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t('materialSearch.settings.moveDown', 'הזז למטה')}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={!canDown}
                              onClick={() => moveOutputKey(key, 1)}
                              aria-label="move down"
                            >
                              <KeyboardArrowDown fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          </Box>
        ) : (
          <Box sx={{ px: 2, pb: 2, height: LIST_HEIGHT, scrollbarGutter: 'stable' }}>
            {tabValue === 0 && (
              <FieldCheckList items={searchItems} checkedSet={searchChecked} onToggle={handleSearchToggle} />
            )}
            {tabValue === 2 && (
              <FieldCheckList items={outputItems} checkedSet={compareChecked} onToggle={handleCompareToggle} />
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', p: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button color="inherit" startIcon={<SettingsBackupRestore />} onClick={handleReset}>
          {t('materialSearch.settings.resetDefaults', 'שחזר לברירת מחדל')}
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={handleCancel} color="inherit">
            {t('materialSearch.settings.cancel', 'ביטול')}
          </Button>
          <Button onClick={handleApply} variant="contained" color="primary">
            {t('materialSearch.settings.apply', 'שמור')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
