import React, { memo, useCallback } from 'react';
import { Box, Typography, IconButton, Paper, Chip, SxProps, Theme } from '@mui/material';
import { Download as DownloadIcon, Image as ImageIcon, Description as FileIcon } from '@mui/icons-material';

interface FileInfo {
  id: string;
  name: string;
  extension: string;
  size: number;
  mime_type: string;
  has_preview_image?: boolean;
}

interface FileAttachmentListProps {
  fileIds: string[];
  files?: { [key: string]: FileInfo };
  onDownload?: (fileId: string) => void;
  onPreview?: (fileId: string) => void;
  sx?: SxProps<Theme>;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

const getFileIcon = (mimeType: string) => {
  if (isImageFile(mimeType)) {
    return <ImageIcon />;
  }
  return <FileIcon />;
};

export const FileAttachmentList: React.FC<FileAttachmentListProps> = memo(({
  fileIds,
  files = {},
  onDownload,
  onPreview,
  sx,
}) => {
  const handleFileClick = useCallback((file: FileInfo) => {
    if (isImageFile(file.mime_type) && onPreview) {
      onPreview(file.id);
    }
  }, [onPreview]);

  const handleDownloadClick = useCallback((e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(fileId);
    }
  }, [onDownload]);

  const handlePreviewClick = useCallback((fileId: string) => {
    if (onPreview) {
      onPreview(fileId);
    }
  }, [onPreview]);

  if (!fileIds || fileIds.length === 0) {
    return null;
  }

  const attachedFiles = fileIds
    .map(id => files[id])
    .filter(Boolean);

  if (attachedFiles.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 1, ...sx }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {attachedFiles.map((file) => {
          const handleClick = () => handleFileClick(file);
          const handleDownload = (e: React.MouseEvent) => handleDownloadClick(e, file.id);
          
          return (
            <Paper
              key={file.id}
              variant="outlined"
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1,
                minWidth: 200,
                maxWidth: 300,
                cursor: isImageFile(file.mime_type) && onPreview ? 'pointer' : 'default',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
              onClick={handleClick}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <Box sx={{ color: 'text.secondary', mr: 1, flexShrink: 0 }}>
                  {getFileIcon(file.mime_type)}
                </Box>
                
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{ fontWeight: 500 }}
                    title={file.name}
                  >
                    {file.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size)}
                  </Typography>
                </Box>
              </Box>
              
              {onDownload && (
                <IconButton
                  size="small"
                  onClick={handleDownload}
                  sx={{ ml: 1 }}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              )}
            </Paper>
          );
        })}
      </Box>

      {/* Image previews for image files */}
      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {attachedFiles
          .filter(file => isImageFile(file.mime_type) && file.has_preview_image)
          .map((file) => {
            const handlePreview = () => handlePreviewClick(file.id);
            
            return (
              <Box
                key={file.id}
                sx={{
                  maxWidth: 200,
                  maxHeight: 150,
                  overflow: 'hidden',
                  borderRadius: 1,
                  cursor: onPreview ? 'pointer' : 'default',
                  '&:hover': {
                    opacity: 0.8,
                  },
                }}
                onClick={handlePreview}
              >
                <img
                  src={`/api/v4/files/${file.id}/preview`}
                  alt={file.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  loading="lazy"
                />
              </Box>
            );
          })}
      </Box>
    </Box>
  );
});

FileAttachmentList.displayName = 'FileAttachmentList';