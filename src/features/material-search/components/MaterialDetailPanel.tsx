import {
  Box, Typography, Chip, Button, Alert,
  Dialog, DialogContent, IconButton, Skeleton,
} from '@mui/material';
import { useRef } from 'react';
import {
  ErrorOutline, Refresh, Close as CloseIcon,
  Inventory2Outlined, CategoryOutlined, FactoryOutlined,
  StraightenOutlined, PersonOutlined, CalendarTodayOutlined,
  EditOutlined,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useRecoilState } from 'recoil';
import { selectedMaterialNumberState } from '../state/search.state';
import { useMaterialDetailsQuery } from '../hooks/useMaterialSearch';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(raw: string): string {
  if (!raw) return '—';
  // handles YYYYMMDD and YYYY-MM-DD
  const s = raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
  try {
    return new Intl.DateTimeFormat('he-IL', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(s));
  } catch { return raw; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoCard({
  icon,
  label,
  value,
  accent = '#4F46E5',
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: string;
}) {
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      p: 2,
      borderRadius: 2.5,
      border: '1px solid',
      borderColor: 'rgba(226,232,240,0.8)',
      bgcolor: '#FAFBFF',
      position: 'relative',
      overflow: 'hidden',
      // Accent left bar
      '&::before': {
        content: '""',
        position: 'absolute',
        right: 0,
        top: '15%',
        bottom: '15%',
        width: 3,
        borderRadius: '3px 0 0 3px',
        bgcolor: accent,
        opacity: 0.5,
      },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{
          width: 28, height: 28, borderRadius: 1.5,
          bgcolor: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent, flexShrink: 0,
        }}>
          {icon}
        </Box>
        <Typography variant="caption" sx={{
          color: 'text.disabled', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.6rem',
        }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', pl: 0.5, fontSize: '0.875rem' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

function TimelineRow({ icon, label, user, date, accent }: {
  icon: React.ReactNode;
  label: string;
  user: string;
  date: string;
  accent: string;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Box sx={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        bgcolor: `${accent}15`,
        border: `2px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent,
        mt: 0.25,
      }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, pb: 2, borderBottom: '1px dashed rgba(226,232,240,0.9)' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.6rem', fontWeight: 700 }}>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PersonOutlined sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>{user || '—'}</Typography>
          </Box>
          <Box sx={{
            px: 1, py: 0.2, borderRadius: '20px',
            bgcolor: `${accent}10`, border: `1px solid ${accent}25`,
            display: 'flex', alignItems: 'center', gap: 0.4,
          }}>
            <CalendarTodayOutlined sx={{ fontSize: '0.7rem', color: accent }} />
            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: accent, fontWeight: 600 }}>
              {date}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Skeleton loading ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <>
      {/* Header skeleton */}
      <Box sx={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', px: 3.5, pt: 2.5, pb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Skeleton variant="rounded" width={56} height={56} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={80} height={12} sx={{ bgcolor: 'rgba(255,255,255,0.2)', mb: 1 }} />
            <Skeleton variant="text" width={180} height={32} sx={{ bgcolor: 'rgba(255,255,255,0.25)' }} />
            <Skeleton variant="text" width={240} height={18} sx={{ bgcolor: 'rgba(255,255,255,0.18)', mt: 0.5 }} />
            <Skeleton variant="rounded" width={60} height={22} sx={{ bgcolor: 'rgba(255,255,255,0.2)', mt: 1, borderRadius: 10 }} />
          </Box>
        </Box>
      </Box>
      {/* Content skeleton */}
      <DialogContent sx={{ p: 3.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 3 }}>
          {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 2.5 }} />)}
        </Box>
        <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2, mb: 3 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2].map(i => <Skeleton key={i} variant="rounded" height={60} sx={{ borderRadius: 2 }} />)}
        </Box>
      </DialogContent>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MaterialDetailPanel() {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useRecoilState(selectedMaterialNumberState);

  // ponytail: keep last non-null id so dialog content doesn't flash "not found" during MUI close animation
  const displayIdRef = useRef<string | null>(null);
  if (selectedId) displayIdRef.current = selectedId;
  const displayId = displayIdRef.current;

  const { data: material, isLoading, isError, error, refetch } = useMaterialDetailsQuery(displayId);

  const handleClose = () => setSelectedId(null);

  const isActive = material && !material.LVORM;

  return (
    <Dialog
      open={!!selectedId}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          overflow: 'hidden',
          maxHeight: '92vh',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }
      }}
    >
      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {isLoading && <LoadingSkeleton />}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {!isLoading && isError && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5, py: 8, px: 4 }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '50%',
            bgcolor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ErrorOutline sx={{ fontSize: 36, color: 'error.main' }} />
          </Box>
          <Typography variant="h6" fontWeight="bold" color="error">שגיאה בטעינת חומר</Typography>
          <Alert severity="error" sx={{ width: '100%', maxWidth: 400, fontSize: '0.8rem', borderRadius: 2 }}>
            {error instanceof Error ? error.message : String(error)}
          </Alert>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={() => refetch()}>נסה שוב</Button>
            <Button variant="text" size="small" onClick={handleClose}>סגור</Button>
          </Box>
        </Box>
      )}

      {/* ── Not found ─────────────────────────────────────────────────────── */}
      {!isLoading && !isError && !material && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8, px: 4 }}>
          <Box sx={{ fontSize: '3rem', lineHeight: 1 }}>📦</Box>
          <Typography variant="h6" fontWeight="bold" color="text.secondary">חומר לא נמצא</Typography>
          <Typography variant="body2" color="text.disabled">{displayId}</Typography>
          <Button variant="text" size="small" onClick={handleClose}>סגור</Button>
        </Box>
      )}

      {/* ── Material data ─────────────────────────────────────────────────── */}
      {!isLoading && !isError && material && (
        <>
          {/* ── HERO HEADER ────────────────────────────────────────────── */}
          <Box sx={{
            background: 'linear-gradient(135deg, #4F46E5 0%, #6D28D9 50%, #7C3AED 100%)',
            px: 3.5,
            pt: 2.5,
            pb: 4,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            // Decorative blobs
            '&::before': {
              content: '""', position: 'absolute',
              top: -50, right: -50, width: 200, height: 200,
              borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
              pointerEvents: 'none',
            },
            '&::after': {
              content: '""', position: 'absolute',
              bottom: -80, left: 80, width: 280, height: 280,
              borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
              pointerEvents: 'none',
            },
          }}>
            {/* Close button */}
            <IconButton
              onClick={handleClose}
              size="small"
              sx={{
                position: 'absolute', top: 12, left: 12, zIndex: 1,
                color: 'rgba(255,255,255,0.75)',
                '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.15)' },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, pr: 6, position: 'relative', zIndex: 1 }}>
              {/* Icon box */}
              <Box sx={{
                width: 56, height: 56, borderRadius: 2.5, flexShrink: 0,
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Inventory2Outlined sx={{ color: 'white', fontSize: 28 }} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* Eyebrow */}
                <Typography sx={{ opacity: 0.65, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.62rem', fontWeight: 700, mb: 0.5 }}>
                  {t('materialSearch.results.columns.materialNumber')}
                </Typography>

                {/* MATNR — hero number */}
                <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.15, letterSpacing: '-0.5px', fontFamily: 'monospace', mb: 0.5 }}>
                  {material.MATNR}
                </Typography>

                {/* Description */}
                <Typography sx={{ opacity: 0.88, fontSize: '0.9rem', fontWeight: 400, lineHeight: 1.4, mb: 1.25 }}>
                  {material.MAKTX}
                </Typography>

                {/* Status + type badges */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label={isActive ? t('materialSearch.details.active') : t('materialSearch.details.deleted')}
                    sx={{
                      bgcolor: isActive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
                      color: isActive ? '#bbf7d0' : '#fecaca',
                      border: `1px solid ${isActive ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                      fontWeight: 700, fontSize: '0.7rem',
                      '& .MuiChip-label': { px: 1.25 },
                    }}
                  />
                  <Chip
                    size="small"
                    label={t(`materialSearch.enums.materialType.${material.MTART}`)}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.9)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      fontWeight: 600, fontSize: '0.7rem',
                      '& .MuiChip-label': { px: 1.25 },
                    }}
                  />
                  <Chip
                    size="small"
                    label={material.MEINS}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.85)',
                      border: '1px solid rgba(255,255,255,0.18)',
                      fontWeight: 600, fontSize: '0.7rem',
                      '& .MuiChip-label': { px: 1.25 },
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          {/* ── CONTENT ────────────────────────────────────────────────── */}
          <DialogContent sx={{ p: 3.5, bgcolor: '#F8FAFC', overflowY: 'auto' }}>

            {/* ── Basic data cards ── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
              <InfoCard
                icon={<CategoryOutlined sx={{ fontSize: '0.9rem' }} />}
                label={t('materialSearch.filters.materialType')}
                value={t(`materialSearch.enums.materialType.${material.MTART}`)}
                accent="#4F46E5"
              />
              <InfoCard
                icon={<FactoryOutlined sx={{ fontSize: '0.9rem' }} />}
                label={t('materialSearch.details.industrySector')}
                value={t(`materialSearch.enums.industrySector.${material.MBRSH}`)}
                accent="#7C3AED"
              />
              <InfoCard
                icon={<StraightenOutlined sx={{ fontSize: '0.9rem' }} />}
                label={t('materialSearch.filters.baseUnit')}
                value={material.MEINS}
                accent="#0EA5E9"
              />
            </Box>

            {/* ── Long description ── */}
            {material.LONG_TEXT && (
              <Box sx={{
                mb: 3,
                borderRadius: 2.5,
                overflow: 'hidden',
                border: '1px solid rgba(226,232,240,0.8)',
                bgcolor: 'white',
              }}>
                {/* Section label bar */}
                <Box sx={{
                  px: 2, py: 1,
                  background: 'linear-gradient(90deg, rgba(79,70,229,0.07) 0%, transparent 100%)',
                  borderBottom: '1px solid rgba(226,232,240,0.8)',
                  display: 'flex', alignItems: 'center', gap: 1,
                }}>
                  <Box sx={{ width: 3, height: 14, borderRadius: 2, bgcolor: 'primary.main', flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.62rem', color: 'primary.dark' }}>
                    {t('materialSearch.details.longDescription')}
                  </Typography>
                </Box>
                <Box sx={{ px: 2.5, py: 2 }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', lineHeight: 1.75, fontSize: '0.875rem' }}>
                    {material.LONG_TEXT}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* ── Admin / audit timeline ── */}
            <Box sx={{
              borderRadius: 2.5,
              border: '1px solid rgba(226,232,240,0.8)',
              bgcolor: 'white',
              overflow: 'hidden',
            }}>
              <Box sx={{
                px: 2, py: 1,
                background: 'linear-gradient(90deg, rgba(79,70,229,0.07) 0%, transparent 100%)',
                borderBottom: '1px solid rgba(226,232,240,0.8)',
                display: 'flex', alignItems: 'center', gap: 1,
              }}>
                <Box sx={{ width: 3, height: 14, borderRadius: 2, bgcolor: 'primary.main', flexShrink: 0 }} />
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.62rem', color: 'primary.dark' }}>
                  {t('materialSearch.details.adminData')}
                </Typography>
              </Box>
              <Box sx={{ px: 2.5, pt: 2.5, pb: 0.5, display: 'flex', flexDirection: 'column', gap: 0 }}>
                <TimelineRow
                  icon={<PersonOutlined sx={{ fontSize: '0.95rem' }} />}
                  label={t('materialSearch.details.createdBy')}
                  user={material.ERNAM}
                  date={formatDate(material.ERSDA)}
                  accent="#4F46E5"
                />
                <TimelineRow
                  icon={<EditOutlined sx={{ fontSize: '0.95rem' }} />}
                  label={t('materialSearch.details.changedBy')}
                  user={material.AENAM}
                  date={formatDate(material.LAEDA)}
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
