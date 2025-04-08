import React, { useState } from "react";
import { Box, Tabs, Tab, Typography, Grid } from "@mui/material";

// Catégories d'emojis basées sur Mattermost
const EMOJI_CATEGORIES = [
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

// Mapping des emojis (à remplacer par une liste complète)
const EMOJI_MAP = {
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
    "😝",
    "🤑",
    "🤗",
    "🤭",
    "🤫",
    "🤔",
    "🤐",
    "🤨",
    "😐",
    "😑",
    "😶",
    "😏",
    "😒",
    "🙄",
    "😬",
    "😮",
    "😯",
    "😪",
    "😫",
    "🤤",
    "😴",
    "😌",
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
  // Autres catégories peuvent être ajoutées similairement
};

// Catégories de GIFs (à intégrer avec une API de GIFs)
const GIF_CATEGORIES = ["Trending", "Reactions", "Memes", "Celebs", "Sports"];

/**
 * Props pour le composant EmojiPicker
 */
export interface EmojiPickerProps {
  /** Callback quand un emoji est sélectionné */
  onEmojiSelect?: (emoji: string) => void;

  /** Callback pour fermer le sélecteur */
  onClose?: () => void;
}

/**
 * Composant de sélection d'emojis et de GIFs
 */
const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onEmojiSelect,
  onClose,
}) => {
  // États pour les onglets d'emojis et de GIFs
  const [activeTab, setActiveTab] = useState(0);
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0]);
  const [activeGifCategory, setActiveGifCategory] = useState(GIF_CATEGORIES[0]);

  /**
   * Gère la sélection d'un emoji
   * @param emoji Emoji sélectionné
   */
  const handleEmojiSelect = (emoji: string) => {
    onEmojiSelect?.(emoji);
  };

  return (
    <Box
      sx={{
        width: 350,
        height: 400,
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      {/* Onglets principaux (Emojis/GIFs) */}
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Emojis" value={0} />
        <Tab label="GIFs" value={1} />
      </Tabs>

      {activeTab === 0 ? (
        <>
          {/* Sous-catégories d'emojis */}
          <Tabs
            value={activeCategory}
            onChange={(_, newValue) => setActiveCategory(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            {EMOJI_CATEGORIES.map((category) => (
              <Tab key={category} label={category} value={category} />
            ))}
          </Tabs>

          {/* Grille des emojis */}
          <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
            <Grid container spacing={1}>
              {EMOJI_MAP["Smileys & Emotion"]?.map((emoji, index) => (
                <Grid size={{ xs: 2 }} key={index}>
                  <Box
                    onClick={() => handleEmojiSelect(emoji)}
                    sx={{
                      cursor: "pointer",
                      fontSize: "1.5rem",
                      textAlign: "center",
                      borderRadius: 1,
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    {emoji}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </>
      ) : (
        <>
          {/* Sous-catégories de GIFs */}
          <Tabs
            value={activeGifCategory}
            onChange={(_, newValue) => setActiveGifCategory(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            {GIF_CATEGORIES.map((category) => (
              <Tab key={category} label={category} value={category} />
            ))}
          </Tabs>

          {/* Placeholder pour les GIFs */}
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              p: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Intégration des GIFs à venir
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};

export default EmojiPicker;
