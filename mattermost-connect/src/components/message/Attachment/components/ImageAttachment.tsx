// src/components/message/Attachment/components/ImageAttachment.tsx
import React, { useState, useEffect } from "react";
import {
  alpha,
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { ImageAttachmentProps } from "../types/AttachmentTypes";
import {
  Error as ErrorIcon,
  Image as ImageIcon,
  Lock as LockIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  Archive as ArchiveIcon,
} from "@mui/icons-material";
import { useMattermost } from "../../../../context";

/**
 * Vérifie si le fichier est de type PDF
 */
const isPdfType = (type: string, fileName?: string): boolean => {
  return (
    type.includes("pdf") || (fileName ? /\.(pdf)$/i.test(fileName) : false)
  );
};

/**
 * Vérifie si le fichier est une archive
 */
const isArchiveType = (type: string, fileName?: string): boolean => {
  return (
    type.includes("zip") ||
    type.includes("archive") ||
    type.includes("odt") ||
    (fileName ? /\.(zip|rar|7z|tar|gz)$/i.test(fileName) : false)
  );
};

/**
 * Component for displaying image attachments with secure thumbnail loading
 * Supports PDF and archive file types as well
 */
const ImageAttachment: React.FC<ImageAttachmentProps> = ({
  thumbnailError: propsThumbnailError,
  setThumbnailError,
  fileName,
  onImageClick,
  fileId, // ID pour récupérer le fichier directement
  fileType, // Type de fichier pour déterminer l'icône
  sx,
}) => {
  const [loadAttempts, setLoadAttempts] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorType, setErrorType] = useState<"auth" | "load" | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [secureUrl, setSecureUrl] = useState<string | null>(null);
  const { services } = useMattermost();
  const mattermostService = services?.mattermostService;
  const fileService = services?.fileService;
  const baseUrl = mattermostService?.getBaseUrl?.() || "";

  // Détermine le type de fichier
  const isPdf = isPdfType(fileType || "", fileName);
  const isArchive = isArchiveType(fileType || "", fileName);
  const isImage = !isPdf && !isArchive;

  // Chargement de la miniature ou de l'icône appropriée
  useEffect(() => {
    // Si c'est un PDF ou une archive, on utilise une icône statique
    if (isPdf) {
      setSecureUrl(`${baseUrl}/static/files/00301d72e07c55d59df5.svg`);
      return;
    }

    if (isArchive) {
      setSecureUrl(`${baseUrl}/static/files/48c8ed225ff4a2f7a4c1.svg`);
      return;
    }

    // Pour les images, on utilise la méthode sécurisée
    const loadSecureThumbnail = async () => {
      if (!fileId) return;

      setErrorType(null);
      setThumbnailError(false);

      setIsLoading(true);

      try {
        // Utiliser la nouvelle méthode du service de fichiers
        const thumbnailBlobUrl = await fileService?.fetchThumbnail(fileId);
        if (thumbnailBlobUrl) setSecureUrl(thumbnailBlobUrl);
      } catch (error) {
        console.error("Erreur lors du chargement de la miniature:", error);

        // Déterminer le type d'erreur
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes("401") ||
          errorMessage.includes("unauthorized") ||
          errorMessage.includes("session invalide")
        ) {
          setErrorType("auth");
        } else {
          setErrorType("load");
        }

        setThumbnailError(true);
      } finally {
        setIsLoading(false);
      }
    };

    // Si c'est une image, charger la miniature
    if (isImage) {
      void loadSecureThumbnail();
    }

    // Nettoyer l'URL blob à la destruction du composant
    return () => {
      if (secureUrl && secureUrl.startsWith("blob:") && fileService) {
        fileService.revokeObjectURL(secureUrl);
      }
    };
  }, [fileId, fileService, loadAttempts, isImage, baseUrl, isPdf, isArchive]);

  // Reset error state when the fileId changes
  useEffect(() => {
    if (fileId) {
      setErrorType(null);
      setThumbnailError(false);
    }
  }, [fileId, setThumbnailError]);

  // Handle image load errors (fallback)
  const handleImageError = (
    _e: React.SyntheticEvent<HTMLImageElement, Event>,
  ) => {
    // Si l'image ne se charge pas, on affiche une erreur
    setErrorType("load");
    setThumbnailError(true);
  };

  // Attempt to refresh/reload the image
  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      // Incrémenter le compteur de tentatives pour forcer le rechargement
      setLoadAttempts((prev) => prev + 1);

      // Si c'est une erreur d'auth, tenter une réauthentification
      if (
        errorType === "auth" &&
        fileService &&
        "handleAuthError" in fileService
      ) {
        await fileService.handleAuthError();
      }

      // Réinitialiser l'URL sécurisée pour forcer un nouveau chargement
      if (secureUrl && secureUrl.startsWith("blob:")) {
        fileService?.revokeObjectURL(secureUrl);
      }
      setSecureUrl(null);

      // Reset error state
      setThumbnailError(false);
      setErrorType(null);
    } catch (error) {
      console.error("Error refreshing image:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Determine appropriate error icon based on error type
  const getErrorIcon = () => {
    if (errorType === "auth") {
      return <LockIcon />;
    }
    return <ErrorIcon />;
  };

  // Determine appropriate file type icon
  const getFileTypeIcon = () => {
    if (isPdf) {
      return <PdfIcon />;
    }
    if (isArchive) {
      return <ArchiveIcon />;
    }
    return <ImageIcon />;
  };

  const refresh = (e: any) => {
    e.stopPropagation();
    void handleRefresh();
  };

  return (
    <>
      {isLoading ? (
        // État de chargement
        <Box
          sx={{
            mr: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 1,
            bgcolor: (theme) => alpha(theme.palette.action.hover, 0.5),
            ...sx,
          }}
        >
          <CircularProgress size={24} />
        </Box>
      ) : secureUrl && !propsThumbnailError ? (
        // Pour les PDF et archives, on affiche simplement l'icône
        isPdf || isArchive ? (
          <Box
            component="img"
            src={secureUrl}
            alt={fileName}
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              mr: 1.5,
              ...sx,
            }}
            onClick={onImageClick}
          />
        ) : (
          // Pour les images, on affiche la miniature
          <Box
            component="img"
            src={secureUrl}
            alt={fileName}
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              objectFit: "cover",
              mr: 1.5,
              ...sx,
            }}
            onClick={onImageClick}
            onError={handleImageError}
          />
        )
      ) : (
        // État d'erreur ou par défaut
        <Box
          sx={{
            mr: 1.5,
            color: propsThumbnailError
              ? errorType === "auth"
                ? "warning.main"
                : "error.main"
              : "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 1,
            bgcolor: (theme) => alpha(theme.palette.action.hover, 0.5),
            position: "relative",
            ...sx,
          }}
        >
          {propsThumbnailError ? getErrorIcon() : getFileTypeIcon()}

          {/* Refresh button that appears on error */}
          {propsThumbnailError && (
            <Tooltip title="Rafraîchir">
              <IconButton
                size="small"
                onClick={refresh}
                sx={{
                  position: "absolute",
                  bottom: -8,
                  right: -8,
                  bgcolor: "background.paper",
                  width: 20,
                  height: 20,
                  padding: 0,
                  boxShadow: 1,
                  "&:hover": {
                    bgcolor: "primary.light",
                    color: "primary.contrastText",
                  },
                  "& .MuiSvgIcon-root": {
                    fontSize: 14,
                  },
                }}
                disabled={isRefreshing}
              >
                <RefreshIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
    </>
  );
};

export default ImageAttachment;
