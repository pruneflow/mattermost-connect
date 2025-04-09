// src/components/EmojiPicker/GifPickerContent.tsx
import React, { useState, useEffect } from "react";
import { Box, Grid, Typography, Skeleton } from "@mui/material";
import { GifPickerContentProps } from "./types";

// Catégories de GIFs
export const GIF_CATEGORIES = [
  "Trending",
  "Reactions",
  "Memes",
  "Celebs",
  "Sports",
  "TV",
  "Movies",
  "Animals",
];

// Exemple de données GIF pour la démo - à remplacer par vos propres données
const GIF_SAMPLES = {
  Trending: [
    { id: "trend1", title: "Trending GIF 1" },
    { id: "trend2", title: "Trending GIF 2" },
    { id: "trend3", title: "Trending GIF 3" },
    { id: "trend4", title: "Trending GIF 4" },
  ],
  Reactions: [
    { id: "react1", title: "Reaction GIF 1" },
    { id: "react2", title: "Reaction GIF 2" },
    { id: "react3", title: "Reaction GIF 3" },
    { id: "react4", title: "Reaction GIF 4" },
  ],
  Memes: [
    { id: "meme1", title: "Meme GIF 1" },
    { id: "meme2", title: "Meme GIF 2" },
  ],
  // Autres catégories similaires
};

/**
 * Contenu du sélecteur de GIFs
 */
const GifPickerContent: React.FC<GifPickerContentProps> = ({
  onGifSelect,
  searchQuery,
  activeCategory,
}) => {
  const [loading, setLoading] = useState(false);
  const [gifs, setGifs] = useState<any[]>([]);

  // Simuler un chargement de GIFs
  useEffect(() => {
    setLoading(true);

    // Simuler un délai de chargement
    const timer = setTimeout(() => {
      if (searchQuery) {
        // Simuler une recherche - remplacer par une vraie API
        setGifs([
          { id: "search1", title: `Result for "${searchQuery}" 1` },
          { id: "search2", title: `Result for "${searchQuery}" 2` },
          { id: "search3", title: `Result for "${searchQuery}" 3` },
          { id: "search4", title: `Result for "${searchQuery}" 4` },
        ]);
      } else {
        // Afficher les GIFs de la catégorie sélectionnée
        setGifs(GIF_SAMPLES[activeCategory] || []);
      }
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, activeCategory]);

  // Gérer la sélection d'un GIF
  const handleGifClick = (gifId: string) => {
    // Dans une implémentation réelle, on récupérerait l'URL du GIF
    const gifUrl = `https://api.giphy.com/v1/gifs/${gifId}`;
    onGifSelect(gifId, gifUrl);
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
      {loading ? (
        // Affichage du chargement
        <Grid container spacing={1}>
          {[1, 2, 3, 4].map((num) => (
            <Grid item key={num} xs={6}>
              <Skeleton
                variant="rectangular"
                height={80}
                sx={{ borderRadius: 1 }}
              />
              <Skeleton variant="text" width="80%" sx={{ mt: 0.5 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        // Affichage des GIFs
        <Grid container spacing={1}>
          {gifs.map((gif) => (
            <Grid item key={gif.id} xs={6}>
              <Box
                onClick={() => handleGifClick(gif.id)}
                sx={{
                  width: "100%",
                  height: 80,
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  overflow: "hidden",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "transform 0.2s",
                  "&:hover": {
                    transform: "scale(1.05)",
                  },
                }}
              >
                {/* Ici, vous afficheriez une prévisualisation du GIF */}
                <Typography
                  variant="caption"
                  sx={{ p: 1, textAlign: "center" }}
                >
                  {gif.title}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {!loading && gifs.length === 0 && (
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
              ? "Aucun GIF correspondant à votre recherche"
              : "Aucun GIF disponible dans cette catégorie"}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default GifPickerContent;
