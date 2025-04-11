// src/components/EmojiPicker/GifPickerContent.tsx
import React from "react";
import { Box, Grid, Typography, Skeleton, useTheme } from "@mui/material";
import { GifPickerContentProps } from "../../../types";

/**
 * Affichage du contenu GIF avec gestion des états de chargement et des résultats vides
 */
const GifPickerContent: React.FC<GifPickerContentProps> = ({
  onGifSelect,
  searchQuery,
  activeCategory,
  gifs,
  loading,
}) => {
  const theme = useTheme();

  // Gérer la sélection d'un GIF
  const handleGifClick = (gifId: string, gifUrl?: string) => {
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
            <Grid key={num} size={{ xs: 6 }}>
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
            <Grid key={gif.id} size={{ xs: 6 }}>
              <Box
                onClick={() => handleGifClick(gif.id, gif.url)}
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
                    boxShadow: theme.shadows[2],
                  },
                  position: "relative",
                }}
              >
                {/* Prévisualisation du GIF (si elle existe) */}
                {gif.preview ? (
                  <Box
                    component="img"
                    src={gif.preview}
                    alt={gif.title}
                    sx={{
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                    }}
                    onError={(e) => {
                      // Fallback en cas d'erreur de chargement de l'image
                      e.currentTarget.src = "/api/placeholder/100/80";
                    }}
                  />
                ) : (
                  <Typography
                    variant="caption"
                    sx={{ p: 1, textAlign: "center" }}
                    component={"div"}
                  >
                    {gif.title}
                  </Typography>
                )}

                {/* Titre du GIF en overlay */}
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    bgcolor: "rgba(0, 0, 0, 0.6)",
                    padding: "2px 4px",
                  }}
                >
                  <Typography
                    component={"div"}
                    variant="caption"
                    sx={{
                      color: "white",
                      fontSize: "0.6rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "block",
                    }}
                  >
                    {gif.title}
                  </Typography>
                </Box>
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
          <Typography component={"div"} variant="body2" color="text.secondary">
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
