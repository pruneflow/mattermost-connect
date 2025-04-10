// src/components/ChannelViewer/MessageAttachment.tsx
import React from "react";
import { MessageAttachment as MessageAttachmentType } from "../../types";

// Material-UI Components
import { Box, Paper, Typography, SxProps, Theme, alpha } from "@mui/material";

// Material-UI Icons
import {
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Code as CodeIcon,
  Description as TextIcon,
  VideoFile as VideoIcon,
  MusicNote as AudioIcon,
} from "@mui/icons-material";

/**
 * Props for the MessageAttachment component
 */
export interface MessageAttachmentProps {
  /** The attachment data */
  file: MessageAttachmentType;

  /** Optional click handler */
  onClick?: (file: MessageAttachmentType) => void;

  /** Material-UI sx prop for additional styling */
  sx?: SxProps<Theme>;

  /** Styling for the icon */
  iconSx?: SxProps<Theme>;
}

/**
 * A component that renders a message attachment (file)
 */
const MessageAttachment: React.FC<MessageAttachmentProps> = ({
  file,
  onClick,
  sx,
  iconSx,
}) => {
  // Get the appropriate icon based on file type
  const getFileIcon = () => {
    const fileType = file.type?.toLowerCase() || "";
    const fileName = file.name.toLowerCase();

    // Check file type or extension
    if (
      fileType.includes("image") ||
      fileName.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)
    ) {
      return <ImageIcon sx={{ ...iconSx }} />;
    } else if (fileType.includes("pdf") || fileName.endsWith(".pdf")) {
      return <PdfIcon sx={{ ...iconSx }} />;
    } else if (
      fileType.includes("video") ||
      fileName.match(/\.(mp4|mov|avi|webm)$/)
    ) {
      return <VideoIcon sx={{ ...iconSx }} />;
    } else if (
      fileType.includes("audio") ||
      fileName.match(/\.(mp3|wav|ogg|flac)$/)
    ) {
      return <AudioIcon sx={{ ...iconSx }} />;
    } else if (fileName.match(/\.(txt|md|rtf|doc|docx)$/)) {
      return <TextIcon sx={{ ...iconSx }} />;
    } else if (
      fileName.match(/\.(js|jsx|ts|tsx|html|css|java|py|c|cpp|php|rb)$/)
    ) {
      return <CodeIcon sx={{ ...iconSx }} />;
    } else {
      return <FileIcon sx={{ ...iconSx }} />;
    }
  };

  // Format the file size
  const formatFileSize = (bytes?: number): string => {
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

  // Handle click on attachment
  const handleAttachmentClick = () => {
    if (onClick) {
      onClick(file);
    } else if (file.url || file.link) {
      window.open(file.url || file.link, "_blank");
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        alignItems: "center",
        p: 1,
        borderRadius: 1,
        bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
        border: "1px solid",
        borderColor: "divider",
        cursor: file.url || file.link ? "pointer" : "default",
        "&:hover": {
          bgcolor: (theme) => alpha(theme.palette.background.default, 0.8),
        },
        ...sx,
      }}
      onClick={handleAttachmentClick}
    >
      <Box sx={{ mr: 1, color: "text.secondary" }}>{getFileIcon()}</Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" component={"div"} noWrap title={file.name}>
          {file.name}
        </Typography>

        {file.size && (
          <Typography
            variant="caption"
            component={"div"}
            color="text.secondary"
          >
            {formatFileSize(file.size)}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default MessageAttachment;
