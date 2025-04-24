// src/components/messages/FileUpload.tsx
/**
 * Component for uploading files
 */
import React, { useState, useCallback } from "react";
import { SxProps, Theme } from "@mui/material/styles";
import FileUploadUI from "../../internal/components/messages/FileUploadUI";
import { useMessages } from "../../hooks/useMessages";

export interface FileUploadProps {
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
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * File upload component with drag and drop support
 *
 * This component provides a user interface for uploading files with drag and drop
 * support, file validation, and progress tracking.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <FileUpload
 *   channelId="channel123"
 *   onUploadComplete={(fileIds) => console.log('Files uploaded:', fileIds)}
 * />
 *
 * // With custom limits
 * <FileUpload
 *   channelId="channel123"
 *   maxFiles={5}
 *   maxSize={10 * 1024 * 1024} // 10MB
 *   accept="image/*,application/pdf"
 *   onUploadComplete={(fileIds) => console.log('Files uploaded:', fileIds)}
 * />
 *
 * // With lifecycle callbacks
 * <FileUpload
 *   channelId="channel123"
 *   onFilesSelected={(files) => console.log('Files selected:', files)}
 *   onUploadStart={() => console.log('Upload started')}
 *   onUploadComplete={(fileIds) => console.log('Upload completed:', fileIds)}
 *   onUploadError={(error) => console.error('Upload error:', error)}
 * />
 * ```
 */
const FileUpload: React.FC<FileUploadProps> = ({
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
  const [isUploadingState, setIsUploadingState] = useState(false);

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
    setIsUploadingState(true);

    if (onUploadStart) {
      onUploadStart();
    }
  }, [onUploadStart]);

  // Handle file upload
  const handleUpload = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      setIsUploadingState(true);

      try {
        if (onUploadStart) {
          onUploadStart();
        }

        const fileIds = await uploadFiles(files);

        if (onUploadComplete) {
          onUploadComplete(fileIds);
        }
      } catch (error) {
        console.error("Error uploading files:", error);

        if (onUploadError) {
          onUploadError(error as Error);
        }
      } finally {
        setIsUploadingState(false);
      }
    },
    [uploadFiles, onUploadStart, onUploadComplete, onUploadError],
  );

  return (
    <FileUploadUI
      maxFiles={maxFiles}
      maxSize={maxSize}
      accept={accept}
      isLoading={isUploadingState || isUploading}
      onFilesSelected={handleFilesSelected}
      onUploadStart={handleUploadStart}
      onUploadComplete={onUploadComplete}
      onUploadError={onUploadError}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default FileUpload;
