import { Tabs, Tab } from "@mui/material";
import {
  EmojiEmotions as EmojiIcon,
  Image as ImageIcon,
} from "@mui/icons-material";
import { PickerMode } from "../../../../types";

interface EmojiPickerTabsProps {
  /** Mode du picker (message ou réaction) */
  mode: PickerMode;
  /** Index de l'onglet actif */
  activeTab: number;
  /** Fonction pour changer d'onglet */
  setActiveTab: (newValue: number) => void;
  /** Fonction pour réinitialiser la recherche */
  clearSearch: () => void;
}

export const EmojiPickerTabs: React.FC<EmojiPickerTabsProps> = ({
  mode,
  activeTab,
  setActiveTab,
  clearSearch,
}) => {
  // Si en mode réaction, ne pas afficher les onglets
  if (mode === PickerMode.REACTION) return null;

  return (
    <Tabs
      value={activeTab}
      onChange={(_, newValue) => {
        setActiveTab(newValue);
        clearSearch(); // Réinitialiser la recherche lors du changement d'onglet
      }}
      variant="fullWidth"
      sx={{
        minHeight: "40px",
        "& .MuiTab-root": {
          minHeight: "40px",
          py: 0.5,
        },
      }}
    >
      <Tab
        icon={<EmojiIcon fontSize="small" />}
        iconPosition="start"
        label="Emojis"
        value={0}
      />
      <Tab
        icon={<ImageIcon fontSize="small" />}
        iconPosition="start"
        label="GIFs"
        value={1}
      />
    </Tabs>
  );
};
