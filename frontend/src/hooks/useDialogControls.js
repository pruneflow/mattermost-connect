import { useState } from "react";

/**
 * Hook personnalisé pour gérer l'état d'ouverture/fermeture de plusieurs dialogues
 * @param {Array} dialogNames - Tableau des noms de dialogues à gérer
 */
const useDialogControls = (dialogNames = []) => {
  // Créer un état pour chaque dialogue
  const [dialogState, setDialogState] = useState(
    dialogNames.reduce((acc, name) => {
      acc[name] = false;
      return acc;
    }, {}),
  );

  // Fonction pour ouvrir un dialogue spécifique
  const openDialog = (dialogName) => {
    if (dialogNames.includes(dialogName)) {
      setDialogState((prev) => ({
        ...prev,
        [dialogName]: true,
      }));
    }
  };

  // Fonction pour fermer un dialogue spécifique
  const closeDialog = (dialogName) => {
    if (dialogNames.includes(dialogName)) {
      setDialogState((prev) => ({
        ...prev,
        [dialogName]: false,
      }));
    }
  };

  // Retourner l'état et les fonctions de contrôle
  return {
    dialogState,
    openDialog,
    closeDialog,
  };
};

export default useDialogControls;
