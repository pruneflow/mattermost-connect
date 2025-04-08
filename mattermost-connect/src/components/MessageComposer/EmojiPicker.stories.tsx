// src/components/MessageComposer/EmojiPicker.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import EmojiPicker from "./EmojiPicker";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  TextField,
  InputAdornment,
} from "@mui/material";
import { EmojiEmotions as EmojiIcon } from "@mui/icons-material";

const meta: Meta<typeof EmojiPicker> = {
  title: "Components/EmojiPicker",
  component: EmojiPicker,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    onEmojiSelect: { action: "emoji selected" },
    onClose: { action: "closed" },
  },
};

export default meta;

type Story = StoryObj<typeof EmojiPicker>;

// Story de base qui montre le EmojiPicker directement
export const Default: Story = {
  args: {},
};

// Story avec sélection d'emoji et affichage de l'emoji sélectionné
export const WithSelection: Story = {
  render: (args) => {
    const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState(true);

    const handleEmojiSelect = (emoji: string) => {
      setSelectedEmoji(emoji);
      args.onEmojiSelect?.(emoji);
    };

    const handleClose = () => {
      setIsPickerOpen(false);
      setTimeout(() => setIsPickerOpen(true), 500); // Réouvrir après un délai pour la démo
      args.onClose?.();
    };

    return (
      <Box sx={{ minHeight: 500 }}>
        {selectedEmoji && (
          <Paper elevation={2} sx={{ p: 2, mb: 3, maxWidth: 300, mx: "auto" }}>
            <Typography variant="body1" gutterBottom>
              Emoji sélectionné:
            </Typography>
            <Box sx={{ fontSize: "2rem", textAlign: "center" }}>
              {selectedEmoji}
            </Box>
          </Paper>
        )}
        {isPickerOpen && (
          <EmojiPicker
            {...args}
            onEmojiSelect={handleEmojiSelect}
            onClose={handleClose}
          />
        )}
      </Box>
    );
  },
  args: {},
};

// Story qui montre l'intégration du picker dans un champ de texte
export const IntegratedWithTextField: Story = {
  render: (args) => {
    const [text, setText] = useState("");
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const handleEmojiSelect = (emoji: string) => {
      setText((prev) => prev + emoji);
      setAnchorEl(null);
      args.onEmojiSelect?.(emoji);
    };

    return (
      <Box sx={{ width: 400, position: "relative" }}>
        <TextField
          fullWidth
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          variant="outlined"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                  >
                    <EmojiIcon />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        {anchorEl && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              transform: "translateY(-100%)",
              zIndex: 1200,
            }}
          >
            <EmojiPicker
              {...args}
              onEmojiSelect={handleEmojiSelect}
              onClose={() => setAnchorEl(null)}
            />
          </Box>
        )}
      </Box>
    );
  },
  args: {},
};

// Story qui montre comment basculer entre les catégories
export const CategoryNavigation: Story = {
  render: (args) => {
    const categories = [
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

    const [activeCategory, setActiveCategory] = useState(categories[0]);

    return (
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="body2" gutterBottom>
          Vous pouvez naviguer entre les différentes catégories dans le picker
          ci-dessous
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          gutterBottom
          sx={{ display: "block" }}
        >
          Catégorie active: <strong>{activeCategory}</strong>
        </Typography>
        <Box sx={{ mt: 2 }}>
          <EmojiPicker {...args} />
        </Box>
      </Box>
    );
  },
  args: {},
};

// Story qui montre l'onglet GIFs
export const GifTab: Story = {
  render: (args) => {
    return (
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="body2" gutterBottom>
          Le picker prend également en charge les GIFs (cliquez sur l'onglet
          GIFs)
        </Typography>
        <Box sx={{ mt: 2 }}>
          <EmojiPicker {...args} />
        </Box>
      </Box>
    );
  },
  args: {},
  play: async ({ canvasElement }) => {
    // Trouver et cliquer sur l'onglet GIFs
    const gifsTab =
      canvasElement.querySelector('[aria-label="GIFs"]') ||
      canvasElement.querySelector('[role="tab"]:nth-child(2)');
    if (gifsTab) {
      (gifsTab as HTMLElement).click();
    }
  },
};

// Story mobile pour montrer l'adaptabilité
export const Mobile: Story = {
  render: (args) => (
    <Box sx={{ width: "100%", maxWidth: 350 }}>
      <EmojiPicker {...args} />
    </Box>
  ),
  args: {},
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};
