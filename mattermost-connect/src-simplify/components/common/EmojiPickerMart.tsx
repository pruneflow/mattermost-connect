// EmojiPickerMart.tsx
import React from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { SxProps } from '@mui/material/styles';

// Interface pour les props du nouveau composant
export interface EmojiPickerMartProps {
  // Fonction de rappel à appeler lorsqu'un emoji est sélectionné
  // Elle recevra l'emoji natif (string) et le nom court de l'emoji (string)
  onEmojiSelect: (emoji: string, emojiName: string) => void;
  
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
  const handleEmojiSelect = (emojiData: any) => {
    if (emojiData) {
      // Extraire les propriétés nécessaires de l'objet emoji-mart
      const emoji = emojiData.native || ''; // Le caractère emoji natif
      const emojiName = emojiData.id || ''; // L'identifiant/nom court de l'emoji
      
      // Appeler la fonction de rappel avec les formats attendus
      onEmojiSelect(emoji, emojiName);
    }
  };

  return (
    <Picker
      data={data}
      onEmojiSelect={handleEmojiSelect}
      searchPosition={showSearch ? "top" : "none"}
      skinTonePosition={showSkinTones ? "preview" : "none"}
      previewPosition="none"
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