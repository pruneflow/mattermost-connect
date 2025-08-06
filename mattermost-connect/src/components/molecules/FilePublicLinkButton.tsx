import React, { useCallback, useState, useEffect } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Link as LinkIcon, Check as CheckIcon } from '@mui/icons-material';
import { useFileActions } from '../../hooks/useFileActions';

export interface FilePublicLinkButtonProps {
  fileId: string;
  size?: 'small' | 'medium' | 'large';
  tooltip?: string;
  sx?: React.CSSProperties;
}

/**
 * Button component for generating and copying public links
 * Uses Redux-based file actions for state management
 */
export const FilePublicLinkButton: React.FC<FilePublicLinkButtonProps> = ({ 
  fileId, 
  size = 'small', 
  tooltip = 'Copy Public Link', 
  sx 
}) => {
  const { copyPublicLinkToClipboard, hasPublicLink } = useFileActions(fileId);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleCopyLink = useCallback(async () => {
    const success = await copyPublicLinkToClipboard();
    
    if (success) {
      setShowSuccess(true);
    }
  }, [copyPublicLinkToClipboard]);

  // Reset success state after 5 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);
  
  return (
    <Tooltip title={showSuccess ? 'Copié' : tooltip}>
      <IconButton 
        size={size} 
        onClick={handleCopyLink}
        aria-label="copy public link"
        sx={{ 
          p: { xs: 0.75, md: 0.5 },
          color: showSuccess ? 'success.main' : (hasPublicLink ? 'primary.main' : 'inherit'),
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          ...sx
        }}
      >
        {showSuccess ? <CheckIcon fontSize={size} /> : <LinkIcon fontSize={size} />}
      </IconButton>
    </Tooltip>
  );
};

export default FilePublicLinkButton;