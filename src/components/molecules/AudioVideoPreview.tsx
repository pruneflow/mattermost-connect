/**
 * Audio and video preview component with responsive player controls
 * Provides media playback with download functionality following Mattermost patterns
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Box, Typography, useTheme, useMediaQuery, CircularProgress } from '@mui/material';
import { formatFileSize } from '../../utils/formatters';
import { FileDownloadButton } from './FileDownloadButton';
import { imageService } from '../../services/imageService';

// Constants similar to Mattermost
const WEB_VIDEO_WIDTH = 640;
const WEB_VIDEO_HEIGHT = 480;
const MOBILE_VIDEO_WIDTH = 320;
const MOBILE_VIDEO_HEIGHT = 240;

export interface AudioVideoPreviewProps {
  fileId: string;
  fileName: string;
  fileSize?: number;
  mimeType: string;
  updateAt?: number;
  onContentClick?: (e: React.MouseEvent) => void;
}

export const AudioVideoPreview: React.FC<AudioVideoPreviewProps> = ({
  fileId,
  fileName,
  fileSize,
  mimeType,
  updateAt,
  onContentClick
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [canPlay, setCanPlay] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string>('');

  useEffect(() => {
    const loadUrl = async () => {
      try {
        const url = await imageService.getFileUrl(fileId, updateAt);
        setFileUrl(url);
      } catch (error) {
        console.error('Failed to load media URL:', error);
        setCanPlay(false);
      }
    };

    loadUrl();

    return () => {
      if (fileUrl.startsWith('blob:')) {
        imageService.revokeBlobUrl(fileUrl);
      }
    };
  }, [fileId, updateAt]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isVideo = mimeType.startsWith('video/');
  const isAudio = mimeType.startsWith('audio/');

  const handleLoadError = useCallback(() => {
    setCanPlay(false);
    setIsLoading(false);
  }, [fileUrl]);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    setCanPlay(true);
  }, []);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stop = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      video.pause();
      video.currentTime = 0;
    }
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  // Reset when fileUrl changes
  useEffect(() => {
    setCanPlay(true);
    setIsLoading(true);
  }, [fileUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  if (!canPlay) {
    // Fallback to file info when can't play
    return (
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        width: '100%',
        p: 4,
        textAlign: 'center'
      }}
      onClick={onContentClick}
      >
        <Typography variant="h5" gutterBottom sx={{ color: 'white', mb: 2 }}>
          {fileName}
        </Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 1 }}>
          Unable to play {isVideo ? 'video' : 'audio'} file
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 3 }}>
          {fileSize ? `File size: ${formatFileSize(fileSize)}` : ''}
        </Typography>
        <FileDownloadButton fileId={fileId} size="large" />
      </Box>
    );
  }

  if (isVideo) {
    const width = isMobile ? MOBILE_VIDEO_WIDTH : WEB_VIDEO_WIDTH;
    const height = isMobile ? MOBILE_VIDEO_HEIGHT : WEB_VIDEO_HEIGHT;

    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100%',
        width: '100%',
        p: 2
      }}>
        <Box
          onClick={onContentClick}
          sx={{
            position: 'relative',
            display: 'inline-block',
            borderRadius: theme.shape.borderRadius,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
            backgroundColor: 'black'
          }}
        >
          <video
            key={fileId} // Force re-render when file changes
            ref={videoRef}
            controls
            preload="metadata"
            width={width}
            height={height}
            style={{
              maxWidth: '90vw',
              maxHeight: '80vh',
              borderRadius: theme.shape.borderRadius,
              display: 'block'
            }}
            onError={handleLoadError}
            onCanPlay={handleCanPlay}
            onLoadStart={handleLoadStart}
          >
            <source src={fileUrl} type={mimeType} />
            Your browser does not support the video tag.
          </video>
          
          {isLoading && (
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white'
            }}>
              <Typography variant="body2">Loading video...</Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  if (isAudio) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100%',
        width: '100%',
        p: 4,
        textAlign: 'center'
      }}
      onClick={onContentClick}
      >
        <Typography variant="h5" gutterBottom sx={{ color: 'white', mb: 4 }}>
          {fileName}
        </Typography>
        
        <Box sx={{
          display: 'inline-block',
          p: 3,
          borderRadius: theme.shape.borderRadius,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}>
          <audio 
            key={fileId} // Force re-render when file changes
            ref={audioRef}
            controls 
            preload="metadata"
            style={{ 
              width: '100%', 
              minWidth: '300px',
              maxWidth: '500px'
            }}
            onError={handleLoadError}
            onCanPlay={handleCanPlay}
            onLoadStart={handleLoadStart}
          >
            <source src={fileUrl} type={mimeType} />
            Your browser does not support the audio tag.
          </audio>
        </Box>
        
        {fileSize && (
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 2 }}>
            File size: {formatFileSize(fileSize)}
          </Typography>
        )}
      </Box>
    );
  }

  return null;
};

export default AudioVideoPreview;