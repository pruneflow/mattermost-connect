import React from "react";
import { Skeleton, Paper, Container } from "@mui/material";

/**
 * Authentication Skeleton Loader
 * Provides a skeleton UI while authentication state is being determined
 */
const AuthSkeletonLoader: React.FC = () => (
  <Container maxWidth="xs">
    <Paper
      elevation={3}
      sx={{
        padding: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: 8,
      }}
    >
      <Skeleton variant="text" width="80%" height={60} />
      <Skeleton variant="rectangular" width="100%" height={50} sx={{ my: 2 }} />
      <Skeleton variant="rectangular" width="100%" height={50} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" width="100%" height={50} />
    </Paper>
  </Container>
);

export default AuthSkeletonLoader;
