// src/components/EmojiPicker/CategoryBar.tsx
import React from "react";
import { Tabs, Tab, Box, useTheme, useMediaQuery } from "@mui/material";

// Material-UI Icons
import {
  EmojiEmotions as SmileysIcon,
  Person as PeopleIcon,
  Pets as AnimalsIcon,
  Fastfood as FoodIcon,
  DirectionsCar as TravelIcon,
  SportsBasketball as ActivityIcon,
  Lightbulb as ObjectsIcon,
  TagFaces as EmotionIcon,
  Flag as FlagIcon,
  ThumbUp as ReactionIcon,
  Whatshot as TrendingIcon,
  Theaters as MoviesIcon,
  Tv as TvIcon,
  Celebration as MemesIcon,
  Mic as CelebsIcon,
  Sports as SportsIcon,
  Cottage as AnimatedIcon,
} from "@mui/icons-material";

// Types
import { CategoryBarProps } from "../../types";

// Mapping par défaut des icônes pour les catégories
export const DEFAULT_CATEGORY_ICONS: Record<string, React.ReactNode> = {
  // Emoji categories
  "Smileys & Emotion": <SmileysIcon fontSize="small" />,
  "People & Body": <PeopleIcon fontSize="small" />,
  "Animals & Nature": <AnimalsIcon fontSize="small" />,
  "Food & Drink": <FoodIcon fontSize="small" />,
  "Travel & Places": <TravelIcon fontSize="small" />,
  Activities: <ActivityIcon fontSize="small" />,
  Objects: <ObjectsIcon fontSize="small" />,
  Symbols: <EmotionIcon fontSize="small" />,
  Flags: <FlagIcon fontSize="small" />,

  // GIF categories
  Trending: <TrendingIcon fontSize="small" />,
  Reactions: <ReactionIcon fontSize="small" />,
  Memes: <MemesIcon fontSize="small" />,
  Celebs: <CelebsIcon fontSize="small" />,
  Sports: <SportsIcon fontSize="small" />,
  TV: <TvIcon fontSize="small" />,
  Movies: <MoviesIcon fontSize="small" />,
  Animals: <AnimatedIcon fontSize="small" />,
};

/**
 * Barre de catégories réutilisable pour les emojis et GIFs
 */
const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
  categoryIcons = DEFAULT_CATEGORY_ICONS,
  iconsOnly,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Utiliser iconsOnly si défini, sinon utiliser la détection mobile
  const showIconsOnly = iconsOnly !== undefined ? iconsOnly : isMobile;

  return (
    <Tabs
      value={activeCategory}
      onChange={(_, newValue) => onCategoryChange(newValue)}
      variant="scrollable"
      scrollButtons="auto"
      allowScrollButtonsMobile
      sx={{
        minHeight: "36px",
        borderBottom: 1,
        borderColor: "divider",
        "& .MuiTab-root": {
          minWidth: "auto",
          minHeight: "36px",
          px: 1.5,
          py: 0.25,
        },
      }}
    >
      {categories.map((category) => (
        <Tab
          key={category}
          value={category}
          icon={categoryIcons[category] || undefined}
          iconPosition="start"
          label={showIconsOnly ? undefined : getCategoryLabel(category)}
          aria-label={category}
          sx={{
            minWidth: showIconsOnly ? 48 : undefined,
          }}
        />
      ))}
    </Tabs>
  );
};

/**
 * Récupère le premier mot d'une catégorie pour l'affichage compact
 */
const getCategoryLabel = (category: string): string => {
  return category.split(" ")[0];
};

export default CategoryBar;
