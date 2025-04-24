import React from "react";
import { Box, Typography, IconButton, Paper } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { Message } from "../../../../types";

interface ReplyContextProps {
  /** Message auquel on répond */
  replyTo: Message;
  /** Fonction pour effacer la réponse */
  clearReply: () => void;
}

export const ReplyContext: React.FC<ReplyContextProps> = ({
  replyTo,
  clearReply,
}) => {
  if (!replyTo) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        p: 1,
        mb: 1,
        bgcolor: "action.hover",
        borderRadius: (theme) => theme.shape.borderRadius,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Typography variant="body2" component="div" color="text.secondary">
          Replying to:{" "}
          <strong>
            {replyTo.message.length > 50
              ? replyTo.message.substring(0, 50) + "..."
              : replyTo.message}
          </strong>
        </Typography>
      </Box>
      <IconButton size="small" onClick={clearReply}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
};
