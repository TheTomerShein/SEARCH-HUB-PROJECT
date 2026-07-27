import { lazy, Suspense } from 'react';
import { Box, Drawer } from '@mui/material';
import { TopBar } from './TopBar';
import { SearchSidebar } from './SearchSidebar';
import { VirtualizedMaterialList } from './VirtualizedMaterialList';
import { MaterialDetailPanel } from './MaterialDetailPanel';
import { useLayoutMode } from '../hooks/useLayoutMode';
import { ActiveFilterChips } from './ActiveFilterChips';
import { useRecoilValue } from 'recoil';
import { searchSubmittedState, compareModeOpenState } from '../state/search.state';
import { useInitDefaultFields } from '../hooks/useInitDefaultFields';

const MaterialCompareView = lazy(() =>
  import('./MaterialCompareView').then((m) => ({ default: m.MaterialCompareView })),
);

export function MaterialSearchScreen() {
  const {
    isLgUp,
    filterDrawerOpen,
    setFilterDrawerOpen,
  } = useLayoutMode();

  useInitDefaultFields();

  const searchSubmitted = useRecoilValue(searchSubmittedState);
  const compareOpen = useRecoilValue(compareModeOpenState);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {!searchSubmitted ? (
          /* First-screen hero (restored visual) */
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              overflowY: 'auto',
              background: `
                radial-gradient(ellipse at 20% 50%, rgba(79,70,229,0.18) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.15) 0%, transparent 55%),
                radial-gradient(ellipse at 60% 80%, rgba(99,102,241,0.1) 0%, transparent 50%),
                linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 40%, #F5F3FF 100%)
              `,
              '&::before': {
                content: '""',
                position: 'fixed',
                inset: 0,
                backgroundImage: 'radial-gradient(circle, rgba(79,70,229,0.08) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                pointerEvents: 'none',
                zIndex: 0,
              },
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: 1200,
                px: { xs: 2, md: 4 },
                py: { xs: 3, md: 5 },
                position: 'relative',
                zIndex: 1,
              }}
            >
              <SearchSidebar centered />
            </Box>
          </Box>
        ) : (
          <>
            {isLgUp ? (
              <SearchSidebar />
            ) : (
              <Drawer
                anchor="left"
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                PaperProps={{ sx: { height: '100%' } }}
              >
                <SearchSidebar />
              </Drawer>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <ActiveFilterChips />
              <VirtualizedMaterialList />
            </Box>
          </>
        )}
      </Box>

      <MaterialDetailPanel />
      {compareOpen && (
        <Suspense fallback={null}>
          <MaterialCompareView />
        </Suspense>
      )}
    </Box>
  );
}
