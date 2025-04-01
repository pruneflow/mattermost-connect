import { Box, CircularProgress } from "@mui/material";

/**
 * Composant affichant un indicateur de chargement centré
 */
const LoadingState = () => {
  return (
    <Box display="flex" justifyContent="center" my={4}>
      <CircularProgress />
    </Box>
  );
};

export default LoadingState;
