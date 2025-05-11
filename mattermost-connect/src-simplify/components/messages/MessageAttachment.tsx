import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Download as DownloadIcon,
  FileCopy as FileCopyIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as TextIcon,
  Code as CodeIcon,
  VideoLibrary as VideoIcon,
  AudioFile as AudioIcon
} from '@mui/icons-material';
import { FileInfo } from '../../api/types';
import { formatFileSize } from '../../utils/formatters';
import { api } from '../../api/client';

export interface MessageAttachmentProps {
  fileIds: string[];
  files?: FileInfo[];
}

export function MessageAttachment({ fileIds, files: propFiles }: MessageAttachmentProps) {
  const [files, setFiles] = useState<FileInfo[]>(propFiles || []);
  const [loading, setLoading] = useState<boolean>(!propFiles && fileIds.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');

  // Fetch file info if not provided as props
  useEffect(() => {
    if (!propFiles && fileIds.length > 0) {
      const fetchFiles = async () => {
        setLoading(true);
        setError(null);
        
        try {
          const fetchedFiles: FileInfo[] = [];
          
          // Fetch each file info
          for (const fileId of fileIds) {
            try {
              const response = await api.get<FileInfo>(`files/${fileId}/info`);
              fetchedFiles.push(response.data);
            } catch (err) {
              console.error(`Failed to fetch file info for ${fileId}:`, err);
              // Continue with other files even if one fails
            }
          }
          
          setFiles(fetchedFiles);
        } catch (err) {
          console.error('Failed to fetch file info:', err);
          setError('Failed to load file attachments');
        } finally {
          setLoading(false);
        }
      };
      
      void fetchFiles();
    }
  }, [fileIds, propFiles]);

  // Handle download
  const handleDownload = (fileId: string, fileName: string) => {
    // Get the base URL and add the file path
    const baseUrl = api.getBaseUrl();
    const token = localStorage.getItem('mattermost_token');
    
    // Create the complete download URL with auth token and force download parameter
    const downloadUrl = `${baseUrl}/api/v4/files/${fileId}`;
    
    // For better download handling we'll use a direct XHR request
    // This ensures proper file downloads even for images
    const xhr = new XMLHttpRequest();
    xhr.open('GET', downloadUrl, true);
    xhr.responseType = 'blob';
    
    // Add the auth token if available
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    
    xhr.onload = function() {
      if (this.status === 200) {
        // Create a blob URL from the response
        const blob = new Blob([this.response]);
        const url = window.URL.createObjectURL(blob);
        
        // Create a link element and trigger download
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Failed to download file:', this.status);
      }
    };
    
    xhr.onerror = function() {
      console.error('XHR error during file download');
    };
    
    xhr.send();
  };

  // Handle copy link
  const handleCopyLink = (fileId: string) => {
    const fileUrl = `${api.getBaseUrl()}/api/v4/files/${fileId}`;
    
    void navigator.clipboard.writeText(fileUrl)
      .then(() => {
        setSnackbarMessage('Link copied to clipboard');
        setSnackbarOpen(true);
      })
      .catch((err) => {
        console.error('Failed to copy link:', err);
        setSnackbarMessage('Failed to copy link');
        setSnackbarOpen(true);
      });
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Get appropriate icon based on file type
  const getFileIcon = (mimeType: string) => {
    const baseUrl = api.getBaseUrl();

    if (mimeType.startsWith('image/')) {
      return <ImageIcon fontSize="small" />;
    } else if (mimeType === 'application/pdf') {
      return (
        <Box
          component="img"
          src={`${baseUrl}/static/files/00301d72e07c55d59df5.svg`}
          alt="PDF file"
          sx={{ width: 20, height: 20 }}
        />
      );
    } else if (
      mimeType.startsWith('text/') ||
      mimeType.includes('javascript') ||
      mimeType.includes('json') ||
      mimeType.includes('xml') ||
      mimeType.includes('html') ||
      mimeType.includes('document') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation') ||
      mimeType.includes('ms-') ||
      mimeType.includes('office') ||
      mimeType.includes('archive') ||
      mimeType.includes('zip') ||
      mimeType.includes('rar')
    ) {
      return (
        <Box
          component="img"
          src={`${baseUrl}/static/files/48c8ed225ff4a2f7a4c1.svg`}
          alt="Document file"
          sx={{ width: 20, height: 20 }}
        />
      );
    } else if (mimeType.startsWith('video/')) {
      return <VideoIcon fontSize="small" />;
    } else if (mimeType.startsWith('audio/')) {
      return <AudioIcon fontSize="small" />;
    } else {
      return <FileIcon fontSize="small" />;
    }
  };

  // Function to determine if a file should be displayed as an image
  const isDisplayableImage = (mimeType: string): boolean => {
    return mimeType.startsWith('image/') && 
           !mimeType.includes('svg') && 
           !mimeType.includes('icon') &&
           !mimeType.includes('webp');
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
        <CircularProgress size={18} sx={{ mr: 1 }} />
        <Typography variant="caption">Loading attachments...</Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 1, color: 'error.main' }}>
        <Typography variant="caption">{error}</Typography>
      </Box>
    );
  }

  // No files
  if (files.length === 0) {
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
        {files.map((file) => (
          <Paper
            key={file.id}
            elevation={0}
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
              '&:hover': {
                borderColor: 'primary.light',
                backgroundColor: 'background.paper',
              },
            }}
          >
            {/* File icon/preview */}
            <Box
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
                <Box
                  component="img"
                  src={`${api.getBaseUrl()}/api/v4/files/${file.id}/preview`}
                  alt={file.name}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 1,
                    boxShadow: '0 0 1px rgba(0,0,0,0.2)',
                  }}
                  onError={(e) => {
                    // If image preview fails, show generic icon
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%;">${getFileIcon(file.mime_type)}</div>`;
                  }}
                />
              ) : (
                <Box sx={{ fontSize: { xs: '1.25rem', md: '1.1rem' } }}>
                  {getFileIcon(file.mime_type)}
                </Box>
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
            <Box sx={{ 
              display: 'flex', 
              ml: 1, 
              flexShrink: 0,
              gap: { xs: 1, md: 0.5 } 
            }}>
              <Tooltip title="Copy Link">
                <IconButton 
                  size="small" 
                  onClick={() => handleCopyLink(file.id)}
                  aria-label="copy file link"
                  sx={{ 
                    p: { xs: 0.75, md: 0.5 },
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    }
                  }}
                >
                  <FileCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download">
                <IconButton 
                  size="small" 
                  onClick={() => handleDownload(file.id, file.name)}
                  aria-label="download file"
                  sx={{ 
                    p: { xs: 0.75, md: 0.5 },
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    }
                  }}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ 
          vertical: 'bottom', 
          horizontal: 'center' 
        }}
        sx={{
          bottom: { xs: 16, sm: 24 }
        }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity="success" 
          variant="filled"
          sx={{ 
            width: '100%',
            boxShadow: 2 
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default MessageAttachment;