import { Snackbar, Alert } from "@mui/material";

interface AttachmentNotificationProps {
  /** Si la notification est ouverte */
  snackbarOpen: boolean;
  /** Message de la notification */
  snackbarMessage: string;
  /** Type de notification */
  snackbarSeverity: "success" | "error" | "info" | "warning";
  /** Fonction pour fermer la notification */
  handleSnackbarClose: () => void;
}

const AttachmentNotification: React.FC<AttachmentNotificationProps> = ({
  snackbarOpen,
  snackbarMessage,
  snackbarSeverity,
  handleSnackbarClose,
}) => {
  return (
    <Snackbar
      open={snackbarOpen}
      autoHideDuration={6000}
      onClose={handleSnackbarClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        onClose={handleSnackbarClose}
        severity={snackbarSeverity}
        variant="filled"
        sx={{ width: "100%" }}
      >
        {snackbarMessage}
      </Alert>
    </Snackbar>
  );
};

export default AttachmentNotification;
