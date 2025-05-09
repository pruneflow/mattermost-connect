import React from 'react';
import { Box, Paper, Typography, IconButton, CircularProgress } from '@mui/material';
import { Close as CloseIcon, InsertDriveFile as FileIcon } from '@mui/icons-material';
import { formatFileSize } from '../utils/formatters';

interface FileStatus {
  file: File;
  uploading: boolean;
  uploaded: boolean;
  fileId?: string;
  url?: string;
}

interface AttachmentPreviewProps {
  files: FileStatus[];
  onRemove: (file: File) => void;
  variant?: 'grid' | 'list'; // Options de style: grid (default) ou list (en colonne)
  maxWidth?: number | string; // Permet de définir une largeur maximale personnalisée
}

/**
 * Preview component for files being uploaded or already uploaded
 */
export function AttachmentPreview({
  files,
  onRemove,
  variant = 'grid',
  maxWidth
}: AttachmentPreviewProps) {
  if (!files || files.length === 0) return null;

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: variant === 'list' ? 'column' : 'row',
      flexWrap: variant === 'list' ? 'nowrap' : 'wrap',
      gap: 1,
      p: 1,
      width: '100%',
    }}>
      {files.map((fileStatus, index) => (
        <AttachmentItem
          key={index}
          fileStatus={fileStatus}
          onRemove={() => onRemove(fileStatus.file)}
          variant={variant}
          maxWidth={maxWidth}
        />
      ))}
    </Box>
  );
}

interface AttachmentItemProps {
  fileStatus: FileStatus;
  onRemove: () => void;
  variant?: 'grid' | 'list';
  maxWidth?: number | string;
}

/**
 * Individual attachment preview item
 */
function AttachmentItem({ fileStatus, onRemove, variant = 'grid', maxWidth }: AttachmentItemProps) {
  const { file, uploading, uploaded, fileId, url } = fileStatus;
  
  // Determine if this is an image that can be previewed
  const isImage = file.type.startsWith('image/') && 
                 ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);
  
  // Create local URL for image preview
  const previewUrl = isImage ? URL.createObjectURL(file) : null;
  
  // Cleanup URL when component unmounts
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  
  // Styles en fonction de la variante
  const getStyles = () => {
    if (variant === 'list') {
      return {
        width: '100%',
        maxWidth: maxWidth || '100%',
        height: 60,
        position: 'relative' as const,
        overflow: 'hidden' as const,
        display: 'flex' as const,
        flexDirection: 'row' as const,
      };
    }
    // Style par défaut ('grid')
    return {
      width: 160,
      height: 160,
      position: 'relative' as const,
      overflow: 'hidden' as const,
      display: 'flex' as const,
      flexDirection: 'column' as const,
    };
  };

  return (
    <Paper
      elevation={1}
      sx={getStyles()}
    >
      {/* Remove button */}
      <IconButton
        size="small"
        onClick={onRemove}
        sx={variant === 'list' ? {
          ml: 'auto',
          mr: 1,
          color: 'text.secondary',
          '&:hover': {
            bgcolor: 'action.hover',
          },
          zIndex: 1
        } : {
          position: 'absolute',
          top: 4,
          right: 4,
          bgcolor: 'rgba(0,0,0,0.3)',
          color: 'white',
          '&:hover': {
            bgcolor: 'rgba(0,0,0,0.5)',
          },
          zIndex: 1
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
      
      {/* Upload status indicator - adapté selon la variante */}
      {uploading && (
        <Box
          sx={variant === 'list' ? {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            mr: 1,
            position: 'relative'
          } : {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.5)',
            zIndex: 1
          }}
        >
          <CircularProgress color="primary" size={variant === 'list' ? 24 : 40} />
        </Box>
      )}
      
      {/* File preview - styles différents selon la variante */}
      {isImage && previewUrl ? (
        <Box
          component="img"
          src={previewUrl}
          alt={file.name}
          sx={variant === 'list' ? {
            width: 40,
            height: 40,
            objectFit: 'cover',
            borderRadius: 1,
            mr: 1
          } : {
            width: '100%',
            height: '70%',
            objectFit: 'cover',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        />
      ) : (
        <Box
          sx={variant === 'list' ? {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            bgcolor: 'action.hover',
            borderRadius: 1,
            mr: 1
          } : {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '70%',
            width: '100%',
            bgcolor: 'action.hover',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <FileIcon sx={{ fontSize: variant === 'list' ? 24 : 50, color: 'text.secondary' }} />
        </Box>
      )}

      {/* File info - styles différents selon la variante */}
      <Box sx={variant === 'list' ? {
        flexGrow: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      } : {
        p: 1,
        height: '30%',
        overflow: 'hidden'
      }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatFileSize(file.size)}
        </Typography>
      </Box>
    </Paper>
  );
}

export default AttachmentPreview;