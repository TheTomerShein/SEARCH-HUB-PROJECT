import { useMemo, forwardRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Chip,
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
import { compareModeOpenState, checkedRowsState, activeCompareFieldsState } from '../state/search.state';
import { useMaterialCompareQuery, useOutputFieldsQuery } from '../hooks/useMaterialSearch';
import { CompareFieldSelector } from '../types/material';
import { TFunction } from 'i18next';

const Transition = forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Modern subtle accent colors for top borders of each compared item
const COLUMN_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('he-IL', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso));
  } catch {
    return iso ?? '—';
  }
}

const formatters: Record<string, (v: any, t: TFunction) => string> = {
  MTART: (v, t) => t(`materialSearch.enums.materialType.${v}`),
  MBRSH: (v, t) => t(`materialSearch.enums.industrySector.${v}`),
  LVORM: (v, t) => v ? t('materialSearch.details.deleted') : t('materialSearch.details.active'),
  ERSDA: (v) => formatDate(v),
  LAEDA: (v) => formatDate(v),
};

export function MaterialCompareView() {
  const { t } = useTranslation();
  const [open, setOpen] = useRecoilState(compareModeOpenState);
  const checkedRows = useRecoilValue(checkedRowsState);
  const activeCompareFields = useRecoilValue(activeCompareFieldsState);
  const { data: outputFields } = useOutputFieldsQuery();

  const matnrsToCompare = useMemo(() => checkedRows.slice(0, 4), [checkedRows]);

  const fieldsToCompare = useMemo(() => {
    if (!outputFields) return [];
    if (!activeCompareFields) return outputFields;
    return outputFields.filter(f => activeCompareFields.includes(f.field_name));
  }, [outputFields, activeCompareFields]);

  const fieldsToFetch = useMemo(() => {
    const f: CompareFieldSelector[] = fieldsToCompare.map(f => ({ table_name: f.table_name, field_name: f.field_name }));
    const hasField = (name: string) => f.some(field => field.field_name === name);
    if (!hasField('LONG_TEXT')) f.push({ table_name: 'STXL', field_name: 'LONG_TEXT' });
    if (!hasField('MAKTX')) f.push({ table_name: 'MAKT', field_name: 'MAKTX' });
    if (!hasField('LVORM')) f.push({ table_name: 'MARA', field_name: 'LVORM' });
    return f;
  }, [fieldsToCompare]);

  const { data: materialsData, isLoading } = useMaterialCompareQuery(
    open ? matnrsToCompare : [], 
    open ? fieldsToFetch : []
  );

  const allMaterials = useMemo(() => {
    if (!materialsData) return Array(matnrsToCompare.length).fill(null);
    return matnrsToCompare.map(matnr => materialsData.find(m => m.MATNR === matnr) || null);
  }, [materialsData, matnrsToCompare]);

  const hasLongTextDiff = useMemo(() => {
    const allTexts = allMaterials.map(m => m?.LONG_TEXT ?? '').filter(Boolean);
    return allTexts.length > 1 && new Set(allTexts).size > 1;
  }, [allMaterials]);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      fullScreen
      TransitionComponent={Transition}
      PaperProps={{ sx: { bgcolor: '#f8fafc' } }}
    >
      {/* ── Title bar ── */}
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
          zIndex: 50, // Above table headers
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#eff6ff', color: '#2563eb', p: 1, borderRadius: 2 }}>
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
        {isLoading ? (
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2 }}>
            <CircularProgress size={48} thickness={4} sx={{ color: '#3b82f6' }} />
          </Box>
        ) : (
          <TableContainer component={Box} sx={{ flex: 1, overflow: 'auto', bgcolor: '#ffffff' }}>
            <Table stickyHeader sx={{ minWidth: 800, tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  {/* Top-left corner (sticky) */}
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
                    <Typography variant="overline" fontWeight="700" color="#475569" sx={{ letterSpacing: 1 }}>
                      {t('materialSearch.compare.field')}
                    </Typography>
                  </TableCell>

                  {/* Material Headers */}
                  {allMaterials.map((material, i) => {
                    const headerColor = COLUMN_COLORS[i % COLUMN_COLORS.length];
                    return (
                      <TableCell
                        key={material ? material.MATNR : `empty-${i}`}
                        sx={{
                          top: 0,
                          zIndex: 20,
                          bgcolor: '#ffffff',
                          borderBottom: '2px solid #cbd5e1',
                          borderTop: `4px solid ${headerColor}`,
                          p: 3,
                          width: `${100 / Math.max(matnrsToCompare.length, 1)}%`,
                          verticalAlign: 'top',
                        }}
                      >
                        {material ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              {t('materialSearch.results.columns.materialNumber')}
                            </Typography>
                            <Typography variant="h6" fontWeight="800" sx={{ color: '#0f172a' }}>
                              {material.MATNR}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#475569', minHeight: 40 }}>
                              {material.MAKTX}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Chip
                                label={material.LVORM ? t('materialSearch.details.deleted') : t('materialSearch.details.active')}
                                size="small"
                                sx={{
                                  bgcolor: material.LVORM ? '#fee2e2' : '#dcfce7',
                                  color: material.LVORM ? '#991b1b' : '#166534',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  height: 24,
                                  border: `1px solid ${material.LVORM ? '#f87171' : '#4ade80'}`,
                                }}
                              />
                            </Box>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>

              <TableBody>
                {/* Data rows */}
                {fieldsToCompare.map((field) => {
                  const allRawVals = allMaterials.map((m) => (m ? String((m as any)[field.field_name] ?? '') : null)).filter(Boolean);
                  const isDiff = allRawVals.length > 1 && new Set(allRawVals).size > 1;

                  return (
                    <TableRow 
                      key={field.field_name} 
                      hover 
                      sx={{ 
                        '&:hover .MuiTableCell-root': { bgcolor: isDiff ? '#fef08a' : '#f1f5f9' },
                        '&:hover .sticky-label': { bgcolor: '#e2e8f0' }
                      }}
                    >
                      {/* Row Label (Sticky) */}
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
                        {t(field.hebrew_desc)}
                      </TableCell>

                      {/* Values */}
                      {allMaterials.map((material, i) => {
                        const rawVal = material ? (material as any)[field.field_name] : null;
                        const displayVal = material 
                          ? (formatters[field.field_name] ? formatters[field.field_name](rawVal, t) : String(rawVal ?? '—'))
                          : '—';

                        return (
                          <TableCell
                            key={i}
                            sx={{
                              bgcolor: isDiff ? '#fefce8' : 'transparent',
                              borderBottom: '1px solid #e2e8f0',
                              borderInlineEnd: i < allMaterials.length - 1 ? '1px solid #f1f5f9' : 'none',
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

                {/* Long description row */}
                <TableRow 
                  hover 
                  sx={{ 
                    '&:hover .MuiTableCell-root': { bgcolor: hasLongTextDiff ? '#fef08a' : '#f1f5f9' },
                    '&:hover .sticky-label': { bgcolor: '#e2e8f0' }
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
                        borderInlineEnd: i < allMaterials.length - 1 ? '1px solid #f1f5f9' : 'none',
                        p: 2.5,
                        verticalAlign: 'top',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: hasLongTextDiff ? '#854d0e' : '#475569', fontSize: '0.85rem', lineHeight: 1.6 }}>
                        {material?.LONG_TEXT ?? '—'}
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
