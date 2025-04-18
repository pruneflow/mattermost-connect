// src/components/notification/TypingIndicator.tsx
import React from "react";
import { Box, Typography, Fade } from "@mui/material";
import { useMattermost } from "../../context";

/**
 * Props pour le composant TypingIndicator
 */
interface TypingIndicatorProps {
  channelId: string;
  maxUsersToShow?: number;
}

/**
 * Affiche un indicateur lorsque des utilisateurs sont en train de taper
 * Utilise le contexte MattermostContext pour accéder aux utilisateurs qui tapent
 */
const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  channelId,
  maxUsersToShow = 3,
}) => {
  // Utiliser les nouvelles méthodes du MattermostProvider
  const { getTypingIndicatorText, getTypingUsersForChannel } = useMattermost();

  // Obtenir le texte formaté pour l'indicateur
  const typingText = getTypingIndicatorText(channelId);

  // Obtenir les utilisateurs qui tapent pour vérifier s'il y en a
  const typingUsers = getTypingUsersForChannel(channelId);
  const isTyping = typingUsers.length > 0;

  if (!isTyping) return null;

  return (
    <Fade in={isTyping}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          py: 0.5,
          px: 2,
          height: "auto",
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
          {typingText}
        </Typography>
      </Box>
    </Fade>
  );
};

export default TypingIndicator;
