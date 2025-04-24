// src/internal/containers/messages/FileUploadContainer.tsx
/**
 * Container component for file upload that manages state and upload logic
 */
import React, { useCallback, useState } from "react";
import { BaseComponentProps } from "../../types/componentTypes";
import FileUploadUI from "../../components/messages/FileUploadUI";
import { useMessages } from "../../../hooks/useMessages";

export interface FileUploadContainerProps extends BaseComponentProps {
  /** Channel ID to upload files to */
  channelId: string;
  /** Maximum number of files that can be uploaded */
  maxFiles?: number;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Accepted file types */
  accept?: string;
  /** Callback when files are selected */
  onFilesSelected?: (files: File[]) => void;
  /** Callback when a file upload starts */
  onUploadStart?: () => void;
  /** Callback when a file upload completes */
  onUploadComplete?: (fileIds: string[]) => void;
  /** Callback when a file upload fails */
  onUploadError?: (error: Error) => void;
}

const FileUploadContainer: React.FC<FileUploadContainerProps> = ({
  channelId,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB
  accept = "*",
  onFilesSelected,
  onUploadStart,
  onUploadComplete,
  onUploadError,
  className,
  sx,
  id,
}) => {
  // Get upload function from messages hook
  const { uploadFiles, isUploading } = useMessages(channelId);

  // State for tracking uploading state
  const [isUploadingLocal, setIsUploadingLocal] = useState(false);

  // Handle file selection
  const handleFilesSelected = useCallback(
    (files: File[]) => {
      if (onFilesSelected) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected],
  );

  // Handle upload start
  const handleUploadStart = useCallback(() => {
    setIsUploadingLocal(true);

    if (onUploadStart) {
      onUploadStart();
    }
  }, [onUploadStart]);

  // Handle upload - this is the main upload function that will be passed to UI
  const handleUpload = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      try {
        handleUploadStart();

        const fileIds = await uploadFiles(files);

        if (onUploadComplete) {
          onUploadComplete(fileIds);
        }

        return fileIds;
      } catch (error) {
        console.error("Error uploading files:", error);

        if (onUploadError) {
          onUploadError(error as Error);
        }
      } finally {
        setIsUploadingLocal(false);
      }
    },
    [uploadFiles, handleUploadStart, onUploadComplete, onUploadError],
  );

  return (
    <FileUploadUI
      maxFiles={maxFiles}
      maxSize={maxSize}
      accept={accept}
      isLoading={isUploadingLocal || isUploading}
      onFilesSelected={handleFilesSelected}
      onUploadStart={handleUploadStart}
      onUpload={handleUpload} // Pass the actual upload function to the UI
      onUploadComplete={onUploadComplete}
      onUploadError={onUploadError}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default FileUploadContainer;
