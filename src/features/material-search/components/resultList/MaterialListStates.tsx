import { Box, Typography, Skeleton, Alert, Button } from '@mui/material';
import { ErrorOutline, Refresh, SearchOff } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export function MaterialListSkeleton() {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          gap: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: '#f1f5f9',
        }}
      >
        <Skeleton variant="rounded" width={22} height={22} />
        {[110, 160, 72, 72, 88].map((w, i) => (
          <Skeleton key={i} variant="rounded" width={w} height={12} />
        ))}
      </Box>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              px: 2,
              py: 1.5,
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              bgcolor: i % 2 === 0 ? '#fafbfc' : '#fff',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <Skeleton variant="rounded" width={16} height={16} sx={{ flexShrink: 0 }} />
            <Skeleton variant="rounded" width={100} height={24} sx={{ borderRadius: '6px' }} />
            <Skeleton variant="rounded" width={`${28 + (i % 3) * 10}%`} height={12} />
            <Skeleton variant="rounded" width={72} height={20} sx={{ borderRadius: 10, ml: 'auto' }} />
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
