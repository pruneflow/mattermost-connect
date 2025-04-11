// src/components/Attachment/Attachment.tsx
import React, { useState, useEffect } from "react";
import { useMattermost } from "../../context/MattermostProvider";

// Types
import { MessageAttachment as AttachmentType } from "../../types";

// Material-UI Components
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Grid,
  alpha,
  SxProps,
  Theme,
} from "@mui/material";

// Material-UI Icons
import {
  MoreVert as MoreIcon,
  Download as DownloadIcon,
  Link as LinkIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

// Attachment type components
import {
  ImageAttachment,
  DocumentAttachment,
  MediaAttachment,
  GenericAttachment,
  isImageType,
  isDocumentType,
  isMediaType,
} from "./attachments";

/**
 * Modes available for the Attachment component
 */
export enum AttachmentMode {
  /** Standard display in a message */
  MESSAGE = "message",
  /** Preview in the message composer */
  PREVIEW = "preview",
}

/**
 * Common props to all modes
 */
interface CommonAttachmentProps {
  /** The file to display */
  file: File | AttachmentType;

  /** Display mode of the component */
  mode?: AttachmentMode;

  /** Additional style */
  sx?: SxProps<Theme>;

  /** Style for the icon */
  iconSx?: SxProps<Theme>;

  /** Fixed width of the component (default 240px) */
  width?: string | number;
}

/**
 * Props specific to MESSAGE mode
 */
interface MessageAttachmentProps extends CommonAttachmentProps {
  mode?: AttachmentMode.MESSAGE;

  /** Optional click handler */
  onClick?: (file: AttachmentType) => void;
}

/**
 * Props specific to PREVIEW mode
 */
interface PreviewAttachmentProps extends CommonAttachmentProps {
  mode?: AttachmentMode.PREVIEW;

  /** Handler to remove the attachment */
  onRemove?: () => void;

  /** Whether the file is currently uploading */
  isUploading?: boolean;

  /** Whether the file has been uploaded to the server */
  isUploaded?: boolean;
}

/**
 * Type for a group of attachments
 */
export interface AttachmentGroupProps {
  /** List of files to display */
  files: (File | AttachmentType)[];

  /** Display mode of the components */
  mode?: AttachmentMode;

  /** Handler to remove an attachment (PREVIEW mode) */
  onRemove?: (index: number) => void;

  /** Whether the files are currently uploading (PREVIEW mode) */
  isUploading?: boolean[];

  /** Whether the files have been uploaded to the server (PREVIEW mode) */
  isUploaded?: boolean[];

  /** Additional style */
  sx?: SxProps<Theme>;
}

/**
 * Union of possible props types
 */
export type AttachmentProps = MessageAttachmentProps | PreviewAttachmentProps;

/**
 * Interface representing a file that has been uploaded to Mattermost
 */
export interface MattermostFile {
  /** Mattermost file ID */
  id: string;
  /** File name */
  name: string;
  /** File type/mime-type */
  type?: string;
  /** File size in bytes */
  size?: number;
  /** URL to the file (if available) */
  url?: string;
}

/**
 * Unified component for displaying attachments
 * Works in both message mode and preview mode
 */
const Attachment: React.FC<AttachmentProps> = (props) => {
  const {
    file,
    mode = AttachmentMode.MESSAGE,
    sx,
    iconSx,
    width = 240,
  } = props;

  // Mode-specific props
  const isPreviewMode = mode === AttachmentMode.PREVIEW;

  // Extract mode-specific props
  const onClick = !isPreviewMode
    ? (props as MessageAttachmentProps).onClick
    : undefined;
  const onRemove = isPreviewMode
    ? (props as PreviewAttachmentProps).onRemove
    : undefined;
  const isUploading = isPreviewMode
    ? (props as PreviewAttachmentProps).isUploading
    : false;
  const isUploaded = isPreviewMode
    ? (props as PreviewAttachmentProps).isUploaded
    : true;

  // Hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { fileService } = useMattermost();

  // State
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [showControls, setShowControls] = useState(isMobile);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("success");
  const [publicLinkLoading, setPublicLinkLoading] = useState(false);
  const { service } = useMattermost();

  // Derived states
  const baseUrl = service?.getBaseUrl?.() || "";

  // Determine if we have a File object or an AttachmentType object
  const isLocalFile = !isUploaded && file instanceof File;
  const mattermostFile = isLocalFile ? null : (file as AttachmentType);

  // Get file properties based on type
  const fileName = isLocalFile
    ? (file as File).name
    : (file as AttachmentType).name;
  const fileType = isLocalFile
    ? (file as File).type
    : (file as AttachmentType).type || "";
  const fileSize = isLocalFile
    ? (file as File).size
    : (file as AttachmentType).size || 0;
  const fileId = isLocalFile ? undefined : (file as AttachmentType).id;

  // Generate thumbnail URL for the file
  useEffect(() => {
    const generateThumbnailUrl = async () => {
      try {
        // Reset error
        setThumbnailError(false);

        // For PDF files, use a static SVG icon
        if (
          fileType.includes("pdf") ||
          fileName.toLowerCase().endsWith(".pdf")
        ) {
          setThumbnailUrl(`${baseUrl}/static/files/00301d72e07c55d59df5.svg`);
          return;
        }

        // For ZIP files, use the ZIP icon
        if (
          fileType.includes("zip") ||
          fileName.toLowerCase().endsWith(".zip")
        ) {
          setThumbnailUrl(`${baseUrl}/static/files/48c8ed225ff4a2f7a4c1.svg`);
          return;
        }

        // For images uploaded to Mattermost, use the thumbnail API
        if (fileId) {
          setThumbnailUrl(`${baseUrl}/api/v4/files/${fileId}/thumbnail`);
          return;
        }

        // For local image files, create a local object URL
        if (isLocalFile && fileType.includes("image")) {
          const localUrl = URL.createObjectURL(file as File);
          setThumbnailUrl(localUrl);
          return;
        }

        // For other file types, don't set a thumbnail URL
        setThumbnailUrl(null);
      } catch (error) {
        console.error("Error generating thumbnail URL:", error);
        setThumbnailError(true);
        setThumbnailUrl(null);
      }
    };

    void generateThumbnailUrl();

    // Clean up object URL when component unmounts
    return () => {
      if (thumbnailUrl && isLocalFile && fileType.includes("image")) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [file, fileId, isLocalFile, fileType, fileName, baseUrl, isUploaded]);

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "";

    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
  };

  // Handler for attachment click
  const handleAttachmentClick = () => {
    if (!isPreviewMode && onClick && mattermostFile) {
      onClick(mattermostFile);
    } else if (mattermostFile?.url || mattermostFile?.link) {
      window.open(mattermostFile.url || mattermostFile.link, "_blank");
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    // Calculate position based on the event
    setMenuPosition({
      top: event.clientY,
      left: event.clientX,
    });
  };

  const handleMenuClose = () => {
    setMenuPosition(null);
  };

  // Create a public link
  const handleCreatePublicLink = async () => {
    if (!fileId) {
      setSnackbarMessage("Unable to create public link: File ID is missing");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      handleMenuClose();
      return;
    }

    try {
      setPublicLinkLoading(true);

      // Use the file service to create a public link
      const publicLink = await fileService.createPublicLink(fileId);

      // Copy the link to clipboard
      await navigator.clipboard.writeText(publicLink);

      // User notification
      setSnackbarMessage("Public link created and copied to clipboard!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error creating public link:", error);
      setSnackbarMessage(
        error instanceof Error ? error.message : "Failed to create public link",
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setPublicLinkLoading(false);
      handleMenuClose();
    }
  };

  // Download the file
  const handleDownload = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (!fileId) {
      setSnackbarMessage("Unable to download: File ID is missing");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    try {
      fileService.downloadFile(fileId);
    } catch (error) {
      console.error("Error downloading file:", error);
      setSnackbarMessage(
        error instanceof Error ? error.message : "Failed to download file",
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  // Close the snackbar notification
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Get the appropriate attachment component based on file type
  const renderAttachmentIcon = () => {
    if (isImageType(fileType, fileName)) {
      return (
        <ImageAttachment
          file={file}
          thumbnailUrl={thumbnailUrl}
          thumbnailError={thumbnailError}
          setThumbnailError={setThumbnailError}
          fileName={fileName}
          onImageClick={handleAttachmentClick}
        />
      );
    } else if (isDocumentType(fileType, fileName)) {
      return (
        <DocumentAttachment
          file={file}
          fileType={fileType}
          fileName={fileName}
          onDocumentClick={handleAttachmentClick}
          iconSx={iconSx}
        />
      );
    } else if (isMediaType(fileType, fileName)) {
      return (
        <MediaAttachment
          file={file}
          fileType={fileType}
          fileName={fileName}
          onMediaClick={handleAttachmentClick}
          iconSx={iconSx}
        />
      );
    } else {
      return (
        <GenericAttachment
          file={file}
          fileType={fileType}
          fileName={fileName}
          onAttachmentClick={handleAttachmentClick}
          iconSx={iconSx}
        />
      );
    }
  };

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          p: 1.5,
          borderRadius: 1,
          bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
          border: "1px solid",
          borderColor: "divider",
          cursor:
            !isPreviewMode && (mattermostFile?.url || mattermostFile?.link)
              ? "pointer"
              : "default",
          width,
          "&:hover": {
            bgcolor: (theme) => alpha(theme.palette.background.default, 0.8),
          },
          ...sx,
          position: "relative",
        }}
        onClick={!isPreviewMode ? handleAttachmentClick : undefined}
        onMouseEnter={() => !isMobile && setShowControls(true)}
        onMouseLeave={() => !isMobile && setShowControls(false)}
      >
        {/* Thumbnail or icon */}
        {renderAttachmentIcon()}

        {/* File information */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            component={"div"}
            noWrap
            title={fileName}
            fontWeight={500}
          >
            {fileName}
          </Typography>

          <Typography
            variant="caption"
            component={"div"}
            color="text.secondary"
          >
            {formatFileSize(fileSize)}
            {isPreviewMode && isUploading && (
              <Box
                component="span"
                sx={{ ml: 1, display: "inline-flex", alignItems: "center" }}
              >
                <CircularProgress size={10} sx={{ mr: 0.5 }} />
                Uploading...
              </Box>
            )}
          </Typography>
        </Box>

        {/* Action buttons (visible on hover or always on mobile) */}
        {((showControls && !isPreviewMode) || isMobile) && (
          <Box sx={{ display: "flex", ml: 1 }}>
            <Tooltip title="Options">
              <IconButton
                id="options-button"
                size="small"
                onClick={handleMenuOpen}
              >
                <MoreIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Download">
              <IconButton size="small" onClick={handleDownload}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Remove button for preview mode */}
        {isPreviewMode && onRemove && !isUploading && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            sx={{
              position: "absolute",
              top: -8,
              right: -8,
              bgcolor: "background.paper",
              boxShadow: 1,
              "&:hover": {
                bgcolor: "error.light",
                color: "error.contrastText",
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}

        {/* Loading indicator for preview mode */}
        {isPreviewMode && isUploading && (
          <CircularProgress
            size={24}
            sx={{
              position: "absolute",
              top: -12,
              right: -12,
              bgcolor: "background.paper",
              borderRadius: "50%",
              p: 0.5,
            }}
          />
        )}
      </Paper>

      {/* Context menu - only with public link creation option */}
      <Menu
        id="options-menu"
        open={Boolean(menuPosition)}
        onClose={handleMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={menuPosition ? menuPosition : undefined}
      >
        <MenuItem
          onClick={handleCreatePublicLink}
          disabled={publicLinkLoading}
          dense
        >
          <ListItemIcon>
            {publicLinkLoading ? (
              <CircularProgress size={20} />
            ) : (
              <LinkIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText
            primary={publicLinkLoading ? "Creating..." : "Create public link"}
          />
        </MenuItem>
      </Menu>

      {/* Notification snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

/**
 * Component to display a group of attachments side by side (on desktop)
 */
export const AttachmentGroup: React.FC<AttachmentGroupProps> = ({
  files,
  mode = AttachmentMode.MESSAGE,
  onRemove,
  isUploading,
  isUploaded,
  sx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // If on mobile, stack the attachments
  if (isMobile) {
    return (
      <Box sx={sx}>
        {files.map((file, index) => (
          <Box key={index} sx={{ mb: 1, "&:last-child": { mb: 0 } }}>
            <Attachment
              file={file}
              mode={mode}
              onRemove={onRemove ? () => onRemove(index) : undefined}
              isUploading={isUploading ? isUploading[index] : undefined}
              isUploaded={isUploaded ? isUploaded[index] : undefined}
              width="100%"
            />
          </Box>
        ))}
      </Box>
    );
  }

  // On desktop and in message mode, display attachments inline with scroll
  if (mode === AttachmentMode.MESSAGE) {
    return (
      <Box
        sx={{
          display: "flex",
          overflowX: "auto",
          gap: 1,
          pb: 1, // Space for horizontal scroll
          ...sx,
        }}
      >
        {files.map((file, index) => (
          <Attachment
            key={index}
            file={file}
            mode={mode}
            width={240} // Fixed width for each attachment
          />
        ))}
      </Box>
    );
  }

  // On desktop for other modes (preview), display in grid
  return (
    <Grid container spacing={1} sx={sx}>
      {files.map((file, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
          <Attachment
            file={file}
            mode={mode}
            onRemove={onRemove ? () => onRemove(index) : undefined}
            isUploading={isUploading ? isUploading[index] : undefined}
            isUploaded={isUploaded ? isUploaded[index] : undefined}
            width="100%"
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default Attachment;
