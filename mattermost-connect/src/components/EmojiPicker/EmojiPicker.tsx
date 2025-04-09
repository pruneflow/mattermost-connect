// src/components/EmojiPicker/EmojiPicker.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  InputBase,
  IconButton,
  Tooltip,
  InputAdornment,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from "@mui/material";

// Material-UI Icons
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Image as ImageIcon,
  EmojiEmotions as EmojiIcon,
} from "@mui/icons-material";

// Composants
import EmojiPickerContent from "./EmojiPickerContent";
import GifPickerContent from "./GifPickerContent";
import CategoryBar from "./CategoryBar";
import { DEFAULT_CATEGORY_ICONS } from "./CategoryBar";

// Context et types
import { useEmoji } from "../../context/EmojiProvider";
import {
  EmojiPickerProps,
  PickerMode,
  EmojiSelectionResult,
} from "../../types";

/**
 * Sélecteur d'emojis et de GIFs
 * Prend en charge deux modes : sélection d'emoji pour un message ou ajout d'une réaction
 */
const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onSelect,
  onClose,
  mode = PickerMode.MESSAGE,
  messageId,
  channelId,
  sx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const {
    // États
    activeEmojiCategory,
    setActiveEmojiCategory,
    emojiCategories,
    activeGifCategory,
    setActiveGifCategory,
    gifCategories,
    gifs,
    loadingGifs,
    frequentEmojis,
    searchQuery,
    setSearchQuery,
    // Fonctions
    addReaction,
  } = useEmoji();

  // État pour la navigation entre onglets (emojis/GIFs)
  const [activeTab, setActiveTab] = useState(0); // 0 = emojis, 1 = GIFs

  // Déterminer la taille en fonction de l'appareil et du mode
  const getPickerSize = () => {
    if (mode === PickerMode.REACTION) {
      // Plus petit pour les réactions
      return {
        width: isMobile ? 270 : 300,
        height: isMobile ? 320 : 340,
      };
    }
    // Taille normale pour les messages
    return {
      width: isMobile ? 300 : 320,
      height: isMobile ? 350 : 370,
    };
  };

  const { width, height } = getPickerSize();

  /**
   * Gère la sélection d'un emoji
   */
  const handleEmojiSelect = async (emoji: string, emojiName: string) => {
    // Créer l'objet résultat pour le callback
    const result: EmojiSelectionResult = {
      emoji,
      emojiName,
      type: "emoji",
    };

    if (mode === PickerMode.REACTION && messageId && channelId) {
      try {
        // Si en mode réaction, envoyer directement la réaction via l'API
        await addReaction(channelId, messageId, emoji);

        // Fermer le picker après l'ajout réussi
        onClose?.();
      } catch (error) {
        console.error("Error adding reaction:", error);
        // Vous pourriez ajouter une notification d'erreur ici
      }
    } else {
      // En mode message, simplement retourner l'emoji sélectionné
      onSelect?.(result);
      if (mode === PickerMode.REACTION) {
        onClose?.();
      }
    }
  };

  /**
   * Gère la sélection d'un GIF
   */
  const handleGifSelect = (gifId: string, gifUrl?: string) => {
    // Créer l'objet résultat pour le callback
    const result: EmojiSelectionResult = {
      emoji: "📷", // Emoji de remplacement pour indiquer un GIF
      emojiName: "gif",
      type: "gif",
      gifId,
      gifUrl,
    };

    onSelect?.(result);

    // Toujours fermer après sélection d'un GIF
    onClose?.();
  };

  /**
   * Gère la recherche d'emojis ou de GIFs
   */
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  /**
   * Efface la recherche
   */
  const clearSearch = () => {
    setSearchQuery("");
  };

  // Titre à afficher en fonction du mode
  const getTitle = () => {
    if (mode === PickerMode.REACTION) {
      return "Ajouter une réaction";
    }
    return activeTab === 0 ? "Emojis" : "GIFs";
  };

  return (
    <Box
      sx={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "background.paper",
        boxShadow: theme.shadows[3],
        ...sx,
      }}
    >
      {/* Titre du picker en mode réaction */}
      {mode === PickerMode.REACTION && (
        <Box
          sx={{
            p: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="subtitle2">{getTitle()}</Typography>
          {onClose && (
            <IconButton size="small" onClick={onClose}>
              <ClearIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}

      {/* Onglets principaux (Emojis/GIFs) - masqués en mode réaction */}
      {mode === PickerMode.MESSAGE && (
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => {
            setActiveTab(newValue);
            setSearchQuery(""); // Réinitialiser la recherche lors du changement d'onglet
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
      )}

      {/* Barre de recherche */}
      <Box sx={{ px: 1, py: 0.5, borderBottom: 1, borderColor: "divider" }}>
        <InputBase
          placeholder={
            activeTab === 0 ? "Rechercher un emoji..." : "Rechercher un GIF..."
          }
          fullWidth
          value={searchQuery}
          onChange={handleSearchChange}
          startAdornment={
            <InputAdornment position="start">
              <SearchIcon
                fontSize="small"
                sx={{ color: "text.secondary", mr: 0.5 }}
              />
            </InputAdornment>
          }
          endAdornment={
            searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={clearSearch}
                  edge="end"
                  sx={{ p: 0.5 }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }
          sx={{
            fontSize: "0.875rem",
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: "action.hover",
          }}
        />
      </Box>

      {activeTab === 0 || mode === PickerMode.REACTION ? (
        // SECTION EMOJIS
        <>
          {/* Sous-catégories des Emojis (visibles uniquement si pas de recherche) */}
          {!searchQuery && (
            <CategoryBar
              categories={emojiCategories}
              activeCategory={activeEmojiCategory}
              onCategoryChange={setActiveEmojiCategory}
              categoryIcons={DEFAULT_CATEGORY_ICONS}
              iconsOnly={isMobile}
            />
          )}
          <EmojiPickerContent
            onEmojiSelect={handleEmojiSelect}
            searchQuery={searchQuery}
            activeCategory={activeEmojiCategory}
            frequentEmojis={frequentEmojis}
          />
        </>
      ) : (
        // SECTION GIFS
        <>
          {/* Sous-catégories de GIFs (visibles uniquement si pas de recherche) */}
          {!searchQuery && (
            <CategoryBar
              categories={gifCategories}
              activeCategory={activeGifCategory}
              onCategoryChange={setActiveGifCategory}
              categoryIcons={DEFAULT_CATEGORY_ICONS}
              iconsOnly={isMobile}
            />
          )}

          {/* Grille des GIFs */}
          <GifPickerContent
            onGifSelect={handleGifSelect}
            searchQuery={searchQuery}
            activeCategory={activeGifCategory}
            gifs={gifs}
            loading={loadingGifs}
          />
        </>
      )}

      {/* Barre d'état en bas (optionnelle) */}
      <Box
        sx={{
          p: 0.5,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "background.default",
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          {activeTab === 0 || mode === PickerMode.REACTION
            ? "Emojis"
            : searchQuery
              ? "Recherche de GIFs..."
              : `GIFs ${activeGifCategory}`}
        </Typography>

        {onClose && mode === PickerMode.MESSAGE && (
          <Tooltip title="Fermer">
            <IconButton size="small" onClick={onClose}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default EmojiPicker;
