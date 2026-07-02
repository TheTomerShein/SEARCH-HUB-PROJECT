import { Box, Button, Typography, IconButton, Tooltip, Chip, Badge, Menu, MenuItem, Snackbar, Alert, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { FileDownload, ClearAll, Settings as SettingsIcon, CheckBox as CheckBoxIcon, CompareArrows as CompareIcon, MoreVert, FilterList, Share, ContentCopy } from '@mui/icons-material';
import { useRecoilState } from 'recoil';
import { searchCriteriaState, searchSubmittedState, checkedRowsState, compareModeOpenState } from '../state/search.state';
import { useMaterialSearchInfiniteQuery } from '../hooks/useMaterialSearch';
import { fetchAllMaterials } from '../api/materialService';
import { useState } from 'react';
import { FieldSettingsDialog } from './FieldSettingsDialog';
import { Material } from '../types/material';
import { useLayoutMode } from '../hooks/useLayoutMode';
import { useShareableLink } from '../hooks/useShareableLink';

export function TopBar() {
  const { t } = useTranslation();
  const [criteria, setCriteria] = useRecoilState(searchCriteriaState);
  const [searchSubmitted, setSearchSubmitted] = useRecoilState(searchSubmittedState);
  const [checkedRows, setCheckedRows] = useRecoilState(checkedRowsState);
  const [, setCompareOpen] = useRecoilState(compareModeOpenState);
  const { data, isFetchingNextPage } = useMaterialSearchInfiniteQuery(criteria, searchSubmitted);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isLgUp, isMdUp, setFilterDrawerOpen } = useLayoutMode();
  const { copyLink } = useShareableLink();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const hasSelection = checkedRows.length > 0;
  const canCompare = checkedRows.length >= 2 && checkedRows.length <= 4;
  const tooManyForCompare = checkedRows.length > 4;

  const handleClearFilters = () => {
    setCriteria({ LVORM: false });
    setSearchSubmitted(false);
    setCheckedRows([]); // also clear selection on filter reset
  };

  const handleClearSelection = () => {
    setCheckedRows([]);
  };

  const handleCopyLink = async () => {
    const ok = await copyLink();
    if (ok) {
      setToastMessage(t('materialSearch.actions.linkCopied', 'הקישור הועתק בהצלחה!'));
      setToastOpen(true);
    }
  };

  const handleCopyMaterials = async () => {
    if (!data?.pages) return;
    setIsCopying(true);

    try {
      let rowsToCopy: Material[];

      if (hasSelection) {
        // Copy only the checked rows, preserving their original order
        const materialsList = data.pages.flatMap(p => p.materials);
        const checkedSet = new Set(checkedRows);
        rowsToCopy = materialsList.filter(m => checkedSet.has(m.MATNR));
      } else {
        // No selection → copy everything by fetching all pages
        const { $skip: _s, $top: _t, ...baseCriteria } = criteria;
        rowsToCopy = await fetchAllMaterials(baseCriteria);
      }

      if (rowsToCopy.length === 0) return;

      const matnrList = rowsToCopy.map(m => m.MATNR).join('\n');
      await navigator.clipboard.writeText(matnrList);

      setToastMessage(t('materialSearch.actions.materialsCopied', 'החומרים הועתקו ללוח בהצלחה!'));
      setToastOpen(true);
    } catch (error) {
      console.error('Failed to copy materials to clipboard', error);
    } finally {
      setIsCopying(false);
    }
  };

  const handleExport = async () => {
    if (!data?.pages) return;
    setIsExporting(true);

    try {
      let rowsToExport: Material[];

      if (hasSelection) {
        // Export only the checked rows, preserving their original order
        const materials = data.pages.flatMap(p => p.materials);
        const checkedSet = new Set(checkedRows);
        rowsToExport = materials.filter(m => checkedSet.has(m.MATNR));
      } else {
        // No selection → export everything by fetching all pages
        const { $skip: _s, $top: _t, ...baseCriteria } = criteria;
        rowsToExport = await fetchAllMaterials(baseCriteria);
      }

      if (rowsToExport.length === 0) return;

      const xlsx = await import('xlsx');
      const worksheet = xlsx.utils.json_to_sheet(rowsToExport);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Materials');
      const filename = hasSelection
        ? `materials_selected_${checkedRows.length}.xlsx`
        : 'materials_export.xlsx';
      xlsx.writeFile(workbook, filename);
    } finally {
      setIsExporting(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const materials = data?.pages.flatMap(p => p.materials) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;
  const loadedCount = materials.length;
  const isExportDisabled = loadedCount === 0 || isExporting || (!hasSelection && isFetchingNextPage);
  const exportLabel = hasSelection
    ? `${t('materialSearch.actions.exportExcel')} (${checkedRows.length})`
    : t('materialSearch.actions.exportExcel');
  const isCopyDisabled = loadedCount === 0 || isCopying || (!hasSelection && isFetchingNextPage);
  const copyLabel = hasSelection
    ? t('materialSearch.actions.copyMaterialsSelected', { count: checkedRows.length, defaultValue: `העתק ${checkedRows.length} שורות ללוח` })
    : t('materialSearch.actions.copyMaterials', 'העתק חומרים ללוח');

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      p: 2,
      borderBottom: 1,
      borderColor: 'divider',
      bgcolor: 'background.paper',
      gap: 2,
      flexWrap: 'wrap',
    }}>
      <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', flexShrink: 0 }}>
        {t('app.title')}
      </Typography>

      {/* Centre: result count + selection badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {searchSubmitted && data && (
          <Typography variant="body2" color="text.secondary">
            {t('materialSearch.results.loadedCount', { loaded: loadedCount, total: totalCount })}
          </Typography>
        )}

        {hasSelection && (
          <Chip
            icon={<CheckBoxIcon sx={{ fontSize: '1rem !important' }} />}
            label={`${checkedRows.length} נבחרו`}
            size="small"
            color="primary"
            variant="outlined"
            onDelete={handleClearSelection}
            sx={{ fontWeight: 600 }}
          />
        )}
      </Box>

      {/* Right: actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        {!isLgUp && searchSubmitted && (
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setFilterDrawerOpen(true)}
            size="small"
          >
            סינון
          </Button>
        )}

        {isMdUp ? (
          <>
            <Tooltip title={t('materialSearch.actions.copyLink', 'העתק קישור')}>
              <IconButton onClick={handleCopyLink} id="copy-link-btn">
                <Share />
              </IconButton>
            </Tooltip>

            <Tooltip title={t('materialSearch.settings.title', 'הגדרות תצוגה')}>
              <IconButton onClick={() => setSettingsOpen(true)} id="open-settings-btn">
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            {hasSelection && (
              <Tooltip title={tooManyForCompare ? t('materialSearch.compare.tooMany') : t('materialSearch.compare.button')}>
                <span>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<CompareIcon />}
                    onClick={() => setCompareOpen(true)}
                    disabled={!canCompare}
                    id="compare-btn"
                    sx={{
                      borderColor: canCompare ? 'secondary.main' : undefined,
                      fontWeight: 600,
                    }}
                  >
                    {t('materialSearch.compare.button')} ({checkedRows.length})
                  </Button>
                </span>
              </Tooltip>
            )}

            <Button
              variant="outlined"
              startIcon={<ClearAll />}
              onClick={handleClearFilters}
              id="clear-filters-btn"
            >
              {t('materialSearch.filters.clearFilters')}
            </Button>

            {searchSubmitted && (
              <>
                <Tooltip title={hasSelection ? `העתק ${checkedRows.length} שורות נבחרות ללוח` : 'העתק כל התוצאות ללוח'}>
                  <span>
                    <Badge
                      badgeContent={hasSelection ? checkedRows.length : 0}
                      color="secondary"
                      max={9999}
                      sx={{ mr: 1.5 }}
                    >
                      <Button
                        variant="outlined"
                        startIcon={isCopying ? <CircularProgress size={20} color="inherit" /> : <ContentCopy />}
                        onClick={handleCopyMaterials}
                        disabled={isCopyDisabled}
                        id="copy-materials-btn"
                      >
                        {copyLabel}
                      </Button>
                    </Badge>
                  </span>
                </Tooltip>

                <Tooltip title={hasSelection ? `ייצוא ${checkedRows.length} שורות נבחרות` : 'ייצוא כל התוצאות'}>
                  <span>
                    <Badge
                      badgeContent={hasSelection ? checkedRows.length : 0}
                      color="primary"
                      max={9999}
                    >
                      <Button
                        variant="contained"
                        startIcon={isExporting ? <CircularProgress size={20} color="inherit" /> : <FileDownload />}
                        onClick={handleExport}
                        disabled={isExportDisabled}
                        id="export-excel-btn"
                        color={hasSelection ? 'primary' : 'primary'}
                      >
                        {exportLabel}
                      </Button>
                    </Badge>
                  </span>
                </Tooltip>
              </>
            )}
          </>
        ) : (
          <>
            <IconButton onClick={handleMenuOpen}>
              <MoreVert />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => { handleMenuClose(); handleCopyLink(); }}>
                <Share sx={{ mr: 1 }} fontSize="small" /> {t('materialSearch.actions.copyLink', 'העתק קישור')}
              </MenuItem>
              <MenuItem onClick={() => { handleMenuClose(); setSettingsOpen(true); }}>
                <SettingsIcon sx={{ mr: 1 }} fontSize="small" /> {t('materialSearch.settings.title', 'הגדרות תצוגה')}
              </MenuItem>
              {hasSelection && (
                <MenuItem 
                  onClick={() => { handleMenuClose(); setCompareOpen(true); }}
                  disabled={!canCompare}
                >
                  <CompareIcon sx={{ mr: 1 }} fontSize="small" /> {t('materialSearch.compare.button')} ({checkedRows.length})
                </MenuItem>
              )}
              <MenuItem onClick={() => { handleMenuClose(); handleClearFilters(); }}>
                <ClearAll sx={{ mr: 1 }} fontSize="small" /> {t('materialSearch.filters.clearFilters')}
              </MenuItem>
              {searchSubmitted && (
                <MenuItem onClick={() => { handleMenuClose(); handleCopyMaterials(); }} disabled={isCopyDisabled}>
                  {isCopying ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : <ContentCopy sx={{ mr: 1 }} fontSize="small" />} {copyLabel}
                </MenuItem>
              )}
              {searchSubmitted && (
                <MenuItem onClick={() => { handleMenuClose(); handleExport(); }} disabled={isExportDisabled}>
                  {isExporting ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : <FileDownload sx={{ mr: 1 }} fontSize="small" />} {exportLabel}
                </MenuItem>
              )}
            </Menu>
          </>
        )}
      </Box>

      <FieldSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      
      <Snackbar open={toastOpen} autoHideDuration={3000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToastOpen(false)} severity="success" sx={{ width: '100%' }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
