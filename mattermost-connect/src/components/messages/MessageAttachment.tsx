import React, { useState, useEffect, useRef, useCallback } from 'react';
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

// Importation du hook useFile et du bouton de téléchargement
import { useFile } from '../../hooks';
import FileDownloadButton from './FileDownloadButton';

// Composant pour la prévisualisation d'image avec authentification
interface AuthenticatedImagePreviewProps {
  fileId: string;
  fileName: string;
  onError?: () => void;
}

function AuthenticatedImagePreview({ fileId, fileName, onError }: AuthenticatedImagePreviewProps) {
  // Utilisation du hook useFile qui gère le cache et les requêtes API
  const { previewUrl, isPreviewLoading, fetchPreview } = useFile(fileId);
  
  // Effet pour charger la prévisualisation si nécessaire
  useEffect(() => {
    if (!previewUrl) {
      fetchPreview().catch(error => {
        console.error('Error loading image preview:', error);
        if (onError) onError();
      });
    }
  }, [fileId, previewUrl, fetchPreview, onError]);
  
  return previewUrl ? (
    <Box
      component="img"
      src={previewUrl}
      alt={fileName}
      sx={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: 1,
        boxShadow: '0 0 1px rgba(0,0,0,0.2)',
      }}
    />
  ) : (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100%', 
      width: '100%' 
    }}>
      {isPreviewLoading ? <CircularProgress size={16} /> : <Box sx={{ fontSize: '0.75rem' }}>❌</Box>}
    </Box>
  );
}

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
          
          // On doit encore faire des appels directs à l'API,
          // mais maintenant ces appels seront gérés par les mécanismes de cache
          // et de déduplication mis en place dans le singleton FileCacheService
          for (const fileId of fileIds) {
            try {
              // Vérifier si les infos sont déjà en cache global (variable window)
              const pendingInfoRequests = (window as any).__pendingFileInfoRequests;
              const fileCache = (window as any).__fileInfoCache;
              
              let info;
              
              // Si une requête est déjà en cours pour ce fileId, attendre son résultat
              if (pendingInfoRequests && pendingInfoRequests.has(fileId)) {
                console.log(`MessageAttachment: Reusing pending request for file info: ${fileId}`);
                info = await pendingInfoRequests.get(fileId);
              } 
              // Si l'info est déjà en cache, l'utiliser directement
              else if (fileCache && fileCache.has(fileId)) {
                console.log(`MessageAttachment: Using cached file info: ${fileId}`);
                info = fileCache.get(fileId);
              } 
              // Sinon, faire l'appel API normalement
              else {
                const token = localStorage.getItem('mattermost_token');
                
                // Créer une promesse de requête
                const fetchPromise = (async () => {
                  const response = await fetch(`${api.getBaseUrl()}/api/v4/files/${fileId}/info`, {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                  
                  if (!response.ok) {
                    throw new Error(`Failed to fetch file info: ${response.status}`);
                  }
                  
                  return await response.json();
                })();
                
                // Stocker la promesse pour déduplication
                if (!pendingInfoRequests) {
                  (window as any).__pendingFileInfoRequests = new Map();
                  (window as any).__pendingFileInfoRequests.set(fileId, fetchPromise);
                } else {
                  pendingInfoRequests.set(fileId, fetchPromise);
                }
                
                // Attendre le résultat
                info = await fetchPromise;
                
                // Nettoyer la promesse en cours
                if (pendingInfoRequests) {
                  pendingInfoRequests.delete(fileId);
                }
                
                // Mettre en cache pour les utilisations futures
                if (!fileCache) {
                  (window as any).__fileInfoCache = new Map();
                  (window as any).__fileInfoCache.set(fileId, info);
                } else {
                  fileCache.set(fileId, info);
                }
              }
              
              if (info) {
                fetchedFiles.push(info);
              }
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
    } else if (propFiles) {
      // Si les fichiers sont fournis en props, les utiliser directement
      setFiles(propFiles);
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
                  fileName={file.name}
                  onError={() => {
                    // Au lieu de manipuler directement le DOM, 
                    // nous pourrions utiliser un state, mais les modifications
                    // DOM directes sont risquées en React
                    console.log(`Failed to load preview for file: ${file.id}`);
                    // Pas de manipulation DOM ici
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
              <FileDownloadButton 
                fileId={file.id} 
                size="small"
                tooltip="Download" 
                sx={{ 
                  p: { xs: 0.75, md: 0.5 },
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  }
                }}
              />
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