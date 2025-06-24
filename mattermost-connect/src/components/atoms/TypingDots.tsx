import React, { useMemo } from 'react';
import { Box, SxProps, Theme, keyframes } from '@mui/material';

export interface TypingDotsProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  sx?: SxProps<Theme>;
}

// Animation keyframes for typing dots
const typingAnimation = keyframes`
  0% {
    opacity: 0.2;
    transform: scale(0.8);
  }
  20% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0.2;
    transform: scale(0.8);
  }
`;

// Static size configuration extracted for performance
const SIZE_CONFIG = {
  small: { dotSize: 3, spacing: 1 },
  medium: { dotSize: 4, spacing: 1.5 },
  large: { dotSize: 6, spacing: 2 },
} as const;

const STATIC_STYLES = {
  container: {
    display: 'flex',
    alignItems: 'center',
  } as const,
  
  dot: {
    borderRadius: '50%',
    animation: `${typingAnimation} 1s infinite ease-in-out`,
  } as const,
};

/**
 * TypingDots component following Mattermost patterns
 * Animated dots indicator for typing status
 */
export const TypingDots: React.FC<TypingDotsProps> = ({
  size = 'medium',
  color,
  sx,
}) => {
  // Memoized styles based on size and color
  const styles = useMemo(() => {
    const { dotSize, spacing } = SIZE_CONFIG[size];
    const dotColor = color || 'primary.main';
    
    return {
      container: {
        ...STATIC_STYLES.container,
        gap: `${spacing}px`,
        ...sx,
      },
      
      dot: {
        ...STATIC_STYLES.dot,
        width: dotSize,
        height: dotSize,
        backgroundColor: dotColor,
      },
    };
  }, [size, color, sx]);

  return (
    <Box sx={styles.container}>
      {[0, 1, 2].map((index) => (
        <Box
          key={index}
          sx={{
            ...styles.dot,
            animationDelay: `${index * 0.2}s`,
          }}
        />
      ))}
    </Box>
  );
};

export default TypingDots;