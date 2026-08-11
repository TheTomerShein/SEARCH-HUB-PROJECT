import { useId } from 'react';
import { Box, Typography } from '@mui/material';

type MarkVariant = 'color' | 'onDark' | 'onLight';

type MarkProps = {
  size?: number;
  variant?: MarkVariant;
};

/**
 * Sherlok mark: magnifying glass + deerstalker brim (detective / search).
 * Pure SVG — no emoji, works on light & dark chrome.
 */
export function SherlokMark({ size = 40, variant = 'color' }: MarkProps) {
  const gradId = useId().replace(/:/g, '');
  const isOnDark = variant === 'onDark';
  const glass = isOnDark ? 'rgba(255,255,255,0.95)' : '#3730A3';
  const handle = isOnDark ? 'rgba(255,255,255,0.88)' : '#4F46E5';
  const accent = isOnDark ? '#FCD34D' : '#D97706';
  const bg =
    variant === 'color'
      ? `url(#${gradId})`
      : isOnDark
        ? 'rgba(255,255,255,0.16)'
        : '#EEF2FF';

  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'inline-flex',
        lineHeight: 0,
        borderRadius: '22%',
        boxShadow:
          variant === 'color'
            ? '0 2px 8px rgba(79,70,229,0.28)'
            : isOnDark
              ? '0 2px 10px rgba(0,0,0,0.12)'
              : '0 1px 4px rgba(15,23,42,0.08)',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {variant === 'color' && (
          <defs>
            <linearGradient id={gradId} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4F46E5" />
              <stop offset="0.55" stopColor="#6D28D9" />
              <stop offset="1" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
        )}
        <rect width="64" height="64" rx="14" fill={bg} />
        {/* deerstalker brim — small hat cue */}
        <path
          d="M18 16c2.5-4 8-6.5 14-6.5S43.5 12 46 16c-3-1.2-7.5-1.8-14-1.8S21 14.8 18 16z"
          fill={accent}
          opacity={isOnDark ? 0.95 : 0.9}
        />
        <path
          d="M24 15.5c1.2-2.2 4.2-3.6 8-3.6s6.8 1.4 8 3.6"
          stroke={isOnDark ? 'rgba(255,255,255,0.35)' : 'rgba(55,48,163,0.25)'}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        {/* lens */}
        <circle cx="30" cy="34" r="12.5" stroke={glass} strokeWidth="3.2" fill="none" />
        <circle
          cx="30"
          cy="34"
          r="8"
          fill={isOnDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.22)'}
        />
        {/* glare */}
        <path
          d="M24.5 28.5c1.8-2.2 4.2-3.2 6.5-3.4"
          stroke={isOnDark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.85)'}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* handle */}
        <path
          d="M39.5 43.5L50 54"
          stroke={handle}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M40.5 44.5L49 53"
          stroke={accent}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity={0.85}
        />
      </svg>
    </Box>
  );
}

type BrandProps = {
  /** Top bar vs hero */
  size?: 'sm' | 'md' | 'lg';
  /** Invert mark for purple hero */
  onDark?: boolean;
  /** Show English under Hebrew name */
  showEnglish?: boolean;
  /** Hero subtitle under brand */
  subtitle?: string;
};

const sizeMap = {
  sm: { mark: 36, title: { xs: '1.2rem', sm: '1.35rem' }, gap: 1.25 },
  md: { mark: 48, title: { xs: '1.55rem', sm: '1.75rem' }, gap: 1.5 },
  lg: { mark: 64, title: { xs: '1.9rem', sm: '2.35rem' }, gap: 1.75 },
} as const;

/** Wordmark + mark for TopBar / hero. */
export function SherlokBrand({
  size = 'sm',
  onDark = false,
  showEnglish = true,
  subtitle,
}: BrandProps) {
  const s = sizeMap[size];
  const titleColor = onDark ? '#FFFFFF' : 'primary.dark';
  const enColor = onDark ? 'rgba(255,255,255,0.72)' : 'text.secondary';
  const subColor = onDark ? 'rgba(255,255,255,0.78)' : 'text.secondary';

  return (
    <Box
      role="img"
      aria-label="שרלוק · Sherlok"
      sx={{
        display: 'flex',
        alignItems: subtitle ? 'flex-start' : 'center',
        gap: s.gap,
        minWidth: 0,
      }}
    >
      <SherlokMark size={s.mark} variant={onDark ? 'onDark' : 'color'} />
      <Box sx={{ minWidth: 0, pt: subtitle && size === 'lg' ? 0.25 : 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
          <Typography
            component="span"
            sx={{
              fontWeight: 800,
              color: titleColor,
              letterSpacing: '-0.03em',
              fontSize: s.title,
              lineHeight: 1.15,
              fontFamily: '"Heebo", "Segoe UI", system-ui, sans-serif',
            }}
          >
            שרלוק
          </Typography>
          {showEnglish && (
            <Typography
              component="span"
              sx={{
                fontWeight: 600,
                color: enColor,
                letterSpacing: '0.04em',
                fontSize:
                  size === 'lg'
                    ? { xs: '0.85rem', sm: '0.95rem' }
                    : size === 'md'
                      ? '0.8rem'
                      : '0.72rem',
                textTransform: 'uppercase',
                lineHeight: 1.2,
              }}
            >
              Sherlok
            </Typography>
          )}
        </Box>
        {subtitle ? (
          <Typography
            sx={{
              mt: size === 'md' ? 0.5 : 0.75,
              color: subColor,
              fontWeight: 400,
              fontSize:
                size === 'md'
                  ? { xs: '0.8rem', sm: '0.88rem' }
                  : { xs: '0.9rem', sm: '1rem' },
              lineHeight: 1.4,
              maxWidth: 420,
              fontFamily: '"Heebo", "Segoe UI", system-ui, sans-serif',
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}
