import {
  Box,
  CircularProgress,
  Fade,
  SxProps,
  Theme,
  Typography,
} from "@mui/material";

interface LoadingIndicatorProps {
  /** Si le chargement est actif */
  loading: boolean;
  /** Taille de l'indicateur */
  size?: number | string;
  /** Couleur personnalisée */
  color?:
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning"
    | "inherit";
  /** Texte d'accompagnement */
  label?: string;
  /** Styles personnalisés */
  sx?: SxProps<Theme>;
  /** Durée de la transition en ms */
  transitionDuration?: number;
}

/**
 * Indicateur de chargement avec texte optionnel et transition d'entrée/sortie
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  loading,
  size = 40,
  color = "primary",
  label,
  sx,
  transitionDuration = 300,
}) => {
  return (
    <Fade in={loading} timeout={transitionDuration} unmountOnExit>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          ...sx,
        }}
      >
        <CircularProgress size={size} color={color} />

        {label && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
            component="div"
          >
            {label}
          </Typography>
        )}
      </Box>
    </Fade>
  );
};
