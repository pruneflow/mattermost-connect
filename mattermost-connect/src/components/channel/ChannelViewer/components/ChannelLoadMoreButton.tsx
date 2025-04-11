import { Box, Button, CircularProgress } from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import React from "react";

interface ChannelLoadMoreButtonProps {
  /** Si d'autres messages sont disponibles */
  hasMoreMessages: boolean;
  /** Si le chargement est en cours */
  loadingMore: boolean;
  /** Fonction pour charger plus de messages */
  loadMoreMessages: () => void;
}

export const ChannelLoadMoreButton: React.FC<ChannelLoadMoreButtonProps> = ({
  hasMoreMessages,
  loadingMore,
  loadMoreMessages,
}) => {
  if (!hasMoreMessages) return null;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        mb: 2,
      }}
    >
      <Button
        variant="outlined"
        size="small"
        onClick={loadMoreMessages}
        disabled={loadingMore}
        startIcon={
          loadingMore ? <CircularProgress size={16} /> : <ExpandMoreIcon />
        }
      >
        {loadingMore ? "Loading..." : "Load more messages"}
      </Button>
    </Box>
  );
};
