import { Box, Drawer } from '@mui/material';
import { TopBar } from './TopBar';
import { SearchSidebar } from './SearchSidebar';
import { VirtualizedMaterialList } from './VirtualizedMaterialList';
import { MaterialDetailPanel } from './MaterialDetailPanel';
import { MaterialCompareView } from './MaterialCompareView';
import { useLayoutMode } from '../hooks/useLayoutMode';
import { ActiveFilterChips } from './ActiveFilterChips';
import { useRecoilValue } from 'recoil';
import { searchSubmittedState } from '../state/search.state';

export function MaterialSearchScreen() {
  const { 
    isLgUp, 
    filterDrawerOpen, 
    setFilterDrawerOpen, 
  } = useLayoutMode();
  
  const searchSubmitted = useRecoilValue(searchSubmittedState);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {!searchSubmitted ? (
          /* ── Hero background ──────────────────────────────────────────── */
          <Box sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            overflowY: 'auto',
            // Rich animated gradient mesh background
            background: `
              radial-gradient(ellipse at 20% 50%, rgba(79,70,229,0.18) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.15) 0%, transparent 55%),
              radial-gradient(ellipse at 60% 80%, rgba(99,102,241,0.1) 0%, transparent 50%),
              linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 40%, #F5F3FF 100%)
            `,
            // Subtle dot grid overlay for texture
            '&::before': {
              content: '""',
              position: 'fixed',
              inset: 0,
              backgroundImage: 'radial-gradient(circle, rgba(79,70,229,0.08) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              pointerEvents: 'none',
              zIndex: 0,
            },
          }}>
            <Box sx={{ width: '100%', maxWidth: 1200, px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 }, position: 'relative', zIndex: 1 }}>
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
              >
                <SearchSidebar />
              </Drawer>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <ActiveFilterChips />
              <VirtualizedMaterialList />
            </Box>
          </>
        )}
      </Box>

      {/* Detail dialog — self-managing via selectedMaterialNumberState */}
      <MaterialDetailPanel />
      {/* Compare dialog — rendered outside the layout flow, hidden when closed */}
      <MaterialCompareView />
    </Box>
  );
}
