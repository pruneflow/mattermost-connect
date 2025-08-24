/**
 * File preview modal footer component
 * Shows action buttons (public link, download) and navigation on mobile only
 */
import React from 'react';
import {
  Box,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
} from '@mui/icons-material';
import FileActionButtons from './FileActionButtons';

interface FilePreviewFooterProps {
  currentFileId: string;
  showNavigation?: boolean;
  canNavigatePrevious?: boolean;
  canNavigateNext?: boolean;
  fileIndex?: number;
  totalFiles?: number;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
}

export const FilePreviewFooter: React.FC<FilePreviewFooterProps> = ({
  currentFileId,
  showNavigation = false,
  canNavigatePrevious = false,
  canNavigateNext = false,
  fileIndex = 0,
  totalFiles = 1,
  onNavigatePrevious,
  onNavigateNext,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Only show footer on mobile
  if (!isMobile) {
    return null;
  }

  return (
    <Box sx={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      py: 2,
      px: 2,
      borderTop: 1,
      borderColor: 'divider',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      zIndex: 1300, // Same as Dialog zIndex
      minHeight: '80px', // Minimum height for consistent layout
      flexShrink: 0
    }}>
      {/* Navigation et boutons d'action */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        width: '100%',
        justifyContent: 'center'
      }}>
        {/* Navigation gauche */}
        {showNavigation && (
          <IconButton 
            onClick={onNavigatePrevious} 
            disabled={!canNavigatePrevious}
            size="medium"
            sx={{ 
              color: !canNavigatePrevious ? 'text.disabled' : 'text.primary'
            }}
          >
            <PrevIcon />
          </IconButton>
        )}
        
        {/* Boutons d'action */}
        <FileActionButtons
          fileId={currentFileId}
          size="medium"
          showPublicLink={true}
          showDownload={true}
        />
        
        {/* Navigation droite */}
        {showNavigation && (
          <IconButton 
            onClick={onNavigateNext} 
            disabled={!canNavigateNext}
            size="medium"
            sx={{ 
              color: !canNavigateNext ? 'text.disabled' : 'text.primary'
            }}
          >
            <NextIcon />
          </IconButton>
        )}
      </Box>
      
      {/* Compteur de pages */}
      {showNavigation && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {fileIndex + 1} / {totalFiles}
        </Typography>
      )}
    </Box>
  );
};