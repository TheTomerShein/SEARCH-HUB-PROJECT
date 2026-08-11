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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.15, minWidth: 0 }}>
      {description ? (
        <Typography
          component="span"
          sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary', lineHeight: 1.35 }}
        >
          {description}
        </Typography>
      ) : null}
      {code ? (
        <Typography
          component="span"
          sx={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: '0.75rem',
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
        gap: 0.65,
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'rgba(226,232,240,0.8)',
        bgcolor: '#FAFBFF',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 0,
        '&::before': {
          content: '""',
          position: 'absolute',
          right: 0,
          top: '16%',
          bottom: '16%',
          width: 2.5,
          borderRadius: '2px 0 0 2px',
          bgcolor: accent,
          opacity: 0.5,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: 1.25,
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
            letterSpacing: '0.04em',
            fontSize: '0.68rem',
            lineHeight: 1.25,
          }}
        >
          {label}
        </Typography>
      </Box>
      <Box sx={{ pl: 0.35, minWidth: 0 }}>
        {value ?? (
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.9rem' }}>
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
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          flexShrink: 0,
          bgcolor: `${accent}15`,
          border: `1.5px solid ${accent}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          mt: 0.2,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, pb: 1.5, borderBottom: '1px dashed rgba(226,232,240,0.9)' }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.disabled',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontSize: '0.68rem',
            fontWeight: 700,
          }}
        >
          {label}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', mt: 0.4, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <PersonOutlined sx={{ fontSize: '0.95rem', color: 'text.secondary' }} />
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.88rem' }}>
              {user || '—'}
            </Typography>
          </Box>
          <Box
            sx={{
              px: 0.9,
              py: 0.2,
              borderRadius: '20px',
              bgcolor: `${accent}10`,
              border: `1px solid ${accent}25`,
              display: 'flex',
              alignItems: 'center',
              gap: 0.35,
            }}
          >
            <CalendarTodayOutlined sx={{ fontSize: '0.75rem', color: accent }} />
            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: accent, fontWeight: 600 }}>
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
          px: 2.5,
          pt: 2,
          pb: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Skeleton
            variant="rounded"
            width={42}
            height={42}
            sx={{ borderRadius: 1.75, bgcolor: 'rgba(255,255,255,0.2)', flexShrink: 0 }}
          />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={75} height={11} sx={{ bgcolor: 'rgba(255,255,255,0.2)', mb: 0.65 }} />
            <Skeleton variant="text" width={160} height={26} sx={{ bgcolor: 'rgba(255,255,255,0.25)' }} />
            <Skeleton variant="text" width={200} height={16} sx={{ bgcolor: 'rgba(255,255,255,0.18)', mt: 0.35 }} />
            <Skeleton
              variant="rounded"
              width={56}
              height={20}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', mt: 0.85, borderRadius: 10 }}
            />
          </Box>
        </Box>
      </Box>
      <DialogContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mb: 2.25 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={72} sx={{ borderRadius: 2, mb: 2.25 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={48} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </DialogContent>
    </>
  );
}
