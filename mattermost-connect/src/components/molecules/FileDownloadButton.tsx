import React, { useCallback } from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { useFileActions } from '../../hooks/useFileActions';

export interface FileDownloadButtonProps {
  fileId: string;
  size?: 'small' | 'medium' | 'large';
  tooltip?: string;
  sx?: React.CSSProperties;
}

/**
 * Button component for downloading files
 * Uses the useFile hook for download functionality with loading states
 */
export const FileDownloadButton: React.FC<FileDownloadButtonProps> = ({ 
  fileId, 
  size = 'small', 
  tooltip = 'Download', 
  sx 
}) => {
  const { download, isDownloading, canDownload } = useFileActions(fileId);
  
  const handleDownloadClick = useCallback(() => {
    download();
  }, [download]);
  
  return (
    <Tooltip title={tooltip}>
      <IconButton 
        size={size} 
        onClick={handleDownloadClick}
        aria-label="download file"
        disabled={!canDownload || isDownloading}
        sx={{ 
          p: { xs: 0.75, md: 0.5 },
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          ...sx
        }}
      >
        {isDownloading ? (
          <CircularProgress size={size === 'small' ? 16 : 24} />
        ) : (
          <DownloadIcon fontSize={size} />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default FileDownloadButton;