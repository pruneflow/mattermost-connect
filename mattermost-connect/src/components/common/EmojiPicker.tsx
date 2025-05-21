// EmojiPicker.tsx
import React, { useEffect, useState } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { 
  SxProps, 
  useTheme, 
  useMediaQuery,
  Popper,
  Paper,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Breakpoint
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { PopperPlacementType } from '@mui/material/Popper';
import { createEmojiNameWithTone, getUserPreferredSkinTone } from '../../utils/emojiMartAdapter';

// Animation de transition pour le Dialog
const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Interface pour le composant principal
export interface EmojiPickerProps {
  // Mode de visualisation
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  
  // Fonction de rappel à appeler lorsqu'un emoji est sélectionné
  onEmojiSelect: (emoji: string, emojiName: string, skinTone?: number) => void;
  
  // Propriétés de personnalisation
  showSearch?: boolean;
  showSkinTones?: boolean;
  height?: number | string;
  width?: number | string;
  sx?: SxProps;
  
  // Configuration du positionnement
  placement?: PopperPlacementType;
  
  // Options avancées
  mobileBreakpoint?: string; // Personnalisation du breakpoint mobile
}

/**
 * Composant EmojiPicker responsive basé sur emoji-mart
 * S'affiche en popper sur desktop et en modal sur mobile
 */
export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  open,
  anchorEl,
  onClose,
  onEmojiSelect,
  sx,
  showSearch = true,
  showSkinTones = true,
  height = isMobile ? 280 : 350,
  width = isMobile ? '100%' : 280,
  placement = "left-end",
  mobileBreakpoint = "sm"
}) => {
  // Détection du mode mobile
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(mobileBreakpoint as Breakpoint));
  
  // Gestion de la teinte de peau
  const [currentSkinTone, setCurrentSkinTone] = useState<number>(getUserPreferredSkinTone());
  
  // Mettre à jour la teinte si elle change dans localStorage
  useEffect(() => {
    const handleSkinToneChange = () => {
      setCurrentSkinTone(getUserPreferredSkinTone());
    };
    
    // Écouter les changements de stockage
    window.addEventListener("storage", handleSkinToneChange);
    return () => {
      window.removeEventListener("storage", handleSkinToneChange);
    };
  }, []);

  // Traitement de la sélection d'emoji
  const handleEmojiSelect = (emojiData: any) => {
    if (emojiData) {
      // Extraire les propriétés nécessaires de l'objet emoji-mart
      const emoji = emojiData.native || ''; // Le caractère emoji natif
      const baseEmojiName = emojiData.id || ''; // L'identifiant/nom court de l'emoji
      
      // Récupérer la teinte actuelle
      const skinTone = emojiData.skin || currentSkinTone;
      
      // Créer le nom complet avec la teinte si nécessaire (format Mattermost)
      const fullEmojiName = createEmojiNameWithTone(baseEmojiName, skinTone);
      
      // Appeler la fonction de rappel avec les formats attendus
      onEmojiSelect(emoji, fullEmojiName, skinTone);
      
      // Fermer le picker
      onClose();
    }
  };

  // Composant Picker intérieur réutilisé dans les deux modes
  const PickerContent = (
    <Picker
      data={data}
      onEmojiSelect={handleEmojiSelect}
      searchPosition={showSearch ? "top" : "none"}
      skinTonePosition={showSkinTones ? "preview" : "none"}
      previewPosition="none"
      maxFrequentRows={2}
      onSkinChange={(skin: number) => setCurrentSkinTone(skin)}
      height={isMobile ? 280 : height}
      width={isMobile ? '100%' : width}
      // Appliquer des styles supplémentaires si nécessaire
      style={{
        ...sx,
        border: 'none',
        borderRadius: '4px'
      }}
    />
  );

  // Rendu conditionnel selon le type d'appareil
  if (isMobile) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="xs"
        TransitionComponent={Transition}
        sx={{
          '& .MuiDialog-paper': {
            margin: 0,
            position: 'absolute',
            bottom: 0,
            borderRadius: '16px 16px 0 0',
            maxWidth: '100%',
            width: '100%'
          },
          '& .MuiDialogContent-root': {
            p: 0,
            overflowX: 'auto'
          }
        }}
      >
        <DialogContent>
          {PickerContent}
        </DialogContent>
      </Dialog>
    );
  }

  // Version desktop - Popper standard (comportement inchangé)
  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement={placement}
      sx={{ zIndex: 1300 }}
    >
      <Paper>
        {PickerContent}
      </Paper>
    </Popper>
  );
};

// Pour compatibilité avec l'ancien nom
export interface EmojiPickerMartProps extends EmojiPickerProps {}
export const EmojiPickerMart = EmojiPicker;

export default EmojiPicker;