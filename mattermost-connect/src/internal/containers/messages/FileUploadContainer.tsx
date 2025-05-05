// src/internal/containers/messages/FileUploadContainer.tsx
/**
 * Container for file uploads
 * Handles file selection, validation, and uploading
 */
import React, { useCallback, useState, useRef } from "react";
import { useBaseContainer } from "../base/BaseContainer";
import { useMessages } from "../../../hooks";
import FileUploadUI from "../../components/messages/FileUploadUI";
import {
  formatFileSize,
  getFileExtension,
} from "../../../utils/mattermostUtils";

export interface FileUploadContainerProps {
  /** Channel ID */
  channelId: string;
  /** Maximum file size in bytes (default: 50MB) */
  maxFileSize?: number;
  /** Maximum number of files (default: 10) */
  maxFiles?: number;
  /** Allowed file types */
  allowedTypes?: string[];
  /** Whether the uploader is disabled */
  disabled?: boolean;
  /** Callback when upload completes successfully */
  onUploadComplete?: (fileIds: string[]) => void;
  /** Callback when upload fails */
  onUploadError?: (error: Error) => void;
  /** Callback when files are selected */
  onFilesSelected?: (files: File[]) => void;
  /** CSS class name */
  className?: string;
  /** Material UI's sx prop for styling */
  sx?: any;
  /** ID for the component */
  id?: string;
}

/**
 * Container for file uploads
 * Manages file selection, validation, and uploading
 */
const FileUploadContainer: React.FC<FileUploadContainerProps> = (props) => {
  const {
    channelId,
    maxFileSize = 50 * 1024 * 1024, // 50MB
    maxFiles = 10,
    allowedTypes,
    disabled = false,
    onUploadComplete,
    onUploadError,
    onFilesSelected,
    className,
    sx,
    id,
  } = props;

  // Use messages hook for upload functionality
  const { uploadFiles, isUploading } = useMessages(channelId);

  // State for selected files
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // State for upload progress
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use BaseContainer for common functionality
  const [baseState, baseAPI] = useBaseContainer({
    initialLoading: isUploading,
    id,
    className,
    sx,
  });

  // Validate files
  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const validFiles: File[] = [];
      const errors: string[] = [];

      // Check if adding these files would exceed max files
      if (selectedFiles.length + files.length > maxFiles) {
        errors.push(`You can upload a maximum of ${maxFiles} files at once.`);
        return { valid: validFiles, errors };
      }

      // Validate each file
      files.forEach((file) => {
        // Check file size
        if (file.size > maxFileSize) {
          errors.push(
            `File "${file.name}" exceeds the maximum file size of ${formatFileSize(maxFileSize)}.`,
          );
          return;
        }

        // Check file type if restrictions are provided
        if (allowedTypes && allowedTypes.length > 0) {
          const ext = getFileExtension(file.name);
          const mimeType = file.type;

          const isAllowed = allowedTypes.some((type) => {
            return mimeType.startsWith(type) || type.includes(ext);
          });

          if (!isAllowed) {
            errors.push(`File "${file.name}" has an unsupported file type.`);
            return;
          }
        }

        validFiles.push(file);
      });

      return { valid: validFiles, errors };
    },
    [selectedFiles.length, maxFiles, maxFileSize, allowedTypes],
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const { valid, errors } = validateFiles(fileArray);

      if (errors.length > 0) {
        // Show errors
        errors.forEach((error) => {
          baseAPI.setError(new Error(error));
        });
      }

      if (valid.length > 0) {
        setSelectedFiles((prev) => [...prev, ...valid]);

        if (onFilesSelected) {
          onFilesSelected(valid);
        }
      }
    },
    [validateFiles, baseAPI, onFilesSelected],
  );

  // Handle file drag and drop
  const handleFileDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (event.dataTransfer.files) {
        handleFileSelect(event.dataTransfer.files);
      }
    },
    [handleFileSelect],
  );

  // Handle click on the upload area
  const handleUploadClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Handle file upload
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    try {
      // Start upload
      const fileIds = await uploadFiles(selectedFiles);

      // Clear selected files
      setSelectedFiles([]);

      // Callback
      if (onUploadComplete) {
        onUploadComplete(fileIds);
      }
    } catch (error) {
      baseAPI.setError(
        error instanceof Error ? error : new Error("Upload failed"),
      );

      if (onUploadError) {
        onUploadError(
          error instanceof Error ? error : new Error("Upload failed"),
        );
      }
    }
  }, [selectedFiles, uploadFiles, baseAPI, onUploadComplete, onUploadError]);

  // Handle file removal
  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Handle input change
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(event.target.files);
      // Reset input value to allow selecting the same file again
      event.target.value = "";
    },
    [handleFileSelect],
  );

  // Prepare UI props
  const uiProps = {
    selectedFiles,
    isUploading: baseState.isLoading,
    uploadProgress,
    disabled,
    fileInputRef,
    onUploadClick: handleUploadClick,
    onFileDrop: handleFileDrop,
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => e.preventDefault(),
    onInputChange: handleInputChange,
    onRemoveFile: handleRemoveFile,
    onUpload: handleUpload,
    className,
    sx,
    id,
  };

  return <FileUploadUI {...uiProps} />;
};

// Memoize to prevent unnecessary rerenders
export default React.memo(FileUploadContainer);
