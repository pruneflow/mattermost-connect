/**
 * File preview modal header component
 * Shows user info, file details, and action buttons
 */
import React from 'react';
import {
  DialogTitle,
  IconButton,
  Box,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Close as CloseIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
} from '@mui/icons-material';
import { UserAvatar } from '../atoms/UserAvatar';
import { formatFileSize } from '../../utils/formatters';
import { displayUsername } from '../../utils/userUtils';
import FileActionButtons from './FileActionButtons';
import { User, EnrichedChannel, FileInfo } from '../../api/types';

interface FilePreviewHeaderProps {
  fileInfo: FileInfo | null;
  user: User | null;
  channel: EnrichedChannel | null;
  currentFileId: string;
  showNavigation: boolean;
  canNavigatePrevious: boolean;
  canNavigateNext: boolean;
  fileIndex: number;
  totalFiles: number;
  onClose: () => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
}

export const FilePreviewHeader: React.FC<FilePreviewHeaderProps> = ({
  fileInfo,
  user,
  channel,
  currentFileId,
  showNavigation,
  canNavigatePrevious,
  canNavigateNext,
  fileIndex,
  totalFiles,
  onClose,
  onNavigatePrevious,
  onNavigateNext,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!fileInfo) return null;

  if (isMobile) {
    return (
      <DialogTitle sx={{
        display: 'flex',
        flexDirection: 'column',
        py: 2,
        px: 2,
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        flexShrink: 0
      }}>
        {/* Première ligne : Avatar + nom fichier + bouton fermeture */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {/* User Avatar */}
          {user && (
            <Box sx={{ mr: 2, flexShrink: 0 }}>
              <UserAvatar
                userId={user.id}
                size="small"
              />
            </Box>
          )}
          
          {/* File name */}
          <Typography variant="h6" sx={{ 
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1
          }}>
            {fileInfo.name}
          </Typography>
          
          {/* Close button */}
          <IconButton onClick={onClose} size="small" sx={{ ml: 1 }}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        {/* Deuxième ligne : taille - "User shared in channel" */}
        <Box sx={{ display: 'flex', alignItems: 'center', pl: user ? 6 : 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            {formatFileSize(fileInfo.size || 0)}
          </Typography>
          {user && channel && (
            <Typography variant="body2" color="text.secondary">
              - {displayUsername(user, "full_name_nickname", true)} shared in {channel.computedDisplayName || channel.display_name}
            </Typography>
          )}
        </Box>
      </DialogTitle>
    );
  }

  // Desktop layout (inchangé)
  return (
    <DialogTitle sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      py: 2,
      px: 2,
      borderBottom: 1,
      borderColor: 'divider',
      height: '10vh',
      minHeight: '10vh',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(8px)',
      flexShrink: 0
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
              onClick={onNavigatePrevious} 
              disabled={!canNavigatePrevious}
              size="small"
              sx={{ color: !canNavigatePrevious ? 'text.disabled' : 'text.primary' }}
            >
              <PrevIcon />
            </IconButton>
            <Typography variant="body2" color="text.secondary" sx={{ mx: 1 }}>
              {fileIndex + 1} / {totalFiles}
            </Typography>
            <IconButton 
              onClick={onNavigateNext} 
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
  );
};