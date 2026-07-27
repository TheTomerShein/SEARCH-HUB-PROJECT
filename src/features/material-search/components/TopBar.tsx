import {
  Box,
  Button,
  Chip,
  Typography,
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
  searchCriteriaState,
  searchSubmittedState,
  checkedRowsState,
  searchListMetaState,
  compareModeOpenState,
} from '../state/search.state';
import { lazy, Suspense, useMemo, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLayoutMode } from '../hooks/useLayoutMode';
import { useShareableLink } from '../hooks/useShareableLink';
import { useBulkMaterialActions } from '../hooks/useBulkMaterialActions';
import { matnrFromResultRowId } from '../types/material';
import { openErrorsReportWithMaterials } from '../api/postMaterialsMessage';

const FieldSettingsDialog = lazy(() =>
  import('./FieldSettingsDialog').then((m) => ({ default: m.FieldSettingsDialog })),
);

/**
 * App chrome: brand · loaded count · selection chip · export / copy / compare.
 */
export function TopBar() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [, setCriteria] = useRecoilState(searchCriteriaState);
  const [searchSubmitted, setSearchSubmitted] = useRecoilState(searchSubmittedState);
  const [checkedRows, setCheckedRows] = useRecoilState(checkedRowsState);
  const setCompareOpen = useSetRecoilState(compareModeOpenState);
  const listMeta = useRecoilValue(searchListMetaState);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    handleExport,
    handleCopyMaterials,
  } = useBulkMaterialActions();

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
  const canCompare = uniqueMatnrCount >= 2 && uniqueMatnrCount <= 4;
  const canTransfer = searchSubmitted && uniqueMatnrCount > 0;

  /** Open external "דוח שגויים" site and post selected MATNRs via window.postMessage. */
  const openErrorsReport = useCallback(() => {
    if (uniqueMatnrs.length === 0) return;
    try {
      const { materials } = openErrorsReportWithMaterials(uniqueMatnrs);
      showToast(
        t('materialSearch.transfer.opened', {
          count: materials.length,
          defaultValue: `דוח שגויים נפתח · ${materials.length} חומרים נשלחו`,
        }),
      );
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : t('materialSearch.transfer.openFailed', 'פתיחת דוח שגויים נכשלה'),
        'error',
      );
    }
  }, [uniqueMatnrs, showToast, t]);

  const handleClearFilters = () => {
    void queryClient.cancelQueries({ queryKey: ['materials', 'search', 'infinite'] });
    setCriteria({ LVORM: false });
    setSearchSubmitted(false);
    setCheckedRows([]);
  };

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

  const { loadedCount, totalCount, hasData } = listMeta;

  return (
    <Box
      component="header"
      className="mdg-topbar"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1.25,
        gap: 2,
        flexWrap: 'wrap',
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 1px 0 rgba(15,23,42,0.04)',
        zIndex: 10,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flexWrap: 'wrap' }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            flexShrink: 0,
            color: 'primary.dark',
            letterSpacing: '-0.02em',
            fontSize: { xs: '1rem', sm: '1.15rem' },
          }}
        >
          {t('app.title')}
        </Typography>
        {searchSubmitted && hasData && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              px: 1.25,
              py: 0.35,
              borderRadius: 1.5,
              bgcolor: 'action.hover',
              fontWeight: 600,
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
            }}
          >
            {t('materialSearch.results.loadedCount', { loaded: loadedCount, total: totalCount })}
          </Typography>
        )}
        {hasSelection && (
          <Tooltip title={t('materialSearch.selection.clear', 'נקה בחירה')}>
            <span>
              <Chip
                size="small"
                color="primary"
                label={t('materialSearch.selection.count', {
                  count: checkedCount,
                  defaultValue: `${checkedCount} נבחרו`,
                })}
                onClick={clearSelection}
                onDelete={clearSelection}
                deleteIcon={<CloseIcon fontSize="small" />}
                sx={{ fontWeight: 700, cursor: 'pointer' }}
              />
            </span>
          </Tooltip>
        )}
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

            <Tooltip title={t('materialSearch.settings.title', 'הגדרות תצוגה')}>
              <IconButton onClick={() => setSettingsOpen(true)} id="open-settings-btn" size="small">
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={t('materialSearch.filters.clearFilters')}>
              <IconButton onClick={handleClearFilters} id="clear-filters-btn" size="small">
                <FilterAltOff fontSize="small" />
              </IconButton>
            </Tooltip>

            {searchSubmitted && (
              <Tooltip title={t('materialSearch.actions.copyMaterials', 'העתק חומרים')}>
                <span>
                  <IconButton
                    onClick={() => void handleCopyMaterials()}
                    disabled={isCopyDisabled}
                    id="copy-materials-btn"
                    size="small"
                  >
                    {isCopying ? <CircularProgress size={18} /> : <ContentCopy fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
            )}

            {searchSubmitted && canCompare && (
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={<CompareIcon />}
                onClick={() => setCompareOpen(true)}
                sx={{ fontWeight: 600 }}
              >
                {t('materialSearch.compare.button')} ({uniqueMatnrCount})
              </Button>
            )}

            {searchSubmitted && (
              <>
                {canTransfer && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<FlightIcon />}
                    onClick={openErrorsReport}
                    id="transfer-materials-btn"
                    sx={{
                      fontWeight: 700,
                      // Amber = caution / issues report — not error-red, not primary indigo
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
                    {t('materialSearch.transfer.button', 'דוח שגויים')} ({uniqueMatnrCount})
                  </Button>
                )}
                <Button
                  variant="contained"
                  size="small"
                  startIcon={isExporting ? <CircularProgress size={16} color="inherit" /> : <FileDownload />}
                  onClick={() => void handleExport()}
                  disabled={isExportDisabled}
                  id="export-excel-btn"
                  sx={{ fontWeight: 700, ml: 0.5 }}
                >
                  {t('materialSearch.actions.exportExcel')}
                </Button>
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
                  <ContentCopy sx={{ mr: 1 }} fontSize="small" /> {t('materialSearch.actions.copyMaterials')}
                </MenuItem>
              )}
              {searchSubmitted && canCompare && (
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null);
                    setCompareOpen(true);
                  }}
                >
                  <CompareIcon sx={{ mr: 1 }} fontSize="small" /> {t('materialSearch.compare.button')}
                </MenuItem>
              )}
              {canTransfer && (
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null);
                    openErrorsReport();
                  }}
                  sx={{ color: '#B45309', fontWeight: 600 }}
                >
                  <FlightIcon sx={{ mr: 1, color: '#D97706' }} fontSize="small" />{' '}
                  {t('materialSearch.transfer.button', 'דוח שגויים')} ({uniqueMatnrCount})
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
                  <FileDownload sx={{ mr: 1 }} fontSize="small" /> {t('materialSearch.actions.exportExcel')}
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
            initialTab={searchSubmitted ? 1 : 0}
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
