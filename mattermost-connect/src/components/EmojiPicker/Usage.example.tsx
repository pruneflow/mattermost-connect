// src/components/EmojiPicker/Usage.example.tsx
// Exemple d'utilisation du composant EmojiPicker

import React, { useState } from "react";
import {
  Button,
  IconButton,
  Box,
  Typography,
  Popover,
  Paper,
} from "@mui/material";
import { EmojiEmotions, AddReaction } from "@mui/icons-material";

// Importer le composant EmojiPicker et ses types
import { EmojiPicker, PickerMode, EmojiSelectionResult } from "./index";

/**
 * Exemple d'utilisation du EmojiPicker pour un composant de message
 */
export const MessageWithReactions = () => {
  // Ancre pour le popover
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLElement | null>(null);
  const [reactionAnchorEl, setReactionAnchorEl] = useState<HTMLElement | null>(
    null,
  );

  // État pour les réactions et le contenu du message
  const [reactions, setReactions] = useState<string[]>([]);
  const [messageContent, setMessageContent] = useState<string>(
    "Voici un exemple de message auquel on peut ajouter des emojis et des réactions!",
  );

  // Gestionnaires pour les popovers
  const handleEmojiClick = (event: React.MouseEvent<HTMLElement>) => {
    setEmojiAnchorEl(event.currentTarget);
  };

  const handleReactionClick = (event: React.MouseEvent<HTMLElement>) => {
    setReactionAnchorEl(event.currentTarget);
  };

  const handleCloseEmoji = () => {
    setEmojiAnchorEl(null);
  };

  const handleCloseReaction = () => {
    setReactionAnchorEl(null);
  };

  // Gestionnaire pour la sélection d'emoji dans le message
  const handleEmojiSelect = (result: EmojiSelectionResult) => {
    setMessageContent((prev) => prev + " " + result.emoji);
    handleCloseEmoji();
  };

  // Gestionnaire pour l'ajout d'une réaction
  const handleReactionSelect = (result: EmojiSelectionResult) => {
    setReactions((prev) => [...prev, result.emoji]);
    handleCloseReaction();
  };

  // État des popovers
  const emojiOpen = Boolean(emojiAnchorEl);
  const reactionOpen = Boolean(reactionAnchorEl);

  return (
    <Box sx={{ maxWidth: 500, mx: "auto", p: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        {/* Contenu du message */}
        <Typography variant="body1" gutterBottom>
          {messageContent}
        </Typography>

        {/* Barre d'outils du message */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 2,
          }}
        >
          {/* Bouton pour ajouter un emoji au message */}
          <Button
            startIcon={<EmojiEmotions />}
            onClick={handleEmojiClick}
            size="small"
          >
            Ajouter un emoji
          </Button>

          {/* Bouton pour ajouter une réaction */}
          <IconButton
            onClick={handleReactionClick}
            size="small"
            color="primary"
          >
            <AddReaction />
          </IconButton>
        </Box>

        {/* Afficher les réactions */}
        {reactions.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
            {reactions.map((emoji, index) => (
              <Box
                key={index}
                sx={{
                  borderRadius: "12px",
                  border: "1px solid",
                  borderColor: "divider",
                  px: 1,
                  py: 0.5,
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  bgcolor: "action.hover",
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "action.selected",
                  },
                }}
              >
                {emoji}{" "}
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  1
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Popover pour sélectionner un emoji (à insérer dans le message) */}
      <Popover
        open={emojiOpen}
        anchorEl={emojiAnchorEl}
        onClose={handleCloseEmoji}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={handleCloseEmoji}
          mode={PickerMode.MESSAGE}
        />
      </Popover>

      {/* Popover pour ajouter une réaction */}
      <Popover
        open={reactionOpen}
        anchorEl={reactionAnchorEl}
        onClose={handleCloseReaction}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <EmojiPicker
          onSelect={handleReactionSelect}
          onClose={handleCloseReaction}
          mode={PickerMode.REACTION}
          // Dans un cas réel, nous fournirions messageId et channelId
          messageId="message123"
          channelId="channel456"
        />
      </Popover>

      {/* Instructions d'utilisation */}
      <Box
        sx={{
          mt: 4,
          p: 2,
          border: "1px dashed",
          borderColor: "divider",
          borderRadius: 1,
        }}
      >
        <Typography variant="subtitle1" gutterBottom>
          Comment utiliser le composant EmojiPicker
        </Typography>
        <Typography variant="body2">
          Ce composant peut être utilisé dans deux modes différents :
        </Typography>
        <ol>
          <li>
            <Typography variant="body2">
              <strong>Mode MESSAGE</strong> : pour insérer un emoji dans un
              message
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Mode REACTION</strong> : pour ajouter une réaction à un
              message
            </Typography>
          </li>
        </ol>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Dans le mode REACTION, si vous fournissez messageId et channelId, la
          réaction sera envoyée automatiquement via l'API. Sinon, vous recevrez
          simplement l'emoji sélectionné.
        </Typography>
      </Box>
    </Box>
  );
};

export default MessageWithReactions;
