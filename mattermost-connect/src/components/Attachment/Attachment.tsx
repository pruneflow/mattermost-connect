// src/components/Attachment/Attachment.tsx
import React, { useState, useEffect, useRef } from "react";
import { useMattermost } from "../../context/MattermostProvider";
import { createFileService } from "../../services/file.service";

// Types
import { MessageAttachment as AttachmentType } from "../../types";

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
  Grid,
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
  Close as CloseIcon,
  BrokenImage as ErrorIcon,
  FolderZip as ZipIcon,
} from "@mui/icons-material";

/**
 * Modes disponibles pour le composant Attachment
 */
export enum AttachmentMode {
  /** Affichage standard dans un message */
  MESSAGE = "message",
  /** Prévisualisation dans le composeur de message */
  PREVIEW = "preview",
}

/**
 * Props communes à tous les modes
 */
interface CommonAttachmentProps {
  /** Le fichier à afficher */
  file: File | AttachmentType;

  /** Mode d'affichage du composant */
  mode?: AttachmentMode;

  /** Style supplémentaire */
  sx?: SxProps<Theme>;

  /** Style pour l'icône */
  iconSx?: SxProps<Theme>;

  /** Largeur fixe du composant (par défaut 240px) */
  width?: string | number;
}

/**
 * Props spécifiques au mode MESSAGE
 */
interface MessageAttachmentProps extends CommonAttachmentProps {
  mode?: AttachmentMode.MESSAGE;

  /** Gestionnaire de clic optionnel */
  onClick?: (file: AttachmentType) => void;
}

/**
 * Props spécifiques au mode PREVIEW
 */
interface PreviewAttachmentProps extends CommonAttachmentProps {
  mode?: AttachmentMode.PREVIEW;

  /** Gestionnaire pour supprimer la pièce jointe */
  onRemove?: () => void;

  /** Si le fichier est en cours de téléchargement */
  isUploading?: boolean;

  /** Si le fichier a été téléchargé sur le serveur */
  isUploaded?: boolean;
}

/**
 * Type pour un groupe de pièces jointes
 */
export interface AttachmentGroupProps {
  /** Liste des fichiers à afficher */
  files: (File | AttachmentType)[];

  /** Mode d'affichage des composants */
  mode?: AttachmentMode;

  /** Gestionnaire pour supprimer une pièce jointe (mode PREVIEW) */
  onRemove?: (index: number) => void;

  /** Si les fichiers sont en cours de téléchargement (mode PREVIEW) */
  isUploading?: boolean[];

  /** Si les fichiers ont été téléchargés sur le serveur (mode PREVIEW) */
  isUploaded?: boolean[];

  /** Style supplémentaire */
  sx?: SxProps<Theme>;
}

/**
 * Union des types de props possibles
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
 * Composant unifié pour l'affichage des pièces jointes
 * Fonctionne à la fois en mode message et en mode prévisualisation
 */
const Attachment: React.FC<AttachmentProps> = (props) => {
  const {
    file,
    mode = AttachmentMode.MESSAGE,
    sx,
    iconSx,
    width = 240,
  } = props;

  // Props spécifiques au mode
  const isPreviewMode = mode === AttachmentMode.PREVIEW;

  // Extraire les props spécifiques au mode
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
  const { service } = useMattermost();
  const fileService = createFileService(service);

  // État
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

  // États dérivés
  const baseUrl = service?.getBaseUrl?.() || "";

  // Déterminer si nous avons un objet File ou un objet AttachmentType
  const isLocalFile = !isUploaded && file instanceof File;
  const mattermostFile = isLocalFile ? null : (file as AttachmentType);

  // Obtenir les propriétés du fichier selon le type
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

  // Générer l'URL de miniature pour le fichier
  useEffect(() => {
    const generateThumbnailUrl = async () => {
      try {
        // Réinitialiser l'erreur
        setThumbnailError(false);

        // Pour les fichiers PDF, utiliser l'icône SVG statique
        if (
          fileType.includes("pdf") ||
          fileName.toLowerCase().endsWith(".pdf")
        ) {
          setThumbnailUrl(`${baseUrl}/static/files/00301d72e07c55d59df5.svg`);
          return;
        }

        // Pour les fichiers ZIP, utiliser l'icône ZIP
        if (
          fileType.includes("zip") ||
          fileName.toLowerCase().endsWith(".zip")
        ) {
          setThumbnailUrl(`${baseUrl}/static/files/48c8ed225ff4a2f7a4c1.svg`);
          return;
        }

        // Pour les images téléchargées sur Mattermost, utiliser l'API de miniature
        if (fileId) {
          setThumbnailUrl(`${baseUrl}/api/v4/files/${fileId}/thumbnail`);
          return;
        }

        // Pour les fichiers image locaux, créer une URL d'objet locale
        if (isLocalFile && fileType.includes("image")) {
          const localUrl = URL.createObjectURL(file as File);
          setThumbnailUrl(localUrl);
          return;
        }

        // Pour les autres types de fichiers, ne pas définir d'URL de miniature
        setThumbnailUrl(null);
      } catch (error) {
        console.error("Error generating thumbnail URL:", error);
        setThumbnailError(true);
        setThumbnailUrl(null);
      }
    };

    void generateThumbnailUrl();

    // Nettoyer l'URL d'objet lors du démontage
    return () => {
      if (thumbnailUrl && isLocalFile && fileType.includes("image")) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [file, fileId, isLocalFile, fileType, fileName, baseUrl, isUploaded]);

  // Obtenir l'icône appropriée selon le type de fichier
  const getFileIcon = () => {
    // Vérifier le type de fichier ou l'extension
    if (
      fileType.includes("image") ||
      fileName.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)
    ) {
      return <ImageIcon sx={iconSx} />;
    } else if (
      fileType.includes("pdf") ||
      fileName.toLowerCase().endsWith(".pdf")
    ) {
      return <PdfIcon sx={iconSx} />;
    } else if (
      fileType.includes("video") ||
      fileName.match(/\.(mp4|mov|avi|webm)$/i)
    ) {
      return <VideoIcon sx={iconSx} />;
    } else if (
      fileType.includes("audio") ||
      fileName.match(/\.(mp3|wav|ogg|flac)$/i)
    ) {
      return <AudioIcon sx={iconSx} />;
    } else if (fileName.match(/\.(txt|md|rtf|doc|docx)$/i)) {
      return <TextIcon sx={iconSx} />;
    } else if (
      fileName.match(/\.(js|jsx|ts|tsx|html|css|java|py|c|cpp|php|rb)$/i)
    ) {
      return <CodeIcon sx={iconSx} />;
    } else if (fileName.match(/\.(zip|rar|7z|tar|gz)$/i)) {
      return <ZipIcon sx={iconSx} />;
    } else {
      return <FileIcon sx={iconSx} />;
    }
  };

  // Formater la taille du fichier
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

  // Gestionnaire de clic sur la pièce jointe
  const handleAttachmentClick = () => {
    if (!isPreviewMode && onClick && mattermostFile) {
      onClick(mattermostFile);
    } else if (mattermostFile?.url || mattermostFile?.link) {
      window.open(mattermostFile.url || mattermostFile.link, "_blank");
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    // Calculer la position basée sur l'événement
    setMenuPosition({
      top: event.clientY,
      left: event.clientX,
    });
  };

  const handleMenuClose = () => {
    setMenuPosition(null);
  };

  // Créer un lien public
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

      // Utiliser le service pour créer un lien public
      const publicLink = await fileService.createPublicLink(fileId);

      // Copier le lien dans le presse-papier
      await navigator.clipboard.writeText(publicLink);

      // Notification utilisateur
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

  // Télécharger le fichier
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

  // Fermer la notification snackbar
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
        {/* Miniature ou icône */}
        {thumbnailUrl && !thumbnailError ? (
          <Box
            component="img"
            src={thumbnailUrl}
            alt={fileName}
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

        {/* Informations sur le fichier */}
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

        {/* Boutons d'action (visibles au survol ou toujours sur mobile) */}
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

            <Tooltip title="Télécharger">
              <IconButton size="small" onClick={handleDownload}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Bouton de suppression pour le mode preview */}
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

        {/* Indicateur de chargement pour le mode preview */}
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

      {/* Menu contextuel - seulement avec l'option de création de lien public */}
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
            primary={
              publicLinkLoading
                ? "Création en cours..."
                : "Créer un lien public"
            }
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
 * Composant pour afficher un groupe de pièces jointes côte à côte (en desktop)
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

  // Si on est en mode mobile, empiler les pièces jointes
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

  // En mode desktop et en mode message, afficher les pièces jointes en ligne avec scroll
  if (mode === AttachmentMode.MESSAGE) {
    return (
      <Box
        sx={{
          display: "flex",
          overflowX: "auto",
          gap: 1,
          pb: 1, // Espace pour le scroll horizontal
          ...sx,
        }}
      >
        {files.map((file, index) => (
          <Attachment
            key={index}
            file={file}
            mode={mode}
            width={240} // Largeur fixe pour chaque attachment
          />
        ))}
      </Box>
    );
  }

  // En mode desktop pour d'autres modes (preview), afficher en grille
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
