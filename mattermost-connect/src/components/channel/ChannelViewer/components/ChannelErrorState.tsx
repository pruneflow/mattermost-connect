import { Alert } from "@mui/material";

interface ChannelErrorStateProps {
  /** Message d'erreur à afficher */
  error: string | null;
}

export const ChannelErrorState: React.FC<ChannelErrorStateProps> = ({
  error,
}) => {
  if (!error) return null;

  return (
    <Alert severity="error" sx={{ mb: 2 }}>
      {error}
    </Alert>
  );
};
