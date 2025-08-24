/**
 * File action buttons container with permission-based visibility
 * Shows download and public link buttons based on server config and user permissions
 */
import React from 'react';
import { Box } from '@mui/material';
import { FileDownloadButton } from './FileDownloadButton';
import { FilePublicLinkButton } from './FilePublicLinkButton';
import { canDownload } from '../../services/fileService';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectPublicLinksEnabled } from '../../store/selectors/configSelectors';

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
  const canDownloadFile = canDownload(fileId);
  
  // Check server configuration for public links like official Mattermost
  const enablePublicLink = useAppSelector(selectPublicLinksEnabled);
  
  // Check if clipboard API is available (HTTPS or localhost required)
  const isClipboardAvailable = !!(navigator.clipboard && navigator.clipboard.writeText);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexShrink: 0,
      gap: { xs: 1, md: 0.5 } 
    }}>
      {showPublicLink && enablePublicLink && isClipboardAvailable && (
        <FilePublicLinkButton 
          fileId={fileId} 
          size={size}
          tooltip="Copy Public Link" 
          sx={{ 
            padding: '6px'
          }}
        />
      )}
      
      {showDownload && canDownloadFile && (
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