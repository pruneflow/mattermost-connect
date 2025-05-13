import React, { useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Popover,
  Paper,
  Grid,
  Typography,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  Button,
  Divider
} from '@mui/material';
import { 
  AddReaction as AddReactionIcon,
  Search as SearchIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { useMessages } from '../../hooks/useMessages';
import { useAuth } from '../../context/AuthContext';
import { useMessageReactions } from '../../hooks';
import {
  COMMON_REACTIONS,
  EMOJI_CATEGORIES,
  getEmojiName,
  getEmojiFromName,
  isValidEmojiName,
  processReactions
} from '../../utils/emojiUtils';

export interface MessageReactionsProps {
  messageId: string;
  channelId: string;
  reactions?: Record<string, string[]>; // emoji_name -> user_ids (conservé pour la compatibilité)
  compact?: boolean;
}

export function MessageReactions({
  messageId,
  channelId,
  reactions: propReactions = {},
  compact = false
}: MessageReactionsProps) {
  // Utiliser le hook optimisé pour récupérer les réactions en temps réel
  // Passer channelId pour permettre l'initialisation depuis les données existantes
  const { groupedReactions, reactions: hookReactions } = useMessageReactions(messageId, channelId);
  
  // Convertir les réactions du hook au format attendu par le composant existant
  // Priorité aux réactions WebSocket, avec fallback sur les props
  const reactions = React.useMemo(() => {
    // Si pas de réactions du hook, utiliser celles des props
    if (hookReactions.length === 0) {
      return propReactions;
    }
    
    // Convertir les réactions du hook (par utilisateur) au format attendu (par emoji)
    // Format attendu: { emoji_name: [user_id1, user_id2, ...] }
    const formattedReactions: Record<string, string[]> = {};
    
    // Pour chaque emoji_name, regrouper les user_ids
    Object.entries(groupedReactions).forEach(([emojiName, reactionsArray]) => {
      formattedReactions[emojiName] = reactionsArray.map(reaction => reaction.user_id);
    });
    
    return formattedReactions;
  }, [hookReactions, propReactions, groupedReactions]);
  // Auth context for current user ID
  const { user } = useAuth();
  const currentUserId = user?.id;

  // Local state
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<null | HTMLElement>(null);
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Messages hook for reaction actions
  const { addReaction, removeReaction, isLoading } = useMessages(channelId);

  // Open emoji picker
  const handleOpenEmojiPicker = (event: React.MouseEvent<HTMLElement>) => {
    setEmojiAnchorEl(event.currentTarget);
    setCurrentTab(0);
    setCustomEmojiInput('');
    setSearchQuery('');
  };

  // Close emoji picker
  const handleCloseEmojiPicker = () => {
    setEmojiAnchorEl(null);
  };

  // Toggle reaction
  const toggleReaction = async (emoji: string, emojiName?: string) => {
    if (!currentUserId || !messageId) return;

    // Get the Mattermost-compatible emoji name if not provided
    const mattermostEmojiName = emojiName || getEmojiName(emoji);
    
    try {
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

  // Change tab
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle custom emoji input change
  const handleCustomEmojiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomEmojiInput(e.target.value);
  };

  // Handle custom emoji submit
  const handleCustomEmojiSubmit = () => {
    if (customEmojiInput && isValidEmojiName(customEmojiInput)) {
      void toggleReaction(customEmojiInput, customEmojiInput);
    }
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

  // Filter emoji categories based on search query
  const filterEmojisBySearch = (emojiList: typeof COMMON_REACTIONS) => {
    if (!searchQuery) return emojiList;
    
    return emojiList.filter(({ emoji, name }) => 
      emoji.includes(searchQuery) || 
      name.includes(searchQuery.toLowerCase())
    );
  };

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
      {/* Display reactions */}
      {reactionItems.length > 0 ? (
        reactionItems.map(({ name, emoji, count, userIds }) => {
          const displayEmoji = emoji || name;
          const hasReacted = currentUserId ? userIds.includes(currentUserId) : false;
          
          return (
            <Tooltip
              key={name}
              title={`${displayEmoji} (${name}) - ${count} ${count === 1 ? 'reaction' : 'reactions'}`}
              arrow
            >
              <Chip
                label={`${displayEmoji} ${formatReactionCount(count)}`}
                size="small"
                onClick={() => toggleReaction(emoji, name)}
                sx={{
                  bgcolor: hasReacted ? 'primary.main' : 'action.hover',
                  color: hasReacted ? 'primary.contrastText' : 'text.primary',
                  fontWeight: hasReacted ? 'bold' : 'normal',
                  borderRadius: 16,
                  px: 1,
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
        <Paper sx={{ width: 320, maxHeight: 400, overflow: 'hidden' }}>
          {/* Tabs */}
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Common" />
            <Tab label="All Emojis" />
            <Tab label="Custom" />
          </Tabs>
          
          {/* Search bar (for All Emojis tab) */}
          {currentTab === 1 && (
            <Box sx={{ p: 1, display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
              <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <TextField
                placeholder="Search emojis..."
                variant="standard"
                fullWidth
                value={searchQuery}
                onChange={handleSearchChange}
                sx={{ '& .MuiInput-root': { fontSize: '0.875rem' } }}
              />
            </Box>
          )}
          
          {/* Tab content */}
          <Box sx={{ height: currentTab === 1 ? 300 : 'auto', overflowY: 'auto', p: 1 }}>
            {/* Common reactions */}
            {currentTab === 0 && (
              <Grid container spacing={1}>
                {COMMON_REACTIONS.map(({ emoji, name }) => (
                  <Grid item key={name}>
                    <Tooltip title={name}>
                      <IconButton
                        onClick={() => toggleReaction(emoji, name)}
                        sx={{ fontSize: '1.5rem' }}
                      >
                        {emoji}
                      </IconButton>
                    </Tooltip>
                  </Grid>
                ))}
              </Grid>
            )}
            
            {/* All emojis with categories */}
            {currentTab === 1 && (
              <>
                {/* Smileys */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Smileys & Emotions
                  </Typography>
                  <Grid container spacing={1}>
                    {filterEmojisBySearch(EMOJI_CATEGORIES.smileys).map(({ emoji, name }) => (
                      <Grid item key={name}>
                        <Tooltip title={name}>
                          <IconButton
                            onClick={() => toggleReaction(emoji, name)}
                            sx={{ fontSize: '1.5rem' }}
                          >
                            {emoji}
                          </IconButton>
                        </Tooltip>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
                
                {/* Gestures */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Hand Gestures
                  </Typography>
                  <Grid container spacing={1}>
                    {filterEmojisBySearch(EMOJI_CATEGORIES.gestures).map(({ emoji, name }) => (
                      <Grid item key={name}>
                        <Tooltip title={name}>
                          <IconButton
                            onClick={() => toggleReaction(emoji, name)}
                            sx={{ fontSize: '1.5rem' }}
                          >
                            {emoji}
                          </IconButton>
                        </Tooltip>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
                
                {/* Objects */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Objects & Symbols
                  </Typography>
                  <Grid container spacing={1}>
                    {filterEmojisBySearch(EMOJI_CATEGORIES.objects).map(({ emoji, name }) => (
                      <Grid item key={name}>
                        <Tooltip title={name}>
                          <IconButton
                            onClick={() => toggleReaction(emoji, name)}
                            sx={{ fontSize: '1.5rem' }}
                          >
                            {emoji}
                          </IconButton>
                        </Tooltip>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </>
            )}
            
            {/* Custom emoji */}
            {currentTab === 2 && (
              <Box sx={{ p: 1 }}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Enter a custom emoji name used in your Mattermost workspace:
                </Typography>
                <Box sx={{ display: 'flex', mb: 1 }}>
                  <TextField
                    placeholder="E.g. thumbsup, heart, smile"
                    value={customEmojiInput}
                    onChange={handleCustomEmojiChange}
                    fullWidth
                    size="small"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isValidEmojiName(customEmojiInput)) {
                        handleCustomEmojiSubmit();
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={!customEmojiInput || !isValidEmojiName(customEmojiInput)}
                    onClick={handleCustomEmojiSubmit}
                    sx={{ ml: 1 }}
                  >
                    <SendIcon fontSize="small" />
                  </Button>
                </Box>
                {customEmojiInput && !isValidEmojiName(customEmojiInput) && (
                  <Typography variant="caption" color="error">
                    Emoji names can only contain letters, numbers, underscores and hyphens
                  </Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                  Note: Custom emojis must already exist in your Mattermost workspace to be displayed correctly.
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Popover>
    </Box>
  );
}

export default MessageReactions;