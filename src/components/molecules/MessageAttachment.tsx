/**
 * Message attachment component for displaying file attachments in posts
 * Handles image previews, file icons, and action buttons with modal preview support
 */
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography
} from '@mui/material';
import { fetchAllFiles } from '../../services/fileService';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectMultipleFileInfos } from '../../store/selectors/filesSelectors';
import { formatFileSize } from '../../utils/formatters';
import { FileTypeIcon } from '../atoms/FileIcon';
import { FileActionButtons } from './FileActionButtons';
import { FilePreviewModal } from './FilePreviewModal';
import { client } from '../../api/client';

// Component for authenticated image preview
interface AuthenticatedImagePreviewProps {
  fileId: string;
  onError?: () => void;
}

function AuthenticatedImagePreview({ fileId, onError }: AuthenticatedImagePreviewProps) {
  // Direct use of thumbnail URL with cookie authentication
  const previewUrl = `${client.getUrl()}/api/v4/files/${fileId}/thumbnail`;
  return (
    <Box
      component="img"
      src={previewUrl}
      onError={onError}
      sx={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: 1,
        boxShadow: '0 0 1px rgba(0,0,0,0.2)',
      }}
    />
  );
}

export interface MessageAttachmentProps {
  postId: string;
  fileIds: string[];
}

/**
 * Component for displaying file attachments in messages
 * Handles multiple files with preview, download, and copy link functionality
 */
export const MessageAttachment: React.FC<MessageAttachmentProps> = ({ postId, fileIds }) => {
  
  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewStartIndex, setPreviewStartIndex] = useState(0);
  
  // Get file infos from Redux store
  const fileInfos = useAppSelector((state) => selectMultipleFileInfos(state, fileIds));
  
  // Centralized loading: only file infos (images use direct URLs)
  React.useEffect(() => {
    if (fileIds.length > 0) {
      fetchAllFiles(postId, fileIds);
    }
  }, [postId, fileIds]);

  // Handle opening preview modal (following Mattermost pattern)
  const handleFileClick = React.useCallback((clickedIndex: number) => {
    setPreviewStartIndex(clickedIndex);
    setPreviewModalOpen(true);
  }, []);

  const handleClosePreview = React.useCallback(() => {
    setPreviewModalOpen(false);
  }, []);

  // Function to determine if a file should be displayed as an image
  const isDisplayableImage = (mimeType: string): boolean => {
    return mimeType.startsWith('image/') && 
           !mimeType.includes('svg') && 
           !mimeType.includes('icon') &&
           !mimeType.includes('webp');
  };

  // Filter out null file infos and only show files that loaded
  const validFiles = fileInfos.filter((file): file is NonNullable<typeof file> => Boolean(file));

  if (validFiles.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 1 }}>
      {/* File attachments */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          flexWrap: 'wrap',
          gap: 1,
          width: '100%'
        }}
      >
        {validFiles.map((file, index) => {
          const handleClick = () => handleFileClick(index);
          
          return (
          <Paper
            key={file.id}
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
              borderColor: 'divider',
              padding: '6px 12px',
              flexShrink: 0,
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.light',
                backgroundColor: 'background.paper',
                transform: 'translateY(-1px)',
              },
            }}
          >
            {/* File icon/preview */}
            <Box
              id={`file-preview-${file.id}`}
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: { xs: 40, md: 36 },
                width: { xs: 40, md: 36 },
                mr: 1.5,
                bgcolor: isDisplayableImage(file.mime_type) ? 'transparent' : 'background.default',
                borderRadius: 1,
                flexShrink: 0,
              }}
            >
              {isDisplayableImage(file.mime_type) ? (
                <AuthenticatedImagePreview
                  fileId={file.id}
                  onError={() => {
                  }}
                />
              ) : (
                <FileTypeIcon 
                  mimeType={file.mime_type} 
                  size="medium"
                  sx={{ 
                    fontSize: { xs: '1.25rem', md: '1.1rem' }
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
                }}
              >
                {file.name}
              </Typography>
              
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{
                  fontSize: { xs: '0.75rem', md: '0.75rem' },
                  mt: 0.5
                }}
              >
                {formatFileSize(file.size)}
              </Typography>
            </Box>

            {/* Action buttons */}
            <Box sx={{ ml: 1 }}>
              <FileActionButtons 
                fileId={file.id} 
                size="small"
                showPublicLink={true}
                showDownload={true}
              />
            </Box>
          </Paper>
          );
        })}
      </Box>

      {/* File Preview Modal */}
      { previewModalOpen && (
        <FilePreviewModal
          fileIds={fileIds}
          startIndex={previewStartIndex}
          open={previewModalOpen}
          onClose={handleClosePreview}
          postId={postId}
        />
      )}

    </Box>
  );
};

export default MessageAttachment;