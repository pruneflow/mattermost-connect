import React, { useState } from 'react';
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
  getEmojiName,
  findEmojiByName,
  EMOJI_BY_SHORT_NAME
} from '../../utils/emojiUtils';
import { api } from '../../api/client';
import { EmojiPickerMM } from '../common';

export interface MessageReactionsProps {
  messageId: string;
  channelId: string;
  reactions?: Record<string, string[]>; // emoji_name -> user_ids (conservé pour la compatibilité)
  compact?: boolean;
}

export function MessageReactions({
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
      // Find the Mattermost-compatible emoji name from emoji.json
      let mattermostEmojiName = emojiName;
      
      // Vérifier que EMOJI_BY_SHORT_NAME existe
      if (EMOJI_BY_SHORT_NAME && EMOJI_BY_SHORT_NAME[emojiName]) {
        mattermostEmojiName = EMOJI_BY_SHORT_NAME[emojiName].short_name || emojiName;
      } else {
        // Fallback to more expensive search if needed
        const emojiData = findEmojiByName(emojiName);
        if (emojiData) {
          // Use the short_name from emoji.json, which is the Mattermost compatible name
          mattermostEmojiName = emojiData.short_name;
        }
      }
      
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
  const handleEmojiSelect = (emoji: string, emojiName: string) => {
    void toggleReaction(emoji, emojiName);
  };

  // Format reaction count
  const formatReactionCount = (count: number): string => {
    return count > 99 ? '99+' : count.toString();
  };

  // Process and prepare reactions for display
  const processedReactions = processReactions(reactions);
  
  // Prepare reactions for display
  const reactionItems = processedReactions
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


  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
      {/* Display reactions */}
      {reactionItems.length > 0 ? (
        reactionItems.map((reactionItem) => {
          const { name, emoji, unified, count, userIds } = reactionItem;
          console.debug("reactionItem", reactionItem)
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
                          src={`${api.getBaseUrl()}/static/emoji/${unified.toLowerCase()}.png`} 
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
        <EmojiPickerMM
          onEmojiSelect={handleEmojiSelect}
          height={350}
          width={320}
          showSearchBar={true}
          showCategoryTabs={true}
        />
      </Popover>
    </Box>
  );
}

export default MessageReactions;