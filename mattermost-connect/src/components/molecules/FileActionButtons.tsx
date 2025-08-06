import React from 'react';
import { Box } from '@mui/material';
import { FileDownloadButton } from './FileDownloadButton';
import { FilePublicLinkButton } from './FilePublicLinkButton';
import { useFileActions } from '../../hooks/useFileActions';
import { useServerConfig } from '../../hooks/useServerConfig';

export interface FileActionButtonsProps {
  fileId: string;
  size?: 'small' | 'medium' | 'large';
  showPublicLink?: boolean;
  showDownload?: boolean;
}

/**
 * Conditional action buttons for files based on permissions
 * Only shows buttons if the user has the necessary permissions
 */
export const FileActionButtons: React.FC<FileActionButtonsProps> = ({ 
  fileId, 
  size = 'small',
  showPublicLink = true,
  showDownload = true
}) => {
  const { canDownload } = useFileActions(fileId);
  const { config } = useServerConfig();
  
  // Check server configuration for public links like official Mattermost
  const enablePublicLink = config?.EnablePublicLink === 'true';

  return (
    <Box sx={{ 
      display: 'flex', 
      flexShrink: 0,
      gap: { xs: 1, md: 0.5 } 
    }}>
      {showPublicLink && enablePublicLink && (
        <FilePublicLinkButton 
          fileId={fileId} 
          size={size}
          tooltip="Copy Public Link" 
          sx={{ 
            padding: '6px'
          }}
        />
      )}
      
      {showDownload && canDownload && (
        <FileDownloadButton 
          fileId={fileId} 
          size={size}
          tooltip="Download" 
          sx={{ 
            padding: '6px'
          }}
        />
      )}
    </Box>
  );
};

export default FileActionButtons;