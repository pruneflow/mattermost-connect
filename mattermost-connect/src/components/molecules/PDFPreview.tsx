/**
 * PDF preview component using react-pdf-viewer
 * Displays PDF files with toolbar, navigation, and authentication
 */
import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { imageService } from '../../services/imageService';

// Core viewer and worker
import { Viewer, Worker } from '@react-pdf-viewer/core';

// Plugins
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

export interface PDFPreviewProps {
  fileId: string;
  fileName: string;
  fileSize?: number;
  updateAt?: number;
  onContentClick?: (e: React.MouseEvent) => void;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({
  fileId,
  fileName,
  fileSize,
  updateAt,
  onContentClick
}) => {
  const [fileUrl, setFileUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  
  // Create plugin instance at the top level to avoid hooks order issues
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    const loadUrl = async () => {
      setLoading(true);
      setError(false);
      try {
        const url = await imageService.getFileUrl(fileId, updateAt);
        setFileUrl(url);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadUrl();

    return () => {
      if (fileUrl.startsWith('blob:')) {
        imageService.revokeBlobUrl(fileUrl);
      }
    };
  }, [fileId, updateAt]);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '400px'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !fileUrl) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '400px',
        bgcolor: 'grey.100',
        color: 'text.secondary'
      }}>
        Failed to load PDF
      </Box>
    );
  }


  return (
    <Box
      onClick={onContentClick}
      sx={{
        position: 'relative',
        display: 'inline-block',
        backgroundColor: 'white',
        borderRadius: 1,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        width: '90vw',
        height: '80vh',
        maxWidth: '90vw',
        maxHeight: '80vh',
      }}
    >
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
        <Viewer
          fileUrl={fileUrl}
          plugins={[defaultLayoutPluginInstance]}
          withCredentials={true}
          httpHeaders={{
            'Authorization': `Bearer ${localStorage.getItem('mattermostToken') || ''}`,
          }}
        />
      </Worker>
    </Box>
  );
};

export default PDFPreview;