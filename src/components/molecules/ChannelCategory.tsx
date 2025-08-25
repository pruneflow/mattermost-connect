/**
 * Channel category component with collapsible sections and drag & drop support
 * Displays grouped channels following Mattermost sidebar organization patterns
 */
import React, { useCallback } from "react";
import {
  Box,
  Typography,
  List,
  Collapse,
  IconButton,
  SxProps,
  Theme,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import isEqual from "react-fast-compare";
import { ChannelItemContainer } from "./ChannelItemContainer";
import type { ChannelCategory as ChannelCategoryType } from "../../api/types";

// Static styles extracted for performance
const STATIC_STYLES = {
  categoryContainer: {
    mb: 1,
  } as const,

  categoryHeader: {
    display: "flex",
    alignItems: "center",
    px: 2,
    py: 1,
  } as const,

  categoryTitle: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "text.secondary",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    flex: 1,
    userSelect: "none",
  } as const,

  expandButton: {
    color: "text.secondary",
    p: 0.5,
  } as const,

  channelList: {
    py: 0,
  } as const,

  dropZone: {
    minHeight: 20,
    borderRadius: 1,
    border: "2px dashed transparent",
    "&.drag-over": {
      border: "2px dashed",
      borderColor: "primary.main",
      backgroundColor: "primary.light",
      opacity: 0.1,
    },
  } as const,
};

export interface ChannelCategoryProps {
  category: ChannelCategoryType;
  currentChannelId?: string;
  onChannelSelect?: (channelId: string) => void;
  onToggleCollapse?: (categoryId: string) => void;
  compact?: boolean;
  isDragging?: boolean;
  sx?: SxProps<Theme>;
  showMenu?: boolean
}

interface ChannelCategoryItemsProps {
  channelIds: string[];
  currentChannelId?: string;
  onChannelSelect?: (channelId: string) => void;
  compact?: boolean;
  showMenu?:boolean
}

/**
 * ChannelCategoryItems - Isolated component for rendering channel items with drag & drop
 */
const ChannelCategoryItems: React.FC<ChannelCategoryItemsProps> = React.memo(
  ({ channelIds, currentChannelId, onChannelSelect, compact = false, showMenu = true }) => {
    return (
      <SortableContext
        items={channelIds}
        strategy={verticalListSortingStrategy}
      >
        <List dense sx={STATIC_STYLES.channelList}>
          {channelIds.map((channelId) => (
            <ChannelItemContainer
              key={channelId}
              channelId={channelId}
              isActive={channelId === currentChannelId}
              onClick={onChannelSelect}
              compact={compact}
              draggable
              showMenu={showMenu}
            />
          ))}
        </List>
      </SortableContext>
    );
  },
  isEqual,
);

/**
 * ChannelCategory - Draggable category with collapsible channel list
 * Follows Mattermost sidebar patterns with drag & drop support
 */
export const ChannelCategory: React.FC<ChannelCategoryProps> = React.memo(
  ({
    category,
    currentChannelId,
    onChannelSelect,
    onToggleCollapse,
    compact = false,
    isDragging = false,
    showMenu = true,
    sx,
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging: isSortableDragging,
    } = useSortable({
      id: category.id,
      data: {
        type: "category",
        category,
      },
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition: transition || "transform 150ms ease-out",
      opacity: isDragging || isSortableDragging ? 0.8 : 1,
    };

    const handleToggleCollapse = useCallback(() => {
      if (onToggleCollapse) {
        onToggleCollapse(category.id);
      }
    }, [onToggleCollapse, category.id]);

    const isCollapsed = category.collapsed;
    const hasChannels = category.channel_ids.length > 0;

    // Show favorites only if it has channels, always show other categories
    if (category.type === "favorites" && !hasChannels) {
      return null;
    }

    return (
      <Box
        ref={setNodeRef}
        style={style}
        sx={{
          ...STATIC_STYLES.categoryContainer,
          ...sx,
        }}
      >
        {/* Category Header */}
        <Box
          sx={{
            ...STATIC_STYLES.categoryHeader,
            cursor: "grab",
            "&:active": {
              cursor: "grabbing",
            },
          }}
          {...attributes}
          {...listeners}
          onClick={handleToggleCollapse}
        >
          {/* Category Title */}
          <Typography sx={STATIC_STYLES.categoryTitle}>
            {category.display_name} ({category.channel_ids.length})
          </Typography>

          {/* Collapse/Expand Button */}
          {hasChannels && (
            <IconButton
              size="small"
              sx={STATIC_STYLES.expandButton}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleCollapse();
              }}
            >
              {isCollapsed ? <ExpandMore /> : <ExpandLess />}
            </IconButton>
          )}
        </Box>

        {/* Channel List */}
        <Collapse in={!isCollapsed} timeout="auto" unmountOnExit>
          <Box sx={STATIC_STYLES.dropZone}>
            {hasChannels && (
              <ChannelCategoryItems
                channelIds={category.channel_ids}
                currentChannelId={currentChannelId}
                onChannelSelect={onChannelSelect}
                compact={compact}
                showMenu={showMenu}
              />
            )}
          </Box>
        </Collapse>

        {/* Collapsed state: show only current channel if it's in this category */}
        {isCollapsed &&
          currentChannelId &&
          category.channel_ids.includes(currentChannelId) && (
            <Box sx={STATIC_STYLES.dropZone}>
              <ChannelCategoryItems
                channelIds={[currentChannelId]}
                currentChannelId={currentChannelId}
                onChannelSelect={onChannelSelect}
                compact={compact}
                showMenu={showMenu}
              />
            </Box>
          )}
      </Box>
    );
  },
  isEqual,
);

export default ChannelCategory;
