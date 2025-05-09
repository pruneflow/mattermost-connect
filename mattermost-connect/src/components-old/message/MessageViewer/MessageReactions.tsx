// src/components/message/MessageViewer/MessageReactions.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  alpha,
  Tooltip,
  Zoom,
} from "@mui/material";
import { MessageReactionsProps } from "./MessageTypes";
import {
  useMattermost,
  useMessageContext,
  useUserContext,
} from "../../../context";
import { getEmojiFromName } from "../../../utils";
import { WebSocketEventType } from "../../../services/";

/**
 * Internal type for reaction management
 * Well-organized structure to facilitate tracking reactions
 */
interface ReactionInfo {
  emojiName: string; // Emoji name (for API)
  emoji: string; // Emoji character
  count: number; // Total number of reactions
  userIds: Set<string>; // Set of user IDs who reacted (to avoid duplicates)
}

/**
 * Displays reactions to a message with ability to add/remove reactions
 */
const MessageReactions: React.FC<MessageReactionsProps> = ({
  message,
  isFromCurrentUser = false,
  sx,
}) => {
  const { services } = useMattermost();
  const { currentUser } = useUserContext();
  const { addReaction, removeReaction } = useMessageContext();
  const [reactions, setReactions] = useState<ReactionInfo[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [clickedReaction, setClickedReaction] = useState<string | null>(null);

  // Fonction utilitaire pour organiser les réactions depuis le message
  const processReactions = useCallback(() => {
    if (!message.metadata?.reactions || !message.metadata.reactions.length) {
      return [];
    }

    // Map pour éviter les doublons et simplifier le traitement
    const reactionsMap = new Map<string, ReactionInfo>();

    message.metadata.reactions.forEach((reaction) => {
      const { emoji_name, user_id } = reaction;

      // Convertir le nom d'emoji en caractère en utilisant notre utilitaire centralisé
      // Si le caractère n'est pas trouvé, utiliser le nom comme fallback
      const emojiChar = getEmojiFromName(emoji_name) || emoji_name;

      // Si cette réaction n'existe pas encore, l'initialiser
      if (!reactionsMap.has(emoji_name)) {
        reactionsMap.set(emoji_name, {
          emojiName: emoji_name,
          emoji: emojiChar,
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

        // Obtenir le caractère emoji depuis son nom API
        const emojiChar = getEmojiFromName(emoji_name) || emoji_name;

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
              emoji: emojiChar,
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
    const unsubscribeAdded = services?.notificationService.addEventListener(
      WebSocketEventType.REACTION_ADDED,
      handleReactionAdded,
    );

    const unsubscribeRemoved = services?.notificationService.addEventListener(
      WebSocketEventType.REACTION_REMOVED,
      handleReactionRemoved,
    );

    return () => {
      if (unsubscribeAdded) unsubscribeAdded();
      if (unsubscribeRemoved) unsubscribeRemoved();
    };
  }, [message.id, services?.notificationService]);

  // Fonction pour vérifier si l'utilisateur a déjà réagi
  const hasUserReacted = useCallback(
    (emojiName: string): boolean => {
      if (!currentUser) return false;

      const reaction = reactions.find((r) => r.emojiName === emojiName);
      return reaction ? reaction.userIds.has(currentUser.id) : false;
    },
    [reactions, currentUser],
  );

  // Créer une liste de noms d'utilisateurs pour l'infobulle
  const getUserNamesForTooltip = useCallback(
    (userIds: Set<string>): string => {
      if (!userIds.size) return "";
      
      // Convertir le Set en Array pour pouvoir utiliser les méthodes d'array
      const userIdArray = Array.from(userIds);
      
      // Limiter à 3 utilisateurs maximum pour l'infobulle
      const displayCount = Math.min(userIdArray.length, 3);
      const remainingCount = userIdArray.length - displayCount;
      
      // Si l'utilisateur courant a réagi, le mettre en premier
      let displayUsers = userIdArray
        .slice(0, displayCount)
        .map(id => {
          if (id === currentUser?.id) return "Vous";
          // Idéalement ici, on récupérerait les noms des utilisateurs à partir d'un service
          // Pour l'instant, on affiche juste l'ID raccourci
          return `Utilisateur ${id.substring(0, 5)}...`;
        });
      
      let tooltipText = displayUsers.join(", ");
      
      // Ajouter "+ X autres" si nécessaire
      if (remainingCount > 0) {
        tooltipText += ` et ${remainingCount} autre${remainingCount > 1 ? "s" : ""}`;
      }
      
      return tooltipText;
    },
    [currentUser]
  );

  // Gérer le clic sur une réaction
  const handleReactionClick = useCallback(
    async (emojiName: string) => {
      if (!currentUser) return;

      setLoading((prev) => ({ ...prev, [emojiName]: true }));
      setClickedReaction(emojiName);

      try {
        const alreadyReacted = hasUserReacted(emojiName);

        if (alreadyReacted) {
          await removeReaction(message.id, emojiName);
        } else {
          const emojiChar = getEmojiFromName(emojiName) || emojiName;
          await addReaction(message.id, emojiChar);
        }
      } catch (error) {
        console.error("Error toggling reaction:", error);
      } finally {
        setLoading((prev) => {
          const newLoading = { ...prev };
          delete newLoading[emojiName];
          return newLoading;
        });
        
        // Réinitialiser la réaction cliquée après un court délai
        setTimeout(() => {
          setClickedReaction(null);
        }, 300);
      }
    },
    [message, hasUserReacted, addReaction, removeReaction, currentUser],
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
        gap: 0.8, // Légèrement augmenté pour plus d'espace
        mt: 0.8,
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
        const isClicked = clickedReaction === reaction.emojiName;
        
        // Construire le tooltip en fonction de qui a réagi
        const tooltipTitle = userHasReacted
          ? `${getUserNamesForTooltip(reaction.userIds)}. Cliquez pour retirer votre réaction.`
          : `${getUserNamesForTooltip(reaction.userIds)}. Cliquez pour réagir.`;

        return (
          <Tooltip
            key={reaction.emojiName}
            title={tooltipTitle}
            arrow
            placement="top"
            TransitionComponent={Zoom}
          >
            <Box
              onClick={() =>
                !isLoading && handleReactionClick(reaction.emojiName)
              }
              role="button"
              aria-label={userHasReacted ? `Retirer la réaction ${reaction.emoji}` : `Ajouter la réaction ${reaction.emoji}`}
              aria-pressed={userHasReacted}
              sx={{
                borderRadius: "16px", // Plus arrondi pour être plus visible
                border: "1px solid",
                borderColor: userHasReacted ? "primary.main" : "divider",
                px: 1.2, // Légèrement plus grand
                py: 0.6, // Légèrement plus grand
                fontSize: "0.95rem", // Légèrement plus grand
                display: "flex",
                alignItems: "center",
                gap: 0.7, // Espace entre l'emoji et le nombre
                boxShadow: userHasReacted ? 1 : 0, // Ombre légère pour les réactions de l'utilisateur
                bgcolor: (theme) =>
                  userHasReacted
                    ? alpha(theme.palette.primary.main, 0.15)
                    : alpha(theme.palette.background.paper, 0.8),
                cursor: "pointer",
                transition: "all 0.2s ease-in-out", // Animation de transition
                transform: isClicked ? "scale(0.9)" : "scale(1)", // Animation lorsqu'on clique
                "&:hover": {
                  bgcolor: (theme) => 
                    userHasReacted
                      ? alpha(theme.palette.primary.main, 0.25)
                      : alpha(theme.palette.primary.main, 0.1),
                  boxShadow: 2,
                  transform: "scale(1.05)",
                },
                position: "relative",
              }}
            >
              <span role="img" aria-label={reaction.emojiName}>{reaction.emoji}</span>
              <Typography 
                component={"div"} 
                variant="caption" 
                sx={{ 
                  fontWeight: userHasReacted ? 600 : 400,
                  color: userHasReacted ? "primary.main" : "text.secondary",
                  minWidth: '14px',
                  textAlign: 'center'
                }}
              >
                {isLoading ? (
                  <CircularProgress size={12} thickness={2} />
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