import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  List,
  Typography,
  Divider,
  SxProps,
  Theme,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SearchInput } from '../atoms/SearchInput';
import { TeamHeader } from '../molecules/TeamHeader';
import { ChannelSection } from '../molecules/ChannelSection';
import { ChannelCategory } from '../molecules/ChannelCategory';
import { AddChannelMembersDialog } from './AddChannelMembersDialog';
import { useChannelLoader } from '../../hooks/useChannelLoader';
import { usePermissions } from '../../hooks/usePermissions';

// Static styles extracted for performance
const STATIC_STYLES = {
  container: {
    width: '100%',
  } as const,
  
  searchBox: {
    p: 1,
  } as const,
  
  channelsContainer: {
    flex: 1,
    overflow: 'auto',
  } as const,
  
  divider: {
    my: 1,
  } as const,
};
import { useAutoChannelSelection } from '../../hooks/useAutoChannelSelection';
import { useNavigation } from '../../hooks/useNavigation';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { 
  selectCurrentTeam, 
  selectCurrentChannelId, 
  selectCategoriesForCurrentTeam,
  selectChannelIdsForCurrentTeam,
  createSelectFilteredChannelIds
} from "../../store/selectors";
import { 
  loadChannelCategories,
  updateChannelCategoriesAction,
  reorderCategoriesAction,
  toggleCategoryCollapsedAction,
  moveChannelToCategoryAction,
  reorderChannelsAction
} from '../../store/slices/entitiesSlice';

export interface ChannelListProps {
  showSearch?: boolean;
  onChannelSelect?: (channelId: string) => void;
  compact?: boolean;
  showTeamHeader?: boolean; // Show team name and menu at top
  sx?: SxProps<Theme>;
}

/**
 * ChannelList component following Mattermost sidebar patterns
 * Displays categorized channel list for current team with search functionality
 */
export const ChannelList: React.FC<ChannelListProps> = ({
  showSearch = true,
  onChannelSelect,
  compact = false,
  showTeamHeader = false,
  sx,
}) => {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  
  // Add channel members dialog state  
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const isInviteOpen = Boolean(selectedChannelId);

  // Memoized container styles with custom sx
  const containerStyles = useMemo(() => ({
    ...STATIC_STYLES.container,
    ...sx,
  }), [sx]);

  // Use current team and channel
  const dispatch = useAppDispatch();
  const currentTeam = useAppSelector(selectCurrentTeam);
  const currentChannelId = useAppSelector(selectCurrentChannelId);

  // Get categories for current team using selector
  const categories = useAppSelector(selectCategoriesForCurrentTeam);
  

  // Auto-load channels for current team
  useChannelLoader();

  // Auto-select channel after loading
  useAutoChannelSelection();

  // Load categories when team changes
  React.useEffect(() => {
    if (currentTeam?.id) {
      dispatch(loadChannelCategories(currentTeam.id));
    }
  }, [dispatch, currentTeam?.id]);

  // Get all channel IDs from categories using selector
  const allChannelIds = useAppSelector(selectChannelIdsForCurrentTeam);

  // Get base channel IDs for search
  const baseChannelIds = allChannelIds;

  // Create search selector instance once  
  const selectFilteredChannelIds = useMemo(() => createSelectFilteredChannelIds(), []);
  
  // Get filtered channel IDs using selectFilteredChannelIds  
  const filteredChannelIds = useAppSelector(state => {
    if (!searchQuery.trim()) {
      return baseChannelIds;
    }
    
    // Use selectFilteredChannelIds to get filtered results
    const filteredResult = selectFilteredChannelIds(state, searchQuery);
    
    // Return intersection with our base channel IDs
    return baseChannelIds.filter(id => filteredResult.includes(id));
  });

  // Apply filtering to categories - each category shows only its filtered channels
  const filteredCategories = useMemo(() => {
    return categories
      .map(category => ({
        ...category,
        channel_ids: category.channel_ids.filter(id => filteredChannelIds.includes(id))
      }))
      .filter(category => {
        // Show favorites only if it has channels
        if (category.type === 'favorites') {
          return category.channel_ids.length > 0;
        }
        // Always show other categories even if empty
        return true;
      });
  }, [categories, filteredChannelIds]);

  // Get navigation
  const { navigateToChannel } = useNavigation();
  
  // Get permissions
  const { canManageChannelMembers } = usePermissions();

  // Drag & drop sensors - simple and direct
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Small distance to distinguish from click
        delay: 100, // Small delay to prevent accidental drags
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Handle channel selection with stable callback
  const handleChannelSelect = useCallback((channelId: string) => {
    const teamId = currentTeam?.id;
    if (teamId) {
      navigateToChannel(teamId, channelId);
    }
    onChannelSelect?.(channelId);
  }, [currentTeam?.id, navigateToChannel, onChannelSelect]);


  // Handle category collapse/expand
  const handleToggleCollapse = useCallback((categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
      dispatch(toggleCategoryCollapsedAction({ 
        categoryId, 
        isCollapsed: !category.collapsed 
      }));
    }
  }, [categories, dispatch]);

  // Handle add channel members
  const handleAddChannelMembers = useCallback((channelId: string) => {
    setSelectedChannelId(channelId);
  }, []);

  const closeDialog = useCallback(() => {
    setSelectedChannelId(null);
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'category') {
      setDraggedCategory(active.id as string);
    }
    // Note: We don't track dragged channels since we don't use overlay
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedCategory(null);

    if (!over || active.id === over.id) return;

    const teamId = currentTeam?.id;
    if (!teamId) return;

    // Handle category reordering
    if (active.data.current?.type === 'category' && over.data.current?.type === 'category') {
      const oldIndex = categories.findIndex(cat => cat.id === active.id);
      const newIndex = categories.findIndex(cat => cat.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = [...categories];
        const [removed] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, removed);
        
        dispatch(reorderCategoriesAction({ 
          teamId, 
          categoryOrder: newOrder.map(cat => cat.id) 
        }));
      }
    }
    
    // Handle channel drag & drop
    if (active.data.current?.type === 'channel') {
      const channelId = active.id as string;
      const channel = active.data.current.channel;
      const sourceCategory = categories.find(cat => cat.channel_ids.includes(channelId));
      
      if (!sourceCategory) return;

      let targetCategory = null;
      
      // Case 1: Over a category header
      if (over.data.current?.type === 'category') {
        targetCategory = categories.find(cat => cat.id === over.id);
      }
      
      // Case 2: Over a channel - prioritize reordering within same category
      if (over.data.current?.type === 'channel') {
        const overChannelId = over.id as string;
        const overTargetCategory = categories.find(cat => cat.channel_ids.includes(overChannelId));
        
        // Prioritize reordering within same category
        if (overTargetCategory && overTargetCategory.id === sourceCategory.id) {
          const oldIndex = sourceCategory.channel_ids.indexOf(channelId);
          const newIndex = sourceCategory.channel_ids.indexOf(overChannelId);
          
          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const newChannelOrder = [...sourceCategory.channel_ids];
            const [removed] = newChannelOrder.splice(oldIndex, 1);
            newChannelOrder.splice(newIndex, 0, removed);
            
            dispatch(reorderChannelsAction({ 
              categoryId: sourceCategory.id, 
              newChannelOrder 
            }));
          }
          return; // Exit early for reordering
        }
        
        // For cross-category moves over channels, use the target category
        targetCategory = overTargetCategory;
      }
      
      // Handle move between categories
      if (targetCategory && targetCategory.id !== sourceCategory.id) {
        // Validation: non-DM channels cannot be moved to DM category
        if (channel.type !== 'D' && targetCategory.type === 'direct_messages') {
          return; // Block this move
        }
        
        dispatch(moveChannelToCategoryAction({
          channelId,
          fromCategoryId: sourceCategory.id,
          toCategoryId: targetCategory.id
        }));
      }
    }
  }, [currentTeam?.id, categories, dispatch]);


  return (
    <Box sx={containerStyles}>
      {/* Team Header */}
      {showTeamHeader && (
        <TeamHeader team={currentTeam} compact={compact} />
      )}
      
      {/* Search Bar */}
      {showSearch && (
        <Box sx={STATIC_STYLES.searchBox}>
          <SearchInput
            placeholder="Find channels"
            value={searchQuery}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            size="small"
          />
        </Box>
      )}

      {/* Channel Categories */}
      <Box sx={STATIC_STYLES.channelsContainer}>
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={filteredCategories.map(cat => cat.id)} strategy={verticalListSortingStrategy}>
            {filteredCategories.map((category) => (
              <ChannelCategory
                key={category.id}
                category={category}
                currentChannelId={currentChannelId}
                onChannelSelect={handleChannelSelect}
                onToggleCollapse={handleToggleCollapse}
                onAddChannelMembers={handleAddChannelMembers}
                compact={compact}
                isDragging={draggedCategory === category.id}
              />
            ))}
          </SortableContext>
        </DndContext>
      </Box>

      {/* Add Channel Members Dialog */}
      <AddChannelMembersDialog
        open={isInviteOpen}
        onClose={closeDialog}
        channelId={selectedChannelId || ''}
      />
    </Box>
  );
};

export default ChannelList;