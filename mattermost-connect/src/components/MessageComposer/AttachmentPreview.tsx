// src/components/MessageComposer/AttachmentPreview.tsx
import React from "react";

// Material-UI Components
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  SxProps,
  Theme,
  alpha,
} from "@mui/material";

// Material-UI Icons
import {
  Close as CloseIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Code as CodeIcon,
  Description as TextIcon,
  VideoFile as VideoIcon,
  MusicNote as AudioIcon,
} from "@mui/icons-material";

/**
 * Props for the AttachmentPreview component
 */
export interface AttachmentPreviewProps {
  /** The file to preview */
  file: File;

  /** Callback when removing the attachment */
  onRemove?: () => void;

  /** Material-UI sx prop for additional styling */
  sx?: SxProps<Theme>;
}

/**
 * A component that displays a preview of a file attachment
 */
const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  file,
  onRemove,
  sx,
}) => {
  // Get appropriate icon based on file type
  const getFileIcon = () => {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    if (
      fileType.includes("image") ||
      fileName.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)
    ) {
      return <ImageIcon fontSize="small" />;
    } else if (fileType.includes("pdf") || fileName.endsWith(".pdf")) {
      return <PdfIcon fontSize="small" />;
    } else if (
      fileType.includes("video") ||
      fileName.match(/\.(mp4|mov|avi|webm)$/)
    ) {
      return <VideoIcon fontSize="small" />;
    } else if (
      fileType.includes("audio") ||
      fileName.match(/\.(mp3|wav|ogg|flac)$/)
    ) {
      return <AudioIcon fontSize="small" />;
    } else if (fileName.match(/\.(txt|md|rtf|doc|docx)$/)) {
      return <TextIcon fontSize="small" />;
    } else if (
      fileName.match(/\.(js|jsx|ts|tsx|html|css|java|py|c|cpp|php|rb)$/)
    ) {
      return <CodeIcon fontSize="small" />;
    } else {
      return <FileIcon fontSize="small" />;
    }
  };

  // Format file size
  const formatFileSize = (): string => {
    const bytes = file.size;
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
  };

  // Generate image thumbnail if it's an image
  const isImage = file.type.includes("image");
  const thumbnailUrl = isImage ? URL.createObjectURL(file) : null;

  // Clean up object URL on unmount
  React.useEffect(() => {
    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [thumbnailUrl]);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        p: 1,
        borderRadius: 1,
        bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
        border: "1px solid",
        borderColor: "divider",
        position: "relative",
        ...sx,
      }}
    >
      {/* Thumbnail or icon */}
      {isImage && thumbnailUrl ? (
        <Box
          component="img"
          src={thumbnailUrl}
          alt={file.name}
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            objectFit: "cover",
            mr: 1,
          }}
        />
      ) : (
        <Box sx={{ mr: 1, color: "primary.main" }}>{getFileIcon()}</Box>
      )}

      {/* File info */}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          component={"div"}
          variant="body2"
          noWrap
          title={file.name}
          sx={{ fontWeight: 500 }}
        >
          {file.name}
        </Typography>

        <Typography component={"div"} variant="caption" color="text.secondary">
          {formatFileSize()}
        </Typography>
      </Box>

      {/* Remove button */}
      {onRemove && (
        <Tooltip title="Remove">
          <IconButton
            size="small"
            onClick={onRemove}
            sx={{
              position: "absolute",
              top: -8,
              right: -8,
              bgcolor: "background.paper",
              boxShadow: 1,
              "&:hover": {
                bgcolor: "error.light",
                color: "error.contrastText",
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default AttachmentPreview;
