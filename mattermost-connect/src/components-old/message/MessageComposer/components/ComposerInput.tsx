import {
  TextField,
  InputAdornment,
  CircularProgress,
  Box,
} from "@mui/material";

interface ComposerInputProps {
  /** Placeholder à afficher */
  placeholder: string;
  /** Valeur actuelle du message */
  message: string;
  /** Fonction pour mettre à jour le message */
  setMessage: (value: string) => void;
  /** Si l'entrée est désactivée */
  disabled: boolean;
  /** Si l'envoi est en cours */
  sending: boolean;
  /** Référence vers l'entrée de texte */
  textFieldRef: React.RefObject<HTMLTextAreaElement>;
  /** Fonction appelée à l'appui d'une touche */
  handleKeyPress: (event: React.KeyboardEvent) => void;
}

export const ComposerInput: React.FC<ComposerInputProps> = ({
  placeholder,
  message,
  setMessage,
  disabled,
  sending,
  textFieldRef,
  handleKeyPress,
}) => {
  return (
    <TextField
      fullWidth
      multiline
      maxRows={4}
      placeholder={placeholder}
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      onKeyPress={handleKeyPress}
      disabled={disabled || sending}
      inputRef={textFieldRef}
      variant="outlined"
      size="small"
      sx={{
        flex: 1,
        "& .MuiOutlinedInput-root": {
          borderRadius: 4,
          padding: 1,
        },
      }}
      InputProps={{
        endAdornment: sending ? (
          <InputAdornment position="end">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                color: "text.secondary",
                mr: 1,
              }}
            >
              <CircularProgress size={16} sx={{ mr: 1 }} />
              Sending...
            </Box>
          </InputAdornment>
        ) : null,
        className: "message-composer-input",
      }}
    />
  );
};
