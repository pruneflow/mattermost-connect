import React, { useState, useRef } from "react";
import {
  Box,
  TextField,
  IconButton,
  Tooltip,
  Button,
  Popover,
} from "@mui/material";

// Material-UI Icons
import {
  Send as SendIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatStrikethrough as StrikethroughIcon,
  TextFormat as HeadingIcon,
  Link as LinkIcon,
  Code as CodeIcon,
  FormatQuote as QuoteIcon,
  AttachFile as AttachmentIcon,
  EmojiEmotions as EmojiIcon,
  Visibility as ShowFormattingIcon,
  VisibilityOff as HideFormattingIcon,
} from "@mui/icons-material";

import EmojiPicker from "./EmojiPicker";

/**
 * Props pour le composant MessageComposer
 */
export interface MessageComposerProps {
  /** ID du canal pour envoyer des messages */
  channelId?: string;

  /** Texte de placeholder pour l'input */
  placeholder?: string;

  /** Autoriser les pièces jointes */
  allowAttachments?: boolean;

  /** Callback quand un message est envoyé */
  onMessageSent?: (message: string) => void;

  /** Texte initial du message */
  initialText?: string;

  /** Désactiver le composant */
  disabled?: boolean;

  /** Styles personnalisés */
  sx?: React.CSSProperties;
}

/**
 * Composant pour composer et envoyer des messages
 */
const MessageComposer: React.FC<MessageComposerProps> = ({
  channelId,
  placeholder = "Type a message...",
  allowAttachments = true,
  onMessageSent,
  initialText = "",
  disabled = false,
  sx,
}) => {
  // État pour le message, la visibilité du formatting, et l'ancre des emojis
  const [message, setMessage] = useState(initialText);
  const [showFormatting, setShowFormatting] = useState(false);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLElement | null>(null);
  const textFieldRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Applique un format de texte (gras, italique, etc.)
   * @param prefix Préfixe du format
   * @param suffix Suffixe optionnel du format
   */
  const applyFormat = (prefix: string, suffix?: string) => {
    if (!textFieldRef.current) return;

    const input = textFieldRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const selectedText = message.substring(start, end);

    // Si du texte est sélectionné, l'entourer du format
    if (selectedText) {
      const formattedText = prefix + selectedText + (suffix || prefix);
      const newMessage =
        message.substring(0, start) + formattedText + message.substring(end);

      setMessage(newMessage);

      // Repositionner le curseur
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(
          start + prefix.length,
          start + prefix.length + selectedText.length,
        );
      }, 0);
    } else {
      // Insérer le format à la position du curseur
      const newMessage =
        message.substring(0, start) +
        prefix +
        (suffix || "") +
        message.substring(start);

      setMessage(newMessage);

      // Positionner le curseur
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + prefix.length, start + prefix.length);
      }, 0);
    }
  };

  /**
   * Envoie le message
   */
  const sendMessage = () => {
    if (!message.trim()) return;

    onMessageSent?.(message);
    setMessage("");
  };

  /**
   * Gère la sélection d'un emoji
   * @param emoji Emoji sélectionné
   */
  const handleEmojiSelect = (emoji: string) => {
    if (!textFieldRef.current) return;

    const input = textFieldRef.current;
    const start = input.selectionStart || 0;
    const newMessage =
      message.substring(0, start) + emoji + message.substring(start);

    setMessage(newMessage);

    // Repositionner le curseur
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);

    // Fermer le sélecteur d'emojis
    setEmojiAnchorEl(null);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        padding: 1,
        ...sx,
      }}
    >
      {/* Barre de formatting */}
      {showFormatting && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            marginBottom: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            paddingBottom: 1,
          }}
        >
          {/* Formatage de texte */}
          <Tooltip title="Gras" placement="top" arrow>
            <IconButton onClick={() => applyFormat("**")}>
              <BoldIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Italique" placement="top" arrow>
            <IconButton onClick={() => applyFormat("*")}>
              <ItalicIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Barré" placement="top" arrow>
            <IconButton onClick={() => applyFormat("~~")}>
              <StrikethroughIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Titre" placement="top" arrow>
            <IconButton onClick={() => applyFormat("## ")}>
              <HeadingIcon />
            </IconButton>
          </Tooltip>

          <Box
            sx={{ margin: "0 8px", borderLeft: "1px solid", height: "20px" }}
          />

          <Tooltip title="Lien" placement="top" arrow>
            <IconButton onClick={() => applyFormat("[", "](url)")}>
              <LinkIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Code" placement="top" arrow>
            <IconButton onClick={() => applyFormat("`")}>
              <CodeIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Bloc de code" placement="top" arrow>
            <IconButton onClick={() => applyFormat("```\n", "\n```")}>
              <CodeIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Citation" placement="top" arrow>
            <IconButton onClick={() => applyFormat("> ")}>
              <QuoteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Zone de saisie et actions */}
      <Box sx={{ display: "flex", alignItems: "center" }}>
        {/* Actions de gauche */}
        <Box sx={{ display: "flex", alignItems: "center", marginRight: 1 }}>
          {/* Afficher/masquer le formatting */}
          <Tooltip
            title={
              showFormatting
                ? "Masquer le formatting"
                : "Afficher le formatting"
            }
            placement="top"
            arrow
          >
            <IconButton onClick={() => setShowFormatting(!showFormatting)}>
              {showFormatting ? <HideFormattingIcon /> : <ShowFormattingIcon />}
            </IconButton>
          </Tooltip>

          <Box
            sx={{ margin: "0 8px", borderLeft: "1px solid", height: "20px" }}
          />

          {/* Pièces jointes */}
          {allowAttachments && (
            <Tooltip title="Ajouter des fichiers" placement="top" arrow>
              <IconButton>
                <AttachmentIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* Sélecteur d'emojis */}
          <Tooltip title="Ajouter un emoji" placement="top" arrow>
            <IconButton onClick={(e) => setEmojiAnchorEl(e.currentTarget)}>
              <EmojiIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Zone de saisie du message */}
        <TextField
          inputRef={textFieldRef}
          multiline
          maxRows={4}
          fullWidth
          variant="outlined"
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={disabled}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
            },
          }}
        />

        {/* Bouton d'envoi */}
        <Button
          variant="contained"
          color="primary"
          onClick={sendMessage}
          disabled={!message.trim() || disabled}
          sx={{ marginLeft: 1 }}
        >
          <SendIcon />
        </Button>
      </Box>

      {/* Popover pour le sélecteur d'emojis */}
      <Popover
        open={Boolean(emojiAnchorEl)}
        anchorEl={emojiAnchorEl}
        onClose={() => setEmojiAnchorEl(null)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <EmojiPicker
          onEmojiSelect={handleEmojiSelect}
          onClose={() => setEmojiAnchorEl(null)}
        />
      </Popover>
    </Box>
  );
};

export default MessageComposer;
