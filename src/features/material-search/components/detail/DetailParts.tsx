import { Box, Typography, Skeleton, DialogContent } from '@mui/material';
import {
  PersonOutlined,
  CalendarTodayOutlined,
} from '@mui/icons-material';

/** code + Hebrew desc — used for zzmaterial_type, meins, status, matkl */
export function CodeDescValue({
  code,
  description,
}: {
  code?: string | null;
  description?: string | null;
}) {
  if (!code && !description) return <>{'\u2014'}</>;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
      {description ? (
        <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.primary', lineHeight: 1.3 }}>
          {description}
        </Typography>
      ) : null}
      {code ? (
        <Typography
          component="span"
          sx={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: 'text.secondary',
            letterSpacing: '0.02em',
          }}
        >
          {code}
        </Typography>
      ) : null}
    </Box>
  );
}

export function InfoCard({
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
    <Box
      sx={{
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
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1.5,
            bgcolor: `${accent}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: 'text.disabled',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '0.6rem',
          }}
        >
          {label}
        </Typography>
      </Box>
      <Box sx={{ pl: 0.5, minWidth: 0 }}>
        {value ?? (
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem' }}>
            —
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export function TimelineRow({
  icon,
  label,
  user,
  date,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  user: string;
  date: string;
  accent: string;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          flexShrink: 0,
          bgcolor: `${accent}15`,
          border: `2px solid ${accent}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          mt: 0.25,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, pb: 2, borderBottom: '1px dashed rgba(226,232,240,0.9)' }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.disabled',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '0.6rem',
            fontWeight: 700,
          }}
        >
          {label}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PersonOutlined sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
              {user || '—'}
            </Typography>
          </Box>
          <Box
            sx={{
              px: 1,
              py: 0.2,
              borderRadius: '20px',
              bgcolor: `${accent}10`,
              border: `1px solid ${accent}25`,
              display: 'flex',
              alignItems: 'center',
              gap: 0.4,
            }}
          >
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

export function DetailLoadingSkeleton() {
  return (
    <>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
          px: 3.5,
          pt: 2.5,
          pb: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Skeleton
            variant="rounded"
            width={56}
            height={56}
            sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', flexShrink: 0 }}
          />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={80} height={12} sx={{ bgcolor: 'rgba(255,255,255,0.2)', mb: 1 }} />
            <Skeleton variant="text" width={180} height={32} sx={{ bgcolor: 'rgba(255,255,255,0.25)' }} />
            <Skeleton
              variant="text"
              width={240}
              height={18}
              sx={{ bgcolor: 'rgba(255,255,255,0.18)', mt: 0.5 }}
            />
            <Skeleton
              variant="rounded"
              width={60}
              height={22}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', mt: 1, borderRadius: 10 }}
            />
          </Box>
        </Box>
      </Box>
      <DialogContent sx={{ p: 3.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 3 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 2.5 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2, mb: 3 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={60} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </DialogContent>
    </>
  );
}
