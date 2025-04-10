// src/components/MessageComposer/AttachmentPreview.tsx
import React, { useState, useEffect } from "react";
import { useMattermost } from "../../context/MattermostProvider";

// Material-UI Components
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  SxProps,
  Theme,
  alpha,
  CircularProgress,
  Paper,
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
  BrokenImage as ErrorIcon,
} from "@mui/icons-material";

/**
 * Interface representing a file that has been uploaded to Mattermost
 */
export interface MattermostFile {
  /** Mattermost file ID */
  id: string;
  /** File name */
  name: string;
  /** File type/mime-type */
  type?: string;
  /** File size in bytes */
  size?: number;
  /** URL to the file (if available) */
  url?: string;
}

/**
 * Props for the AttachmentPreview component
 */
export interface AttachmentPreviewProps {
  /** The file to preview - either a local File object or a Mattermost file info */
  file: File | MattermostFile;

  /** Callback when removing the attachment */
  onRemove?: () => void;

  /** Whether the file has already been uploaded to Mattermost */
  isUploaded?: boolean;

  /** Whether to show a loading indicator (for in-progress uploads) */
  isUploading?: boolean;

  /** Material-UI sx prop for additional styling */
  sx?: SxProps<Theme>;
}

/**
 * A component that displays a preview of a file attachment
 * Supports both local files and files that have been uploaded to Mattermost
 */
const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  file,
  onRemove,
  isUploaded = false,
  isUploading = false,
  sx,
}) => {
  const { service } = useMattermost();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState<boolean>(false);

  // Get base URL of the Mattermost server
  const baseUrl = service?.getBaseUrl?.() || "";

  // Determine if we have a File object or a MattermostFile object
  const isLocalFile = !isUploaded && file instanceof File;
  const mattermostFile = isUploaded ? (file as MattermostFile) : null;

  // Get file properties regardless of type
  const fileName = isLocalFile
    ? (file as File).name
    : (file as MattermostFile).name;
  const fileType = isLocalFile
    ? (file as File).type
    : (file as MattermostFile).type || "";
  const fileSize = isLocalFile
    ? (file as File).size
    : (file as MattermostFile).size || 0;

  // Get appropriate icon based on file type
  const getFileIcon = () => {
    // Check if it's a PDF - return specific PDF icon
    if (fileType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf")) {
      return <PdfIcon fontSize="small" color="primary" />;
    }

    // For other file types
    if (
      fileType.includes("image") ||
      fileName.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)
    ) {
      return <ImageIcon fontSize="small" />;
    } else if (
      fileType.includes("video") ||
      fileName.match(/\.(mp4|mov|avi|webm)$/i)
    ) {
      return <VideoIcon fontSize="small" />;
    } else if (
      fileType.includes("audio") ||
      fileName.match(/\.(mp3|wav|ogg|flac)$/i)
    ) {
      return <AudioIcon fontSize="small" />;
    } else if (fileName.match(/\.(txt|md|rtf|doc|docx)$/i)) {
      return <TextIcon fontSize="small" />;
    } else if (
      fileName.match(/\.(js|jsx|ts|tsx|html|css|java|py|c|cpp|php|rb)$/i)
    ) {
      return <CodeIcon fontSize="small" />;
    } else {
      return <FileIcon fontSize="small" />;
    }
  };

  // Format file size
  const formatFileSize = (): string => {
    const bytes = fileSize;
    if (!bytes) return "";

    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
  };

  // Generate thumbnail URL based on file type and upload status
  useEffect(() => {
    const generateThumbnailUrl = async () => {
      try {
        // Reset error state
        setThumbnailError(false);

        // For PDF files, use the static SVG icon regardless of upload status
        if (
          fileType.includes("pdf") ||
          fileName.toLowerCase().endsWith(".pdf")
        ) {
          setThumbnailUrl(`${baseUrl}/static/files/00301d72e07c55d59df5.svg`);
          return;
        }

        // For images that have been uploaded to Mattermost, use the thumbnail API
        if (isUploaded && mattermostFile?.id) {
          setThumbnailUrl(
            `${baseUrl}/api/v4/files/${mattermostFile.id}/thumbnail`,
          );
          return;
        }

        // For local image files, create a local object URL
        if (isLocalFile && fileType.includes("image")) {
          const localUrl = URL.createObjectURL(file as File);
          setThumbnailUrl(localUrl);
          return;
        }

        // For other file types, don't set a thumbnail URL
        setThumbnailUrl(null);
      } catch (error) {
        console.error("Error generating thumbnail URL:", error);
        setThumbnailError(true);
        setThumbnailUrl(null);
      }
    };

    void generateThumbnailUrl();

    // Clean up object URL on unmount
    return () => {
      if (thumbnailUrl && isLocalFile && fileType.includes("image")) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [
    file,
    isUploaded,
    baseUrl,
    mattermostFile,
    isLocalFile,
    fileType,
    fileName,
  ]);
  console.debug("thumbnailUrl", fileName, thumbnailUrl);
  return (
    <Paper
      elevation={1}
      sx={{
        display: "flex",
        alignItems: "center",
        p: 1,
        borderRadius: 1,
        bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
        border: "1px solid",
        borderColor: "divider",
        position: "relative",
        minWidth: 200,
        maxWidth: 300,
        ...sx,
      }}
    >
      {/* Thumbnail or icon */}
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
            mr: 1,
          }}
          onError={() => setThumbnailError(true)}
        />
      ) : (
        <Box
          sx={{ mr: 1, color: thumbnailError ? "error.main" : "primary.main" }}
        >
          {thumbnailError ? <ErrorIcon /> : getFileIcon()}
        </Box>
      )}

      {/* File info */}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          component={"div"}
          variant="body2"
          noWrap
          title={fileName}
          sx={{ fontWeight: 500 }}
        >
          {fileName}
        </Typography>

        <Typography component={"div"} variant="caption" color="text.secondary">
          {formatFileSize()}
          {isUploading && (
            <Box
              component="span"
              sx={{ ml: 1, display: "inline-flex", alignItems: "center" }}
            >
              <CircularProgress size={10} sx={{ mr: 0.5 }} />
              Uploading...
            </Box>
          )}
        </Typography>
      </Box>

      {/* Remove button */}
      {onRemove && !isUploading && (
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

      {/* Loading indicator */}
      {isUploading && (
        <CircularProgress
          size={24}
          sx={{
            position: "absolute",
            top: -12,
            right: -12,
            bgcolor: "background.paper",
            borderRadius: "50%",
            p: 0.5,
          }}
        />
      )}
    </Paper>
  );
};

export default AttachmentPreview;
