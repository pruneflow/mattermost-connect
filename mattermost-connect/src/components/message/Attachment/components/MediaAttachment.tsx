// src/components/Attachment/attachments/MediaAttachment.tsx
import React from "react";
import { alpha, Box } from "@mui/material";
import { BaseAttachmentProps } from "../types/AttachmentTypes";
import {
  VideoFile as VideoIcon,
  MusicNote as AudioIcon,
  InsertDriveFile as FileIcon,
} from "@mui/icons-material";

/**
 * Props for media attachments
 */
interface MediaAttachmentProps extends BaseAttachmentProps {
  /** File type/mime-type */
  fileType: string;

  /** File name */
  fileName: string;

  /** Custom handling for media click */
  onMediaClick?: () => void;
}

/**
 * Component for displaying media attachments (audio, video)
 */
const MediaAttachment: React.FC<MediaAttachmentProps> = ({
  fileType,
  fileName,
  onMediaClick,
  iconSx,
  sx,
}) => {
  // Get appropriate icon based on file type
  const getFileIcon = () => {
    if (
      fileType.includes("video") ||
      fileName.match(/\.(mp4|mov|avi|webm)$/i)
    ) {
      return <VideoIcon sx={iconSx} />;
    } else if (
      fileType.includes("audio") ||
      fileName.match(/\.(mp3|wav|ogg|flac)$/i)
    ) {
      return <AudioIcon sx={iconSx} />;
    } else {
      return <FileIcon sx={iconSx} />;
    }
  };

  return (
    <Box
      sx={{
        mr: 1.5,
        color: "primary.main",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        borderRadius: 1,
        bgcolor: (theme) => alpha(theme.palette.action.hover, 0.5),
        cursor: onMediaClick ? "pointer" : "default",
        ...sx,
      }}
      onClick={onMediaClick}
    >
      {getFileIcon()}
    </Box>
  );
};

export default MediaAttachment;
