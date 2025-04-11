// src/components/notification/TypingIndicator.tsx
import React, { useState, useEffect } from "react";
import { Box, Typography, Fade } from "@mui/material";
import { notificationService } from "../../services/notification.service";
import { useMattermost } from "../../context/MattermostProvider";

/**
 * Props pour le composant TypingIndicator
 */
interface TypingIndicatorProps {
  channelId: string;
  maxUsersToShow?: number;
}

/**
 * Affiche un indicateur lorsque des utilisateurs sont en train de taper
 */
const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  channelId,
  maxUsersToShow = 3,
}) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const { service } = useMattermost();

  // Écouter les événements de frappe
  useEffect(() => {
    const unsubscribe = notificationService.addEventListener(
      "typing_updated",
      (data) => {
        if (data.channelId === channelId) {
          setTypingUsers(data.typingUsers || []);
        }
      },
    );

    return unsubscribe;
  }, [channelId]);

  // Charger les noms des utilisateurs en train de taper
  useEffect(() => {
    if (typingUsers.length === 0) return;

    const loadUserNames = async () => {
      try {
        // Récupérer uniquement les utilisateurs dont nous n'avons pas encore les noms
        const usersToFetch = typingUsers.filter((userId) => !userNames[userId]);
        if (usersToFetch.length === 0) return;

        const users = await service.getUsers({ ids: usersToFetch });

        if (users && users.length > 0) {
          const newUserNames = { ...userNames };

          users.forEach((user) => {
            const displayName =
              `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
              user.username;
            newUserNames[user.id] = displayName;
          });

          setUserNames(newUserNames);
        }
      } catch (error) {
        console.error(
          "Erreur lors du chargement des noms d'utilisateurs:",
          error,
        );
      }
    };

    void loadUserNames();
  }, [typingUsers, userNames, service]);

  // Si personne n'est en train de taper, ne rien afficher
  if (typingUsers.length === 0) {
    return null;
  }

  // Formatter le texte de l'indicateur de frappe
  const formatTypingText = () => {
    const typingUserNames = typingUsers
      .slice(0, maxUsersToShow)
      .map((userId) => userNames[userId] || "Someone")
      .filter(Boolean);

    if (typingUserNames.length === 0) {
      return "";
    }

    if (typingUserNames.length === 1) {
      return `${typingUserNames[0]} est en train d'écrire...`;
    }

    if (typingUserNames.length === 2) {
      return `${typingUserNames[0]} et ${typingUserNames[1]} sont en train d'écrire...`;
    }

    if (typingUserNames.length <= maxUsersToShow) {
      const lastUser = typingUserNames.pop();
      return `${typingUserNames.join(", ")} et ${lastUser} sont en train d'écrire...`;
    }

    const remaining = typingUsers.length - maxUsersToShow;
    return `${typingUserNames.join(", ")} et ${remaining} autres sont en train d'écrire...`;
  };

  return (
    <Fade in={typingUsers.length > 0}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          py: 0.5,
          px: 2,
          height: typingUsers.length > 0 ? "auto" : 0,
          opacity: 0.8,
        }}
      >
        {/* Animation de points */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mr: 1,
            "& span": {
              display: "inline-block",
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              bgcolor: "text.secondary",
              mx: 0.25,
              animation: "typing-animation 1.5s infinite",
            },
            "& span:nth-of-type(2)": {
              animationDelay: "0.2s",
            },
            "& span:nth-of-type(3)": {
              animationDelay: "0.4s",
            },
            "@keyframes typing-animation": {
              "0%, 60%, 100%": {
                transform: "scale(1)",
                opacity: 0.5,
              },
              "20%": {
                transform: "scale(1.5)",
                opacity: 1,
              },
            },
          }}
        >
          <span></span>
          <span></span>
          <span></span>
        </Box>

        <Typography
          variant="caption"
          component="div"
          color="text.secondary"
          sx={{ fontStyle: "italic" }}
        >
          {formatTypingText()}
        </Typography>
      </Box>
    </Fade>
  );
};

export default TypingIndicator;
