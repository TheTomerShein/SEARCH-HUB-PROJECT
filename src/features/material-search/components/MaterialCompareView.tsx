import { useMemo, forwardRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Slide,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { Close as CloseIcon, CompareArrows as CompareIcon, InfoOutlined as InfoIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  compareModeOpenState,
  checkedRowsState,
  activeCompareFieldsState,
  searchCriteriaState,
  searchSubmittedState,
} from '../state/search.state';
import { useMaterialSearchInfiniteQuery, useOutputFieldsQuery } from '../hooks/useMaterialSearch';
import {
  Material,
  fieldKey,
  getRowFieldValue,
  getResultRowId,
  getRowMatnr,
  matnrFromResultRowId,
} from '../types/material';
import { formatFieldValueAsString } from '../utils/formatFieldValue';

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const COLUMN_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];

const longDate = { year: 'numeric' as const, month: 'short' as const, day: 'numeric' as const };

/** Resolve up to 4 unique materials from checked rows using already-loaded search pages. */
function pickMaterialsFromResults(
  checkedRows: string[],
  loadedRows: Material[],
): Material[] {
  const byRowId = new Map(loadedRows.map((m) => [getResultRowId(m), m]));
  const seenMatnr = new Set<string>();
  const out: Material[] = [];

  for (const id of checkedRows) {
    const matnr = matnrFromResultRowId(id);
    if (!matnr || seenMatnr.has(matnr)) continue;
    seenMatnr.add(matnr);

    const row =
      byRowId.get(id) ??
      loadedRows.find((m) => getRowMatnr(m) === matnr || m.MATNR === matnr);
    if (row) out.push(row);
    if (out.length >= 4) break;
  }
  return out;
}

export function MaterialCompareView() {
  const { t } = useTranslation();
  const [open, setOpen] = useRecoilState(compareModeOpenState);
  const checkedRows = useRecoilValue(checkedRowsState);
  const activeCompareFields = useRecoilValue(activeCompareFieldsState);
  const criteria = useRecoilValue(searchCriteriaState);
  const searchSubmitted = useRecoilValue(searchSubmittedState);
  const { data: outputFields } = useOutputFieldsQuery();

  // Same infinite-query cache as the results table — no extra compare API.
  const { data: searchData } = useMaterialSearchInfiniteQuery(criteria, searchSubmitted);

  const loadedRows = useMemo(
    () => searchData?.pages.flatMap((p) => p.materials) ?? [],
    [searchData],
  );

  const allMaterials = useMemo(
    () => (open ? pickMaterialsFromResults(checkedRows, loadedRows) : []),
    [open, checkedRows, loadedRows],
  );

  const fieldsToCompare = useMemo(() => {
    if (!outputFields) return [];
    if (!activeCompareFields) return outputFields;
    return outputFields.filter((f) => activeCompareFields.includes(fieldKey(f)));
  }, [outputFields, activeCompareFields]);

  const hasLongTextDiff = useMemo(() => {
    const allTexts = allMaterials.map((m) => m.LONG_TEXT ?? '').filter(Boolean);
    return allTexts.length > 1 && new Set(allTexts).size > 1;
  }, [allMaterials]);

  const colCount = Math.max(allMaterials.length, 1);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      fullScreen
      TransitionComponent={Transition}
      PaperProps={{ sx: { bgcolor: '#f8fafc' } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          bgcolor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          py: 2,
          px: 3,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          zIndex: 50,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#eff6ff',
            color: '#2563eb',
            p: 1,
            borderRadius: 2,
          }}
        >
          <CompareIcon />
        </Box>
        <Typography variant="h6" fontWeight="700" sx={{ flex: 1, color: '#0f172a' }}>
          {t('materialSearch.compare.title')}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: '#fefce8',
            border: '1px solid #fef08a',
            borderRadius: 2,
            px: 2,
            py: 0.75,
          }}
        >
          <InfoIcon sx={{ fontSize: 16, color: '#ca8a04' }} />
          <Typography variant="caption" fontWeight="600" color="#a16207">
            {t('materialSearch.compare.diffHighlight')}
          </Typography>
        </Box>

        <Tooltip title={t('materialSearch.compare.close')}>
          <IconButton
            onClick={() => setOpen(false)}
            id="compare-close-btn"
            sx={{ bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#e2e8f0' } }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {allMaterials.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              p: 4,
            }}
          >
            <Typography color="text.secondary">
              {t(
                'materialSearch.compare.noLocalData',
                'לא נמצאו נתונים להשוואה בתוצאות שנטענו. ודא שהחומרים מסומנים בטבלה.',
              )}
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Box} sx={{ flex: 1, overflow: 'auto', bgcolor: '#ffffff' }}>
            <Table stickyHeader sx={{ minWidth: 800, tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      position: 'sticky',
                      insetInlineStart: 0,
                      top: 0,
                      zIndex: 40,
                      bgcolor: '#f8fafc',
                      width: 200,
                      borderBottom: '2px solid #cbd5e1',
                      borderInlineEnd: '1px solid #e2e8f0',
                      p: 3,
                      verticalAlign: 'bottom',
                    }}
                  >
                    <Typography
                      variant="overline"
                      fontWeight="700"
                      color="#475569"
                      sx={{ letterSpacing: 1 }}
                    >
                      {t('materialSearch.compare.field')}
                    </Typography>
                  </TableCell>

                  {allMaterials.map((material, i) => {
                    const headerColor = COLUMN_COLORS[i % COLUMN_COLORS.length];
                    return (
                      <TableCell
                        key={getResultRowId(material) || material.MATNR || `col-${i}`}
                        sx={{
                          top: 0,
                          zIndex: 20,
                          bgcolor: '#ffffff',
                          borderBottom: '2px solid #cbd5e1',
                          borderTop: `4px solid ${headerColor}`,
                          p: 3,
                          width: `${100 / colCount}%`,
                          verticalAlign: 'top',
                        }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#64748b',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                            }}
                          >
                            {t('materialSearch.results.columns.materialNumber')}
                          </Typography>
                          <Typography variant="h6" fontWeight="800" sx={{ color: '#0f172a' }}>
                            {material.MATNR}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#475569', minHeight: 40 }}>
                            {material.MAKTX || '—'}
                          </Typography>
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>

              <TableBody>
                {fieldsToCompare.map((field) => {
                  const allRawVals = allMaterials
                    .map((m) => {
                      const v = getRowFieldValue(m, field);
                      return v != null && v !== '' ? String(v) : null;
                    })
                    .filter(Boolean);
                  const isDiff = allRawVals.length > 1 && new Set(allRawVals).size > 1;

                  return (
                    <TableRow
                      key={fieldKey(field)}
                      hover
                      sx={{
                        '&:hover .MuiTableCell-root': {
                          bgcolor: isDiff ? '#fef08a' : '#f1f5f9',
                        },
                        '&:hover .sticky-label': { bgcolor: '#e2e8f0' },
                      }}
                    >
                      <TableCell
                        className="sticky-label"
                        sx={{
                          position: 'sticky',
                          insetInlineStart: 0,
                          zIndex: 10,
                          bgcolor: '#f8fafc',
                          borderInlineEnd: '1px solid #e2e8f0',
                          borderBottom: '1px solid #e2e8f0',
                          p: 2.5,
                          fontWeight: 600,
                          color: '#334155',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        {t(field.hebrewDesc)}
                      </TableCell>

                      {allMaterials.map((material, i) => {
                        const rawVal = getRowFieldValue(material, field);
                        const displayVal = formatFieldValueAsString(field, rawVal, t, longDate);

                        return (
                          <TableCell
                            key={i}
                            sx={{
                              bgcolor: isDiff ? '#fefce8' : 'transparent',
                              borderBottom: '1px solid #e2e8f0',
                              borderInlineEnd:
                                i < allMaterials.length - 1 ? '1px solid #f1f5f9' : 'none',
                              p: 2.5,
                              color: isDiff ? '#854d0e' : '#334155',
                              fontWeight: isDiff ? 600 : 400,
                              wordBreak: 'break-word',
                              transition: 'background-color 0.2s',
                            }}
                          >
                            {displayVal}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}

                <TableRow
                  hover
                  sx={{
                    '&:hover .MuiTableCell-root': {
                      bgcolor: hasLongTextDiff ? '#fef08a' : '#f1f5f9',
                    },
                    '&:hover .sticky-label': { bgcolor: '#e2e8f0' },
                  }}
                >
                  <TableCell
                    className="sticky-label"
                    sx={{
                      position: 'sticky',
                      insetInlineStart: 0,
                      zIndex: 10,
                      bgcolor: '#f8fafc',
                      borderInlineEnd: '1px solid #e2e8f0',
                      borderBottom: '1px solid #e2e8f0',
                      p: 2.5,
                      fontWeight: 600,
                      color: '#334155',
                      verticalAlign: 'top',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    {t('materialSearch.details.longDescription')}
                  </TableCell>
                  {allMaterials.map((material, i) => (
                    <TableCell
                      key={`long-text-${i}`}
                      sx={{
                        bgcolor: hasLongTextDiff ? '#fefce8' : 'transparent',
                        borderBottom: '1px solid #e2e8f0',
                        borderInlineEnd:
                          i < allMaterials.length - 1 ? '1px solid #f1f5f9' : 'none',
                        p: 2.5,
                        verticalAlign: 'top',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          color: hasLongTextDiff ? '#854d0e' : '#475569',
                          fontSize: '0.85rem',
                          lineHeight: 1.6,
                        }}
                      >
                        {material.LONG_TEXT ?? '—'}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
}
