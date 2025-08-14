/**
 * File preview container for managing file uploads in message input
 * Handles automatic file uploading to Mattermost with progress tracking
 */
import React, { useCallback, useEffect, useState } from "react";
import { Box } from "@mui/material";
import { FileItem, FileStatus } from "./FileItem";
import { client } from "../../api/client";

export interface FilePreviewContainerProps {
  files: FileStatus[];
  channelId: string;
  onRemove: (file: File) => void;
  onFilesChange?: (files: FileStatus[]) => void;
}

/**
 * Container for file preview and management in message input
 */
export const FilePreviewContainer: React.FC<FilePreviewContainerProps> = ({
  files,
  channelId,
  onRemove,
  onFilesChange,
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<Set<File>>(new Set());

  // File upload function to Mattermost
  const uploadToMattermost = useCallback(
    async (file: File): Promise<string> => {
      try {
        const formData = new FormData();
        formData.append("files", file);
        formData.append("channel_id", channelId);

        const response = await client.uploadFile(formData);

        if (response.file_infos && response.file_infos.length > 0) {
          return response.file_infos[0].id;
        }

        throw new Error("Upload failed: no file info returned");
      } catch (error) {
        throw error;
      }
    },
    [channelId],
  );

  const handleRemoveFile = useCallback(
    (file: File) => {
      onRemove(file);
    },
    [onRemove],
  );

  const markFileAsUploading = useCallback((file: File) => {
    setUploadingFiles((prev) => new Set(prev).add(file));
  }, []);

  const removeFromUploading = useCallback((file: File) => {
    setUploadingFiles((prev) => {
      const newSet = new Set(prev);
      newSet.delete(file);
      return newSet;
    });
  }, []);

  // Auto-upload new files
  useEffect(() => {
    const newFiles = files.filter(
      (f) =>
        !f.uploaded && !f.uploading && !uploadingFiles.has(f.file) && !f.error,
    );

    if (newFiles.length > 0) {
      newFiles.forEach(async (fileStatus) => {
        const { file } = fileStatus;

        markFileAsUploading(file);
        fileStatus.uploading = true;
        onFilesChange?.(files);

        try {
          const fileId = await uploadToMattermost(file);

          fileStatus.uploaded = true;
          fileStatus.uploading = false;
          fileStatus.fileId = fileId;
          fileStatus.error = undefined;
        } catch (error) {
          fileStatus.error =
            error instanceof Error ? error.message : "Upload failed";
          fileStatus.uploading = false;
          fileStatus.uploaded = false;
        } finally {
          removeFromUploading(file);
          onFilesChange?.(files);
        }
      });
    }
  }, [
    files,
    uploadToMattermost,
    uploadingFiles,
    onFilesChange,
    markFileAsUploading,
    removeFromUploading,
  ]);

  if (!files || files.length === 0) {
    return null;
  }

  return (
    <>
      {files.map((fileStatus, index) => {
        const handleRemove = () => handleRemoveFile(fileStatus.file);
        return (
          <FileItem
            key={`${fileStatus.file.name}-${fileStatus.file.lastModified}-${index}`}
            file={fileStatus}
            showRemove={true}
            uploading={
              fileStatus.uploading || uploadingFiles.has(fileStatus.file)
            }
            onRemove={handleRemove}
          />
        );
      })}
    </>
  );
};

export default FilePreviewContainer;
