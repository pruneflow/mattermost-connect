// src/components/message/Attachment/Attachment.tsx
import React, { useState, useEffect } from "react";
import { useMattermost } from "../../../context";

// Types
import { MessageAttachment as AttachmentType } from "../../../types";

// Material-UI Components
import {
  Paper,
  useMediaQuery,
  useTheme,
  alpha,
  SxProps,
  Theme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Box,
} from "@mui/material";

// Attachment type components
import {
  ImageAttachment,
  AttachmentNotification,
  AttachmentInfo,
  AttachmentContextMenu,
  AttachmentActions,
  AttachmentPreviewControls,
  AttachmentUploadIndicator,
} from "./components";

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
  const { services } = useMattermost();
  const fileService = services?.fileService;

  // State
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

  // État pour la gestion des erreurs d'authentification
  const [authError, setAuthError] = useState<boolean>(false);
  const [authDialogOpen, setAuthDialogOpen] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  // Gestion du chargement direct de l'image pour l'aperçu en plein écran
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState<boolean>(false);

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

  // Nettoyage des URLs blob à la destruction du composant
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:") && fileService) {
        fileService.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, fileService]);

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
  const handleAttachmentClick = async () => {
    if (!isPreviewMode && onClick && mattermostFile) {
      onClick(mattermostFile);
    } else if (mattermostFile?.url || mattermostFile?.link) {
      window.open(mattermostFile.url || mattermostFile.link, "_blank");
    } else if (fileId && isImageType(fileType, fileName)) {
      // Si c'est une image et qu'on a l'ID du fichier, on peut charger l'image en plein écran
      await handleOpenImagePreview(fileId);
    }
  };

  // Vérifie si le fichier est une image
  const isImageType = (type: string, name?: string): boolean => {
    return (
      type.includes("image") ||
      (name ? /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(name) : false)
    );
  };

  // Ouvre l'aperçu d'image en plein écran
  const handleOpenImagePreview = async (id: string) => {
    if (!fileService) return;

    setLoadingPreview(true);

    try {
      const imageUrl = await fileService.fetchFile(id);
      setPreviewUrl(imageUrl);
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error("Erreur lors du chargement de l'image:", error);

      // Montrer une notification d'erreur
      setSnackbarMessage(
        "Erreur lors du chargement de l'image. Veuillez réessayer.",
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);

      // Vérifier si c'est une erreur d'authentification
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("401") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("session invalide")
      ) {
        setAuthDialogOpen(true);
      }
    } finally {
      setLoadingPreview(false);
    }
  };

  // Ferme la boîte de dialogue d'aperçu
  const handleClosePreview = () => {
    setPreviewDialogOpen(false);

    // Nettoyer l'URL du preview après fermeture
    if (previewUrl && previewUrl.startsWith("blob:") && fileService) {
      setTimeout(() => {
        fileService.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }, 300);
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
      const publicLink = await fileService?.createPublicLink(fileId);
      if (publicLink) {
        await navigator.clipboard.writeText(publicLink);

        // User notification
        setSnackbarMessage("Public link created and copied to clipboard!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      }
      // Copy the link to clipboard
    } catch (error) {
      console.error("Error creating public link:", error);

      // Vérifier si c'est une erreur d'authentification
      if (
        error instanceof Error &&
        (error.message.includes("401") ||
          error.message.includes("unauthorized") ||
          error.message.includes("session invalide") ||
          error.message.includes("invalid session"))
      ) {
        setAuthError(true);
        setAuthDialogOpen(true);
      } else {
        setSnackbarMessage(
          error instanceof Error
            ? error.message
            : "Failed to create public link",
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } finally {
      setPublicLinkLoading(false);
      handleMenuClose();
    }
  };

  // Download the file
  const handleDownload = async (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (!fileId) {
      setSnackbarMessage("Unable to download: File ID is missing");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    try {
      await fileService?.downloadFile(fileId);
    } catch (error) {
      console.error("Error downloading file:", error);

      // Vérifier si c'est une erreur d'authentification
      if (
        error instanceof Error &&
        (error.message.includes("401") ||
          error.message.includes("unauthorized") ||
          error.message.includes("session invalide") ||
          error.message.includes("invalid session"))
      ) {
        setAuthError(true);
        setAuthDialogOpen(true);
      } else {
        setSnackbarMessage(
          error instanceof Error ? error.message : "Failed to download file",
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    }
  };

  // Fonction pour gérer les tentatives de réauthentification
  const handleRetryAuth = async () => {
    setIsRetrying(true);

    try {
      // Utiliser la méthode handleAuthError du service de fichiers amélioré
      if (fileService && "handleAuthError" in fileService) {
        const success = await fileService.handleAuthError();

        if (success) {
          // Fermer la boîte de dialogue et réessayer
          setAuthDialogOpen(false);
          setAuthError(false);

          // Réinitialiser l'erreur de miniature
          setThumbnailError(false);
        } else {
          // Informer l'utilisateur de l'échec
          setSnackbarMessage(
            "Échec de la réauthentification. Veuillez vous reconnecter manuellement.",
          );
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        }
      } else {
        // Informer que la réauthentification n'est pas prise en charge
        setSnackbarMessage(
          "La réauthentification automatique n'est pas prise en charge. Veuillez actualiser la page.",
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error(
        "Erreur lors de la tentative de réauthentification:",
        error,
      );
      setSnackbarMessage("Erreur lors de la tentative de réauthentification");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsRetrying(false);
    }
  };

  // Close the snackbar notification
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Fermer la boîte de dialogue d'authentification
  const handleAuthDialogClose = () => {
    setAuthDialogOpen(false);
  };

  // Get the appropriate attachment component based on file type
  const renderAttachmentIcon = () => {
    return (
      <ImageAttachment
        fileId={fileId}
        fileType={fileType}
        thumbnailError={thumbnailError}
        setThumbnailError={setThumbnailError}
        fileName={fileName}
        onImageClick={handleAttachmentClick}
        sx={iconSx}
      />
    );
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
            !isPreviewMode &&
            (mattermostFile?.url ||
              mattermostFile?.link ||
              (fileId && isImageType(fileType, fileName)))
              ? "pointer"
              : "default",
          width,
          "&:hover": {
            bgcolor: (theme) => alpha(theme.palette.background.default, 0.8),
          },
          ...sx,
          position: "relative",
        }}
        onClick={handleAttachmentClick}
        onMouseEnter={() => !isMobile && setShowControls(true)}
        onMouseLeave={() => !isMobile && setShowControls(false)}
      >
        {/* Thumbnail or icon */}
        {renderAttachmentIcon()}

        {/* File information */}
        <AttachmentInfo
          fileName={fileName}
          formattedSize={formatFileSize(fileSize)}
          isUploading={isPreviewMode && isUploading}
        />

        {/* Action buttons */}
        <AttachmentActions
          handleMenuOpen={handleMenuOpen}
          handleDownload={handleDownload}
          showControls={(showControls && !isPreviewMode) || isMobile}
          isPreviewMode={isPreviewMode}
        />

        {/* Preview mode controls */}
        <AttachmentPreviewControls
          isPreviewMode={isPreviewMode}
          onRemove={onRemove}
          isUploading={isUploading}
        />

        {/* Upload indicator */}
        <AttachmentUploadIndicator
          isPreviewMode={isPreviewMode}
          isUploading={isUploading}
        />
      </Paper>

      {/* Context menu */}
      <AttachmentContextMenu
        menuPosition={menuPosition}
        handleMenuClose={handleMenuClose}
        handleCreatePublicLink={handleCreatePublicLink}
        publicLinkLoading={publicLinkLoading}
      />

      {/* Notification snackbar */}
      <AttachmentNotification
        snackbarOpen={snackbarOpen}
        snackbarMessage={snackbarMessage}
        snackbarSeverity={snackbarSeverity}
        handleSnackbarClose={handleSnackbarClose}
      />

      {/* Boîte de dialogue d'erreur d'authentification */}
      <Dialog
        open={authDialogOpen}
        onClose={handleAuthDialogClose}
        aria-labelledby="auth-error-dialog-title"
      >
        <DialogTitle id="auth-error-dialog-title">
          Problème d'authentification
        </DialogTitle>
        <DialogContent>
          <DialogContent>
            Votre session semble avoir expiré ou n'être plus valide. Voulez-vous
            essayer de vous reconnecter automatiquement ?
          </DialogContent>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAuthDialogClose} color="inherit">
            Annuler
          </Button>
          <Button
            onClick={handleRetryAuth}
            color="primary"
            disabled={isRetrying}
            startIcon={isRetrying ? <CircularProgress size={16} /> : null}
          >
            {isRetrying ? "Reconnexion en cours..." : "Se reconnecter"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Boîte de dialogue d'aperçu d'image */}
      <Dialog
        open={previewDialogOpen}
        onClose={handleClosePreview}
        fullWidth
        maxWidth="md"
      >
        <DialogContent>
          {loadingPreview ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : previewUrl ? (
            <Box sx={{ textAlign: "center" }}>
              <img
                src={previewUrl}
                alt={fileName}
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                }}
              />
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", p: 2 }}>Image non disponible</Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Fermer</Button>
          {previewUrl && (
            <Button
              onClick={() => {
                if (fileId) {
                  void fileService?.downloadFile(fileId);
                }
              }}
              color="primary"
            >
              Télécharger
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Attachment;
