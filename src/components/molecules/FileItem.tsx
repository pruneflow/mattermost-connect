/**
 * File item component with upload status and action buttons
 * Supports both uploaded files and files being uploaded with preview thumbnails
 */
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  CircularProgress
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { FileInfo } from '../../api/types';
import { formatFileSize } from '../../utils/formatters';
import { FileTypeIcon } from '../atoms/FileIcon';
import { FileActionButtons } from './FileActionButtons';
import { client } from '../../api/client';

// Status for files being uploaded (input mode)
export interface FileStatus {
  file: File;
  uploading: boolean;
  uploaded: boolean;
  fileId?: string;
  error?: string;
}

// Union type for two usage modes - partial usage of FileInfo
export type FileItemData = Partial<FileInfo> & Pick<FileInfo, 'id' | 'name' | 'size' | 'mime_type'> | FileStatus;

export interface FileItemProps {
  file: FileItemData;
  showPreview?: boolean;
  showDownload?: boolean;
  showPublicLink?: boolean;
  showRemove?: boolean;
  uploading?: boolean;
  onRemove?: () => void;
  onPreview?: () => void;
}

function isFileInfo(file: FileItemData): file is FileInfo {
  return 'id' in file && typeof file.id === 'string';
}

function isFileStatus(file: FileItemData): file is FileStatus {
  return 'file' in file && file.file instanceof File;
}

/**
 * Generic component for file display
 * Used in messages and message input
 */
export const FileItem: React.FC<FileItemProps> = ({
  file,
  showPreview = false,
  showDownload = false,
  showPublicLink = false,
  showRemove = false,
  uploading = false,
  onRemove,
  onPreview,
}) => {
  const fileData = React.useMemo(() => {
    if (isFileInfo(file)) {
      return {
        id: file.id,
        name: file.name,
        size: file.size,
        mimeType: file.mime_type,
        extension: file.extension,
      };
    } else if (isFileStatus(file)) {
      return {
        id: file.fileId,
        name: file.file.name,
        size: file.file.size,
        mimeType: file.file.type,
        extension: file.file.name.split('.').pop() || '',
      };
    }
    return null;
  }, [file]);

  const thumbnailUrl = React.useMemo(() => {
    if (fileData?.id) {
      return `${client.getUrl()}/api/v4/files/${fileData.id}/thumbnail`;
    }
    return null;
  }, [fileData?.id]);

  // Local preview for new images
  const localPreviewUrl = React.useMemo(() => {
    if (isFileStatus(file) && !file.uploaded && fileData?.mimeType?.startsWith('image/')) {
      return URL.createObjectURL(file.file);
    }
    return null;
  }, [file, fileData?.mimeType]);

  // Cleanup local URL
  React.useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const isDisplayableImage = React.useMemo(() => {
    return fileData?.mimeType?.startsWith('image/') && 
           !fileData.mimeType.includes('svg') && 
           !fileData.mimeType.includes('icon');
  }, [fileData?.mimeType]);

  const displayUrl = thumbnailUrl || localPreviewUrl;

  // Click handling
  const handleClick = React.useCallback(() => {
    if (showPreview && onPreview && !uploading) {
      onPreview();
    }
  }, [showPreview, onPreview, uploading]);

  if (!fileData) return null;

  const hasError = isFileStatus(file) && file.error;

  const handleRemove = (e: any) => {
    e.stopPropagation();
    onRemove?.();
  }

  return (
    <Paper
      elevation={0}
      onClick={handleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: { xs: '100%', sm: 'calc(50% - 4px)', md: '350px' },
        maxWidth: '100%',
        overflow: 'hidden',
        borderRadius: 1,
        border: '1px solid',
        borderColor: hasError ? 'error.main' : 'divider',
        padding: '16px 20px',
        minHeight: '80px',
        flexShrink: { xs: 1, sm: 1, md: 0 },
        transition: 'all 0.2s ease',
        cursor: showPreview && !uploading ? 'pointer' : 'default',
        position: 'relative',
        '&:hover': showPreview && !uploading ? {
          borderColor: 'primary.light',
          backgroundColor: 'background.paper',
          transform: 'translateY(-1px)',
        } : {},
      }}
    >
      {/* Loading overlay */}
      {uploading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.8)',
            zIndex: 2,
          }}
        >
          <CircularProgress size={32} />
        </Box>
      )}

      {/* Remove button (top right) */}
      {showRemove && (
        <IconButton
          size="small"
          onClick={handleRemove}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 20,
            height: 20,
            minWidth: 20,
            minHeight: 20,
            padding: 0,
            color: 'text.secondary',
            transition: 'all 0.2s ease',
            '&:hover': {
              color: 'text.primary',
              transform: 'scale(1.1)',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
            },
            zIndex: 1,
            '& .MuiSvgIcon-root': {
              fontSize: 12,
            }
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      )}

      {/* File icon/thumbnail */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: { xs: 48, md: 48 },
          width: { xs: 48, md: 48 },
          mr: 1.5,
          bgcolor: isDisplayableImage ? 'transparent' : 'background.default',
          borderRadius: 1,
          flexShrink: 0,
          backgroundImage: isDisplayableImage && displayUrl ? `url(${displayUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!isDisplayableImage && (
          <FileTypeIcon 
            mimeType={fileData.mimeType} 
            size="large"
            sx={{ 
              fontSize: { xs: '1.5rem', md: '1.4rem' }
            }}
          />
        )}
      </Box>

      {/* File info */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'hidden', 
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: { xs: '0.875rem', md: '0.875rem' },
            lineHeight: 1.2,
            color: hasError ? 'error.main' : 'text.primary',
            maxWidth: '80%',
          }}
          title={fileData.name}
        >
          {fileData.name}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography 
            variant="caption" 
            color={hasError ? 'error.main' : 'text.secondary'}
            sx={{ fontSize: { xs: '0.75rem', md: '0.75rem' } }}
          >
            {fileData.extension.toUpperCase()}
          </Typography>
          
          <Typography 
            variant="caption" 
            color={hasError ? 'error.main' : 'text.secondary'}
            sx={{ fontSize: { xs: '0.75rem', md: '0.75rem' } }}
          >
            {hasError ? (isFileStatus(file) ? file.error : 'Error') : formatFileSize(fileData.size)}
          </Typography>
        </Box>
      </Box>

      {/* Action buttons */}
      {(showDownload || showPublicLink) && fileData.id && (
        <Box sx={{ ml: 1 }}>
          <FileActionButtons 
            fileId={fileData.id} 
            size="small"
            showPublicLink={showPublicLink}
            showDownload={showDownload}
          />
        </Box>
      )}
    </Paper>
  );
};

export default FileItem;