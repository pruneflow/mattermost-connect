import React, { useState, useMemo } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Popover,
  Tooltip,
  CircularProgress,
  Paper,Grid
} from '@mui/material';
import { 
  AddReaction as AddReactionIcon
} from '@mui/icons-material';
import { useMessages } from '../../hooks/useMessages';
import { useAuth } from '../../context/AuthContext';
import { useMessageReactions } from '../../hooks';
import {
  processReactions,
  findEmojiByName,
  getEmojiImageUrl
} from '../../utils/emojiMartAdapter';
import { api } from '../../api/client';
import { EmojiPickerMart } from '../common';

export interface MessageReactionsProps {
  messageId: string;
  channelId: string;
  reactions?: Record<string, string[]>; // emoji_name -> user_ids (conservé pour la compatibilité)
  compact?: boolean;
}

function MessageReactions({
  messageId,
  channelId,
  reactions = {},
  compact = false
}: MessageReactionsProps) {
  // Auth context for current user ID
  const { user } = useAuth();
  const currentUserId = user?.id;

  // Local state
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<null | HTMLElement>(null);

  // Messages hook for reaction actions
  const { addReaction, removeReaction, isLoading } = useMessages(channelId);

  // Open emoji picker
  const handleOpenEmojiPicker = (event: React.MouseEvent<HTMLElement>) => {
    setEmojiAnchorEl(event.currentTarget);
  };

  // Close emoji picker
  const handleCloseEmojiPicker = () => {
    setEmojiAnchorEl(null);
  };

  // Toggle reaction
  const toggleReaction = async (emoji: string, emojiName: string) => {
    if (!currentUserId || !messageId) return;

    try {
      // Note: emojiName contient déjà le modificateur de teinte si nécessaire
      // car il est construit par createEmojiNameWithTone dans EmojiPickerMart
      const mattermostEmojiName = emojiName;
      
      // Cette recherche peut encore être utile pour récupérer d'autres infos
      // comme le code unified, mais on préserve le nom avec la teinte
      const emojiData = findEmojiByName(emojiName);
      
      // Check if user has already added this reaction
      const hasReacted = reactions[mattermostEmojiName]?.includes(currentUserId);

      if (hasReacted) {
        // Remove reaction
        await removeReaction({ messageId, emojiName: mattermostEmojiName });
      } else {
        // Add reaction
        await addReaction({ messageId, emojiName: mattermostEmojiName });
      }

      // Close emoji picker
      handleCloseEmojiPicker();
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  // Handle emoji selection from the EmojiPicker
  // Note: emojiName inclut déjà le modificateur de teinte si applicable
  const handleEmojiSelect = (emoji: string, emojiName: string, skinTone?: number) => {
    void toggleReaction(emoji, emojiName);
  };

  // Format reaction count
  const formatReactionCount = (count: number): string => {
    return count > 99 ? '99+' : count.toString();
  };

  // Process and prepare reactions for display avec mémoisation
  const processedReactions = useMemo(() => {
    // N'effectuer le traitement que s'il y a des réactions
    if (!reactions || Object.keys(reactions).length === 0) {
      return [];
    }
    return processReactions(reactions);
  }, [reactions]);
  
  // Prepare reactions for display avec mémoisation
  const reactionItems = useMemo(() => {
    return processedReactions
      .filter(({ count }) => count > 0)
      .sort((a, b) => {
        // Sort by whether current user has reacted, then by count, then by name
        const aHasReacted = currentUserId ? a.userIds.includes(currentUserId) : false;
        const bHasReacted = currentUserId ? b.userIds.includes(currentUserId) : false;
        
        if (aHasReacted !== bHasReacted) {
          return aHasReacted ? -1 : 1;
        }
        if (a.count !== b.count) {
          return b.count - a.count;
        }
        return a.name.localeCompare(b.name);
      });
  }, [processedReactions, currentUserId]);


  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
      {/* Display reactions */}
      {reactionItems.length > 0 ? (
        reactionItems.map((reactionItem) => {
          const { name, emoji, unified, count, userIds } = reactionItem;
          const hasReacted = currentUserId ? userIds.includes(currentUserId) : false;
          return (
            <Tooltip
              key={name}
              title={`${name} - ${count} ${count === 1 ? 'reaction' : 'reactions'}`}
              arrow
            >
              <Chip
                size="small"
                onClick={() => toggleReaction(emoji, name)}
                sx={{
                  bgcolor: hasReacted ? 'primary.main' : 'action.hover',
                  color: hasReacted ? 'primary.contrastText' : 'text.primary',
                  fontWeight: hasReacted ? 'bold' : 'normal',
                  borderRadius: 16,
                  px: 1,
                  py: 0.5,
                  height: compact ? 24 : 28,
                  '&:hover': {
                    bgcolor: hasReacted ? 'primary.dark' : 'action.selected',
                    opacity: 0.9
                  },
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  border: '1px solid',
                  borderColor: hasReacted ? 'primary.main' : 'action.hover',
                  display: 'flex', // Ensure the Chip is visible
                  visibility: 'visible', // Force visibility
                }}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {unified ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <img 
                          src={getEmojiImageUrl(unified)} 
                          alt={name}
                          style={{ 
                            width: compact ? '14px' : '16px', 
                            height: compact ? '14px' : '16px' 
                          }}
                          onError={(e) => {
                            // Fallback to Unicode emoji on image load error
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).insertAdjacentHTML(
                              'afterend', 
                              `<span style="font-size: ${compact ? '12px' : '14px'}">${emoji}</span>`
                            );
                          }}
                        />
                        <span style={{ marginLeft: '4px' }}>{formatReactionCount(count)}</span>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: compact ? '12px' : '14px',
                          marginRight: '4px'
                        }}>{emoji}</span>
                        <span>{formatReactionCount(count)}</span>
                      </Box>
                    )}
                  </Box>
                }
              />
            </Tooltip>
          );
        })
      ) : (
        // This helps debug if reactions array is empty
        <Box sx={{ display: 'none' }}>No reactions to display</Box>
      )}

      {/* Add reaction button */}
      <Chip
        size="small"
        icon={isLoading ? <CircularProgress size={14} /> : <AddReactionIcon sx={{ fontSize: 14 }} />}
        label=""
        onClick={handleOpenEmojiPicker}
        sx={{ 
          ml: 0.5, 
          height: compact ? 24 : 28,
          bgcolor: 'action.hover',
          borderRadius: 16,
          px: 0.5,
          '&:hover': {
            bgcolor: 'action.selected',
          },
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          border: '1px solid',
          borderColor: 'action.hover',
        }}
        disabled={isLoading}
      />

      {/* Emoji picker popover */}
      <Popover
        open={Boolean(emojiAnchorEl)}
        anchorEl={emojiAnchorEl}
        onClose={handleCloseEmojiPicker}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <EmojiPickerMart
          onEmojiSelect={handleEmojiSelect}
          showSearch={true}
          width={320}
          height={350}
        />
      </Popover>
    </Box>
  );
}

// Utilisons React.memo pour éviter les rendus inutiles
export default React.memo(MessageReactions, (prevProps, nextProps) => {
  // Ne re-rendre que si les propriétés importantes ont changé
  if (prevProps.messageId !== nextProps.messageId || 
      prevProps.channelId !== nextProps.channelId ||
      prevProps.compact !== nextProps.compact) {
    return false; // Les props ont changé, re-rendre
  }
  
  // Vérifier si les réactions ont changé
  const prevReactionsKeys = Object.keys(prevProps.reactions || {});
  const nextReactionsKeys = Object.keys(nextProps.reactions || {});
  
  // Si le nombre de types de réactions est différent, re-rendre
  if (prevReactionsKeys.length !== nextReactionsKeys.length) {
    return false;
  }
  
  // Pour chaque réaction, vérifier si les utilisateurs ont changé
  for (const key of prevReactionsKeys) {
    const prevUsers = prevProps.reactions?.[key] || [];
    const nextUsers = nextProps.reactions?.[key] || [];
    
    if (prevUsers.length !== nextUsers.length) {
      return false; // Nombre d'utilisateurs différent, re-rendre
    }
    
    // Vérification approfondie des utilisateurs pour cette réaction
    if (prevUsers.length > 0 && !prevUsers.every(userId => nextUsers.includes(userId))) {
      return false; // La liste des utilisateurs a changé, re-rendre
    }
  }
  
  return true; // Aucun changement significatif, ne pas re-rendre
});