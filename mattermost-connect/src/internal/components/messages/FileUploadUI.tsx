// src/internal/components/messages/FileUploadUI.tsx
/**
 * Component for uploading files
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
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  AttachFile as AttachIcon,
} from "@mui/icons-material";
import { FileUploadProps } from "../../types/componentTypes";

const FileUploadUI: React.FC<FileUploadProps> = ({
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB
  accept = "*",
  isLoading = false,
  onFilesSelected,
  onUploadStart,
  onUploadComplete,
  onUploadError,
  className,
  sx,
  id,
}) => {
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for drag over
  const [isDragOver, setIsDragOver] = useState(false);

  // State for selected files
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // State for error message
  const [error, setError] = useState<string | null>(null);

  // Handle file input click
  const handleFileInputClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection via input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    handleFiles(Array.from(files));

    // Reset the input so the same file can be selected again
    e.target.value = "";
  };

  // Handle files (both from input and drop)
  const handleFiles = (files: File[]) => {
    setError(null);

    // Check number of files
    if (files.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} files at once.`);
      return;
    }

    // Check file sizes
    const oversizedFiles = files.filter((file) => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError(
        `Some files exceed the maximum size of ${formatFileSize(maxSize)}.`,
      );
      return;
    }

    // Update selected files
    setSelectedFiles([...selectedFiles, ...files]);

    // Call the callback
    if (onFilesSelected) {
      onFilesSelected(files);
    }
  };

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Handle file removal
  const handleRemoveFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
  };

  // Handle upload start
  const handleUpload = () => {
    if (onUploadStart) {
      onUploadStart();
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
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
          borderColor: isDragOver ? "primary.main" : "divider",
          borderRadius: 2,
          textAlign: "center",
          backgroundColor: isDragOver ? "action.hover" : "background.paper",
          transition: "all 0.2s",
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadIcon
          sx={{
            fontSize: 48,
            color: isDragOver ? "primary.main" : "text.secondary",
            mb: 2,
          }}
        />

        <Typography variant="h6" gutterBottom>
          Drop files here or click to upload
        </Typography>

        <Typography variant="body2" color="text.secondary" paragraph>
          Maximum {maxFiles} files, up to {formatFileSize(maxSize)} each
        </Typography>

        <Button
          variant="contained"
          startIcon={<AttachIcon />}
          onClick={handleFileInputClick}
          disabled={isLoading}
        >
          Select Files
        </Button>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          multiple
          accept={accept}
          onChange={handleFileChange}
        />
      </Paper>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Selected Files ({selectedFiles.length})
          </Typography>

          <Paper variant="outlined" sx={{ mt: 1 }}>
            {selectedFiles.map((file, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Divider />}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    p: 1.5,
                  }}
                >
                  <AttachIcon sx={{ mr: 1, color: "text.secondary" }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" noWrap>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(file.size)}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveFile(index)}
                    disabled={isLoading}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </React.Fragment>
            ))}
          </Paper>

          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={
                isLoading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <UploadIcon />
                )
              }
              onClick={handleUpload}
              disabled={isLoading || selectedFiles.length === 0}
            >
              {isLoading ? "Uploading..." : "Upload Files"}
            </Button>
          </Box>
        </Box>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <Box sx={{ width: "100%", mt: 2 }}>
          <LinearProgress />
        </Box>
      )}
    </Box>
  );
};

export default FileUploadUI;
