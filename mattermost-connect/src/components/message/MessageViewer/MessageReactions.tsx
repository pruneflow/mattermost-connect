// src/components/message/MessageViewer/MessageReactions.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  alpha,
  Tooltip,
} from "@mui/material";
import { MessageReactionsProps } from "./MessageTypes";
import { useMattermost } from "../../../context/MattermostProvider";
import { getEmojiFromName } from "../EmojiPicker";
import { WebSocketEventType } from "../../../services/notification.service";

/**
 * Type interne pour la gestion des réactions
 * Structure plus organisée pour faciliter le suivi des réactions
 */
interface ReactionInfo {
  emojiName: string; // Nom de l'emoji (pour l'API)
  emoji: string; // Caractère de l'emoji
  count: number; // Nombre total de réactions
  userIds: Set<string>; // Ensemble des IDs utilisateurs ayant réagi (pour éviter les doublons)
}

/**
 * Displays reactions to a message with ability to add/remove reactions
 */
const MessageReactions: React.FC<MessageReactionsProps> = ({
  message,
  isFromCurrentUser = false,
  sx,
}) => {
  const { service, currentUser, notificationService } = useMattermost();
  const [reactions, setReactions] = useState<ReactionInfo[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Fonction utilitaire pour organiser les réactions depuis le message
  const processReactions = useCallback(() => {
    if (!message.metadata?.reactions || !message.metadata.reactions.length) {
      return [];
    }

    // Map pour éviter les doublons et simplifier le traitement
    const reactionsMap = new Map<string, ReactionInfo>();

    message.metadata.reactions.forEach((reaction) => {
      const { emoji_name, user_id } = reaction;

      // Si cette réaction n'existe pas encore, l'initialiser
      if (!reactionsMap.has(emoji_name)) {
        reactionsMap.set(emoji_name, {
          emojiName: emoji_name,
          emoji: getEmojiFromName(emoji_name) || emoji_name,
          count: 0,
          userIds: new Set<string>(),
        });
      }

      const reactionInfo = reactionsMap.get(emoji_name)!;

      // N'ajouter l'utilisateur que s'il n'est pas déjà présent
      if (!reactionInfo.userIds.has(user_id)) {
        reactionInfo.userIds.add(user_id);
        reactionInfo.count++;
      }
    });

    // Convertir la Map en tableau pour l'affichage
    return Array.from(reactionsMap.values());
  }, [message.metadata?.reactions]);

  // Initialiser les réactions à partir du message
  useEffect(() => {
    setReactions(processReactions());
  }, [processReactions]);

  // Écouter les événements de réaction via WebSocket
  useEffect(() => {
    const handleReactionAdded = (data: any) => {
      if (!data) return;

      try {
        // WebSocket events from Mattermost have different structures
        // The reaction data can be nested in different ways
        let reactionData;

        if (data.reaction) {
          // Case 1: data has a reaction property
          reactionData =
            typeof data.reaction === "string"
              ? JSON.parse(data.reaction)
              : data.reaction;
        } else if (data.post_id) {
          // Case 2: data itself is the reaction
          reactionData = data;
        } else {
          return; // Unknown format
        }

        if (!reactionData || reactionData.post_id !== message.id) return;

        const { emoji_name, user_id } = reactionData;

        // Mettre à jour l'état local des réactions
        setReactions((prevReactions) => {
          // Créer une copie pour ne pas modifier l'état directement
          const updatedReactions = [...prevReactions];

          // Chercher la réaction existante
          const existingIndex = updatedReactions.findIndex(
            (r) => r.emojiName === emoji_name,
          );

          if (existingIndex >= 0) {
            // La réaction existe déjà
            const reaction = updatedReactions[existingIndex];

            // Vérifier si l'utilisateur a déjà réagi
            if (!reaction.userIds.has(user_id)) {
              // Créer une nouvelle instance pour préserver l'immutabilité
              const updatedUserIds = new Set(reaction.userIds);
              updatedUserIds.add(user_id);

              // Mettre à jour la réaction
              updatedReactions[existingIndex] = {
                ...reaction,
                count: reaction.count + 1,
                userIds: updatedUserIds,
              };
            }
          } else {
            // Nouvelle réaction
            updatedReactions.push({
              emojiName: emoji_name,
              emoji: getEmojiFromName(emoji_name) || emoji_name,
              count: 1,
              userIds: new Set([user_id]),
            });
          }

          return updatedReactions;
        });
      } catch (error) {
        console.error("Error processing reaction_added event:", error);
      }
    };

    const handleReactionRemoved = (data: any) => {
      if (!data) return;

      try {
        // Même logique que pour l'ajout de réaction
        let reactionData;

        if (data.reaction) {
          // Case 1: data has a reaction property
          reactionData =
            typeof data.reaction === "string"
              ? JSON.parse(data.reaction)
              : data.reaction;
        } else if (data.post_id) {
          // Case 2: data itself is the reaction
          reactionData = data;
        } else {
          return; // Unknown format
        }

        if (!reactionData || reactionData.post_id !== message.id) return;

        const { emoji_name, user_id } = reactionData;

        // Mettre à jour l'état local des réactions
        setReactions((prevReactions) => {
          // Créer une copie pour ne pas modifier l'état directement
          const updatedReactions = [...prevReactions];

          // Chercher la réaction existante
          const reactionIndex = updatedReactions.findIndex(
            (r) => r.emojiName === emoji_name,
          );

          if (reactionIndex >= 0) {
            const reaction = updatedReactions[reactionIndex];

            // Vérifier si l'utilisateur a réellement réagi
            if (reaction.userIds.has(user_id)) {
              // Créer une nouvelle instance pour préserver l'immutabilité
              const updatedUserIds = new Set(reaction.userIds);
              updatedUserIds.delete(user_id);

              if (updatedUserIds.size === 0) {
                // Plus personne n'a réagi, supprimer la réaction
                updatedReactions.splice(reactionIndex, 1);
              } else {
                // Mettre à jour la réaction
                updatedReactions[reactionIndex] = {
                  ...reaction,
                  count: reaction.count - 1,
                  userIds: updatedUserIds,
                };
              }
            }
          }

          return updatedReactions;
        });
      } catch (error) {
        console.error("Error processing reaction_removed event:", error);
      }
    };

    // S'abonner aux événements
    const unsubscribeAdded = notificationService.addEventListener(
      WebSocketEventType.REACTION_ADDED,
      handleReactionAdded,
    );

    const unsubscribeRemoved = notificationService.addEventListener(
      WebSocketEventType.REACTION_REMOVED,
      handleReactionRemoved,
    );

    return () => {
      unsubscribeAdded();
      unsubscribeRemoved();
    };
  }, [message.id]);

  // Fonction pour vérifier si l'utilisateur a déjà réagi
  const hasUserReacted = useCallback(
    (emojiName: string): boolean => {
      if (!currentUser) return false;

      const reaction = reactions.find((r) => r.emojiName === emojiName);
      return reaction ? reaction.userIds.has(currentUser.id) : false;
    },
    [reactions, currentUser],
  );

  // Gérer le clic sur une réaction
  const handleReactionClick = useCallback(
    async (emojiName: string) => {
      if (!currentUser || !service) return;

      // Définir l'état de chargement pour cet emoji
      setLoading((prev) => ({ ...prev, [emojiName]: true }));

      try {
        const alreadyReacted = hasUserReacted(emojiName);

        if (alreadyReacted) {
          // L'utilisateur a déjà réagi, supprimer la réaction
          await service.removeReaction(
            message.channel_id,
            message.id,
            emojiName,
          );

          /*// Mise à jour optimiste (l'événement WebSocket confirmera)
          setReactions((prevReactions) => {
            const updatedReactions = [...prevReactions];
            const reactionIndex = updatedReactions.findIndex(
              (r) => r.emojiName === emojiName,
            );

            if (reactionIndex >= 0) {
              const reaction = updatedReactions[reactionIndex];
              const updatedUserIds = new Set(reaction.userIds);
              updatedUserIds.delete(currentUser.id);

              if (updatedUserIds.size === 0) {
                // Plus personne n'a réagi, supprimer la réaction
                updatedReactions.splice(reactionIndex, 1);
              } else {
                // Mettre à jour la réaction
                updatedReactions[reactionIndex] = {
                  ...reaction,
                  count: reaction.count - 1,
                  userIds: updatedUserIds,
                };
              }
            }

            return updatedReactions;
          });*/
        } else {
          // L'utilisateur n'a pas encore réagi, ajouter la réaction
          await service.addReaction(message.id, emojiName);

          /*     // Mise à jour optimiste (l'événement WebSocket confirmera)
          setReactions((prevReactions) => {
            const updatedReactions = [...prevReactions];
            const existingIndex = updatedReactions.findIndex(
              (r) => r.emojiName === emojiName,
            );

            if (existingIndex >= 0) {
              // La réaction existe déjà
              const reaction = updatedReactions[existingIndex];
              const updatedUserIds = new Set(reaction.userIds);

              if (!updatedUserIds.has(currentUser.id)) {
                updatedUserIds.add(currentUser.id);
                updatedReactions[existingIndex] = {
                  ...reaction,
                  count: reaction.count + 1,
                  userIds: updatedUserIds,
                };
              }
            } else {
              // Nouvelle réaction
              updatedReactions.push({
                emojiName,
                emoji: getEmojiFromName(emojiName) || emojiName,
                count: 1,
                userIds: new Set([currentUser.id]),
              });
            }

            return updatedReactions;
          });*/
        }
      } catch (error) {
        console.error("Error toggling reaction:", error);
      } finally {
        // Effacer l'état de chargement
        setLoading((prev) => {
          const newLoading = { ...prev };
          delete newLoading[emojiName];
          return newLoading;
        });
      }
    },
    [message, hasUserReacted, service, currentUser],
  );

  // Si aucune réaction, ne rien afficher
  if (reactions.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0.5,
        mt: 0.5,
        justifyContent: isFromCurrentUser ? "flex-end" : "flex-start",
        maxWidth: { xs: "95%", sm: "85%" },
        alignSelf: isFromCurrentUser ? "flex-end" : "flex-start",
        ...sx,
      }}
    >
      {reactions.map((reaction) => {
        const isLoading = loading[reaction.emojiName] || false;
        const userHasReacted = currentUser
          ? reaction.userIds.has(currentUser.id)
          : false;

        return (
          <Tooltip
            key={reaction.emojiName}
            title={
              userHasReacted
                ? "Cliquez pour retirer votre réaction"
                : "Cliquez pour réagir"
            }
          >
            <Box
              onClick={() =>
                !isLoading && handleReactionClick(reaction.emojiName)
              }
              sx={{
                borderRadius: "12px",
                border: "1px solid",
                borderColor: "divider",
                px: 1,
                py: 0.5,
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                bgcolor: (theme) =>
                  userHasReacted
                    ? alpha(theme.palette.primary.main, 0.2)
                    : alpha(theme.palette.primary.main, 0.1),
                cursor: "pointer",
                "&:hover": {
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                },
                position: "relative",
              }}
            >
              {reaction.emoji}{" "}
              <Typography component={"div"} variant="caption" sx={{ ml: 0.5 }}>
                {isLoading ? (
                  <CircularProgress size={10} thickness={2} sx={{ ml: 0.5 }} />
                ) : (
                  reaction.count
                )}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};

export default MessageReactions;
