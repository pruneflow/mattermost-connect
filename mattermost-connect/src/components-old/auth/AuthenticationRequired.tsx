import React from "react";

import { Typography, Button, Paper, Container } from "@mui/material";

/**
 * Authentication Required Component
 * Displayed when user is not authenticated
 */
const AuthenticationRequired: React.FC<{ onLogin: () => void }> = ({
  onLogin,
}) => (
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
      <Typography variant="h5" gutterBottom>
        Authentication Required
      </Typography>
      <Typography
        variant="body2"
        color="textSecondary"
        align="center"
        sx={{ mb: 3 }}
      >
        You must be logged in to access this content.
      </Typography>
      <Button variant="contained" color="primary" fullWidth onClick={onLogin}>
        Log In
      </Button>
    </Paper>
  </Container>
);

export default AuthenticationRequired;
