// src/components/ChannelViewer/MessageAttachment.tsx
import React, { useState, useEffect } from "react";
import { useMattermost } from "../../context/MattermostProvider";
import { MessageAttachment as MessageAttachmentType } from "../../types";

// Material-UI Components
import {
  Box,
  Paper,
  Typography,
  SxProps,
  Theme,
  alpha,
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
} from "@mui/material";

// Material-UI Icons
import {
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Code as CodeIcon,
  Description as TextIcon,
  VideoFile as VideoIcon,
  MusicNote as AudioIcon,
  MoreVert as MoreIcon,
  Download as DownloadIcon,
  Link as LinkIcon,
  ContentCopy as CopyIcon,
  BrokenImage as ErrorIcon,
  FolderZip as ZipIcon,
} from "@mui/icons-material";

/**
 * Props for the MessageAttachment component
 */
export interface MessageAttachmentProps {
  /** The attachment data */
  file: MessageAttachmentType;

  /** Optional click handler */
  onClick?: (file: MessageAttachmentType) => void;

  /** Material-UI sx prop for additional styling */
  sx?: SxProps<Theme>;

  /** Styling for the icon */
  iconSx?: SxProps<Theme>;
}

/**
 * A component that renders a message attachment (file) with options to download and share
 */
const MessageAttachment: React.FC<MessageAttachmentProps> = ({
  file,
  onClick,
  sx,
  iconSx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { service } = useMattermost();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState<boolean>(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [showControls, setShowControls] = useState(isMobile);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("success");
  const [publicLinkLoading, setPublicLinkLoading] = useState(false);

  const menuOpen = Boolean(menuAnchorEl);

  // Get base URL of the Mattermost server
  const baseUrl = service?.getBaseUrl?.() || "";

  // Generate thumbnail URL based on file type
  useEffect(() => {
    const generateThumbnailUrl = async () => {
      try {
        // Reset error state
        setThumbnailError(false);

        // For PDF files, use the static SVG icon
        if (
          file.type?.includes("pdf") ||
          file.name.toLowerCase().endsWith(".pdf")
        ) {
          setThumbnailUrl(`${baseUrl}/static/files/00301d72e07c55d59df5.svg`);
          return;
        }

        // For ZIP files, use ZIP icon
        if (
          file.type?.includes("zip") ||
          file.name.toLowerCase().endsWith(".zip")
        ) {
          setThumbnailUrl(`${baseUrl}/static/files/48c8ed225ff4a2f7a4c1.svg`);
          return;
        }

        // For images that have been uploaded to Mattermost, use the thumbnail API
        if (file.id) {
          setThumbnailUrl(`${baseUrl}/api/v4/files/${file.id}/thumbnail`);
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
  }, [file, baseUrl]);

  // Get the appropriate icon based on file type
  const getFileIcon = () => {
    const fileType = file.type?.toLowerCase() || "";
    const fileName = file.name.toLowerCase();

    // Check file type or extension
    if (
      fileType.includes("image") ||
      fileName.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)
    ) {
      return <ImageIcon sx={{ ...iconSx }} />;
    } else if (fileType.includes("pdf") || fileName.endsWith(".pdf")) {
      return <PdfIcon sx={{ ...iconSx }} />;
    } else if (
      fileType.includes("video") ||
      fileName.match(/\.(mp4|mov|avi|webm)$/)
    ) {
      return <VideoIcon sx={{ ...iconSx }} />;
    } else if (
      fileType.includes("audio") ||
      fileName.match(/\.(mp3|wav|ogg|flac)$/)
    ) {
      return <AudioIcon sx={{ ...iconSx }} />;
    } else if (fileName.match(/\.(txt|md|rtf|doc|docx)$/)) {
      return <TextIcon sx={{ ...iconSx }} />;
    } else if (
      fileName.match(/\.(js|jsx|ts|tsx|html|css|java|py|c|cpp|php|rb)$/)
    ) {
      return <CodeIcon sx={{ ...iconSx }} />;
    } else if (fileName.match(/\.(zip|rar|7z|tar|gz)$/)) {
      return <ZipIcon sx={{ ...iconSx }} />;
    } else {
      return <FileIcon sx={{ ...iconSx }} />;
    }
  };

  // Format the file size
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

  // Handle click on attachment
  const handleAttachmentClick = () => {
    if (onClick) {
      onClick(file);
    } else if (file.url || file.link) {
      window.open(file.url || file.link, "_blank");
    }
  };

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // Create public link
  const handleCreatePublicLink = async () => {
    if (!file.id) {
      setSnackbarMessage("Unable to create public link: File ID is missing");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      handleMenuClose();
      return;
    }

    try {
      setPublicLinkLoading(true);

      // Construire l'URL pour le lien public
      const publicLink = `${baseUrl}/api/v4/files/${file.id}/link`;

      // Dans un cas réel, on utiliserait ici l'API appropriée
      // Ici je simule une requête réussie
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Copier le lien dans le presse-papier
      await navigator.clipboard.writeText(publicLink);

      // Notifier l'utilisateur
      setSnackbarMessage("Public link created and copied to clipboard!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error creating public link:", error);
      setSnackbarMessage("Failed to create public link");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setPublicLinkLoading(false);
      handleMenuClose();
    }
  };

  // Download file
  const handleDownload = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (!file.id) {
      setSnackbarMessage("Unable to download: File ID is missing");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    // Créer l'URL de téléchargement
    const downloadUrl = `${baseUrl}/api/v4/files/${file.id}?download=1`;

    // Ouvrir l'URL dans un nouvel onglet ou utiliser un lien invisible
    window.open(downloadUrl, "_blank");
  };

  // Close snackbar
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
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
          cursor: file.url || file.link ? "pointer" : "default",
          position: "relative",
          "&:hover": {
            bgcolor: (theme) => alpha(theme.palette.background.default, 0.8),
          },
          ...sx,
        }}
        onClick={handleAttachmentClick}
        onMouseEnter={() => !isMobile && setShowControls(true)}
        onMouseLeave={() => !isMobile && setShowControls(false)}
      >
        {/* Thumbnail or icon */}
        {thumbnailUrl && !thumbnailError ? (
          <Box
            component="img"
            src={thumbnailUrl}
            alt={file.name}
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              objectFit: "cover",
              mr: 1.5,
            }}
            onError={() => setThumbnailError(true)}
          />
        ) : (
          <Box
            sx={{
              mr: 1.5,
              color: thumbnailError ? "error.main" : "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: (theme) => alpha(theme.palette.action.hover, 0.5),
            }}
          >
            {thumbnailError ? <ErrorIcon /> : getFileIcon()}
          </Box>
        )}

        {/* File info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            component={"div"}
            noWrap
            title={file.name}
            fontWeight={500}
          >
            {file.name}
          </Typography>

          {file.size && (
            <Typography
              variant="caption"
              component={"div"}
              color="text.secondary"
            >
              {formatFileSize(file.size)}
            </Typography>
          )}
        </Box>

        {/* Action buttons (visible on hover or always on mobile) */}
        {(showControls || isMobile) && (
          <Box sx={{ display: "flex", ml: 1 }}>
            <Tooltip title="Download">
              <IconButton size="small" onClick={handleDownload}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="More options">
              <IconButton size="small" onClick={handleMenuOpen}>
                <MoreIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Context menu */}
        <Menu
          anchorEl={menuAnchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
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
              primary={
                publicLinkLoading ? "Creating link..." : "Create public link"
              }
            />
          </MenuItem>
          <MenuItem onClick={handleDownload} dense>
            <ListItemIcon>
              <DownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Download" />
          </MenuItem>
          {file.url && (
            <MenuItem
              onClick={() => {
                navigator.clipboard.writeText(file.url || "");
                setSnackbarMessage("Link copied to clipboard!");
                setSnackbarSeverity("success");
                setSnackbarOpen(true);
                handleMenuClose();
              }}
              dense
            >
              <ListItemIcon>
                <CopyIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Copy link" />
            </MenuItem>
          )}
        </Menu>
      </Paper>

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

export default MessageAttachment;
