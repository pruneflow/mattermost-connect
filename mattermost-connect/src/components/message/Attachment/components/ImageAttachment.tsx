// src/components/Attachment/attachments/ImageAttachment.tsx
import React from "react";
import { alpha, Box } from "@mui/material";
import { ImageAttachmentProps } from "../types/AttachmentTypes";
import { Error as ErrorIcon, Image as ImageIcon } from "@mui/icons-material";

/**
 * Component for displaying image attachments
 */
const ImageAttachment: React.FC<ImageAttachmentProps> = ({
  thumbnailUrl,
  thumbnailError,
  setThumbnailError,
  fileName,
  onImageClick,
  sx,
}) => {
  return (
    <>
      {thumbnailUrl && !thumbnailError ? (
        <Box
          component="img"
          src={thumbnailUrl}
          alt={fileName}
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            objectFit: "cover",
            mr: 1.5,
            ...sx,
          }}
          onClick={onImageClick}
          onError={() => setThumbnailError(true)}
        />
      ) : (
        <Box
          sx={{
            mr: 1.5,
            color: thumbnailError ? "error.main" : "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 1,
            bgcolor: (theme) => alpha(theme.palette.action.hover, 0.5),
            ...sx,
          }}
        >
          {thumbnailError ? <ErrorIcon /> : <ImageIcon />}
        </Box>
      )}
    </>
  );
};

export default ImageAttachment;
