// src/components/messages/FileUpload.tsx
/**
 * Component for uploading files
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import FileUploadContainer from "../../internal/containers/messages/FileUploadContainer";

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
const FileUpload: React.FC<FileUploadProps> = (props) => {
  return <FileUploadContainer {...props} />;
};

export default FileUpload;
