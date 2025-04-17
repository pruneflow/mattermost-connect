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
import { Notification } from "../../services/notification.service";
import { useMattermost } from "../../context/MattermostProvider";
import { getInitials, generateColorFromString } from "../../utils";

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
 */
const NotificationSnackbar: React.FC<NotificationSnackbarProps> = ({
  notification,
  onClose,
  onClick,
  autoHideDuration = 5000,
}) => {
  const [open, setOpen] = useState(true);
  const { service } = useMattermost();
  const [senderName, setSenderName] = useState<string>(notification.title);
  const [avatarInitials, setAvatarInitials] = useState<string>("");

  // Charger les informations de l'expéditeur si disponibles
  useEffect(() => {
    const loadSenderInfo = async () => {
      // Si nous avons un ID d'expéditeur dans la notification
      if (notification.sender?.id) {
        try {
          const users = await service.getUsers({
            ids: [notification.sender.id],
          });
          if (users && users.length > 0) {
            const sender = users[0];
            setSenderName(
              `${sender.first_name || ""} ${sender.last_name || ""}`.trim() ||
                sender.username,
            );
            setAvatarInitials(
              getInitials(
                `${sender.first_name || ""} ${sender.last_name || ""}`.trim() ||
                  sender.username,
              ),
            );
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
  }, [notification, service]);

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
      slots={{ transition: SlideTransition }}
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
