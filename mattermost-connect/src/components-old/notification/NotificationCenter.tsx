// src/components/notification/NotificationCenter.tsx
import React, { useState, useEffect } from "react";
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Badge,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  DoneAll as DoneAllIcon,
  Chat as ChatIcon,
  Announcement as AnnouncementIcon,
  Person as PersonIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { Notification } from "../../services/";
import { useMattermost } from "../../context";
import { formatTimestamp, generateColorFromString } from "../../utils";
import { assertServiceInitialized } from "../../services";

/**
 * Props pour le composant NotificationCenter
 */
interface NotificationCenterProps {
  onNavigateToChannel?: (notification: Notification) => void;
}

/**
 * Centre de notifications pour l'application
 */
const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onNavigateToChannel,
}) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { services } = useMattermost();
  assertServiceInitialized(services, "NotificationSnackbar requires services");
  assertServiceInitialized(
    services.notificationService,
    "NotificationSnackbar requires notificationService",
  );
  // Charger les notifications initiales
  useEffect(() => {
    setNotifications(services.notificationService.getNotifications());

    // Écouter les nouvelles notifications
    const removeListener = services.notificationService.addEventListener(
      "notification_added",
      (notification: Notification) => {
        setNotifications((prev) => [notification, ...prev]);
      },
    );

    // Écouter les mises à jour de toutes les notifications
    const updateListener = services.notificationService.addEventListener(
      "notifications_updated",
      (updatedNotifications: Notification[]) => {
        setNotifications([...updatedNotifications]);
      },
    );

    return () => {
      removeListener();
      updateListener();
    };
  }, []);

  // Calculer le nombre de notifications non lues
  useEffect(() => {
    setUnreadCount(
      notifications.filter((notification) => !notification.read).length,
    );
  }, [notifications]);

  // Ouvrir/fermer le centre de notifications
  const toggleDrawer = () => {
    setOpen(!open);
  };

  // Marquer une notification comme lue
  const handleMarkAsRead = (notificationId: string) => {
    services.notificationService.markNotificationAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
    );
  };

  // Marquer toutes les notifications comme lues
  const handleMarkAllAsRead = () => {
    services.notificationService.markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Effacer toutes les notifications
  const handleClearAll = () => {
    services.notificationService.clearNotifications();
    setNotifications([]);
  };

  // Naviguer vers un canal et/ou message
  const handleNavigateToNotification = (notification: Notification) => {
    if (notification.channelId && onNavigateToChannel) {
      onNavigateToChannel(notification);
      handleMarkAsRead(notification.id);
      setOpen(false);
    }
  };

  // Obtenir l'icône de notification en fonction du type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "message":
        return <ChatIcon />;
      case "mention":
        return <PersonIcon />;
      case "system":
        return <AnnouncementIcon />;
      case "error":
        return <ErrorIcon color="error" />;
      default:
        return <NotificationsIcon />;
    }
  };

  return (
    <>
      {/* Bouton de notifications avec badge */}
      <Tooltip title="Notifications">
        <IconButton color="inherit" onClick={toggleDrawer}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Drawer des notifications */}
      <Drawer
        anchor="right"
        open={open}
        onClose={toggleDrawer}
        slotProps={{
          paper: { sx: { width: { xs: "100%", sm: 350 }, maxWidth: "100%" } },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6" component="div">
            Notifications
          </Typography>
          <Box>
            <IconButton
              size="small"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              title="Marquer tout comme lu"
            >
              <DoneAllIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleClearAll}
              disabled={notifications.length === 0}
              title="Effacer tout"
            >
              <DeleteIcon />
            </IconButton>
            <IconButton size="small" onClick={toggleDrawer}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Divider />

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <NotificationsIcon
              sx={{ fontSize: 48, color: "text.disabled", mb: 2 }}
            />
            <Typography color="text.secondary" component="div">
              Aucune notification
            </Typography>
          </Box>
        ) : (
          <List>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                alignItems="flex-start"
                sx={{
                  bgcolor: notification.read ? "transparent" : "action.hover",
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "action.selected",
                  },
                }}
                onClick={() => handleNavigateToNotification(notification)}
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification.id);
                    }}
                  >
                    {notification.read ? <CloseIcon /> : <DoneAllIcon />}
                  </IconButton>
                }
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: generateColorFromString(notification.title),
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography
                      variant="subtitle2"
                      component="div"
                      fontWeight={notification.read ? 400 : 600}
                    >
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography
                        variant="body2"
                        component="div"
                        color="text.primary"
                      >
                        {notification.content}
                      </Typography>
                      <Typography
                        variant="caption"
                        component="div"
                        color="text.secondary"
                      >
                        {formatTimestamp(notification.timestamp)}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Drawer>
    </>
  );
};

export default NotificationCenter;
