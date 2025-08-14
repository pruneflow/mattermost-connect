/**
 * PDF preview component using react-pdf-viewer
 * Displays PDF files with toolbar, navigation, and authentication
 */
import React from 'react';
import { Box } from '@mui/material';

// Core viewer and worker
import { Viewer, Worker } from '@react-pdf-viewer/core';

// Plugins
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

export interface PDFPreviewProps {
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  onContentClick?: (e: React.MouseEvent) => void;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({
  fileUrl,
  fileName,
  fileSize,
  onContentClick
}) => {
  // Create plugin instance like in the official docs
  const defaultLayoutPluginInstance = defaultLayoutPlugin();


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