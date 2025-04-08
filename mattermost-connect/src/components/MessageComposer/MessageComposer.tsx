import React, { useState, useRef } from "react";
import {
  Box,
  TextField,
  IconButton,
  Tooltip,
  Popover,
  InputAdornment,
  Collapse,
  Divider,
  useMediaQuery,
  useTheme,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
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
  MoreHoriz as MoreIcon,
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
 * Formateur de texte pour représenter les outils de formatage
 */
interface FormatOption {
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

/**
 * Composant pour composer et envoyer des messages
 * Interface fluide avec contrôles intégrés au bas de la zone de saisie
 * Adaptation responsiv pour mobile et desktop
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // État pour le message, la visibilité du formatting, et l'ancre des emojis
  const [message, setMessage] = useState(initialText);
  const [showFormatting, setShowFormatting] = useState(false);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLElement | null>(null);
  const [moreMenuAnchorEl, setMoreMenuAnchorEl] = useState<HTMLElement | null>(
    null,
  );
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

    // Fermer le menu "more" si ouvert
    if (moreMenuAnchorEl) {
      setMoreMenuAnchorEl(null);
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

  // Définir toutes les options de formatage
  const formatOptions: FormatOption[] = [
    {
      label: "Gras",
      icon: <BoldIcon fontSize="small" />,
      action: () => applyFormat("**"),
    },
    {
      label: "Italique",
      icon: <ItalicIcon fontSize="small" />,
      action: () => applyFormat("*"),
    },
    {
      label: "Barré",
      icon: <StrikethroughIcon fontSize="small" />,
      action: () => applyFormat("~~"),
    },
    {
      label: "Titre",
      icon: <HeadingIcon fontSize="small" />,
      action: () => applyFormat("## "),
    },
    {
      label: "Lien",
      icon: <LinkIcon fontSize="small" />,
      action: () => applyFormat("[", "](url)"),
    },
    {
      label: "Code",
      icon: <CodeIcon fontSize="small" />,
      action: () => applyFormat("`"),
    },
    {
      label: "Bloc de code",
      icon: <CodeIcon fontSize="small" />,
      action: () => applyFormat("```\n", "\n```"),
    },
    {
      label: "Citation",
      icon: <QuoteIcon fontSize="small" />,
      action: () => applyFormat("> "),
    },
  ];

  // Sur mobile, on n'affiche que les 4 premières options
  const primaryOptions = formatOptions.slice(0, 4);
  const secondaryOptions = formatOptions.slice(4);

  // Boutons d'action principaux (formatage, pièces jointes, emoji, envoi)
  const actionBar = (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Tooltip
        title={
          showFormatting ? "Masquer le formatage" : "Afficher le formatage"
        }
      >
        <IconButton
          size="small"
          onClick={() => setShowFormatting(!showFormatting)}
        >
          {showFormatting ? (
            <HideFormattingIcon fontSize="small" />
          ) : (
            <ShowFormattingIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>

      {allowAttachments && (
        <Tooltip title="Ajouter des fichiers">
          <IconButton size="small">
            <AttachmentIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title="Ajouter un emoji">
        <IconButton
          size="small"
          onClick={(e) => setEmojiAnchorEl(e.currentTarget)}
        >
          <EmojiIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Envoyer">
        <span>
          <IconButton
            size="small"
            color="primary"
            onClick={sendMessage}
            disabled={!message.trim() || disabled}
            sx={{ ml: 0.5 }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
  console.debug("showFormatting", showFormatting);
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        ...(!isMobile
          ? { m: 1 }
          : {
              position: "sticky",
              bottom: 0,
              left: 0,
              right: 0,
              width: "100%",
              borderTop: "1px solid",
              borderColor: "divider",
              zIndex: 10,
            }),
        ...sx,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          ...(isMobile
            ? {
                borderRadius: 0,
              }
            : {
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "4px",
                overflow: "hidden",
              }),
        }}
      >
        <TextField
          inputRef={textFieldRef}
          multiline
          minRows={1}
          maxRows={isMobile ? 3 : 4}
          fullWidth
          variant="outlined"
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              padding: "8px 12px",
              "& fieldset": {
                border: "none",
              },
              "&.Mui-focused fieldset": {
                border: "none",
              },
              "&:hover fieldset": {
                border: "none",
              },
            },
          }}
          slotProps={{
            input: {
              endAdornment: !showFormatting && (
                <InputAdornment position="end">{actionBar}</InputAdornment>
              ),
            },
          }}
        />

        {/* Barre de formatage pour desktop (cachée sur mobile) */}
        {!isMobile && (
          <Collapse in={showFormatting}>
            <Box
              sx={{
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {formatOptions.map((option, index) => (
                    <React.Fragment key={option.label}>
                      <Tooltip title={option.label}>
                        <IconButton size="small" onClick={option.action}>
                          {option.icon}
                        </IconButton>
                      </Tooltip>
                      {index === 3 && (
                        <Divider
                          orientation="vertical"
                          flexItem
                          sx={{ mx: 0.5, height: 20 }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </Box>

                {/* Actions à droite */}
                {actionBar}
              </Box>
            </Box>
          </Collapse>
        )}

        {/* Barre de formatage pour mobile (toujours visible si le formatage est activé) */}
        {isMobile && showFormatting && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 1,
              borderTop: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {/* Afficher seulement les 4 premiers outils de formatage sur mobile */}
              {primaryOptions.map((option) => (
                <Tooltip key={option.label} title={option.label}>
                  <IconButton size="small" onClick={option.action}>
                    {option.icon}
                  </IconButton>
                </Tooltip>
              ))}

              {/* Bouton "Plus" pour afficher les outils restants */}
              <Tooltip title="Plus d'options">
                <IconButton
                  size="small"
                  onClick={(e) => setMoreMenuAnchorEl(e.currentTarget)}
                >
                  <MoreIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Bouton pour masquer la barre de formatage sur mobile */}
            {actionBar}
          </Box>
        )}
      </Box>

      {/* Popover pour le sélecteur d'emojis */}
      <Popover
        open={Boolean(emojiAnchorEl)}
        anchorEl={emojiAnchorEl}
        onClose={() => setEmojiAnchorEl(null)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <EmojiPicker
          onEmojiSelect={handleEmojiSelect}
          onClose={() => setEmojiAnchorEl(null)}
        />
      </Popover>

      {/* Menu pour les options de formatage supplémentaires sur mobile */}
      <Menu
        anchorEl={moreMenuAnchorEl}
        open={Boolean(moreMenuAnchorEl)}
        onClose={() => setMoreMenuAnchorEl(null)}
      >
        {secondaryOptions.map((option) => (
          <MenuItem key={option.label} onClick={option.action}>
            <ListItemIcon>{option.icon}</ListItemIcon>
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default MessageComposer;
