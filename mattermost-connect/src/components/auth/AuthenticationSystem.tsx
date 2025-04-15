// src/components/auth/AuthenticationSystem.tsx
import React, { useState, useEffect } from "react";
import { useAuthRetry } from "../../hooks/useAuthRetry";
import AuthErrorHandler from "../common/AuthErrorHandler";
import { useMattermost } from "../../context/MattermostProvider";
import { Snackbar, Alert } from "@mui/material";

/**
 * Props pour le système d'authentification
 */
interface AuthenticationSystemProps {
  /**
   * Composants enfants
   */
  children: React.ReactNode;

  /**
   * Callback à appeler lorsque l'utilisateur est déconnecté
   */
  onLogout?: () => void;

  /**
   * Fréquence de vérification de l'authentification (en ms)
   * @default 60000 (1 minute)
   */
  authCheckInterval?: number;
}

/**
 * Composant principal qui gère l'authentification à l'échelle de l'application
 *
 * Ce composant doit être placé au plus haut niveau de votre application,
 * en englobant tous les composants qui ont besoin d'authentification.
 */
const AuthenticationSystem: React.FC<AuthenticationSystemProps> = ({
  children,
  onLogout,
  authCheckInterval = 60000, // 1 minute par défaut
}) => {
  const [authDialogOpen, setAuthDialogOpen] = useState<boolean>(false);
  const [authCheckTimer, setAuthCheckTimer] = useState<number | null>(null);
  const { isConnected, service, fileService } = useMattermost();

  // Utiliser notre hook personnalisé
  const { error, resetError } = useAuthRetry({
    onAuthError: () => {
      setAuthDialogOpen(true);
    },
    onMaxRetriesExceeded: () => {
      // Si toutes les tentatives échouent, déconnecter l'utilisateur
      if (onLogout) {
        onLogout();
      }
    },
  });

  // Vérifier périodiquement l'authentification
  useEffect(() => {
    if (!isConnected || !fileService || authCheckInterval <= 0) {
      // Ne pas vérifier si pas connecté ou pas d'intervalle configuré
      return;
    }

    // Fonction de vérification d'authentification
    const checkAuthentication = async () => {
      try {
        // Vérifier si le fileService a une méthode isAuthenticated
        if ("isAuthenticated" in fileService) {
          const isAuth = (fileService as any).isAuthenticated();
          if (!isAuth) {
            setAuthDialogOpen(true);
          }
        } else if (service.mode === "direct") {
          // Pour le mode direct, essayer de récupérer l'utilisateur courant
          await service.getCurrentUser();
        }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification d'authentification:",
          error,
        );

        if (
          error instanceof Error &&
          (error.message.includes("401") ||
            error.message.includes("unauthorized") ||
            error.message.includes("session invalide") ||
            error.message.includes("invalid session"))
        ) {
          setAuthDialogOpen(true);
        }
      }
    };

    // Démarrer le timer
    const timer = window.setInterval(checkAuthentication, authCheckInterval);
    setAuthCheckTimer(timer);

    // Nettoyer le timer à la destruction du composant
    return () => {
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, [isConnected, service, fileService, authCheckInterval, onLogout]);

  // Nettoyer le timer lorsque le composant est démonté
  useEffect(() => {
    return () => {
      if (authCheckTimer) {
        window.clearInterval(authCheckTimer);
      }
    };
  }, [authCheckTimer]);

  // Si une erreur d'authentification est détectée, afficher la boîte de dialogue
  useEffect(() => {
    if (error && isAuthError(error)) {
      setAuthDialogOpen(true);
    }
  }, [error]);

  // Fonction pour vérifier si une erreur est liée à l'authentification
  const isAuthError = (error: Error): boolean => {
    return (
      error.message.includes("401") ||
      error.message.includes("unauthorized") ||
      error.message.includes("session invalide") ||
      error.message.includes("invalid session")
    );
  };

  // Gérer la fermeture de la boîte de dialogue
  const handleAuthDialogClose = () => {
    setAuthDialogOpen(false);
    resetError();
  };

  // Gérer le succès de l'authentification
  const handleAuthSuccess = () => {
    setAuthDialogOpen(false);
    resetError();
  };

  // Gérer l'échec de l'authentification
  const handleAuthFailure = () => {
    // Si toutes les tentatives échouent, déconnecter l'utilisateur
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <>
      {children}

      {/* Boîte de dialogue d'erreur d'authentification */}
      <AuthErrorHandler
        open={authDialogOpen}
        onClose={handleAuthDialogClose}
        onAuthSuccess={handleAuthSuccess}
        onAuthFailure={handleAuthFailure}
        message="Votre session a expiré ou n'est plus valide. Voulez-vous vous reconnecter automatiquement ?"
        title="Session expirée"
      />
    </>
  );
};

export default AuthenticationSystem;
