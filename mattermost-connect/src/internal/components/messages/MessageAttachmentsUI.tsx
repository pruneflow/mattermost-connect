// src/internal/components/messages/MessageAttachmentsUI.tsx
/**
 * Component that displays message attachments
 */
import React from "react";
import { Box, Typography, Paper, Link, IconButton, Grid } from "@mui/material";
import {
  Download as DownloadIcon,
  OpenInNew as OpenIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Code as CodeIcon,
  Description as TextIcon,
  Archive as ArchiveIcon,
} from "@mui/icons-material";
import { MessageAttachment } from "../../../index";
import { BaseComponentProps } from "../../types/componentTypes";

export interface MessageAttachmentsUIProps extends BaseComponentProps {
  /** Attachment objects */
  attachments?: MessageAttachment[];
  /** File IDs (alternative to attachments) */
  fileIds?: string[];
  /** Maximum height for previews */
  maxPreviewHeight?: number;
  /** Whether to show compact version */
  compact?: boolean;
  /** Callback when attachment is clicked */
  onAttachmentClick?: (attachment: MessageAttachment) => void;
  /** Callback when download is clicked */
  onDownload?: (attachment: MessageAttachment) => void;
}

const MessageAttachmentsUI: React.FC<MessageAttachmentsUIProps> = ({
  attachments = [],
  fileIds = [],
  maxPreviewHeight = 200,
  compact = false,
  onAttachmentClick,
  onDownload,
  className,
  sx,
  id,
}) => {
  // Return null if no attachments
  if (
    (!attachments || attachments.length === 0) &&
    (!fileIds || fileIds.length === 0)
  ) {
    return null;
  }

  // TODO: Implement file fetching for fileIds
  // This is a simplified version that just works with attachments

  // Handle attachment click
  const handleAttachmentClick = (attachment: MessageAttachment) => {
    if (onAttachmentClick) {
      onAttachmentClick(attachment);
    } else if (attachment.url) {
      window.open(attachment.url, "_blank");
    }
  };

  // Handle download click
  const handleDownload = (
    e: React.MouseEvent,
    attachment: MessageAttachment,
  ) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(attachment);
    } else if (attachment.url) {
      // Create an invisible a element
      const a = document.createElement("a");
      a.href = attachment.url;
      a.download = attachment.name || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Get file icon based on type
  const getFileIcon = (attachment: MessageAttachment) => {
    const type = attachment.type?.toLowerCase() || "";

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

  // Determine if attachment is an image
  const isImage = (attachment: MessageAttachment) => {
    return attachment.type?.startsWith("image/") || false;
  };

  // Determine if attachment is a video
  const isVideo = (attachment: MessageAttachment) => {
    return attachment.type?.startsWith("video/") || false;
  };

  // Determine if attachment is an audio
  const isAudio = (attachment: MessageAttachment) => {
    return attachment.type?.startsWith("audio/") || false;
  };

  return (
    <Box
      className={className}
      sx={{
        mt: 1,
        ...sx,
      }}
      id={id}
    >
      <Grid container spacing={1}>
        {attachments.map((attachment) => (
          <Grid
            item
            xs={12}
            sm={compact ? 12 : 6}
            md={compact ? 12 : 4}
            key={attachment.id}
          >
            <Paper
              elevation={1}
              sx={{
                p: 1,
                borderRadius: 1,
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: "action.hover",
                },
                display: "flex",
                flexDirection: "column",
              }}
              onClick={() => handleAttachmentClick(attachment)}
            >
              {/* Preview area */}
              {isImage(attachment) && attachment.url && (
                <Box
                  sx={{
                    height: compact ? 100 : maxPreviewHeight,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden",
                    mb: 1,
                  }}
                >
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                </Box>
              )}

              {isVideo(attachment) && attachment.url && (
                <Box
                  sx={{
                    height: compact ? 100 : maxPreviewHeight,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden",
                    mb: 1,
                  }}
                >
                  <video
                    controls
                    preload="metadata"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                    }}
                  >
                    <source src={attachment.url} type={attachment.type} />
                    Your browser does not support the video tag.
                  </video>
                </Box>
              )}

              {isAudio(attachment) && attachment.url && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <audio controls>
                    <source src={attachment.url} type={attachment.type} />
                    Your browser does not support the audio tag.
                  </audio>
                </Box>
              )}

              {/* File info */}
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box sx={{ pr: 1 }}>{getFileIcon(attachment)}</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {attachment.name}
                  </Typography>
                  {attachment.size !== undefined && (
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(attachment.size)}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleDownload(e, attachment)}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                  {attachment.url && (
                    <IconButton
                      size="small"
                      component={Link}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <OpenIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// Format file size to human readable format
const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  } else if (sizeInBytes < 1024 * 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
};

export default MessageAttachmentsUI;
