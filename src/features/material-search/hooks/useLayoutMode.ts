import { useTheme, useMediaQuery } from '@mui/material';
import { useRecoilState } from 'recoil';
import { criteriaPanelOpenState } from '../state/search.state';

export function useLayoutMode() {
  const theme = useTheme();
  const isLgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [criteriaPanelOpen, setCriteriaPanelOpen] = useRecoilState(criteriaPanelOpenState);

  return {
    isLgUp,
    isMdUp,
    criteriaPanelOpen,
    setCriteriaPanelOpen,
    /** @deprecated use setCriteriaPanelOpen */
    setFilterDrawerOpen: setCriteriaPanelOpen,
    /** @deprecated use criteriaPanelOpen */
    filterDrawerOpen: criteriaPanelOpen,
  };
}
