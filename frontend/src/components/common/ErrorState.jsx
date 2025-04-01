import { Alert, Button } from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

/**
 * Composant pour afficher un message d'erreur avec bouton de réessai
 */
const ErrorState = ({ error, onRetry }) => {
  const { t } = useTranslation();

  return (
    <Alert severity="error" sx={{ my: 2 }}>
      {t("common.error", { message: error.message })}
      <Button
        variant="outlined"
        size="small"
        startIcon={<RefreshIcon />}
        onClick={onRetry}
        sx={{ ml: 2 }}
      >
        {t("common.retry")}
      </Button>
    </Alert>
  );
};

export default ErrorState;
