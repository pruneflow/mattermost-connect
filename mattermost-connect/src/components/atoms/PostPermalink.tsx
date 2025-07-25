import React, { memo, useMemo } from 'react';
import { IconButton, Tooltip, SxProps, Theme, useTheme } from '@mui/material';
import { Link as LinkIcon } from '@mui/icons-material';
import { usePermalinkNavigation } from '../../hooks/usePermalinkNavigation';

/**
 * Composant pour le lien permanent d'un post
 */

interface PostPermalinkProps {
  postId: string;
  teamName: string;
  channelName: string;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}

// Static styles extracted outside component for performance
const STATIC_STYLES = {
  base: {
    opacity: 0,
    visibility: 'hidden',
    
    '.post-header:hover &': {
      opacity: 1,
      visibility: 'visible',
    },
  } as const,

  hover: {
    '&:hover': {
      // Dynamic colors will be applied via theme
    },
  } as const,
} as const;

const generatePermalink = (postId: string, teamName: string, channelName: string): string => {
  // Format: /team/channels/channel/post_id
  return `/${teamName}/channels/${channelName}/${postId}`;
};

export const PostPermalink: React.FC<PostPermalinkProps> = memo(({
  postId,
  teamName,
  channelName,
  onClick,
  sx,
}) => {
  const theme = useTheme();
  const { navigateToPost } = usePermalinkNavigation();
  
  const handleClick = () => {
    const permalink = generatePermalink(postId, teamName, channelName);
    
    // Option 1: Navigate directly to the post (in same channel)
    navigateToPost(postId);
    
    // Option 2: Copy link to clipboard (traditional behavior)
    navigator.clipboard.writeText(window.location.origin + permalink);
    
    // Notifier le parent
    if (onClick) {
      onClick();
    }
  };
  
  // Memoized dynamic styles
  const dynamicStyles = useMemo(() => ({
    ...STATIC_STYLES.base,
    padding: theme.spacing(0.25),
    color: theme.palette.text.secondary,
    transition: theme.transitions.create(['opacity', 'visibility', 'color'], {
      duration: theme.transitions.duration.short,
    }),
    
    '&:hover': {
      color: theme.palette.primary.main,
      backgroundColor: theme.palette.action.hover,
    },
    
    ...sx,
  }), [theme, sx]);
  
  return (
    <Tooltip
      title="Copy link to this message"
      placement="top"
      arrow
      enterDelay={1000}
    >
      <IconButton
        size="small"
        onClick={handleClick}
        sx={dynamicStyles}
        aria-label="Copy link to message"
      >
        <LinkIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
});

PostPermalink.displayName = 'PostPermalink';