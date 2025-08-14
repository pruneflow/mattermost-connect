/**
 * Message reactions component for displaying and managing emoji reactions on posts
 * Groups reactions by emoji type and allows users to add/remove reactions
 */
import React, { memo, useCallback, useMemo } from 'react';
import { Box, Chip, Tooltip, SxProps, Theme, useTheme } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Reaction } from '../../api/types';
import { useAppSelector } from '../../hooks/useAppSelector';
import { toggleReactionOnPost } from '../../services/reactionService';
import { selectCurrentUserId } from '../../store/selectors';
import { EmojiPickerButton } from '../common/EmojiPickerButton';
import { findEmojiByName } from '../../utils/emojiMartAdapter';

interface MessageReactionsProps {
  postId: string;
  reactions: Reaction[];
  sx?: SxProps<Theme>;
}

interface GroupedReaction {
  emojiName: string;
  character: string;
  count: number;
  userIds: string[];
  hasCurrentUser: boolean;
}

const reactionsContainerStyles: SxProps<Theme> = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 0.5,
  alignItems: 'center',
};

const addReactionButtonStyles: SxProps<Theme> = {
  minWidth: 'auto',
  height: 24,
  fontSize: '0.75rem',
  border: '1px dashed',
  borderColor: 'divider',
  backgroundColor: 'transparent',
  order: 999, // Always last in flex
  '&:hover': {
    backgroundColor: 'action.hover',
  },
};

const ReactionChip: React.FC<{
  reaction: GroupedReaction;
  onToggle: (emojiName: string) => void;
  theme: any;
}> = memo(({ reaction, onToggle, theme }) => {
  const handleClick = useCallback(() => {
    onToggle(reaction.emojiName);
  }, [onToggle, reaction.emojiName]);

  const chipStyles: SxProps<Theme> = {
    height: 24,
    fontSize: '0.75rem',
    cursor: 'pointer',
    border: '1px solid',
    borderColor: reaction.hasCurrentUser ? theme.palette.primary.main : 'divider',
    backgroundColor: reaction.hasCurrentUser ? theme.palette.primary.light : 'transparent',
    color: reaction.hasCurrentUser ? theme.palette.primary.contrastText : 'text.primary',
    '&:hover': {
      backgroundColor: reaction.hasCurrentUser 
        ? theme.palette.primary.main 
        : theme.palette.action.hover,
    },
  };

  return (
    <Tooltip
      title={`${reaction.userIds.length} ${reaction.userIds.length === 1 ? 'person' : 'people'} reacted with ${reaction.emojiName}`}
    >
      <Chip
        size="small"
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <span>{reaction.character}</span>
            <span>{reaction.count}</span>
          </Box>
        }
        onClick={handleClick}
        sx={chipStyles}
      />
    </Tooltip>
  );
});

ReactionChip.displayName = 'ReactionChip';

export const MessageReactions: React.FC<MessageReactionsProps> = memo(({
  postId,
  reactions,
  sx,
}) => {
  const theme = useTheme();
  const currentUserId = useAppSelector(selectCurrentUserId);

  // Group reactions by emoji name
  const groupedReactions = React.useMemo((): GroupedReaction[] => {
    const groups = new Map<string, GroupedReaction>();

    reactions.forEach(reaction => {
      const existing = groups.get(reaction.emoji_name);
      if (existing) {
        existing.count++;
        existing.userIds.push(reaction.user_id);
        if (reaction.user_id === currentUserId) {
          existing.hasCurrentUser = true;
        }
      } else {
        const emojiData = findEmojiByName(reaction.emoji_name);
        groups.set(reaction.emoji_name, {
          emojiName: reaction.emoji_name,
          character: emojiData?.emoji || '❓',
          count: 1,
          userIds: [reaction.user_id],
          hasCurrentUser: reaction.user_id === currentUserId,
        });
      }
    });

    return Array.from(groups.values()).sort((a, b) => a.emojiName.localeCompare(b.emojiName));
  }, [reactions, currentUserId]);

  const handleReactionToggle = useCallback(async (emojiName: string) => {
    try {
      await toggleReactionOnPost(postId, emojiName);
    } catch (error) {
    }
  }, [postId]);

  const handleEmojiSelect = useCallback(async (emoji: string) => {
    try {
      await toggleReactionOnPost(postId, emoji);
    } catch (error) {
    }
  }, [postId]);


  if (groupedReactions.length === 0) {
    return null;
  }

  return (
    <Box sx={{ ...reactionsContainerStyles, ...sx }}>
      {groupedReactions.map((reaction) => (
        <ReactionChip
          key={reaction.emojiName}
          reaction={reaction}
          onToggle={handleReactionToggle}
          theme={theme}
        />
      ))}

      {/* Add reaction button */}
      <EmojiPickerButton
        onEmojiSelect={handleEmojiSelect}
        size="small"
        sx={addReactionButtonStyles}
      />
    </Box>
  );
});

MessageReactions.displayName = 'MessageReactions';