// src/components/notification/NotificationSnackbar.tsx
import React, { useState, useEffect } from "react";
import {
  Snackbar,
  Alert,
  Typography,
  Box,
  Avatar,
  Button,
  Slide,
  SlideProps,
} from "@mui/material";
import { Notification } from "../../services/notification/notification.service";
import { useMattermost } from "../../context/MattermostProvider";
import { getInitials, generateColorFromString } from "../../utils/formatting";
import { assertServiceInitialized } from "../../services/factory";

/**
 * Props pour le composant NotificationSnackbar
 */
interface NotificationSnackbarProps {
  notification: Notification;
  onClose: () => void;
  onClick?: () => void;
  autoHideDuration?: number;
}

/**
 * Transition personnalisée pour les notifications
 */
function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="down" />;
}

/**
 * Affiche une notification sous forme de Snackbar
 *
 * Ce composant gère l'affichage d'une notification à l'écran sous forme d'une Snackbar Material-UI.
 * Il charge les informations de l'expéditeur si disponibles, et permet de naviguer vers le message en cliquant.
 *
 * Voici comment il fonctionne en détail:
 * 1. Il reçoit une notification via les props, ainsi que des callbacks pour gérer la fermeture et le clic.
 * 2. Il utilise le hook useMattermost pour accéder aux services Mattermost nécessaires.
 * 3. Dans un useEffect, il charge les informations de l'expéditeur si un ID est fourni dans la notification.
 *    - Il utilise le mattermostService pour récupérer les données utilisateur.
 *    - Il met à jour le nom et les initiales de l'avatar avec ces informations.
 * 4. Il gère la fermeture de la notification lorsque l'utilisateur clique en dehors ou sur le bouton de fermeture.
 * 5. Si la notification a un channelId et qu'un onClick est fourni, il permet de naviguer vers le message en cliquant sur la Snackbar.
 * 6. Il détermine la sévérité de l'alerte (couleur) en fonction du type de notification.
 * 7. Il affiche le contenu de la notification avec un avatar de l'expéditeur et un bouton pour voir le message si applicable.
 *
 * En résumé, ce composant fournit une interface visuelle pratique pour afficher des notifications Mattermost à l'utilisateur,
 * avec des interactions pour fermer la notification ou naviguer vers le contenu lié.
 */
const NotificationSnackbar: React.FC<NotificationSnackbarProps> = ({
  notification,
  onClose,
  onClick,
  autoHideDuration = 5000,
}) => {
  const [open, setOpen] = useState(true);
  const { services } = useMattermost();
  const [senderName, setSenderName] = useState<string>(notification.title);
  const [avatarInitials, setAvatarInitials] = useState<string>("");

  assertServiceInitialized(services, "NotificationSnackbar requires services");
  assertServiceInitialized(
    services.mattermostService,
    "NotificationSnackbar requires MattermostService",
  );

  const mattermostService = services.mattermostService;

  // Charger les informations de l'expéditeur si disponibles
  useEffect(() => {
    const loadSenderInfo = async () => {
      // Si nous avons un ID d'expéditeur dans la notification
      if (notification.sender?.id) {
        try {
          const users = await mattermostService.getUsers({
            ids: [notification.sender.id],
          });

          if (users && users.length > 0) {
            const sender = users[0];
            const displayName = `${sender.first_name || ""} ${
              sender.last_name || ""
            }`.trim();

            setSenderName(displayName || sender.username);

            // Générer les initiales de l'avatar à partir du nom complet ou du nom d'utilisateur
            setAvatarInitials(getInitials(displayName || sender.username));
          }
        } catch (error) {
          console.error(
            "Erreur lors du chargement des informations de l'expéditeur:",
            error,
          );
        }
      }
    };

    void loadSenderInfo();
  }, [notification, mattermostService]);

  // Gérer la fermeture de la notification
  const handleClose = (
    event: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setOpen(false);
    onClose();
  };

  // Gérer le clic sur la notification
  const handleClick = () => {
    if (onClick) {
      onClick();
      handleClose({} as Event);
    }
  };

  // Déterminer la sévérité de l'alerte en fonction du type de notification
  const getSeverity = () => {
    switch (notification.type) {
      case "mention":
        return "warning";
      case "error":
        return "error";
      case "system":
        return "info";
      default:
        return "info";
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      TransitionComponent={SlideTransition}
    >
      <Alert
        onClose={handleClose}
        severity={getSeverity()}
        variant="filled"
        elevation={6}
        sx={{ width: "100%", cursor: onClick ? "pointer" : "default" }}
        onClick={handleClick}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              mr: 1.5,
              bgcolor: generateColorFromString(senderName),
            }}
          >
            {avatarInitials}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" component="div">
              {senderName}
            </Typography>
            <Typography variant="body2" component="div">
              {notification.content}
            </Typography>
          </Box>
        </Box>

        {notification.channelId && (
          <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end" }}>
            <Button
              size="small"
              color="inherit"
              sx={{ textTransform: "none", opacity: 0.8 }}
              onClick={handleClick}
            >
              Voir le message
            </Button>
          </Box>
        )}
      </Alert>
    </Snackbar>
  );
};

export default NotificationSnackbar;
