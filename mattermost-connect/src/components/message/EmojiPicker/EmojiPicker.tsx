// src/components/EmojiPicker/EmojiPicker.tsx
import React, { useState } from "react";
import { Box, useTheme, useMediaQuery } from "@mui/material";

// Composants
import EmojiPickerContent from "./components/EmojiPickerContent";
import GifPickerContent from "./components/GifPickerContent";
import EmojiPickerCategoryBar from "./components/EmojiPickerCategoryBar";
import { DEFAULT_CATEGORY_ICONS } from "./components/EmojiPickerCategoryBar";

// Context et types
import { useEmoji } from "../../../context/EmojiProvider";
import {
  EmojiPickerProps,
  PickerMode,
  EmojiSelectionResult,
} from "../../../types";
import { EmojiPickerFooter } from "./components/EmojiPickerFooter";
import { EmojiSearchBar } from "./components/EmojiSearchBar";
import { EmojiPickerHeader } from "./components/EmojiPickerHeader";
import { EmojiPickerTabs } from "./components/EmojiPickerTabs";

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
        await addReaction(messageId, emoji);

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
      {/* En-tête (uniquement en mode réaction) */}
      <EmojiPickerHeader mode={mode} activeTab={activeTab} onClose={onClose} />

      {/* Onglets principaux (uniquement en mode message) */}
      <EmojiPickerTabs
        mode={mode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        clearSearch={clearSearch}
      />

      {/* Barre de recherche */}
      <EmojiSearchBar
        activeTab={activeTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        clearSearch={clearSearch}
      />

      {/* Contenu principal */}
      {activeTab === 0 || mode === PickerMode.REACTION ? (
        // SECTION EMOJIS
        <>
          {/* Barre de catégories (visible uniquement sans recherche) */}
          {!searchQuery && (
            <EmojiPickerCategoryBar
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
          {/* Barre de catégories GIF (visible uniquement sans recherche) */}
          {!searchQuery && (
            <EmojiPickerCategoryBar
              categories={gifCategories}
              activeCategory={activeGifCategory}
              onCategoryChange={setActiveGifCategory}
              categoryIcons={DEFAULT_CATEGORY_ICONS}
              iconsOnly={isMobile}
            />
          )}
          <GifPickerContent
            onGifSelect={handleGifSelect}
            searchQuery={searchQuery}
            activeCategory={activeGifCategory}
            gifs={gifs}
            loading={loadingGifs}
          />
        </>
      )}

      {/* Pied de page avec statut et bouton de fermeture */}
      <EmojiPickerFooter
        mode={mode}
        activeTab={activeTab}
        searchQuery={searchQuery}
        activeEmojiCategory={activeEmojiCategory}
        activeGifCategory={activeGifCategory}
        onClose={onClose}
      />
    </Box>
  );
};

export default EmojiPicker;
