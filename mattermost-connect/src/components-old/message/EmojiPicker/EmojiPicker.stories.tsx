// src/components/message/EmojiPicker/EmojiPicker.stories.tsx
import type { Decorator, Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import EmojiPicker from "../../.././components-old/message/EmojiPicker/EmojiPicker";
import { Box, Typography, Paper } from "@mui/material";
import { MattermostProvider } from "../../../context";
import { EMOJI_CATEGORIES, GIF_CATEGORIES } from "../../../utils";
import { GifData, PickerMode } from "../../../types";

// Mock GIFs data for Storybook
const MOCK_GIFS: Record<string, GifData[]> = {
  Trending: [
    {
      id: "trend1",
      preview: "https://via.placeholder.com/150",
      title: "Trending GIF 1",
    },
    {
      id: "trend2",
      preview: "https://via.placeholder.com/150",
      title: "Trending GIF 2",
    },
  ],
  Reactions: [
    {
      id: "react1",
      preview: "https://via.placeholder.com/150",
      title: "Reaction GIF 1",
    },
    {
      id: "react2",
      preview: "https://via.placeholder.com/150",
      title: "Reaction GIF 2",
    },
  ],
  Memes: [
    {
      id: "meme1",
      preview: "https://via.placeholder.com/150",
      title: "Meme GIF 1",
    },
    {
      id: "meme2",
      preview: "https://via.placeholder.com/150",
      title: "Meme GIF 2",
    },
  ],
};

// Create mock services for Storybook
const createMockServices = () => {
  // Mock Mattermost service
  const mattermostService = {
    mode: "custom" as const,
    getBaseUrl: () => "https://example.com",
    getCurrentUser: async () => ({
      id: "user1",
      username: "testuser",
      update_at: Date.now(),
    }),
    getFrequentEmojis: async () => [
      "👍",
      "❤️",
      "😂",
      "🎉",
      "🔥",
      "👏",
      "✅",
      "🙏",
    ],
    addReaction: async () => ({ success: true }),
    removeReaction: async () => ({ success: true }),
    hasReacted: async () => false,
    getGifs: async (category: string) => MOCK_GIFS[category] || [],
    searchGifs: async (query: string) => {
      const allGifs = Object.values(MOCK_GIFS).flat();
      return allGifs.filter((gif) =>
        gif.title.toLowerCase().includes(query.toLowerCase()),
      );
    },
  };

  // Mock notification service
  const notificationService = {
    addEventListener: () => () => {},
    setCurrentUserId: () => {},
  };

  // Mock emoji service
  const emojiService = {
    getFrequentEmojis: mattermostService.getFrequentEmojis,
    addReaction: mattermostService.addReaction,
    removeReaction: mattermostService.removeReaction,
    hasReacted: mattermostService.hasReacted,
    searchGifs: mattermostService.searchGifs,
    getGifs: mattermostService.getGifs,
  };

  return {
    mattermostService,
    notificationService,
    emojiService,
    // Add minimal implementations of other required services
    teamService: {},
    channelService: {},
    messageService: {},
    userService: {},
    reactionService: {},
    fileService: {},
    errorHandler: {},
  };
};

// Decorator to provide a mock MattermostProvider
const ProviderDecorator: Decorator = (Story) => (
  <MattermostProvider
    serviceProvider={{
      setupService: () => createMockServices().mattermostService,
      isConnected: true,
      skipConnectionTest: true,
      enableWebsocket: false,
    }}
  >
    <Story />
  </MattermostProvider>
);

const meta: Meta<typeof EmojiPicker> = {
  title: "Components/EmojiPicker",
  component: EmojiPicker,
  decorators: [ProviderDecorator],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    onSelect: { action: "emoji selected" },
    onClose: { action: "closed" },
    mode: {
      control: "radio",
      options: [PickerMode.MESSAGE, PickerMode.REACTION],
    },
  },
};

export default meta;

type Story = StoryObj<typeof EmojiPicker>;

// Basic story showing the EmojiPicker directly
export const Default: Story = {
  args: {
    mode: PickerMode.MESSAGE,
  },
};

// Story with emoji selection and display of the selected emoji
export const WithSelection: Story = {
  render: (args) => {
    const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState(true);

    const handleEmojiSelect = (result: any) => {
      setSelectedEmoji(result.emoji);
      args.onSelect?.(result);
    };

    const handleClose = () => {
      setIsPickerOpen(false);
      setTimeout(() => setIsPickerOpen(true), 500); // Reopen after delay for demo
      args.onClose?.();
    };

    return (
      <Box sx={{ minHeight: 500 }}>
        {selectedEmoji && (
          <Paper elevation={2} sx={{ p: 2, mb: 3, maxWidth: 300, mx: "auto" }}>
            <Typography component={"div"} variant="body1" gutterBottom>
              Selected emoji:
            </Typography>
            <Box sx={{ fontSize: "2rem", textAlign: "center" }}>
              {selectedEmoji}
            </Box>
          </Paper>
        )}
        {isPickerOpen && (
          <EmojiPicker
            {...args}
            onSelect={handleEmojiSelect}
            onClose={handleClose}
          />
        )}
      </Box>
    );
  },
  args: {
    mode: PickerMode.MESSAGE,
  },
};

// Story showing category navigation
export const CategoryNavigation: Story = {
  render: (args) => {
    return (
      <Box sx={{ textAlign: "center" }}>
        <Typography component={"div"} variant="body2" gutterBottom>
          You can navigate between different categories in the picker below
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          gutterBottom
          sx={{ display: "block" }}
        >
          Available categories: <strong>{EMOJI_CATEGORIES.join(", ")}</strong>
        </Typography>
        <Box sx={{ mt: 2 }}>
          <EmojiPicker {...args} />
        </Box>
      </Box>
    );
  },
  args: {
    mode: PickerMode.MESSAGE,
  },
};

// Story showing the GIFs tab
export const GifTab: Story = {
  render: (args) => {
    return (
      <Box sx={{ textAlign: "center" }}>
        <Typography component={"div"} variant="body2" gutterBottom>
          The picker also supports GIFs (click on the GIFs tab)
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          gutterBottom
          sx={{ display: "block" }}
        >
          Available GIF categories: <strong>{GIF_CATEGORIES.join(", ")}</strong>
        </Typography>
        <Box sx={{ mt: 2 }}>
          <EmojiPicker {...args} />
        </Box>
      </Box>
    );
  },
  args: {
    mode: PickerMode.MESSAGE,
  },
  play: async ({ canvasElement }) => {
    // Find and click on the GIFs tab
    const gifsTab =
      canvasElement.querySelector('[aria-label="GIFs"]') ||
      canvasElement.querySelector('[role="tab"]:nth-child(2)');
    if (gifsTab) {
      (gifsTab as HTMLElement).click();
    }
  },
};

// Mobile story to show adaptability
export const Mobile: Story = {
  render: (args) => (
    <Box sx={{ width: "100%", maxWidth: 350 }}>
      <EmojiPicker {...args} />
    </Box>
  ),
  args: {
    mode: PickerMode.MESSAGE,
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};
