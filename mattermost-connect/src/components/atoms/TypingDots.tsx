import React from 'react';
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

/**
 * TypingDots component following Mattermost patterns
 * Animated dots indicator for typing status
 */
export const TypingDots: React.FC<TypingDotsProps> = ({
  size = 'medium',
  color,
  sx,
}) => {
  // Size configuration
  const sizeConfig = {
    small: { dotSize: 3, spacing: 1 },
    medium: { dotSize: 4, spacing: 1.5 },
    large: { dotSize: 6, spacing: 2 },
  };

  const { dotSize, spacing } = sizeConfig[size];
  const dotColor = color || 'primary.main';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: `${spacing}px`,
        ...sx,
      }}
    >
      {[0, 1, 2].map((index) => (
        <Box
          key={index}
          sx={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            backgroundColor: dotColor,
            animation: `${typingAnimation} 1s infinite ease-in-out`,
            animationDelay: `${index * 0.2}s`,
          }}
        />
      ))}
    </Box>
  );
};

export default TypingDots;