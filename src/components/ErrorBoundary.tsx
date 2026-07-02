import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          dir="rtl"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            gap: 2,
            bgcolor: '#f4f5f6',
            p: 4,
            textAlign: 'center',
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 64, color: '#d32f2f' }} />
          <Typography variant="h5" fontWeight="bold" color="text.primary">
            אירעה שגיאה בלתי צפויה
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500 }}>
            משהו השתבש בטעינת האפליקציה. נסה לרענן את הדף או ללחוץ על הכפתור למטה.
          </Typography>
          {this.state.error && (
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ fontFamily: 'monospace', mt: 1 }}
            >
              {this.state.error.message}
            </Typography>
          )}
          <Button
            variant="contained"
            onClick={this.handleReset}
            sx={{ mt: 2 }}
          >
            נסה שוב
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
