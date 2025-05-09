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
}

/**
 * Preview component for files being uploaded or already uploaded
 */
export function AttachmentPreview({ files, onRemove }: AttachmentPreviewProps) {
  if (!files || files.length === 0) return null;
  
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, p: 1 }}>
      {files.map((fileStatus, index) => (
        <AttachmentItem 
          key={index}
          fileStatus={fileStatus}
          onRemove={() => onRemove(fileStatus.file)}
        />
      ))}
    </Box>
  );
}

interface AttachmentItemProps {
  fileStatus: FileStatus;
  onRemove: () => void;
}

/**
 * Individual attachment preview item
 */
function AttachmentItem({ fileStatus, onRemove }: AttachmentItemProps) {
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
  
  return (
    <Paper 
      elevation={1} 
      sx={{ 
        width: 160, 
        height: 160, 
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Remove button */}
      <IconButton
        size="small"
        onClick={onRemove}
        sx={{
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
      
      {/* Upload status indicator */}
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
            bgcolor: 'rgba(0,0,0,0.5)',
            zIndex: 1
          }}
        >
          <CircularProgress color="primary" size={40} />
        </Box>
      )}
      
      {/* File preview */}
      {isImage && previewUrl ? (
        <Box
          component="img"
          src={previewUrl}
          alt={file.name}
          sx={{
            width: '100%',
            height: '70%',
            objectFit: 'cover',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        />
      ) : (
        <Box
          sx={{
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
          <FileIcon sx={{ fontSize: 50, color: 'text.secondary' }} />
        </Box>
      )}
      
      {/* File info */}
      <Box sx={{ p: 1, height: '30%', overflow: 'hidden' }}>
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