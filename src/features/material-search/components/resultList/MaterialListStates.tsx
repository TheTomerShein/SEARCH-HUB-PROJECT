import { Box, Typography, Skeleton, Alert, Button } from '@mui/material';
import { ErrorOutline, Refresh, SearchOff, Search as SearchIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * First-page search loading — works for mock delay and real API latency.
 * Centered magnifying-glass animation + light table shimmer.
 */
export function MaterialListSkeleton() {
  const { t } = useTranslation();

  return (
    <Box
      className="mdg-search-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
      sx={{ flex: 1, minHeight: 0 }}
    >
      <Box className="mdg-search-loading-orb" aria-hidden>
        <Box className="mdg-search-loading-ring" />
        <Box className="mdg-search-loading-ring mdg-search-loading-ring--delayed" />
        <Box className="mdg-search-loading-icon">
          <SearchIcon />
        </Box>
      </Box>

      <Typography className="mdg-search-loading-title" component="p">
        {t('materialSearch.results.loading', 'טוען חומרים...')}
      </Typography>
      <Typography className="mdg-search-loading-sub" component="p">
        {t('materialSearch.results.loadingHint', 'מריץ חיפוש מול השרת — רגע…')}
      </Typography>

      <Box className="mdg-search-loading-bars" aria-hidden>
        <Box className="mdg-search-loading-bar" />
        <Box className="mdg-search-loading-bar" />
        <Box className="mdg-search-loading-bar" />
        <Box className="mdg-search-loading-bar" />
      </Box>

      {/* Subtle table preview so layout shift is smaller when data arrives */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 720,
          mt: 2,
          borderRadius: 2,
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          opacity: 0.85,
        }}
        aria-hidden
      >
        <Box
          sx={{
            px: 2,
            py: 1.25,
            display: 'flex',
            gap: 2,
            borderBottom: '1px solid #E2E8F0',
            bgcolor: '#F8FAFC',
          }}
        >
          <Skeleton variant="rounded" width={18} height={18} />
          {[100, 140, 64, 64, 80].map((w, i) => (
            <Skeleton key={i} variant="rounded" width={w} height={10} />
          ))}
        </Box>
        {Array.from({ length: 5 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              px: 2,
              py: 1.25,
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              bgcolor: i % 2 === 0 ? '#FAFBFC' : '#fff',
              borderBottom: '1px solid #F1F5F9',
            }}
          >
            <Skeleton variant="rounded" width={14} height={14} sx={{ flexShrink: 0 }} />
            <Skeleton variant="rounded" width={88} height={20} sx={{ borderRadius: '6px' }} />
            <Skeleton variant="rounded" width={`${30 + (i % 3) * 12}%`} height={10} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function MaterialListError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const message = error instanceof Error ? error.message : String(error);

  return (
    <Box
      sx={{
        flex: 1,
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          bgcolor: 'error.light',
          opacity: 0.9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 0.5,
        }}
      >
        <ErrorOutline sx={{ fontSize: 28, color: 'error.dark' }} />
      </Box>
      <Typography variant="subtitle1" fontWeight={800} color="error.dark">
        {t('materialSearch.results.error', 'שגיאה בטעינת תוצאות החיפוש')}
      </Typography>
      <Alert severity="error" sx={{ width: '100%', maxWidth: 400, fontSize: '0.8rem', borderRadius: 2 }}>
        {message}
      </Alert>
      <Button variant="contained" startIcon={<Refresh />} onClick={onRetry} sx={{ mt: 1, fontWeight: 700 }}>
        {t('materialSearch.results.retry', 'נסה שוב')}
      </Button>
    </Box>
  );
}

export function MaterialListEmpty() {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        p: 6,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.25,
        maxWidth: 420,
        mx: 'auto',
        mt: 4,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: 3,
          bgcolor: 'rgba(79,70,229,0.08)',
          border: '1px solid rgba(79,70,229,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 0.5,
        }}
      >
        <SearchOff sx={{ fontSize: 32, color: 'primary.main', opacity: 0.85 }} />
      </Box>
      <Typography variant="subtitle1" fontWeight={800} color="text.primary">
        {t('materialSearch.results.empty')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
        {t(
          'materialSearch.results.emptyHint',
          'נסה להרחיב את קריטריוני החיפוש, להסיר סינון, או לבדוק את מספר החומר.',
        )}
      </Typography>
    </Box>
  );
}
