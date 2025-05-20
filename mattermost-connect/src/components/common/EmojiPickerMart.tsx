// EmojiPickerMart.tsx
import React, { useEffect, useState } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { SxProps } from '@mui/material/styles';
import { createEmojiNameWithTone, getUserPreferredSkinTone } from '../../utils/emojiMartAdapter';

// Interface pour les props du nouveau composant
export interface EmojiPickerMartProps {
  // Fonction de rappel à appeler lorsqu'un emoji est sélectionné
  // Elle recevra l'emoji natif (string) et le nom court de l'emoji (string)
  // Si une teinte de peau est sélectionnée, le nom inclura le modificateur de teinte
  onEmojiSelect: (emoji: string, emojiName: string, skinTone?: number) => void;
  
  // Props optionnelles pour la personnalisation
  sx?: SxProps;
  // Ces props seront transmises à emoji-mart
  showSearch?: boolean;
  showSkinTones?: boolean;
  height?: number;
  width?: number;
}

/**
 * Composant EmojiPickerMart basé sur emoji-mart
 */
export const EmojiPickerMart: React.FC<EmojiPickerMartProps> = ({
  onEmojiSelect,
  sx,
  showSearch = true,
  showSkinTones = true,
  height = 400,
  width = 350,
}) => {
  // Cette fonction adapte l'objet emoji retourné par emoji-mart
  // pour le format attendu par notre API
  // Suivre la teinte de peau actuelle
  const [currentSkinTone, setCurrentSkinTone] = useState<number>(getUserPreferredSkinTone());
  
  // Mettre à jour la teinte si elle change dans localStorage
  useEffect(() => {
    const handleSkinToneChange = () => {
      setCurrentSkinTone(getUserPreferredSkinTone());
    };
    
    // Écouter les changements de stockage
    window.addEventListener('storage', handleSkinToneChange);
    return () => {
      window.removeEventListener('storage', handleSkinToneChange);
    };
  }, []);

  const handleEmojiSelect = (emojiData: any) => {
    if (emojiData) {
      // Extraire les propriétés nécessaires de l'objet emoji-mart
      const emoji = emojiData.native || ''; // Le caractère emoji natif
      const baseEmojiName = emojiData.id || ''; // L'identifiant/nom court de l'emoji
      
      // Récupérer la teinte actuelle
      const skinTone = emojiData.skin || currentSkinTone;
      
      // Créer le nom complet avec la teinte si nécessaire (format Mattermost)
      const fullEmojiName = createEmojiNameWithTone(baseEmojiName, skinTone);
      
      // Note: emoji-mart gère automatiquement le stockage des emojis récents
      // via la catégorie "frequent"
      
      // Appeler la fonction de rappel avec les formats attendus
      onEmojiSelect(emoji, fullEmojiName, skinTone);
    }
  };

  return (
    <Picker
      data={data}
      onEmojiSelect={handleEmojiSelect}
      searchPosition={showSearch ? "top" : "none"}
      skinTonePosition={showSkinTones ? "preview" : "none"}
      previewPosition="none"
      maxFrequentRows={2} // Afficher les emojis fréquemment utilisés
      onSkinChange={(skin) => setCurrentSkinTone(skin)}
      height={height}
      width={width}
      // Appliquer des styles supplémentaires si nécessaire
      style={{
        ...sx,
        border: 'none',
        borderRadius: '4px'
      }}
    />
  );
};

export default EmojiPickerMart;