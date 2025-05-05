// src/internal/components/messages/FileUploadUI.tsx
/**
 * Component for uploading files with drag-and-drop
 */
import React, { useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  LinearProgress,
  IconButton,
  Alert,
  Divider,
  List,
  useTheme,
  alpha,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  AttachFile as AttachIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { BaseComponentProps } from "../../types/componentTypes";
import FilePreviewUI from "./FilePreviewUI";
import { formatFileSize } from "../../../utils/mattermostUtils";

export interface FileUploadProps extends BaseComponentProps {
  /** Currently selected files */
  selectedFiles: File[];
  /** Maximum number of files allowed */
  maxFiles?: number;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** MIME types to accept */
  accept?: string;
  /** Whether upload is in progress */
  isUploading?: boolean;
  /** Progress of each file upload (by file name) */
  uploadProgress?: Record<string, number>;
  /** File input reference */
  fileInputRef?: React.RefObject<HTMLInputElement>;
  /** Whether the uploader is disabled */
  disabled?: boolean;
  /** Callback when upload area is clicked */
  onUploadClick?: () => void;
  /** Callback when files are dropped */
  onFileDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
  /** Callback for drag over event */
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  /** Callback when input changes */
  onInputChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Callback to remove a file */
  onRemoveFile?: (index: number) => void;
  /** Callback to start upload */
  onUpload?: () => void;
  /** Validation errors, if any */
  validationErrors?: string[];
}

/**
 * File Upload UI Component
 *
 * Provides drag-and-drop file upload functionality
 */
const FileUploadUI: React.FC<FileUploadProps> = ({
  selectedFiles = [],
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB
  accept = "*",
  isUploading = false,
  uploadProgress = {},
  fileInputRef: propFileInputRef,
  disabled = false,
  onUploadClick,
  onFileDrop,
  onDragOver,
  onInputChange,
  onRemoveFile,
  onUpload,
  validationErrors = [],
  className,
  sx,
  id,
}) => {
  const theme = useTheme();
  // State for drag over
  const [isDragOver, setIsDragOver] = useState(false);

  // Local file input ref if none provided
  const localFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = propFileInputRef || localFileInputRef;

  // Handle drag enter
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!disabled && onFileDrop) {
      onFileDrop(e);
    }
  };

  // Handle click on upload area
  const handleUploadClick = () => {
    if (!disabled && onUploadClick) {
      onUploadClick();
    } else if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file removal
  const handleRemoveFile = (index: number) => {
    if (!disabled && onRemoveFile) {
      onRemoveFile(index);
    }
  };

  // Handle upload button click
  const handleUpload = () => {
    if (!disabled && onUpload) {
      onUpload();
    }
  };

  return (
    <Box
      className={className}
      sx={{
        ...sx,
      }}
      id={id}
    >
      {/* Drag and drop area */}
      <Paper
        elevation={isDragOver ? 3 : 1}
        sx={{
          p: 3,
          border: "2px dashed",
          borderColor: isDragOver
            ? "primary.main"
            : disabled
              ? "action.disabled"
              : "divider",
          borderRadius: 2,
          textAlign: "center",
          backgroundColor: isDragOver
            ? alpha(theme.palette.primary.main, 0.05)
            : disabled
              ? "action.disabledBackground"
              : "background.paper",
          transition: "all 0.2s",
          opacity: disabled ? 0.7 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        onDragEnter={handleDragEnter}
        onDragOver={onDragOver || handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadClick}
      >
        <UploadIcon
          sx={{
            fontSize: 48,
            color: isDragOver
              ? "primary.main"
              : disabled
                ? "action.disabled"
                : "text.secondary",
            mb: 2,
          }}
        />

        <Typography
          variant="h6"
          gutterBottom
          color={disabled ? "text.disabled" : "text.primary"}
        >
          {isDragOver
            ? "Drop files here"
            : "Drop files here or click to upload"}
        </Typography>

        <Typography
          variant="body2"
          color={disabled ? "text.disabled" : "text.secondary"}
          paragraph
        >
          Maximum {maxFiles} files, up to {formatFileSize(maxSize)} each
        </Typography>

        {!disabled && (
          <Button
            variant="contained"
            startIcon={<AttachIcon />}
            onClick={handleUploadClick}
            disabled={disabled || isUploading}
          >
            Select Files
          </Button>
        )}

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          multiple
          accept={accept}
          onChange={onInputChange}
          disabled={disabled || isUploading}
        />
      </Paper>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {validationErrors.map((error, index) => (
            <Alert key={index} severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          ))}
        </Box>
      )}

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Selected Files ({selectedFiles.length})
          </Typography>

          <Paper variant="outlined" sx={{ mt: 1 }}>
            <List sx={{ p: 0 }}>
              {selectedFiles.map((file, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <Divider />}
                  <Box sx={{ p: 1 }}>
                    <FilePreviewUI
                      file={file}
                      isUploading={isUploading}
                      progress={uploadProgress[file.name] || 0}
                      onRemove={() => handleRemoveFile(index)}
                      disabled={disabled || isUploading}
                    />
                  </Box>
                </React.Fragment>
              ))}
            </List>
          </Paper>

          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={
                isUploading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <UploadIcon />
                )
              }
              onClick={handleUpload}
              disabled={disabled || isUploading || selectedFiles.length === 0}
            >
              {isUploading ? "Uploading..." : "Upload Files"}
            </Button>
          </Box>
        </Box>
      )}

      {/* Overall upload progress */}
      {isUploading && (
        <Box sx={{ width: "100%", mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={
              Object.values(uploadProgress).length > 0
                ? (Object.values(uploadProgress).reduce((a, b) => a + b, 0) /
                    (Object.values(uploadProgress).length * 100)) *
                  100
                : 0
            }
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", textAlign: "right", mt: 0.5 }}
          >
            {`${
              Object.values(uploadProgress).length > 0
                ? Math.round(
                    (Object.values(uploadProgress).reduce((a, b) => a + b, 0) /
                      (Object.values(uploadProgress).length * 100)) *
                      100,
                  )
                : 0
            }%`}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default React.memo(FileUploadUI);
