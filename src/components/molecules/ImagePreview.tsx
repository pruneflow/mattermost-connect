/**
 * Image preview component with fallback and error handling
 * Provides responsive image display with click events and loading states
 */
import React from "react";
import { Box, useTheme } from "@mui/material";

export interface ImagePreviewProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  onContentClick?: (e: React.MouseEvent) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  src,
  alt,
  fallbackSrc,
  onContentClick,
}) => {
  const theme = useTheme();
  const handleError = (e: any) => {
    // Fallback to preview URL if full image fails
    if (fallbackSrc) {
      const target = e.target as HTMLImageElement;
      if (target.src !== fallbackSrc) {
        target.src = fallbackSrc;
      }
    }
  };
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
        src={src}
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
