import {
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  Close as CloseIcon,
  CompareArrows as CompareIcon,
  FileDownload,
  FilterAltOff,
  Settings as SettingsIcon,
  MoreVert,
  FilterList,
  Share,
  ContentCopy,
  Flight as FlightIcon,
} from '@mui/icons-material';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  checkedRowsState,
  searchListMetaState,
  compareModeOpenState,
  searchSubmittedState,
} from '../state/search.state';
import { lazy, Suspense, useMemo, useState, useCallback } from 'react';
import { useLayoutMode } from '../hooks/useLayoutMode';
import { useShareableLink } from '../hooks/useShareableLink';
import { useBulkMaterialActions } from '../hooks/useBulkMaterialActions';
import { useClearSearch } from '../hooks/useClearSearch';
import { useErrorsReportTransfer } from '../hooks/useErrorsReportTransfer';
import { matnrFromResultRowId } from '../types/material';
import { SherlokBrand } from '../../../components/SherlokBrand';

const FieldSettingsDialog = lazy(() =>
  import('./FieldSettingsDialog').then((m) => ({ default: m.FieldSettingsDialog })),
);

type CountTone = 'primary' | 'neutral' | 'amber' | 'onPrimary';

const COUNT_TONES: Record<CountTone, { bgcolor: string; color: string; border?: string }> = {
  primary: { bgcolor: 'primary.main', color: '#fff', border: '1px solid #fff' },
  neutral: { bgcolor: '#475569', color: '#fff', border: '1px solid #fff' },
  amber: { bgcolor: '#B45309', color: '#FFFBEB', border: '1px solid #FEF3C7' },
  onPrimary: { bgcolor: '#1E293B', color: '#fff', border: '1px solid #fff' },
};

/**
 * Wraps a bulk action control and pins a small count badge at the
 * physical bottom-left corner (LTR left) when materials are selected.
 */
function WithCornerCount({
  count,
  tone = 'primary',
  children,
}: {
  count: number;
  tone?: CountTone;
  children: React.ReactNode;
}) {
  return (
    <Box
      component="span"
      sx={{
        position: 'relative',
        display: 'inline-flex',
        verticalAlign: 'middle',
      }}
    >
      {children}
      {count > 0 && (
        <Box
          component="span"
          aria-hidden
          sx={{
            position: 'absolute',
            // App is RTL + stylis-plugin-rtl flips left↔right.
            // Write `right` so the flip lands on the physical left (bottom-left corner).
            right: -4,
            bottom: -5,
            zIndex: 1,
            minWidth: 16,
            height: 16,
            px: 0.35,
            borderRadius: '999px',
            fontSize: '0.6rem',
            fontWeight: 800,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontVariantNumeric: 'tabular-nums',
            pointerEvents: 'none',
            boxShadow: '0 1px 2px rgba(15,23,42,0.2)',
            ...COUNT_TONES[tone],
          }}
        >
          {count}
        </Box>
      )}
    </Box>
  );
}

/**
 * App chrome: brand · selection · export / copy / compare / transfer.
 * Loaded-count lives only in the results footer (not top bar).
 */
export function TopBar() {
  const { t } = useTranslation();
  const searchSubmitted = useRecoilValue(searchSubmittedState);
  const [checkedRows, setCheckedRows] = useRecoilState(checkedRowsState);
  const setCompareOpen = useSetRecoilState(compareModeOpenState);
  const listMeta = useRecoilValue(searchListMetaState);
  const clearSearch = useClearSearch();
  const { openErrorsReport: runErrorsReportTransfer } = useErrorsReportTransfer();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<0 | 1 | 2>(0);
  const { isLgUp, isMdUp, setFilterDrawerOpen } = useLayoutMode();
  const { copyLink } = useShareableLink();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const {
    open: toastOpen,
    message: toastMessage,
    severity: toastSeverity,
    showToast,
    setOpen: setToastOpen,
    hasSelection,
    checkedCount,
    isExporting,
    isCopying,
    isExportDisabled,
    isCopyDisabled,
    isBulkAllDisabled,
    handleExport,
    handleCopyMaterials,
    resolveMatnrs,
  } = useBulkMaterialActions();

  const [isTransferring, setIsTransferring] = useState(false);

  const uniqueMatnrs = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of checkedRows) {
      const m = matnrFromResultRowId(id);
      if (!m || seen.has(m)) continue;
      seen.add(m);
      out.push(m);
    }
    return out;
  }, [checkedRows]);
  const uniqueMatnrCount = uniqueMatnrs.length;
  /** Count badge on bulk buttons — only when something is selected. */
  const selCount = hasSelection ? uniqueMatnrCount || checkedCount : 0;
  const canCompare = uniqueMatnrCount >= 2 && uniqueMatnrCount <= 4;
  const { totalCount, hasData } = listMeta;
  /** Selection → those MATNRs; no selection → all search results. */
  const canTransfer = searchSubmitted && hasData && !isTransferring && !( !hasSelection && isBulkAllDisabled);

  const handleErrorsReport = useCallback(async () => {
    setIsTransferring(true);
    try {
      // resolveMatnrs: selected rows if any, else full result set (same as Excel/copy)
      const matnrs = await resolveMatnrs();
      const result = runErrorsReportTransfer(matnrs);
      if (!result.ok) {
        showToast(
          result.message ?? t('materialSearch.transfer.openFailed', 'פתיחת דוח שגויים נכשלה'),
          'error',
        );
        return;
      }
      const count = result.count ?? matnrs.length;
      showToast(
        t('materialSearch.transfer.opened', {
          count,
          defaultValue: `דוח שגויים נפתח · ${count} חומרים נשלחו`,
        }),
      );
    } catch (err) {
      console.error('Errors report transfer failed', err);
      showToast(t('materialSearch.transfer.openFailed', 'פתיחת דוח שגויים נכשלה'), 'error');
    } finally {
      setIsTransferring(false);
    }
  }, [resolveMatnrs, runErrorsReportTransfer, showToast, t]);

  const handleClearFilters = () => clearSearch();

  const clearSelection = () => setCheckedRows([]);

  const handleCopyLink = async () => {
    const ok = await copyLink();
    showToast(
      ok
        ? t('materialSearch.actions.linkCopied', 'הקישור הועתק בהצלחה!')
        : t('materialSearch.actions.copyFailed', 'ההעתקה נכשלה'),
      ok ? 'success' : 'error',
    );
  };

  return (
    <Box
      component="header"
      className="mdg-topbar"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 1.5, sm: 2.5 },
        py: { xs: 1.25, sm: 1.5 },
        gap: 2,
        minHeight: { xs: 56, sm: 64 },
        flexWrap: 'wrap',
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 1px 0 rgba(15,23,42,0.04)',
        zIndex: 10,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flexWrap: 'wrap' }}>
        <SherlokBrand size="sm" />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0, ml: 'auto' }}>
        {!isLgUp && searchSubmitted && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterList />}
            onClick={() => setFilterDrawerOpen(true)}
          >
            {t('materialSearch.filters.title', 'סינון')}
          </Button>
        )}

        {isMdUp ? (
          <>
            <Tooltip title={t('materialSearch.actions.copyLink', 'העתק קישור')}>
              <IconButton onClick={() => void handleCopyLink()} id="copy-link-btn" size="small">
                <Share fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip
              title={
                searchSubmitted
                  ? t('materialSearch.settings.titleWithColumns', 'הגדרות תצוגה · עמודות וסדר')
                  : t('materialSearch.settings.title', 'הגדרות תצוגה')
              }
            >
              <IconButton
                onClick={() => {
                  setSettingsTab(searchSubmitted ? 1 : 0);
                  setSettingsOpen(true);
                }}
                id="open-settings-btn"
                size="small"
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={t('materialSearch.filters.clearFilters')}>
              <IconButton onClick={handleClearFilters} id="clear-filters-btn" size="small">
                <FilterAltOff fontSize="small" />
              </IconButton>
            </Tooltip>

            {searchSubmitted && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {hasSelection && (
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={t('materialSearch.selection.count', {
                      count: checkedCount,
                      defaultValue: `${checkedCount} נבחרו`,
                    })}
                    onDelete={clearSelection}
                    deleteIcon={<CloseIcon fontSize="small" />}
                    sx={{
                      fontWeight: 700,
                      height: 32,
                      '& .MuiChip-label': { px: 1.25 },
                    }}
                  />
                )}
                <Tooltip title={t('materialSearch.actions.copyMaterials', 'העתק חומרים')}>
                  <WithCornerCount count={selCount} tone="primary">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void handleCopyMaterials()}
                      disabled={isCopyDisabled}
                      id="copy-materials-btn"
                      startIcon={
                        isCopying ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <ContentCopy fontSize="small" />
                        )
                      }
                      sx={{ fontWeight: 600, minWidth: 'auto', px: 1.25 }}
                    >
                      {t('materialSearch.actions.copyMaterials', 'העתק חומרים')}
                    </Button>
                  </WithCornerCount>
                </Tooltip>
              </Box>
            )}

            {searchSubmitted && uniqueMatnrCount > 0 && (
              <Tooltip
                title={
                  canCompare
                    ? t('materialSearch.compare.button')
                    : t(
                        'materialSearch.compare.selectHint',
                        'בחר 2–4 חומרים להשוואה',
                      )
                }
              >
                <WithCornerCount count={selCount} tone="neutral">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CompareIcon fontSize="small" />}
                    onClick={() => setCompareOpen(true)}
                    disabled={!canCompare}
                    id="compare-materials-btn"
                    sx={{
                      fontWeight: 700,
                      px: 1.5,
                      color: canCompare ? '#334155' : undefined,
                      borderColor: canCompare ? '#CBD5E1' : undefined,
                      bgcolor: canCompare ? '#F8FAFC' : undefined,
                      '&:hover': canCompare
                        ? {
                            bgcolor: '#F1F5F9',
                            borderColor: '#94A3B8',
                            color: '#0F172A',
                          }
                        : undefined,
                    }}
                  >
                    {t('materialSearch.compare.button')}
                  </Button>
                </WithCornerCount>
              </Tooltip>
            )}

            {searchSubmitted && (
              <>
                {hasData && (
                  <Tooltip
                    title={
                      hasSelection
                        ? t('materialSearch.transfer.selectedHint', {
                            count: uniqueMatnrCount,
                            defaultValue: `שליחת ${uniqueMatnrCount} חומרים נבחרים`,
                          })
                        : t('materialSearch.transfer.allHint', {
                            count: totalCount,
                            defaultValue: `שליחת כל תוצאות החיפוש (${totalCount})`,
                          })
                    }
                  >
                    <WithCornerCount count={selCount} tone="amber">
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={
                          isTransferring ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <FlightIcon fontSize="small" />
                          )
                        }
                        onClick={() => void handleErrorsReport()}
                        disabled={!canTransfer}
                        id="transfer-materials-btn"
                        sx={{
                          fontWeight: 700,
                          color: '#78350F',
                          bgcolor: '#FDE68A',
                          border: '1px solid #F59E0B',
                          boxShadow: 'none',
                          '&:hover': {
                            bgcolor: '#FCD34D',
                            borderColor: '#D97706',
                            boxShadow: '0 1px 3px rgba(217, 119, 6, 0.25)',
                          },
                          '& .MuiButton-startIcon': { color: '#B45309' },
                        }}
                      >
                        {t('materialSearch.transfer.button', 'דוח שגויים')}
                      </Button>
                    </WithCornerCount>
                  </Tooltip>
                )}
                <WithCornerCount count={selCount} tone="onPrimary">
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={
                      isExporting ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <FileDownload fontSize="small" />
                      )
                    }
                    onClick={() => void handleExport()}
                    disabled={isExportDisabled}
                    id="export-excel-btn"
                    sx={{ fontWeight: 700, ml: 0.5 }}
                  >
                    {t('materialSearch.actions.exportExcel')}
                  </Button>
                </WithCornerCount>
              </>
            )}
          </>
        ) : (
          <>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
              <MoreVert />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  void handleCopyLink();
                }}
              >
                <Share sx={{ mr: 1 }} fontSize="small" /> {t('materialSearch.actions.copyLink', 'העתק קישור')}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  setSettingsTab(searchSubmitted ? 1 : 0);
                  setSettingsOpen(true);
                }}
              >
                <SettingsIcon sx={{ mr: 1 }} fontSize="small" /> {t('materialSearch.settings.title', 'הגדרות תצוגה')}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  handleClearFilters();
                }}
              >
                <FilterAltOff sx={{ mr: 1 }} fontSize="small" /> {t('materialSearch.filters.clearFilters')}
              </MenuItem>
              {searchSubmitted && (
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null);
                    void handleCopyMaterials();
                  }}
                  disabled={isCopyDisabled}
                >
                  <ContentCopy sx={{ mr: 1 }} fontSize="small" />
                  {t('materialSearch.actions.copyMaterials')}
                  {selCount > 0 ? ` · ${selCount}` : ''}
                </MenuItem>
              )}
              {searchSubmitted && uniqueMatnrCount > 0 && (
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null);
                    setCompareOpen(true);
                  }}
                  disabled={!canCompare}
                >
                  <CompareIcon sx={{ mr: 1 }} fontSize="small" />
                  {t('materialSearch.compare.button')}
                  {selCount > 0 ? ` · ${selCount}` : ''}
                </MenuItem>
              )}
              {searchSubmitted && hasData && (
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null);
                    void handleErrorsReport();
                  }}
                  disabled={!canTransfer}
                  sx={{ color: '#B45309', fontWeight: 600 }}
                >
                  <FlightIcon sx={{ mr: 1, color: '#D97706' }} fontSize="small" />
                  {t('materialSearch.transfer.button', 'דוח שגויים')}
                  {selCount > 0 ? ` · ${selCount}` : ''}
                </MenuItem>
              )}
              {searchSubmitted && (
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null);
                    void handleExport();
                  }}
                  disabled={isExportDisabled}
                >
                  <FileDownload sx={{ mr: 1 }} fontSize="small" />
                  {t('materialSearch.actions.exportExcel')}
                  {selCount > 0 ? ` · ${selCount}` : ''}
                </MenuItem>
              )}
              {hasSelection && (
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null);
                    clearSelection();
                  }}
                >
                  <CloseIcon sx={{ mr: 1 }} fontSize="small" /> {t('materialSearch.selection.clear', 'נקה בחירה')}
                </MenuItem>
              )}
            </Menu>
          </>
        )}
      </Box>

      {settingsOpen && (
        <Suspense fallback={null}>
          <FieldSettingsDialog
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            initialTab={settingsTab}
          />
        </Suspense>
      )}

      <Snackbar
        open={toastOpen}
        autoHideDuration={2500}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setToastOpen(false)} severity={toastSeverity} sx={{ width: '100%' }} variant="filled">
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
