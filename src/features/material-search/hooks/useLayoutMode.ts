import { useTheme, useMediaQuery } from '@mui/material';
import { useRecoilState } from 'recoil';
import { filterDrawerOpenState, detailDrawerOpenState } from '../state/search.state';

export function useLayoutMode() {
  const theme = useTheme();
  const isLgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [filterDrawerOpen, setFilterDrawerOpen] = useRecoilState(filterDrawerOpenState);
  const [detailDrawerOpen, setDetailDrawerOpen] = useRecoilState(detailDrawerOpenState);

  return {
    isLgUp,
    isMdUp,
    filterDrawerOpen,
    setFilterDrawerOpen,
    detailDrawerOpen,
    setDetailDrawerOpen,
  };
}
