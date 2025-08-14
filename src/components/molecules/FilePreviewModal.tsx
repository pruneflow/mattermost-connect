/**
 * File preview modal with navigation and user context
 * Displays images, PDFs, audio/video with keyboard navigation and action buttons
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Close as CloseIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectFileInfoById } from '../../store/selectors/filesSelectors';
import { selectPostById } from '../../store/selectors/postsSelectors';
import { selectUserById, selectChannelById } from '../../store/selectors';
import { selectThreadPostId } from '../../store/selectors/messageUI';
import { selectThread } from '../../store/selectors/threads';
import { FileDownloadButton } from './FileDownloadButton';
import { client } from '../../api/client';
import FileActionButtons from './FileActionButtons';
import { UserAvatar } from '../atoms/UserAvatar';
import { formatFileSize } from '../../utils/formatters';
import { displayUsername } from '../../utils/userUtils';
import { ImagePreview } from './ImagePreview';
import { PDFPreview } from './PDFPreview';
import { AudioVideoPreview } from './AudioVideoPreview';

export interface FilePreviewModalProps {
  fileIds: string[]; // Array of file IDs
  startIndex?: number; // Initial file to display
  open: boolean;
  onClose: () => void;
  postId: string; // Post ID to get user and channel info
}

/**
 * File preview modal following Mattermost's exact implementation pattern
 * Uses getFilePreviewUrl for previews and supports navigation between files
 */
export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  fileIds,
  startIndex = 0,
  open,
  onClose,
  postId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [fileIndex, setFileIndex] = useState(startIndex);

  // Reset index when modal opens
  useEffect(() => {
    if (open) {
      setFileIndex(startIndex);
    }
  }, [open, startIndex]);

  const currentFileId = fileIds[fileIndex];
  const fileInfo = useAppSelector(state => 
    currentFileId ? selectFileInfoById(state, currentFileId) : null
  );
  
  // Get post, user, and channel information
  const post = useAppSelector(state => selectPostById(state, postId));
  const user = useAppSelector(state => 
    post?.user_id ? selectUserById(post.user_id)(state) : null
  );
  const channel = useAppSelector(state => 
    post?.channel_id ? selectChannelById(state, post.channel_id) : null
  );

  // Navigation state
  const canNavigatePrevious = fileIndex > 0;
  const canNavigateNext = fileIndex < fileIds.length - 1;
  const showNavigation = fileIds.length > 1;

  // Handle keyboard navigation (Mattermost pattern)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case 'ArrowLeft':
          navigateToPrevious();
          break;
        case 'ArrowRight':
          navigateToNext();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [open, fileIndex, fileIds.length, onClose]);

  const navigateToPrevious = useCallback(() => {
    if (canNavigatePrevious) {
      setFileIndex(prev => prev - 1);
    }
  }, [canNavigatePrevious]);

  const navigateToNext = useCallback(() => {
    if (canNavigateNext) {
      setFileIndex(prev => prev + 1);
    }
  }, [canNavigateNext]);

  const handleNavigatePreviousClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent modal close
    navigateToPrevious();
  }, [navigateToPrevious]);

  const handleNavigateNextClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent modal close
    navigateToNext();
  }, [navigateToNext]);

  const renderFilePreview = () => {
    if (!fileInfo || !currentFileId) {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%',
          width: '100%'
        }}
        >
          <CircularProgress size={48} />
        </Box>
      );
    }

    const { mime_type, name, update_at } = fileInfo;

    // Image preview (using Mattermost's URL pattern)
    if (mime_type.startsWith('image/')) {
      // Use getFilePreviewUrl for thumbnails/previews, getFileUrl for full resolution
      const previewUrl = client.getFilePreviewUrl(currentFileId, update_at);
      const fullUrl = client.getFileUrl(currentFileId, update_at);
      
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          p: 2
        }}>
          <ImagePreview
            src={fullUrl}
            alt={name}
            fallbackSrc={previewUrl}
            onContentClick={(e) => e.stopPropagation()}
          />
        </Box>
      );
    }

    // Audio/Video preview
    if (mime_type.startsWith('video/') || mime_type.startsWith('audio/')) {
      const mediaUrl = client.getFileUrl(currentFileId, update_at);
      return (
        <AudioVideoPreview
          fileUrl={mediaUrl}
          fileName={name}
          fileSize={fileInfo.size}
          mimeType={mime_type}
          fileId={currentFileId}
          onContentClick={(e) => e.stopPropagation()}
        />
      );
    }

    // PDF preview - Use canvas rendering like Mattermost
    if (mime_type === 'application/pdf') {
      const pdfUrl = client.getFileUrl(currentFileId, update_at);
      
      return (
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          width: '100%',
          p: 2
        }}>
          <PDFPreview
            fileUrl={pdfUrl}
            fileName={name}
            fileSize={fileInfo.size}
            onContentClick={(e) => e.stopPropagation()}
          />
        </Box>
      );
    }

    // Fallback for unsupported file types (following Mattermost pattern)
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100%',
        width: '100%',
        p: 4,
      }}>
        {/* Centered white square with content */}
        <Box
          sx={{
            backgroundColor: 'white',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            maxWidth: 400,
            width: '100%',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Typography variant="h5" gutterBottom sx={{ color: 'text.primary', mb: 2 }}>
            {name}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1 }}>
            Preview not available for this file type
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled', mb: 3 }}>
            File size: {fileInfo.size ? formatFileSize(fileInfo.size) : 'Unknown'}
          </Typography>
          <FileDownloadButton fileId={currentFileId} size="large" />
        </Box>
      </Box>
    );
  };

  if (!currentFileId || !fileInfo) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent) => {
    // Close modal when clicking on backdrop area
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      fullScreen
      slotProps={{
        paper: {
          sx: {
            margin: 0,
            maxHeight: '100vh',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.4)', // More transparent background
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column'
          }
        },
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.3)' // More transparent backdrop
          }
        }
      }}
    >
      {/* Header - User avatar, file info, and actions */}
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        py: 2,
        px: 2,
        borderBottom: 1,
        borderColor: 'divider',
        height: '10vh', // 10% of viewport height
        minHeight: '10vh',
        backgroundColor: 'rgba(255, 255, 255, 0.95)', // Semi-transparent white header
        backdropFilter: 'blur(8px)',
        flexShrink: 0 // Prevent header from shrinking
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', flex: 1, mr: 2 }}>
          {/* User Avatar */}
          {user && (
            <Box sx={{ mr: 2, flexShrink: 0 }}>
              <UserAvatar
                userId={user.id}
                size="small"
              />
            </Box>
          )}
          
          {/* File and user info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* File name and size */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                mr: 1
              }}>
                {fileInfo.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                - {formatFileSize(fileInfo.size || 0)}
              </Typography>
            </Box>
            
            {/* Shared by user in channel */}
            {user && channel && (
              <Typography variant="body2" color="text.secondary">
                {user ? displayUsername(user, "full_name_nickname", true) : 'Unknown User'} shared in {channel.computedDisplayName || channel.display_name}
              </Typography>
            )}
          </Box>
        </Box>
        
        {/* Right side - Actions and navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {/* File Action Buttons */}
          <FileActionButtons
            fileId={currentFileId}
            size="small"
            showPublicLink={true}
            showDownload={true}
          />
          
          {/* Navigation controls */}
          {showNavigation && (
            <>
              <IconButton 
                onClick={navigateToPrevious} 
                disabled={!canNavigatePrevious}
                size="small"
                sx={{ color: !canNavigatePrevious ? 'text.disabled' : 'text.primary' }}
              >
                <PrevIcon />
              </IconButton>
              <Typography variant="body2" color="text.secondary" sx={{ mx: 1 }}>
                {fileIndex + 1} / {fileIds.length}
              </Typography>
              <IconButton 
                onClick={navigateToNext} 
                disabled={!canNavigateNext}
                size="small"
                sx={{ color: !canNavigateNext ? 'text.disabled' : 'text.primary' }}
              >
                <NextIcon />
              </IconButton>
            </>
          )}
          
          {/* Close button */}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Body - File content */}
      <Box sx={{ 
        p: 0, 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'transparent', // Transparent to show the backdrop
        height: '90vh', // 90% of viewport height
        flex: 1,
        cursor: 'pointer' // Indicate clickable area
      }}
      onClick={handleBackdropClick} // Allow clicking on content area to close
      >
        {renderFilePreview()}
        
        {/* Desktop navigation overlay */}
        {!isMobile && showNavigation && (
          <>
            {canNavigatePrevious && (
              <IconButton
                onClick={handleNavigatePreviousClick}
                sx={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: 'text.primary',
                  backdropFilter: 'blur(8px)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 1)',
                  },
                  zIndex: 10,
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                }}
              >
                <PrevIcon />
              </IconButton>
            )}
            
            {canNavigateNext && (
              <IconButton
                onClick={handleNavigateNextClick}
                sx={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: 'text.primary',
                  backdropFilter: 'blur(8px)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 1)',
                  },
                  zIndex: 10,
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                }}
              >
                <NextIcon />
              </IconButton>
            )}
          </>
        )}
      </Box>
    </Dialog>
  );
};

export default FilePreviewModal;