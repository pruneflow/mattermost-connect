// src/components/message/EmojiPicker/components/EmojiPickerContent.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Tooltip,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { EmojiPickerContentProps } from "../../../../types";
import { useMattermost, useEmoji } from "../../../../context";
import { EMOJI_MAP, getEmojiName, searchEmojis } from "../../../../utils";

/**
 * Affiche une grille d'emojis catégorisée ou filtrée par recherche
 */
const EmojiPickerContent: React.FC<EmojiPickerContentProps> = ({
  onEmojiSelect,
  searchQuery,
  activeCategory,
  frequentEmojis = [],
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { services } = useMattermost();

  // État pour les emojis filtrés
  const [filteredEmojis, setFilteredEmojis] = useState<string[]>([]);

  // Effet pour filtrer les emojis lors de la recherche ou du changement de catégorie
  useEffect(() => {
    if (searchQuery) {
      // In the new architecture, we use the utility function directly
      // since emoji service is no longer exposed in the same way
      setFilteredEmojis(searchEmojis(searchQuery));
    } else {
      // Afficher les emojis de la catégorie sélectionnée
      setFilteredEmojis(EMOJI_MAP[activeCategory] || []);
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

  // Afficher les emojis fréquents seulement si pas de recherche et si c'est la première catégorie
  const showFrequent = frequentEmojis.length > 0 && !searchQuery;

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
      {/* Section pour les emojis fréquemment utilisés */}
      {showFrequent && (
        <>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 0.5, px: 1 }}
            component={"div"}
          >
            Récemment utilisés
          </Typography>

          <Grid container spacing={0.5} sx={{ mb: 1.5 }}>
            {frequentEmojis.map((emoji, index) => (
              <Grid key={`frequent-${index}`} size={{ xs: 12 / emojisPerRow }}>
                <Tooltip title={getEmojiName(emoji)} arrow>
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

          <Divider sx={{ my: 1 }} />
        </>
      )}

      {/* Grille principale d'emojis */}
      <Grid container spacing={0.5}>
        {filteredEmojis.map((emoji, index) => (
          <Grid key={index} size={{ xs: 12 / emojisPerRow }}>
            <Tooltip title={getEmojiName(emoji)} arrow>
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
          <Typography variant="body2" color="text.secondary" component={"div"}>
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
