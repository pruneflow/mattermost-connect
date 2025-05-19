import React from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { useFile } from '../../hooks';

interface FileDownloadButtonProps {
  fileId: string;
  size?: 'small' | 'medium' | 'large';
  tooltip?: string;
  sx?: React.CSSProperties;
}

export function FileDownloadButton({ 
  fileId, 
  size = 'small', 
  tooltip = 'Download', 
  sx 
}: FileDownloadButtonProps) {
  // Utiliser le hook useFile pour gérer le téléchargement
  const { downloadFile, isDownloading } = useFile(fileId);
  
  return (
    <Tooltip title={tooltip}>
      <IconButton 
        size={size} 
        onClick={() => downloadFile()}
        aria-label="download file"
        disabled={isDownloading}
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
}

export default FileDownloadButton;