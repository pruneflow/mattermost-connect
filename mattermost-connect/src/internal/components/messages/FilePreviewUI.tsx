// src/internal/components/messages/FilePreviewUI.tsx
/**
 * Component for previewing a file before upload or after attachment
 */
import React from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import {
  InsertDriveFile as FileIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Code as CodeIcon,
  Description as TextIcon,
  Archive as ArchiveIcon,
} from "@mui/icons-material";
import { FilePreviewProps } from "../../types/componentTypes";
import { MessageAttachment } from "../../../index";

const FilePreviewUI: React.FC<FilePreviewProps> = ({
  file,
  isUploading = false,
  progress = 0,
  onRemove,
  className,
  sx,
  id,
}) => {
  // Get file details based on whether it's a File or MessageAttachment
  const fileName = "name" in file ? file.name : file.name || "";
  const fileSize = "size" in file ? file.size : file.size || 0;
  const fileType = "type" in file ? file.type : file.type || "";
  const fileUrl = "url" in file ? file.url : undefined;

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
  };

  // Get file icon based on type
  const getFileIcon = () => {
    const type = fileType.toLowerCase();

    if (type.startsWith("image/")) {
      return <ImageIcon />;
    } else if (type.startsWith("video/")) {
      return <VideoIcon />;
    } else if (type.startsWith("audio/")) {
      return <AudioIcon />;
    } else if (type === "application/pdf") {
      return <PdfIcon />;
    } else if (type.includes("text/")) {
      return <TextIcon />;
    } else if (
      type.includes("zip") ||
      type.includes("archive") ||
      type.includes("compressed")
    ) {
      return <ArchiveIcon />;
    } else if (
      type.includes("code") ||
      type.includes("javascript") ||
      type.includes("json")
    ) {
      return <CodeIcon />;
    } else {
      return <FileIcon />;
    }
  };

  // Determine if file is an image (for preview)
  const isImage = fileType.startsWith("image/");

  // Generate preview URL for image files
  const previewUrl =
    isImage && "type" in file ? URL.createObjectURL(file) : fileUrl;

  return (
    <Paper
      className={className}
      variant="outlined"
      sx={{
        p: 1,
        borderRadius: 1,
        display: "flex",
        alignItems: "center",
        width: { xs: "100%", sm: 250 },
        position: "relative",
        ...sx,
      }}
      id={id}
    >
      {/* Preview for images */}
      {isImage && previewUrl ? (
        <Box
          sx={{
            width: 40,
            height: 40,
            mr: 1,
            borderRadius: 1,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "action.hover",
          }}
        >
          <img
            src={previewUrl}
            alt={fileName}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          />
        </Box>
      ) : (
        <Box
          sx={{
            mr: 1,
            color: "text.secondary",
          }}
        >
          {getFileIcon()}
        </Box>
      )}

      {/* File info */}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap>
          {fileName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {fileSize ? formatFileSize(fileSize) : ""}
        </Typography>

        {/* Upload progress */}
        {isUploading && (
          <LinearProgress
            variant={progress > 0 ? "determinate" : "indeterminate"}
            value={progress}
            sx={{ mt: 0.5, height: 4 }}
          />
        )}
      </Box>

      {/* Remove button */}
      {onRemove && !isUploading && (
        <IconButton
          size="small"
          onClick={onRemove}
          sx={{
            ml: 1,
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      )}

      {/* Loading indicator */}
      {isUploading && (
        <CircularProgress
          size={16}
          sx={{
            ml: 1,
          }}
        />
      )}
    </Paper>
  );
};

export default FilePreviewUI;
