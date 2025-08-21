/**
 * Image preview component with fallback and error handling
 * Provides responsive image display with click events and loading states
 */
import React, { useState, useEffect } from "react";
import { Box, useTheme, CircularProgress } from "@mui/material";
import { imageService } from "../../services/imageService";

export interface ImagePreviewProps {
  fileId: string;
  alt: string;
  updateAt?: number;
  onContentClick?: (e: React.MouseEvent) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  fileId,
  alt,
  updateAt,
  onContentClick,
}) => {
  const theme = useTheme();
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [fullUrl, setFullUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const loadUrls = async () => {
      setLoading(true);
      setError(false);
      try {
        const [preview, full] = await Promise.all([
          imageService.getFilePreview(fileId, updateAt),
          imageService.getFileUrl(fileId, updateAt)
        ]);
        setPreviewUrl(preview);
        setFullUrl(full);
      } catch (err) {
        console.error('Failed to load image URLs:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadUrls();

    return () => {
      if (previewUrl.startsWith('blob:')) imageService.revokeBlobUrl(previewUrl);
      if (fullUrl.startsWith('blob:')) imageService.revokeBlobUrl(fullUrl);
    };
  }, [fileId, updateAt]);

  const handleError = (e: any) => {
    // Fallback to preview URL if full image fails
    if (previewUrl) {
      const target = e.target as HTMLImageElement;
      if (target.src !== previewUrl) {
        target.src = previewUrl;
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '200px',
        width: '200px'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !fullUrl) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '200px',
        width: '200px',
        bgcolor: 'grey.100',
        color: 'text.secondary'
      }}>
        Failed to load image
      </Box>
    );
  }
  return (
    <Box
      onClick={onContentClick}
      sx={{
        position: "relative",
        display: "inline-block", // So the div matches exactly the image size
        maxWidth: "90%",
        maxHeight: "90%",
        borderRadius: theme.shape.borderRadius,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        backgroundColor: "rgba(255, 255, 255, 0.15)",
      }}
    >
      <img
        src={fullUrl}
        alt={alt}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          borderRadius: theme.shape.borderRadius,
          display: "block", // Avoid spaces at bottom of image
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
        onError={handleError}
      />
    </Box>
  );
};

export default ImagePreview;
