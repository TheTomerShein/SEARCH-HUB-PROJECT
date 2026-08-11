import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecoilRoot } from 'recoil';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { MaterialSearchScreen } from './features/material-search/components/MaterialSearchScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

// Create rtl cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const theme = createTheme({
  direction: 'rtl',
  spacing: 8,
  typography: {
    fontFamily: 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif',
    fontSize: 14,
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
    h5: {
      fontWeight: 800,
      letterSpacing: '-0.4px',
    },
    h6: {
      fontWeight: 800,
      letterSpacing: '-0.3px',
    },
    subtitle1: {
      fontWeight: 700,
      letterSpacing: '-0.2px',
    },
    body2: {
      lineHeight: 1.5,
    },
  },
  palette: {
    primary: {
      main: '#4F46E5',
      light: '#818CF8',
      dark: '#3730A3',
    },
    secondary: {
      main: '#6366F1',
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    divider: '#E2E8F0',
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 1px 3px rgba(79, 70, 229, 0.25)',
          },
        },
        outlined: {
          borderColor: '#E2E8F0',
          '&:hover': {
            borderColor: '#CBD5E1',
            bgcolor: '#F8FAFC',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#F8FAFC',
          borderRadius: 8,
          transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#E2E8F0',
          },
          '&:hover': {
            backgroundColor: '#F1F5F9',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#CBD5E1',
            },
          },
          '&.Mui-focused': {
            backgroundColor: '#FFFFFF',
            boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.12)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#4F46E5',
              borderWidth: '1px',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 6,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        enterDelay: 400,
      },
    },
  },
});


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <CacheProvider value={cacheRtl}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <QueryClientProvider client={queryClient}>
            <RecoilRoot>
              <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
                <MaterialSearchScreen />
              </div>
            </RecoilRoot>
          </QueryClientProvider>
        </ThemeProvider>
      </CacheProvider>
    </ErrorBoundary>
  );
}

export default App;

