import { Box, Typography } from "@mui/material";
import { Info as InfoIcon } from "@mui/icons-material";

export const ChannelEmptyState: React.FC = () => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        flexDirection: "column",
        color: "text.secondary",
      }}
    >
      <InfoIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
      <Typography component={"div"} variant="body1">
        No messages in this channel
      </Typography>
      <Typography component={"div"} variant="body2" sx={{ mt: 1 }}>
        Be the first to start a conversation!
      </Typography>
    </Box>
  );
};
