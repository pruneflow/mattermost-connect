import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Hook personnalisé pour gérer les opérations de copie dans le presse-papiers
 * et les notifications associées
 */
const useClipboard = () => {
  const { t } = useTranslation();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
  });

  // Fonction pour copier du texte dans le presse-papiers
  const copyToClipboard = (text, itemName) => {
    navigator.clipboard.writeText(text);
    setSnackbar({
      open: true,
      message: t("spaces.copied", { item: itemName }),
    });
  };

  // Fonction pour fermer la notification
  const closeSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  return {
    snackbar,
    copyToClipboard,
    closeSnackbar,
  };
};

export default useClipboard;
