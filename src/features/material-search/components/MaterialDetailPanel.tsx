import {
  Box,
  Typography,
  Chip,
  Button,
  Alert,
  Dialog,
  DialogContent,
  IconButton,
  Fade,
} from '@mui/material';
import { useRef } from 'react';
import {
  ErrorOutline,
  Refresh,
  Close as CloseIcon,
  Inventory2Outlined,
  CategoryOutlined,
  FactoryOutlined,
  StraightenOutlined,
  PersonOutlined,
  EditOutlined,
  AccountTreeOutlined,
  LabelOutlined,
  AssignmentOutlined,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useRecoilState } from 'recoil';
import { selectedMaterialNumberState } from '../state/search.state';
import { useMaterialDetailsQuery } from '../hooks/useMaterialSearch';
import { formatDate } from '../../../utils/formatDate';
import {
  InfoCard,
  TimelineRow,
  DetailLoadingSkeleton,
  CodeDescValue,
} from './detail/DetailParts';

export function MaterialDetailPanel() {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useRecoilState(selectedMaterialNumberState);

  // Keep last non-null id so dialog content doesn't flash "not found" during MUI close animation
  const displayIdRef = useRef<string | null>(null);
  if (selectedId) displayIdRef.current = selectedId;
  const displayId = displayIdRef.current;

  const { data: material, isLoading, isError, error, refetch } = useMaterialDetailsQuery(displayId);

  const handleClose = () => setSelectedId(null);

  const statusCode = material?.global_status?.code ?? '';
  const isActive = material ? statusCode !== 'Z9' && !/delete|מחיק/i.test(material.global_status?.description_he ?? '') : false;
  const isDeleted = material ? statusCode === 'Z9' || /מחיק/i.test(material.global_status?.description_he ?? '') : false;

  return (
    <Dialog
      open={!!selectedId}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      TransitionComponent={Fade}
      transitionDuration={{ enter: 180, exit: 120 }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          maxHeight: '92vh',
          boxShadow: '0 20px 40px -12px rgba(15,23,42,0.28)',
          border: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      {isLoading && <DetailLoadingSkeleton />}

      {!isLoading && isError && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2.5,
            py: 8,
            px: 4,
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: 'rgba(239,68,68,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ErrorOutline sx={{ fontSize: 36, color: 'error.main' }} />
          </Box>
          <Typography variant="h6" fontWeight="bold" color="error">
            שגיאה בטעינת חומר
          </Typography>
          <Alert severity="error" sx={{ width: '100%', maxWidth: 400, fontSize: '0.8rem', borderRadius: 2 }}>
            {error instanceof Error ? error.message : String(error)}
          </Alert>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={() => refetch()}>
              נסה שוב
            </Button>
            <Button variant="text" size="small" onClick={handleClose}>
              סגור
            </Button>
          </Box>
        </Box>
      )}

      {!isLoading && !isError && !material && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            py: 8,
            px: 4,
          }}
        >
          <Box sx={{ fontSize: '3rem', lineHeight: 1 }}>📦</Box>
          <Typography variant="h6" fontWeight="bold" color="text.secondary">
            חומר לא נמצא
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {displayId}
          </Typography>
          <Button variant="text" size="small" onClick={handleClose}>
            סגור
          </Button>
        </Box>
      )}

      {!isLoading && !isError && material && (
        <>
          {/* Hero */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #6D28D9 50%, #7C3AED 100%)',
              px: 3.5,
              pt: 2.5,
              pb: 4,
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                pointerEvents: 'none',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: -80,
                left: 80,
                width: 280,
                height: 280,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)',
                pointerEvents: 'none',
              },
            }}
          >
            <IconButton
              onClick={handleClose}
              size="small"
              sx={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 1,
                color: 'rgba(255,255,255,0.75)',
                '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.15)' },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2.5,
                pr: 6,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2.5,
                  flexShrink: 0,
                  background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Inventory2Outlined sx={{ color: 'white', fontSize: 28 }} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    opacity: 0.65,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    mb: 0.5,
                  }}
                >
                  {t('materialSearch.results.columns.materialNumber')}
                </Typography>

                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{ lineHeight: 1.15, letterSpacing: '-0.5px', fontFamily: 'monospace', mb: 0.5 }}
                >
                  {material.matnr}
                </Typography>

                <Typography sx={{ opacity: 0.88, fontSize: '0.9rem', fontWeight: 400, lineHeight: 1.4, mb: 1.25 }}>
                  {material.maktx}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label={
                      material.global_status?.description_he ||
                      (isDeleted
                        ? t('materialSearch.details.deleted')
                        : isActive
                          ? t('materialSearch.details.active')
                          : '—')
                    }
                    sx={{
                      bgcolor: isDeleted ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)',
                      color: isDeleted ? '#fecaca' : '#bbf7d0',
                      border: `1px solid ${isDeleted ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`,
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      '& .MuiChip-label': { px: 1.25 },
                    }}
                  />
                  {material.zzmaterial_type?.code && (
                    <Chip
                      size="small"
                      label={`${material.zzmaterial_type.code} · ${material.zzmaterial_type.description_he}`}
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.15)',
                        color: 'rgba(255,255,255,0.9)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        '& .MuiChip-label': { px: 1.25 },
                      }}
                    />
                  )}
                  {material.meins?.code && (
                    <Chip
                      size="small"
                      label={`${material.meins.code} · ${material.meins.description_he}`}
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.12)',
                        color: 'rgba(255,255,255,0.85)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        '& .MuiChip-label': { px: 1.25 },
                      }}
                    />
                  )}
                  {material.change_request && (
                    <Chip
                      size="small"
                      icon={<AssignmentOutlined sx={{ fontSize: '0.95rem !important', color: '#fde68a !important' }} />}
                      label={`${t('materialSearch.details.changeRequest')}: ${material.change_request}`}
                      sx={{
                        bgcolor: 'rgba(245,158,11,0.28)',
                        color: '#fde68a',
                        border: '1px solid rgba(251,191,36,0.45)',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        '& .MuiChip-label': { px: 1 },
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          </Box>

          <DialogContent sx={{ p: 3.5, bgcolor: '#F8FAFC', overflowY: 'auto' }}>
            {/* Core coded fields */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                gap: 2,
                mb: 3,
              }}
            >
              <InfoCard
                icon={<CategoryOutlined sx={{ fontSize: '0.9rem' }} />}
                label={t('materialSearch.details.zzMaterialType')}
                value={
                  <CodeDescValue
                    code={material.zzmaterial_type?.code}
                    description={material.zzmaterial_type?.description_he}
                  />
                }
                accent="#4F46E5"
              />
              <InfoCard
                icon={<StraightenOutlined sx={{ fontSize: '0.9rem' }} />}
                label={t('materialSearch.filters.baseUnit')}
                value={
                  <CodeDescValue code={material.meins?.code} description={material.meins?.description_he} />
                }
                accent="#0EA5E9"
              />
              <InfoCard
                icon={<LabelOutlined sx={{ fontSize: '0.9rem' }} />}
                label={t('materialSearch.results.columns.materialGroup')}
                value={
                  <CodeDescValue code={material.matkl?.code} description={material.matkl?.description_he} />
                }
                accent="#7C3AED"
              />
              <InfoCard
                icon={<FactoryOutlined sx={{ fontSize: '0.9rem' }} />}
                label={t('materialSearch.details.globalStatus')}
                value={
                  <CodeDescValue
                    code={material.global_status?.code}
                    description={material.global_status?.description_he}
                  />
                }
                accent={isDeleted ? '#EF4444' : '#22C55E'}
              />
              <InfoCard
                icon={<AccountTreeOutlined sx={{ fontSize: '0.9rem' }} />}
                label={t('materialSearch.details.managingBranch')}
                value={
                  material.managing_branch ? (
                    <CodeDescValue
                      code={material.managing_branch.werks}
                      description={material.managing_branch.name}
                    />
                  ) : (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.disabled' }}>
                      —
                    </Typography>
                  )
                }
                accent="#F59E0B"
              />
              <InfoCard
                icon={<AssignmentOutlined sx={{ fontSize: '0.9rem' }} />}
                label={t('materialSearch.details.changeRequest')}
                value={
                  material.change_request ? (
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                        color: '#B45309',
                        fontSize: '0.875rem',
                      }}
                    >
                      {material.change_request}
                    </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.disabled', fontSize: '0.85rem' }}>
                      {t('materialSearch.details.noChangeRequest')}
                    </Typography>
                  )
                }
                accent="#D97706"
              />
            </Box>

            {/* Using branches */}
            <Box
              sx={{
                mb: 3,
                borderRadius: 2.5,
                overflow: 'hidden',
                border: '1px solid rgba(226,232,240,0.8)',
                bgcolor: 'white',
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  background: 'linear-gradient(90deg, rgba(79,70,229,0.07) 0%, transparent 100%)',
                  borderBottom: '1px solid rgba(226,232,240,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box sx={{ width: 3, height: 14, borderRadius: 2, bgcolor: 'primary.main', flexShrink: 0 }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontSize: '0.62rem',
                    color: 'primary.dark',
                  }}
                >
                  {t('materialSearch.details.usingBranches')}
                </Typography>
              </Box>
              <Box sx={{ px: 2.5, py: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {material.using_branches?.length ? (
                  material.using_branches.map((b) => (
                    <Chip
                      key={b.werks}
                      size="small"
                      label={b.name ? `${b.werks} · ${b.name}` : b.werks}
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        bgcolor: 'rgba(79,70,229,0.06)',
                        border: '1px solid rgba(79,70,229,0.15)',
                        color: 'primary.dark',
                      }}
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="text.disabled">
                    {t('materialSearch.details.noBranches')}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Admin timeline */}
            <Box
              sx={{
                borderRadius: 2.5,
                border: '1px solid rgba(226,232,240,0.8)',
                bgcolor: 'white',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  background: 'linear-gradient(90deg, rgba(79,70,229,0.07) 0%, transparent 100%)',
                  borderBottom: '1px solid rgba(226,232,240,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box sx={{ width: 3, height: 14, borderRadius: 2, bgcolor: 'primary.main', flexShrink: 0 }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontSize: '0.62rem',
                    color: 'primary.dark',
                  }}
                >
                  {t('materialSearch.details.adminData')}
                </Typography>
              </Box>
              <Box sx={{ px: 2.5, pt: 2.5, pb: 0.5, display: 'flex', flexDirection: 'column', gap: 0 }}>
                <TimelineRow
                  icon={<PersonOutlined sx={{ fontSize: '0.95rem' }} />}
                  label={t('materialSearch.details.createdBy')}
                  user={material.created_by}
                  date={formatDate(material.created_at, { year: 'numeric', month: 'long', day: 'numeric' })}
                  accent="#4F46E5"
                />
                <TimelineRow
                  icon={<EditOutlined sx={{ fontSize: '0.95rem' }} />}
                  label={t('materialSearch.details.changedBy')}
                  user={material.changed_by}
                  date={formatDate(material.changed_at, { year: 'numeric', month: 'long', day: 'numeric' })}
                  accent="#7C3AED"
                />
              </Box>
            </Box>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
