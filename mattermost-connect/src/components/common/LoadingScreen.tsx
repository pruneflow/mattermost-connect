/**
 * Loading screen component with configurable positioning and centering
 * Provides flexible loading indicator with optional message and positioning options
 */
import React from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import type { ReactNode, CSSProperties } from "react";

type Props = {
  position?: "absolute" | "fixed" | "relative" | "static" | "inherit";
  style?: CSSProperties;
  message?: ReactNode;
  centered?: boolean;
};

export default function LoadingScreen({
  message,
  position = "relative",
  style,
  centered = false,
}: Props) {

  return (
    <Box
      sx={{
        position,
        top: centered ? "50%" : undefined,
        left: centered ? "50%" : undefined,
        transform: centered ? "translate(-50%, -50%)" : undefined,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: centered ? "center" : "flex-start",
        justifyContent: centered ? "center" : "flex-start",
        ...style,
      }}
    >
      <Box
        sx={{
          textAlign: "center",
        }}
      >
        <Typography variant="body1" sx={{ mb: 2 }}>
          {message || 'Loading' }
        </Typography>

        <CircularProgress />
      </Box>
    </Box>
  );
}
