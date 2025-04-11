// src/components/MessageComposer/MessageComposer.stories.tsx
import type { Meta, StoryObj, Decorator } from "@storybook/react";
import React, { useState } from "react";
import { MattermostProvider } from "../../../context/MattermostProvider";
import MessageComposer from "./MessageComposer";
import { Box, Typography, Paper } from "@mui/material";

// Mock Mattermost service pour Storybook
const createMockMattermostService = () => ({
  postMessage: async (channelId: string, message: string) => {
    console.log(`Message envoyé au canal ${channelId}:`, message);
    return {
      id: "mock-message-id",
      message,
      channel_id: channelId,
      user_id: "user1",
      create_at: Date.now(),
      update_at: Date.now(),
    };
  },
  // Autres méthodes mockées si nécessaire
});

// Decorateur pour fournir un MattermostProvider factice
const MattermostProviderDecorator: Decorator = (Story) => (
  <MattermostProvider
    serviceProvider={{
      setupService: createMockMattermostService,
      isConnected: true,
      skipConnectionTest: true,
    }}
  >
    <Story />
  </MattermostProvider>
);

// Wrapper pour afficher le composant dans un contexte visuellement cohérent
const MessageComposerWrapper = (args) => {
  const [messages, setMessages] = useState<
    Array<{ id: string; text: string; time: string }>
  >([]);

  const handleMessageSent = (message: string) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: Date.now().toString(),
        text: message,
        time: new Date().toLocaleTimeString(),
      },
    ]);

    args.onMessageSent?.(message);
  };

  return (
    <Box
      sx={{
        height: args.height || 400,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Zone d'affichage des messages (pour démonstration) */}
      {args.showMessageHistory && (
        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            p: 2,
            bgcolor: "background.default",
            borderRadius: 1,
            mb: 2,
          }}
        >
          {messages.length > 0 ? (
            messages.map((msg) => (
              <Paper
                key={msg.id}
                elevation={1}
                sx={{ p: 2, mb: 1, maxWidth: "80%", ml: "auto" }}
              >
                <Typography component={"div"} variant="body2">
                  {msg.text}
                </Typography>
                <Typography
                  component={"div"}
                  variant="caption"
                  color="text.secondary"
                >
                  {msg.time}
                </Typography>
              </Paper>
            ))
          ) : (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              <Typography
                component={"div"}
                variant="body2"
                color="text.secondary"
              >
                Les messages envoyés apparaîtront ici
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Composant MessageComposer */}
      <MessageComposer {...args} onMessageSent={handleMessageSent} />
    </Box>
  );
};

const meta: Meta<typeof MessageComposer> = {
  title: "Components/MessageComposer",
  component: MessageComposer,
  parameters: {
    layout: (args) =>
      args.story.name.includes("Mobile") ? "fullscreen" : "centered",
  },
  decorators: [MattermostProviderDecorator],
  argTypes: {
    onMessageSent: { action: "message sent" },
    channelId: { control: "text" },
    placeholder: { control: "text" },
    allowAttachments: { control: "boolean" },
    disabled: { control: "boolean" },
    initialText: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof MessageComposer>;

// Story de base
export const Default: Story = {
  render: (args) => <MessageComposerWrapper {...args} />,
  args: {
    channelId: "channel1",
    placeholder: "Type a message...",
    allowAttachments: true,
    showMessageHistory: true,
  },
};

// Avec texte initial
export const WithInitialText: Story = {
  render: (args) => <MessageComposerWrapper {...args} />,
  args: {
    ...Default.args,
    initialText: "Draft message that needs to be completed...",
  },
};

// État désactivé
export const Disabled: Story = {
  render: (args) => <MessageComposerWrapper {...args} />,
  args: {
    ...Default.args,
    disabled: true,
  },
};

// Sans pièces jointes
export const WithoutAttachments: Story = {
  render: (args) => <MessageComposerWrapper {...args} />,
  args: {
    ...Default.args,
    allowAttachments: false,
  },
};

// Mode mobile (pleine largeur)
export const Mobile: Story = {
  render: (args) => (
    <Box
      sx={{
        width: "100%",
        maxWidth: "480px",
        height: "100vh",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          height: 60,
          bgcolor: "primary.main",
          color: "white",
          display: "flex",
          alignItems: "center",
          px: 2,
        }}
      >
        <Typography component={"div"} variant="h6">
          Canal Général
        </Typography>
      </Box>
      <Box
        sx={{
          flexGrow: 1,
          bgcolor: "background.default",
          p: 1,
          overflowY: "auto",
        }}
      >
        <Typography
          component={"div"}
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", mt: 4 }}
        >
          Contenu de la conversation
        </Typography>
      </Box>
      <MessageComposer {...args} />
    </Box>
  ),
  args: {
    channelId: "channel1",
    placeholder: "Message #general",
    allowAttachments: true,
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};

// Modèle de conversation complet avec historique
export const ConversationExample: Story = {
  render: (args) => {
    const [messages, setMessages] = useState([
      {
        id: "1",
        text: "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
        time: "10:03",
        isUser: false,
      },
      {
        id: "2",
        text: "J'ai besoin d'aide pour configurer le composant MessageComposer",
        time: "10:04",
        isUser: true,
      },
      {
        id: "3",
        text: "Bien sûr, je vais vous montrer comment l'intégrer dans votre application.",
        time: "10:05",
        isUser: false,
      },
    ]);

    const handleMessageSent = (message: string) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: Date.now().toString(),
          text: message,
          time: new Date().toLocaleTimeString(),
          isUser: true,
        },
      ]);

      // Simuler une réponse automatique
      setTimeout(() => {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: (Date.now() + 1).toString(),
            text: "J'ai bien reçu votre message. Est-ce que je peux vous aider avec autre chose ?",
            time: new Date().toLocaleTimeString(),
            isUser: false,
          },
        ]);
      }, 1000);

      args.onMessageSent?.(message);
    };

    return (
      <Box
        sx={{
          height: 500,
          display: "flex",
          flexDirection: "column",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Typography component={"div"} variant="subtitle1" fontWeight="bold">
            Support technique
          </Typography>
        </Box>

        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            p: 2,
            bgcolor: "background.default",
          }}
        >
          {messages.map((msg) => (
            <Paper
              key={msg.id}
              elevation={1}
              sx={{
                p: 2,
                mb: 1,
                maxWidth: "80%",
                ml: msg.isUser ? "auto" : "0",
                mr: msg.isUser ? "0" : "auto",
                bgcolor: msg.isUser ? "primary.light" : "background.paper",
                color: msg.isUser ? "primary.contrastText" : "text.primary",
              }}
            >
              <Typography component={"div"} variant="body2">
                {msg.text}
              </Typography>
              <Typography
                component={"div"}
                variant="caption"
                color={msg.isUser ? "inherit" : "text.secondary"}
                sx={{ opacity: 0.8 }}
              >
                {msg.time}
              </Typography>
            </Paper>
          ))}
        </Box>

        <MessageComposer {...args} onMessageSent={handleMessageSent} />
      </Box>
    );
  },
  args: {
    channelId: "support-channel",
    placeholder: "Envoyer un message...",
    allowAttachments: true,
  },
};
