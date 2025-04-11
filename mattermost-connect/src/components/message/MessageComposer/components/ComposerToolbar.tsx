import { Box, CircularProgress, IconButton, Tooltip } from "@mui/material";
import {
  EmojiEmotions as EmojiIcon,
  Attachment as AttachmentIcon,
  Send as SendIcon,
} from "@mui/icons-material";
import React from "react";

interface ComposerToolbarProps {
  /** Si les pièces jointes sont autorisées */
  allowAttachments: boolean;
  /** Si le composant est désactivé */
  disabled: boolean;
  /** Si l'envoi est en cours */
  sending: boolean;
  /** Si des uploads sont en cours */
  hasUploadsInProgress: boolean;
  /** Si le message est vide */
  isEmpty: boolean;
  /** Référence vers l'input de fichier */
  fileInputRef: React.RefObject<HTMLInputElement>;
  /** Si l'upload est en cours */
  uploadInProgress: boolean;
  /** Fonction pour ouvrir l'emoji picker */
  toggleEmojiPicker: () => void;
  /** Fonction pour ajouter une pièce jointe */
  handleAttachmentClick: () => void;
  /** Fonction pour envoyer le message */
  handleSendMessage: () => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ComposerToolbar: React.FC<ComposerToolbarProps> = ({
  allowAttachments,
  disabled,
  sending,
  hasUploadsInProgress,
  isEmpty,
  fileInputRef,
  uploadInProgress,
  toggleEmojiPicker,
  handleAttachmentClick,
  handleSendMessage,
  handleFileChange,
}) => {
  return (
    <Box sx={{ display: "flex", ml: 1 }}>
      {/* Emoji picker button */}
      <Tooltip title="Add emoji">
        <IconButton
          color="primary"
          onClick={toggleEmojiPicker}
          disabled={disabled || sending}
        >
          <EmojiIcon />
        </IconButton>
      </Tooltip>

      {/* Attachment button */}
      {allowAttachments && (
        <Tooltip title="Add attachment">
          <IconButton
            color="primary"
            onClick={handleAttachmentClick}
            disabled={disabled || sending || uploadInProgress}
          >
            {uploadInProgress ? (
              <CircularProgress size={24} />
            ) : (
              <AttachmentIcon />
            )}
          </IconButton>
        </Tooltip>
      )}

      {/* Send button */}
      <Tooltip title="Send message">
        <IconButton
          color="primary"
          onClick={handleSendMessage}
          disabled={disabled || sending || hasUploadsInProgress || isEmpty}
        >
          <SendIcon />
        </IconButton>
      </Tooltip>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        multiple
      />
    </Box>
  );
};
