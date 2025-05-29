import React, { useState, useEffect, ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

export interface LoadingWrapperProps {
  isLoading: boolean;
  error?: string | null;
  skeleton?: ReactNode;
  children: ReactNode;
  
  // Smart loading delays (following best UX practices)
  showDelay?: number; // Delay before showing loading (default: 200ms)
  minShowTime?: number; // Minimum time to show loading (default: 300ms)
  
  // Error handling
  onRetry?: () => void;
  errorComponent?: ReactNode;
  
  // Debugging
  loadingKey?: string;
}

/**
 * LoadingWrapper - Smart loading component following UX best practices
 * 
 * Features:
 * - 200ms delay before showing loading (prevents flash)
 * - 300ms minimum show time (prevents flicker)
 * - Custom skeleton components
 * - Error states with retry
 * - Debug information in dev mode
 */
export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  isLoading,
  error,
  skeleton,
  children,
  showDelay = 200,
  minShowTime = 300,
  onRetry,
  errorComponent,
  loadingKey,
}) => {
  const [showLoading, setShowLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);

  // Smart loading display logic
  useEffect(() => {
    let showTimer: NodeJS.Timeout;
    let hideTimer: NodeJS.Timeout;

    if (isLoading && !showLoading) {
      // Start loading: wait showDelay before displaying
      showTimer = setTimeout(() => {
        setShowLoading(true);
        setLoadingStartTime(Date.now());
      }, showDelay);
    } else if (!isLoading && showLoading && loadingStartTime) {
      // Stop loading: ensure minimum show time
      const elapsed = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, minShowTime - elapsed);
      
      hideTimer = setTimeout(() => {
        setShowLoading(false);
        setLoadingStartTime(null);
      }, remainingTime);
    }

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [isLoading, showLoading, loadingStartTime, showDelay, minShowTime]);

  // Debug information in development
  if (process.env.NODE_ENV === 'development' && loadingKey) {
    console.debug(`LoadingWrapper[${loadingKey}]:`, {
      isLoading,
      showLoading,
      error,
    });
  }

  // Show loading skeleton
  if (showLoading) {
    return (
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
        role="status"
        aria-label="Loading..."
      >
        {skeleton || <DefaultLoadingSkeleton />}
      </Box>
    );
  }

  // Show error state
  if (error) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          textAlign: 'center',
          color: 'error.main',
        }}
        role="alert"
      >
        <Typography variant="body1" color="error" gutterBottom>
          {error}
        </Typography>
        {onRetry && (
          <Typography
            variant="body2"
            sx={{
              cursor: 'pointer',
              textDecoration: 'underline',
              color: 'primary.main',
              mt: 1,
              '&:hover': {
                color: 'primary.dark',
              },
            }}
            onClick={onRetry}
          >
            Try again
          </Typography>
        )}
      </Box>
    );
  }

  // Show content
  return <>{children}</>;
};

// Default loading skeleton
const DefaultLoadingSkeleton: React.FC = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        bgcolor: 'action.hover',
        mr: 2,
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
      }}
    />
    <Box sx={{ flex: 1 }}>
      <Box
        sx={{
          height: 16,
          bgcolor: 'action.hover',
          borderRadius: 1,
          mb: 1,
          width: '60%',
          animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        }}
      />
      <Box
        sx={{
          height: 12,
          bgcolor: 'action.hover',
          borderRadius: 1,
          width: '40%',
          animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        }}
      />
    </Box>
  </Box>
);

export default LoadingWrapper;

// CSS animation (add to global styles or theme)
export const skeletonAnimation = `
@keyframes skeleton-pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
}
`;