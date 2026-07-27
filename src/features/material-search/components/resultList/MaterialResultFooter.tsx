import { Box, Typography } from '@mui/material';

type Props = {
  loadedCount: number;
  totalCount: number;
  checkedCount: number;
  showCounts: boolean;
  onClearSelection?: () => void;
};

export function MaterialResultFooter({
  loadedCount,
  totalCount,
  checkedCount,
  showCounts,
  onClearSelection,
}: Props) {
  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.25,
        borderTop: '1px solid #E2E8F0',
        background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {showCounts && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                px: 1.25,
                py: 0.25,
                borderRadius: '20px',
                bgcolor: 'rgba(79,70,229,0.08)',
                border: '1px solid rgba(79,70,229,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: 'primary.dark', fontSize: '0.75rem' }}
              >
                {loadedCount.toLocaleString('he-IL')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                / {totalCount.toLocaleString('he-IL')}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
              רשומות
            </Typography>
          </Box>
        )}
        {checkedCount > 0 && (
          <Box
            component={onClearSelection ? 'button' : 'div'}
            type={onClearSelection ? 'button' : undefined}
            onClick={onClearSelection}
            title={onClearSelection ? 'נקה בחירה' : undefined}
            sx={{
              px: 1.25,
              py: 0.25,
              borderRadius: '20px',
              bgcolor: 'rgba(79,70,229,0.12)',
              border: '1px solid rgba(79,70,229,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: onClearSelection ? 'pointer' : 'default',
              font: 'inherit',
              m: 0,
              '&:hover': onClearSelection
                ? { bgcolor: 'rgba(79,70,229,0.2)', borderColor: 'rgba(79,70,229,0.4)' }
                : undefined,
            }}
          >
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: 'primary.dark', fontSize: '0.75rem' }}
            >
              {checkedCount} נבחרו
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
