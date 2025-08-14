/**
 * File attachment list component for displaying message file attachments
 * Supports preview modal, download, and edit mode with file removal
 */
import React, { useCallback, useState } from "react";
import { Box } from "@mui/material";
import { FileItem } from "./FileItem";
import { FilePreviewModal } from "./FilePreviewModal";
import { FileInfo } from "../../api/types";

export interface FileAttachmentListProps {
  postId: string;
  files: FileInfo[];
  mode?: "default" | "edit";
  onRemove?: (fileId: string) => void;
}

/**
 * Component for displaying file attachments in messages
 * Handles preview, download and link copying
 */
export const FileAttachmentList: React.FC<FileAttachmentListProps> = ({
  postId,
  files,
  mode = "default",
  onRemove,
}) => {
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewStartIndex, setPreviewStartIndex] = useState(0);

  const handleFilePreview = useCallback((clickedIndex: number) => {
    setPreviewStartIndex(clickedIndex);
    setPreviewModalOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewModalOpen(false);
  }, []);

  if (files.length === 0) {
    return null;
  }

  return (
    <>
      {/* File attachments - directly in the flex parent */}
      {files.map((file: FileInfo, index) => {
        const onPreview = () => handleFilePreview(index);
        const handleRemoveFile =
          mode === "edit" && onRemove ? () => onRemove(file.id) : undefined;

        return (
          <FileItem
            key={file.id}
            file={file}
            showPreview={mode === "default"}
            showDownload={mode === "default"}
            showPublicLink={mode === "default"}
            showRemove={mode === "edit"}
            onPreview={mode === "default" ? onPreview : undefined}
            onRemove={handleRemoveFile}
          />
        );
      })}

      {/* File Preview Modal */}
      {mode === "default" && previewModalOpen && (
        <FilePreviewModal
          fileIds={files.map((f: FileInfo) => f.id)}
          startIndex={previewStartIndex}
          open={previewModalOpen}
          onClose={handleClosePreview}
          postId={postId}
        />
      )}
    </>
  );
};

export default FileAttachmentList;
