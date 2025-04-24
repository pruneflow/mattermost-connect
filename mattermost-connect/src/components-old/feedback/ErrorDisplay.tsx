// src/components/feedback/ErrorDisplay.tsx
/**
 * Composants pour afficher des erreurs de manière cohérente
 */
import React, { useState, useEffect } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  IconButton,
  Paper,
  Snackbar,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoIcon from "@mui/icons-material/Info";
import {
  getErrorMessage,
  getSuggestions,
  categorizeError,
} from "../../core/utils/error.utils";
import { useError } from "../../providers/ErrorProvider";

/**
 * Propriétés pour le composant ErrorAlert
 */
interface ErrorAlertProps {
  /** Erreur à afficher */
  error: Error | string | null;

  /** Titre de l'alerte */
  title?: string;

  /** Afficher les suggestions pour résoudre l'erreur */
  showSuggestions?: boolean;

  /** Action à effectuer pour réessayer */
  onRetry?: () => void;

  /** Action de fermeture */
  onClose?: () => void;

  /** Sévérité de l'erreur */
  severity?: "error" | "warning" | "info" | "success";
}

/**
 * Alerte d'erreur avec titre, message et suggestions
 *
 * @example
 * ```tsx
 * <ErrorAlert
 *   error={new Error("Failed to load data")}
 *   title="Data Loading Error"
 *   showSuggestions={true}
 *   onRetry={() => loadData()}
 * />
 * ```
 */
export function ErrorAlert({
  error,
  title = "An error occurred",
  showSuggestions = false,
  onRetry,
  onClose,
  severity = "error",
}: ErrorAlertProps): JSX.Element | null {
  // Ne rien afficher s'il n'y a pas d'erreur
  if (!error) return null;

  const message = getErrorMessage(error);
  const suggestions = showSuggestions ? getSuggestions(error) : [];

  return (
    <Alert
      severity={severity}
      action={
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {onRetry && (
            <Button
              color="inherit"
              size="small"
              onClick={onRetry}
              sx={{ mr: 1 }}
            >
              Retry
            </Button>
          )}
          {onClose && (
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={onClose}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          )}
        </Box>
      }
      sx={{
        mb: 2,
        "& .MuiAlert-message": {
          width: "100%",
        },
      }}
    >
      <AlertTitle>{title}</AlertTitle>
      <Typography variant="body2" gutterBottom>
        {message}
      </Typography>

      {showSuggestions && suggestions.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography
            variant="caption"
            component="div"
            sx={{ fontWeight: "bold", mb: 0.5 }}
          >
            Suggestions:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {suggestions.map((suggestion, index) => (
              <li key={index}>
                <Typography variant="caption">{suggestion}</Typography>
              </li>
            ))}
          </ul>
        </Box>
      )}
    </Alert>
  );
}

/**
 * Propriétés pour le composant ErrorToast
 */
interface ErrorToastProps {
  /** Erreur à afficher */
  error: Error | string | null;

  /** Indique si le toast est ouvert */
  open: boolean;

  /** Fonction appelée à la fermeture */
  onClose: () => void;

  /** Durée d'affichage en ms */
  autoHideDuration?: number;

  /** Position horizontale */
  horizontal?: "left" | "center" | "right";

  /** Position verticale */
  vertical?: "top" | "bottom";
}

/**
 * Toast pour afficher une erreur temporairement
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(true);
 *
 * <ErrorToast
 *   error={error}
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   autoHideDuration={5000}
 * />
 * ```
 */
export function ErrorToast({
  error,
  open,
  onClose,
  autoHideDuration = 6000,
  horizontal = "center",
  vertical = "bottom",
}: ErrorToastProps): JSX.Element | null {
  // Ne rien afficher s'il n'y a pas d'erreur
  if (!error) return null;

  const message = getErrorMessage(error);

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical, horizontal }}
    >
      <Alert severity="error" onClose={onClose} sx={{ width: "100%" }}>
        {message}
      </Alert>
    </Snackbar>
  );
}

/**
 * Propriétés pour le composant ErrorBoundaryFallback
 */
interface ErrorBoundaryFallbackProps {
  /** Erreur capturée */
  error: Error;

  /** Fonction pour réinitialiser l'erreur */
  resetError: () => void;

  /** Titre de l'erreur */
  title?: string;

  /** Message personnalisé */
  message?: string;

  /** Afficher les détails techniques */
  showDetails?: boolean;
}

/**
 * Composant de fallback pour ErrorBoundary
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={(error, resetError) => (
 *     <ErrorBoundaryFallback
 *       error={error}
 *       resetError={resetError}
 *       title="Component Error"
 *     />
 *   )}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export function ErrorBoundaryFallback({
  error,
  resetError,
  title = "Something went wrong",
  message,
  showDetails = false,
}: ErrorBoundaryFallbackProps): JSX.Element {
  const errorMessage = message || getErrorMessage(error);
  const [expanded, setExpanded] = useState(false);

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        m: 2,
        maxWidth: "600px",
        mx: "auto",
        border: "1px solid #f44336",
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <ErrorOutlineIcon color="error" sx={{ mr: 1, fontSize: 28 }} />
        <Typography variant="h5" component="h2" color="error">
          {title}
        </Typography>
      </Box>

      <Typography variant="body1" paragraph>
        {errorMessage}
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={resetError}
          sx={{ mr: 1 }}
        >
          Try Again
        </Button>

        {showDetails && (
          <Button
            variant="outlined"
            color="info"
            onClick={() => setExpanded(!expanded)}
            size="small"
          >
            {expanded ? "Hide" : "Show"} Technical Details
          </Button>
        )}
      </Box>

      {showDetails && (
        <Collapse in={expanded}>
          <Paper variant="outlined" sx={{ p: 2, backgroundColor: "#f5f5f5" }}>
            <Typography
              variant="caption"
              component="pre"
              sx={{ whiteSpace: "pre-wrap" }}
            >
              {error.stack || error.toString()}
            </Typography>
          </Paper>
        </Collapse>
      )}
    </Paper>
  );
}

/**
 * Propriétés pour le composant GlobalErrorListener
 */
interface GlobalErrorListenerProps {
  /** Filtrer les erreurs à afficher */
  filter?: (error: Error) => boolean;

  /** Durée d'affichage en ms */
  duration?: number;

  /** Position horizontale */
  horizontal?: "left" | "center" | "right";

  /** Position verticale */
  vertical?: "top" | "bottom";
}

/**
 * Composant qui écoute et affiche les erreurs globales
 *
 * @example
 * ```tsx
 * // Placer dans un composant racine
 * <GlobalErrorListener
 *   duration={5000}
 *   vertical="top"
 * />
 * ```
 */
export function GlobalErrorListener({
  filter,
  duration = 6000,
  horizontal = "center",
  vertical = "bottom",
}: GlobalErrorListenerProps): JSX.Element {
  const { lastError, clearErrors, subscribeToErrors } = useError();
  const [currentError, setCurrentError] = useState<Error | null>(null);
  const [open, setOpen] = useState(false);

  // S'abonner aux erreurs
  useEffect(() => {
    // Si une erreur est déjà présente au montage
    if (lastError && (!filter || filter(lastError))) {
      setCurrentError(lastError);
      setOpen(true);
    }

    // S'abonner aux nouvelles erreurs
    const unsubscribe = subscribeToErrors((error) => {
      if (!filter || filter(error)) {
        setCurrentError(error);
        setOpen(true);
      }
    });

    return unsubscribe;
  }, [lastError, subscribeToErrors, filter]);

  // Gérer la fermeture
  const handleClose = () => {
    setOpen(false);
    // Nettoyer après animation
    setTimeout(() => {
      setCurrentError(null);
      clearErrors();
    }, 300);
  };

  return (
    <ErrorToast
      error={currentError}
      open={open}
      onClose={handleClose}
      autoHideDuration={duration}
      horizontal={horizontal}
      vertical={vertical}
    />
  );
}

/**
 * Propriétés pour le composant NetworkErrorBanner
 */
interface NetworkErrorBannerProps {
  /** Intervalle de vérification de connexion en ms */
  checkInterval?: number;
}

/**
 * Bannière qui s'affiche en cas de problème de connexion réseau
 *
 * @example
 * ```tsx
 * // Placer en haut de l'application
 * <NetworkErrorBanner checkInterval={10000} />
 * ```
 */
export function NetworkErrorBanner({
  checkInterval = 10000,
}: NetworkErrorBannerProps): JSX.Element | null {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Vérifier périodiquement la connexion
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Écouter les événements de connectivité
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Vérifier périodiquement avec un ping
    let interval: number | null = null;
    if (checkInterval > 0) {
      interval = window.setInterval(() => {
        // Simple requête pour vérifier la connectivité
        fetch("/api/health-check", {
          method: "HEAD",
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        })
          .then(() => setIsOffline(false))
          .catch(() => setIsOffline(!navigator.onLine));
      }, checkInterval);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, [checkInterval]);

  // Ne rien afficher si en ligne
  if (!isOffline) return null;

  return (
    <Box sx={{ width: "100%" }}>
      <Alert
        severity="warning"
        icon={<InfoIcon />}
        sx={{
          borderRadius: 0,
          justifyContent: "center",
        }}
      >
        <Typography variant="body2">
          You appear to be offline. Some features may be unavailable.
        </Typography>
      </Alert>
    </Box>
  );
}
