import { lazy, Suspense, useEffect } from 'react';
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
    criteriaPanelOpen,
    setCriteriaPanelOpen,
  } = useLayoutMode();

  useInitDefaultFields();

  const searchSubmitted = useRecoilValue(searchSubmittedState);
  const compareOpen = useRecoilValue(compareModeOpenState);

  // Small screens: keep criteria as a drawer (closed until user opens).
  useEffect(() => {
    if (!isLgUp && searchSubmitted) {
      setCriteriaPanelOpen(false);
    }
  }, [isLgUp, searchSubmitted, setCriteriaPanelOpen]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {!searchSubmitted ? (
          /* Hero: card height follows fields; max = one viewport; fields scroll when capped */
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
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
                position: 'absolute',
                inset: 0,
                backgroundImage: 'radial-gradient(circle, rgba(79,70,229,0.08) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                pointerEvents: 'none',
                zIndex: 0,
              },
              position: 'relative',
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: 1200,
                height: 'auto',
                minHeight: 0,
                px: { xs: 2, md: 4 },
                pt: { xs: 5, md: 8 },
                pb: { xs: 3, md: 5 },
                position: 'relative',
                zIndex: 1,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <SearchSidebar centered />
            </Box>
          </Box>
        ) : (
          <>
            {isLgUp ? (
              criteriaPanelOpen ? <SearchSidebar /> : null
            ) : (
              <Drawer
                anchor="left"
                open={criteriaPanelOpen}
                onClose={() => setCriteriaPanelOpen(false)}
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
