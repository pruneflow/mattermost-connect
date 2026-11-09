/**
 * Public link button for sharing files with external users
 * Generates public links and provides clipboard copy functionality with success feedback
 */
import React, { useCallback, useState, useEffect } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { Link as LinkIcon, Check as CheckIcon } from "@mui/icons-material";
import {
  copyPublicLinkToClipboard,
  hasPublicLink,
} from "../../services/fileService";

export interface FilePublicLinkButtonProps {
  fileId: string;
  size?: "small" | "medium" | "large";
  tooltip?: string;
  sx?: React.CSSProperties;
}

/**
 * Button component for generating and copying public links
 * Uses Redux-based file actions for state management
 */
export const FilePublicLinkButton: React.FC<FilePublicLinkButtonProps> = ({
  fileId,
  size = "small",
  tooltip = "Copy Public Link",
  sx,
}) => {
  const hasLink = hasPublicLink(fileId);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleCopyLink = useCallback(
    async (event: React.MouseEvent) => {
      event.stopPropagation();

      const success = await copyPublicLinkToClipboard(fileId);

      if (success) {
        setShowSuccess(true);
      }
    },
    [fileId],
  );

  // Reset success state after 5 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  return (
    <Tooltip title={showSuccess ? "Copied" : tooltip}>
      <IconButton
        size={size}
        onClick={handleCopyLink}
        aria-label="copy public link"
        sx={{
          p: { xs: 0.75, md: 0.5 },
          color: showSuccess
            ? "success.main"
            : hasLink
              ? "primary.main"
              : "inherit",
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.04)",
          },
          ...sx,
        }}
      >
        {showSuccess ? (
          <CheckIcon fontSize={size} />
        ) : (
          <LinkIcon fontSize={size} />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default FilePublicLinkButton;
