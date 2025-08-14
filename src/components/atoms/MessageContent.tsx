import React, { memo, useMemo } from 'react';
import { Box, SxProps, Theme, useTheme } from '@mui/material';

/**
 * Message content container with markdown styling and theming
 * Provides consistent styling for message text, mentions, links, and formatting
 */

interface MessageContentProps {
  children: React.ReactNode;
  isEditing?: boolean;
  isSystemMessage?: boolean;
  sx?: SxProps<Theme>;
}

// Static styles extracted outside component for performance
const STATIC_STYLES = {
  base: {
    width: '100%',
    wordBreak: 'break-word',
    overflow: 'hidden',
  } as const,
  
  markdown: {
    '& p': {
      margin: 0,
      '&:last-child': {
        marginBottom: 0,
      },
    },
    
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      margin: 0,
      fontWeight: 600,
    },
    
    '& h1': { fontSize: '1.5rem' },
    '& h2': { fontSize: '1.25rem' },
    '& h3': { fontSize: '1.125rem' },
    '& h4': { fontSize: '1rem' },
    '& h5': { fontSize: '0.875rem' },
    '& h6': { fontSize: '0.75rem' },
    
    '& ul, & ol': {
      margin: 0,
    },
    
    '& blockquote': {
      margin: 0,
      fontStyle: 'italic',
    },
    
    '& code': {
      fontFamily: 'monospace',
      fontSize: '0.875rem',
    },
    
    '& pre': {
      margin: 0,
      overflow: 'auto',
      '& code': {
        backgroundColor: 'transparent',
        padding: 0,
      },
    },
    
    '& a': {
      textDecoration: 'none',
      '&:hover': {
        textDecoration: 'underline',
      },
    },
    
    '& img': {
      maxWidth: '100%',
      height: 'auto',
    },
    
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
    },
    
    '& th, & td': {
      textAlign: 'left',
    },
    
    '& th': {
      fontWeight: 600,
    },
    
    '& .emoji': {
      height: '1.2em',
      width: 'auto',
      verticalAlign: 'text-bottom',
    },
    
    '& .hashtag': {
      textDecoration: 'none',
      '&:hover': {
        textDecoration: 'underline',
      },
    },
  } as const,
} as const;

export const MessageContent: React.FC<MessageContentProps> = memo(({
  children,
  isEditing = false,
  isSystemMessage = false,
  sx,
}) => {
  const theme = useTheme();
  
  // Memoized dynamic styles
  const dynamicStyles = useMemo(() => ({
    ...STATIC_STYLES.base,
    ...STATIC_STYLES.markdown,
    
    ...(isSystemMessage && {
      fontStyle: 'italic',
      color: theme.palette.text.secondary,
      fontSize: '0.875rem',
    }),
    
    ...(isEditing && {
      backgroundColor: theme.palette.action.hover,
      border: `1px solid ${theme.palette.primary.main}`,
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(1),
    }),
    
    '& p': {
      ...STATIC_STYLES.markdown['& p'],
      marginBottom: theme.spacing(0.5),
    },
    
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      ...STATIC_STYLES.markdown['& h1, & h2, & h3, & h4, & h5, & h6'],
      marginBottom: theme.spacing(0.5),
    },
    
    '& ul, & ol': {
      ...STATIC_STYLES.markdown['& ul, & ol'],
      marginBottom: theme.spacing(0.5),
      paddingLeft: theme.spacing(2),
    },
    
    '& li': {
      marginBottom: theme.spacing(0.25),
    },
    
    '& blockquote': {
      ...STATIC_STYLES.markdown['& blockquote'],
      marginBottom: theme.spacing(0.5),
      padding: theme.spacing(0.5, 1),
      borderLeft: `4px solid ${theme.palette.divider}`,
      backgroundColor: theme.palette.action.hover,
      borderRadius: theme.shape.borderRadius,
    },
    
    '& code': {
      ...STATIC_STYLES.markdown['& code'],
      backgroundColor: theme.palette.action.hover,
      padding: theme.spacing(0.125, 0.25),
      borderRadius: theme.shape.borderRadius,
    },
    
    '& pre': {
      ...STATIC_STYLES.markdown['& pre'],
      marginBottom: theme.spacing(0.5),
      padding: theme.spacing(1),
      backgroundColor: theme.palette.action.hover,
      borderRadius: theme.shape.borderRadius,
    },
    
    '& a': {
      ...STATIC_STYLES.markdown['& a'],
      color: theme.palette.primary.main,
    },
    
    '& img': {
      ...STATIC_STYLES.markdown['& img'],
      borderRadius: theme.shape.borderRadius,
    },
    
    '& table': {
      ...STATIC_STYLES.markdown['& table'],
      marginBottom: theme.spacing(0.5),
      border: `1px solid ${theme.palette.divider}`,
    },
    
    '& th, & td': {
      ...STATIC_STYLES.markdown['& th, & td'],
      padding: theme.spacing(0.5),
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    
    '& th': {
      ...STATIC_STYLES.markdown['& th'],
      backgroundColor: theme.palette.action.hover,
    },
    
    '& .mention': {
      backgroundColor: theme.palette.primary.main + '20',
      color: theme.palette.primary.main,
      padding: theme.spacing(0.125, 0.25),
      borderRadius: theme.shape.borderRadius,
      fontWeight: 500,
    },
    
    '& .mention--current-user': {
      backgroundColor: theme.palette.warning.main + '20',
      color: theme.palette.warning.main,
    },
    
    '& .mention--invalid-user': {
      backgroundColor: theme.palette.error.main + '20',
      color: theme.palette.error.main,
    },
    
    '& .mention--special': {
      backgroundColor: theme.palette.info.main + '20',
      color: theme.palette.info.main,
    },
    
    '& .emoji': {
      ...STATIC_STYLES.markdown['& .emoji'],
      margin: theme.spacing(0, 0.125),
    },
    
    '& .hashtag': {
      ...STATIC_STYLES.markdown['& .hashtag'],
      color: theme.palette.primary.main,
    },
    
    ...sx,
  }), [theme, isEditing, isSystemMessage, sx]);
  
  return (
    <Box
      className={`message-content ${isSystemMessage ? 'system-message' : ''} ${isEditing ? 'editing' : ''}`}
      sx={dynamicStyles}
    >
      {children}
    </Box>
  );
});

MessageContent.displayName = 'MessageContent';