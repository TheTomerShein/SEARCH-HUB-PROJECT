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
  typography: {
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.5px',
    },
    subtitle1: {
      fontWeight: 600,
      letterSpacing: '-0.3px',
    }
  },
  palette: {
    primary: {
      main: '#4F46E5', // Sleek Indigo
      light: '#818CF8',
      dark: '#3730A3',
    },
    secondary: {
      main: '#8B5CF6', // Vibrant Violet
    },
    background: {
      default: '#F8FAFC', // Slate 50
      paper: '#FFFFFF',
    },
    divider: '#E2E8F0', // Slate 200
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1)',
          },
        },
        outlined: {
          '&:hover': {
            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
          }
        }
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease-in-out',
          backgroundColor: '#F8FAFC',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#E2E8F0',
            transition: 'border-color 0.2s ease-in-out',
          },
          '&:hover': {
            backgroundColor: '#F1F5F9',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#CBD5E1',
            },
          },
          '&.Mui-focused': {
            backgroundColor: '#FFFFFF',
            boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.15)',
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

