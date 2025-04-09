// src/components/EmojiPicker/EmojiPickerContent.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Tooltip,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { EmojiPickerContentProps } from "./types";
import { getEmojiName } from "./data/emojiData";

// Catégories d'emojis
export const EMOJI_CATEGORIES = [
  "Smileys & Emotion",
  "People & Body",
  "Animals & Nature",
  "Food & Drink",
  "Travel & Places",
  "Activities",
  "Objects",
  "Symbols",
  "Flags",
];

// Emojis pour la démo - en pratique, vous remplaceriez ceci par vos propres données
// Note: Ces donnés seraient normalement importées d'un autre fichier
const EMOJI_SAMPLES: Record<string, string[]> = {
  "Smileys & Emotion": [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "🤣",
    "😂",
    "🙂",
    "🙃",
    "😉",
    "😊",
    "😇",
    "🥰",
    "😍",
    "🤩",
    "😘",
    "😗",
    "😚",
    "😙",
    "😋",
    "😛",
    "😜",
    "🤪",
  ],
  "People & Body": [
    "👋",
    "🤚",
    "🖐️",
    "✋",
    "🖖",
    "👌",
    "🤏",
    "✌️",
    "🤞",
    "🤟",
    "🤘",
    "🤙",
    "👈",
    "👉",
    "👆",
    "🖕",
    "👇",
    "☝️",
    "👍",
    "👎",
    "✊",
    "👊",
    "🤛",
    "🤜",
  ],
  "Animals & Nature": [
    "🐶",
    "🐱",
    "🐭",
    "🐹",
    "🐰",
    "🦊",
    "🐻",
    "🐼",
    "🐨",
    "🐯",
    "🦁",
    "🐮",
  ],
  "Food & Drink": [
    "🍏",
    "🍎",
    "🍐",
    "🍊",
    "🍋",
    "🍌",
    "🍉",
    "🍇",
    "🍓",
    "🍈",
    "🍒",
    "🍑",
  ],
  "Travel & Places": [
    "🚗",
    "🚕",
    "🚙",
    "🚌",
    "🚎",
    "🏎️",
    "🚓",
    "🚑",
    "🚒",
    "🚐",
    "🚚",
    "🚛",
  ],
  Activities: [
    "⚽",
    "🏀",
    "🏈",
    "⚾",
    "🥎",
    "🎾",
    "🏐",
    "🏉",
    "🥏",
    "🎱",
    "🪀",
    "🏓",
  ],
  Objects: [
    "🎭",
    "👓",
    "🕶️",
    "🥽",
    "🥼",
    "🦺",
    "👔",
    "👕",
    "👖",
    "🧣",
    "🧤",
    "🧥",
  ],
  Symbols: [
    "❤️",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🖤",
    "🤍",
    "🤎",
    "💔",
    "❣️",
    "💕",
  ],
  Flags: [
    "🏁",
    "🚩",
    "🎌",
    "🏴",
    "🏳️",
    "🏳️‍🌈",
    "🏳️‍⚧️",
    "🏴‍☠️",
    "🇫🇷",
    "🇺🇸",
    "🇬🇧",
    "🇯🇵",
  ],
};

/**
 * Contenu du sélecteur d'emojis
 */
const EmojiPickerContent: React.FC<EmojiPickerContentProps> = ({
  onEmojiSelect,
  searchQuery,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // État pour les emojis filtrés
  const [filteredEmojis, setFilteredEmojis] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(
    EMOJI_CATEGORIES[0],
  );

  // Effet pour filtrer les emojis lors de la recherche ou du changement de catégorie
  useEffect(() => {
    if (searchQuery) {
      // Recherche dans toutes les catégories
      const allEmojis: string[] = [];
      Object.values(EMOJI_SAMPLES).forEach((categoryEmojis) => {
        allEmojis.push(...categoryEmojis);
      });

      // Filtrage simple - en pratique, vous auriez une recherche plus sophistiquée
      setFilteredEmojis(allEmojis);
    } else {
      // Afficher les emojis de la catégorie sélectionnée
      setFilteredEmojis(EMOJI_SAMPLES[activeCategory] || []);
    }
  }, [searchQuery, activeCategory]);

  // Paramètres d'affichage
  const emojisPerRow = 8; // Afficher 8 emojis par ligne
  const emojiSize = isMobile ? "1.2rem" : "1.4rem";

  // Fonction pour gérer la sélection d'un emoji
  const handleEmojiClick = (emoji: string) => {
    const emojiApiName = getEmojiName(emoji);
    onEmojiSelect(emoji, emojiApiName);
  };

  return (
    <Box
      sx={{
        flexGrow: 1,
        overflowY: "auto",
        p: 1,
        "&::-webkit-scrollbar": {
          width: "6px",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "rgba(0,0,0,0.2)",
          borderRadius: "3px",
        },
      }}
    >
      <Grid container spacing={0.5}>
        {filteredEmojis.map((emoji, index) => (
          <Grid item key={index} xs={12 / emojisPerRow}>
            <Tooltip title={emoji} arrow>
              <Box
                onClick={() => handleEmojiClick(emoji)}
                sx={{
                  cursor: "pointer",
                  fontSize: emojiSize,
                  textAlign: "center",
                  borderRadius: 1,
                  py: 0.25,
                  transition: "background-color 0.2s",
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                {emoji}
              </Box>
            </Tooltip>
          </Grid>
        ))}
      </Grid>

      {filteredEmojis.length === 0 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "150px",
            pt: 4,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {searchQuery
              ? "Aucun emoji correspondant"
              : "Aucun emoji dans cette catégorie"}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default EmojiPickerContent;
