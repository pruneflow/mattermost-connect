// src/components/common/AuthErrorHandler.tsx
import React, { useEffect, useState } from "react";
import { useMattermost } from "../../context/MattermostProvider";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";

/**
 * Props du composant AuthErrorHandler
 */
interface AuthErrorHandlerProps {
  /** Fonction à appeler après une réauthentification réussie */
  onAuthSuccess?: () => void;
  /** Fonction à appeler après un échec de réauthentification */
  onAuthFailure?: () => void;
  /** Fonction à appeler lorsque l'utilisateur annule la réauthentification */
  onCancel?: () => void;
  /** Si l'erreur d'authentification est active */
  authError?: boolean;
  /** Si la boîte de dialogue doit être visible */
  open?: boolean;
  /** Fonction pour fermer la boîte de dialogue */
  onClose?: () => void;
  /** Message personnalisé à afficher */
  message?: string;
  /** Titre personnalisé */
  title?: string;
}

/**
 * Composant qui gère les erreurs d'authentification à l'échelle de l'application
 */
const AuthErrorHandler: React.FC<AuthErrorHandlerProps> = ({
  onAuthSuccess,
  onAuthFailure,
  onCancel,
  authError = false,
  open: externalOpen,
  onClose: externalOnClose,
  message = "Votre session semble avoir expiré. Voulez-vous essayer de vous reconnecter automatiquement ?",
  title = "Problème d'authentification",
}) => {
  // État local pour gérer la boîte de dialogue si aucun contrôle externe n'est fourni
  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [notificationOpen, setNotificationOpen] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>("");
  const [notificationSeverity, setNotificationSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("info");

  // Accéder au contexte Mattermost
  const { services } = useMattermost();
  const fileService = services?.fileService;
  const mattermostService = services?.mattermostService;
  // Déterminer si la boîte de dialogue doit être ouverte (contrôle externe ou interne)
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;

  // Fonction de fermeture (externe ou interne)
  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalOpen(false);
    }

    if (onCancel) {
      onCancel();
    }
  };

  // Surveiller les changements d'état d'erreur d'authentification
  useEffect(() => {
    // Si une erreur d'authentification est détectée, ouvrir la boîte de dialogue
    if (authError && externalOpen === undefined) {
      setInternalOpen(true);
    }
  }, [authError, externalOpen]);

  // Gestionnaire de tentative de réauthentification
  const handleRetryAuth = async () => {
    setIsRetrying(true);

    try {
      // Essayer d'abord d'utiliser le service de fichiers amélioré s'il est disponible
      if (fileService && "handleAuthError" in fileService) {
        const success = await (fileService as any).handleAuthError();

        if (success) {
          setNotificationMessage("Reconnexion réussie !");
          setNotificationSeverity("success");
          setNotificationOpen(true);

          // Fermer la boîte de dialogue
          if (externalOnClose) {
            externalOnClose();
          } else {
            setInternalOpen(false);
          }

          // Appeler le callback de succès
          if (onAuthSuccess) {
            onAuthSuccess();
          }

          return;
        }
      }

      // Essayer de rafraîchir l'utilisateur actuel pour forcer une réauthentification
      if (mattermostService?.refreshCurrentUser) {
        await mattermostService?.refreshCurrentUser();

        setNotificationMessage("Reconnexion réussie !");
        setNotificationSeverity("success");
        setNotificationOpen(true);

        // Fermer la boîte de dialogue
        if (externalOnClose) {
          externalOnClose();
        } else {
          setInternalOpen(false);
        }

        // Appeler le callback de succès
        if (onAuthSuccess) {
          onAuthSuccess();
        }

        return;
      }

      // Si aucune des méthodes n'a fonctionné
      setNotificationMessage(
        "Échec de la reconnexion. Veuillez vous reconnecter manuellement.",
      );
      setNotificationSeverity("error");
      setNotificationOpen(true);

      // Appeler le callback d'échec
      if (onAuthFailure) {
        onAuthFailure();
      }
    } catch (error) {
      console.error(
        "Erreur lors de la tentative de réauthentification:",
        error,
      );

      setNotificationMessage(
        "Erreur lors de la tentative de réauthentification",
      );
      setNotificationSeverity("error");
      setNotificationOpen(true);

      // Appeler le callback d'échec
      if (onAuthFailure) {
        onAuthFailure();
      }
    } finally {
      setIsRetrying(false);
    }
  };

  // Fermer la notification
  const handleNotificationClose = () => {
    setNotificationOpen(false);
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={handleClose}
        aria-labelledby="auth-error-dialog-title"
      >
        <DialogTitle id="auth-error-dialog-title">{title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="inherit">
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

      <Snackbar
        open={notificationOpen}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleNotificationClose}
          severity={notificationSeverity}
          variant="filled"
        >
          {notificationMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AuthErrorHandler;
