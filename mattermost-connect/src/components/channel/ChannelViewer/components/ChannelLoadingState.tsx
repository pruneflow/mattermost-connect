import React from "react";
import { Box, Skeleton } from "@mui/material";

export const ChannelLoadingState: React.FC = () => {
  return (
    <Box sx={{ p: 2 }}>
      {Array.from({ length: 3 }).map((_, index) => (
        <Box key={index} sx={{ display: "flex", mb: 2 }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
          <Box sx={{ width: "100%" }}>
            <Skeleton variant="text" width={120} height={24} />
            <Skeleton
              variant="rectangular"
              height={40}
              width={`${Math.random() * 50 + 30}%`}
              sx={{ mt: 1 }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
};
