/**
 * File preview modal with navigation and user context
 * Displays images, PDFs, audio/video with keyboard navigation and action buttons
 */
import React, { useCallback, useEffect, useState } from "react";
import { Dialog } from "@mui/material";
import { useAppSelector } from "../../hooks/useAppSelector";
import { selectFileInfoById } from "../../store/selectors/filesSelectors";
import { selectPostById } from "../../store/selectors/postsSelectors";
import { selectUserById, selectChannelById } from "../../store/selectors";
import { FilePreviewHeader } from "./FilePreviewHeader";
import { FilePreviewContent } from "./FilePreviewContent";
import { FilePreviewFooter } from "./FilePreviewFooter";

export interface FilePreviewModalProps {
  fileIds: string[]; // Array of file IDs
  startIndex?: number; // Initial file to display
  open: boolean;
  onClose: () => void;
  postId: string; // Post ID to get user and channel info
}

/**
 * File preview modal following Mattermost's exact implementation pattern
 * Uses getFilePreviewUrl for previews and supports navigation between files
 */
export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  fileIds,
  startIndex = 0,
  open,
  onClose,
  postId,
}) => {
  const [fileIndex, setFileIndex] = useState(startIndex);

  // Reset index when modal opens
  useEffect(() => {
    if (open) {
      setFileIndex(startIndex);
    }
  }, [open, startIndex]);

  const currentFileId = fileIds[fileIndex];
  const fileInfo = useAppSelector((state) =>
    currentFileId ? selectFileInfoById(state, currentFileId) : null,
  );

  // Get post, user, and channel information
  const post = useAppSelector((state) => selectPostById(state, postId));
  const user = useAppSelector((state) =>
    post?.user_id ? selectUserById(post.user_id)(state) : null,
  );
  const channel = useAppSelector((state) =>
    post?.channel_id ? selectChannelById(state, post.channel_id) : null,
  );

  // Navigation state
  const canNavigatePrevious = fileIndex > 0;
  const canNavigateNext = fileIndex < fileIds.length - 1;
  const showNavigation = fileIds.length > 1;

  // Handle keyboard navigation (Mattermost pattern)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case "ArrowLeft":
          navigateToPrevious();
          break;
        case "ArrowRight":
          navigateToNext();
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [open, fileIndex, fileIds.length, onClose]);

  const navigateToPrevious = useCallback(() => {
    if (canNavigatePrevious) {
      setFileIndex((prev) => prev - 1);
    }
  }, [canNavigatePrevious]);

  const navigateToNext = useCallback(() => {
    if (canNavigateNext) {
      setFileIndex((prev) => prev + 1);
    }
  }, [canNavigateNext]);

  const handleNavigatePreviousClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation(); // Prevent modal close
      navigateToPrevious();
    },
    [navigateToPrevious],
  );

  const handleNavigateNextClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation(); // Prevent modal close
      navigateToNext();
    },
    [navigateToNext],
  );

  if (!currentFileId || !fileInfo) {
    return null;
  }

  const handleBackdropClick = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      fullScreen
      slotProps={{
        paper: {
          sx: {
            margin: 0,
            maxHeight: "100dvh",
            height: "100dvh",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            flexDirection: "column",
            width: "100%", // Fix horizontal scroll issue
            overflow: "hidden",
          },
        },
        backdrop: {
          sx: {
            backgroundColor: "rgba(0, 0, 0, 0.3)",
          },
        },
      }}
    >
      {/* Header */}
      <FilePreviewHeader
        fileInfo={fileInfo}
        user={user}
        channel={channel}
        currentFileId={currentFileId}
        showNavigation={showNavigation}
        canNavigatePrevious={canNavigatePrevious}
        canNavigateNext={canNavigateNext}
        fileIndex={fileIndex}
        totalFiles={fileIds.length}
        onClose={onClose}
        onNavigatePrevious={navigateToPrevious}
        onNavigateNext={navigateToNext}
      />

      {/* Content */}
      <FilePreviewContent
        fileInfo={fileInfo}
        currentFileId={currentFileId}
        showNavigation={showNavigation}
        canNavigatePrevious={canNavigatePrevious}
        canNavigateNext={canNavigateNext}
        onNavigatePrevious={handleNavigatePreviousClick}
        onNavigateNext={handleNavigateNextClick}
        onBackdropClick={handleBackdropClick}
      />

      {/* Footer (mobile only) */}
      <FilePreviewFooter 
        currentFileId={currentFileId}
        showNavigation={showNavigation}
        canNavigatePrevious={canNavigatePrevious}
        canNavigateNext={canNavigateNext}
        fileIndex={fileIndex}
        totalFiles={fileIds.length}
        onNavigatePrevious={navigateToPrevious}
        onNavigateNext={navigateToNext}
      />
    </Dialog>
  );
};

export default FilePreviewModal;
