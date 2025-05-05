// src/internal/components/messages/MessageItemUI.tsx
/**
 * Component that displays a single message
 */
import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tooltip,
  Collapse,
  Divider,
  Chip,
} from "@mui/material";
import {
  Reply as ReplyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Star as PinIcon,
  StarBorder as UnpinIcon,
  EmojiEmotions as EmojiIcon,
  Bookmark as SaveIcon,
  ContentCopy as CopyIcon,
  Flag as ReportIcon,
} from "@mui/icons-material";
import { Message, ReactionCount } from "../../../types";
import { ItemComponentProps } from "../../types/componentTypes";
import { RelativeTime, Markdown } from "../common";
import MessageReactionsUI from "./MessageReactionsUI";
import MessageAttachmentsUI from "./MessageAttachmentsUI";
import UserAvatar from "../../../components/users/UserAvatar";

export interface MessageItemUIProps extends ItemComponentProps<Message> {
  /** User display name */
  userDisplayName?: string;
  /** User image URL */
  userImageUrl?: string;
  /** User status */
  userStatus?: "online" | "away" | "dnd" | "offline";
  /** Whether this is a system message */
  isSystemMessage?: boolean;
  /** Whether the message is being edited */
  isEditing?: boolean;
  /** Whether the message is highlighted */
  isHighlighted?: boolean;
  /** Whether the message is pinned */
  isPinned?: boolean;
  /** Whether to show date separator */
  showDateSeparator?: boolean;
  /** Date for the separator */
  dateSeparatorValue?: string;
  /** Whether to show reactions */
  showReactions?: boolean;
  /** Current user ID */
  currentUserId?: string;
  /** Whether to show a compact version */
  compact?: boolean;
  /** Whether to show full date/time */
  showFullDateTime?: boolean;
  /** Message reactions */
  reactions?: Array<ReactionCount>;
  /** Edit form component */
  editFormComponent?: React.ReactNode;
  /** Callback when edit is started */
  onEdit?: () => void;
  /** Callback when reply is clicked */
  onReply?: () => void;
  /** Callback when delete is clicked */
  onDelete?: () => void;
  /** Callback when pin/unpin is clicked */
  onTogglePin?: () => void;
  /** Callback when add reaction is clicked */
  onAddReaction?: () => void;
  /** Callback when a reaction is clicked */
  onReactionClick?: (emoji: string) => void;
  /** Callback when a user mention is clicked */
  onUserMentionClick?: (userId: string) => void;
  /** Callback when a channel mention is clicked */
  onChannelMentionClick?: (channelId: string) => void;
  /** Callback when message content is copied */
  onCopyContent?: () => void;
  /** Callback when message is saved/bookmarked */
  onSaveMessage?: () => void;
  /** Callback when message is reported */
  onReportMessage?: () => void;
}

const MessageItemUI: React.FC<MessageItemUIProps> = ({
  item,
  isActive = false,
  showActions = false,
  isLoading = false,
  userDisplayName = "Unknown User",
  userImageUrl,
  userStatus,
  isSystemMessage = false,
  isEditing = false,
  isHighlighted = false,
  isPinned = false,
  showDateSeparator = false,
  dateSeparatorValue,
  showReactions = true,
  currentUserId,
  compact = false,
  showFullDateTime = false,
  reactions = [],
  editFormComponent,
  onEdit,
  onReply,
  onDelete,
  onTogglePin,
  onAddReaction,
  onReactionClick,
  onUserMentionClick,
  onChannelMentionClick,
  onCopyContent,
  onSaveMessage,
  onReportMessage,
  onClick,
  onAction,
  className,
  sx,
  id,
}) => {
  // State for message actions menu
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(
    null,
  );
  const menuOpen = Boolean(menuAnchorEl);

  // Handle action menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  // Handle action menu close
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // Handle message click
  const handleClick = () => {
    if (onClick) {
      onClick(item);
    }
  };

  // Handle edit click
  const handleEdit = () => {
    handleMenuClose();
    if (onEdit) {
      onEdit();
    }
  };

  // Handle reply click
  const handleReply = () => {
    handleMenuClose();
    if (onReply) {
      onReply();
    }
  };

  // Handle delete click
  const handleDelete = () => {
    handleMenuClose();
    if (onDelete) {
      onDelete();
    }
  };

  // Handle pin toggle
  const handleTogglePin = () => {
    handleMenuClose();
    if (onTogglePin) {
      onTogglePin();
    }
  };

  // Handle add reaction
  const handleAddReaction = () => {
    handleMenuClose();
    if (onAddReaction) {
      onAddReaction();
    }
  };

  // Handle copy content
  const handleCopyContent = () => {
    handleMenuClose();
    if (onCopyContent) {
      onCopyContent();
    } else {
      // Fallback copy behavior
      navigator.clipboard.writeText(item.message);
    }
  };

  // Handle save message
  const handleSaveMessage = () => {
    handleMenuClose();
    if (onSaveMessage) {
      onSaveMessage();
    }
  };

  // Handle report message
  const handleReportMessage = () => {
    handleMenuClose();
    if (onReportMessage) {
      onReportMessage();
    }
  };

  // Check if message is from current user
  const isCurrentUserMessage = currentUserId === item.user_id;

  // Determine if we should show attachments
  const hasAttachments =
    !!item.file_ids?.length || !!item.metadata?.files?.length;

  // Get message attachments
  const attachments = React.useMemo(() => {
    if (item.metadata?.files) {
      return item.metadata.files;
    }
    return [];
  }, [item.metadata?.files]);

  // Format timestamp
  const timestamp = new Date(item.create_at).getTime();
  const isEdited = item.update_at > item.create_at;

  return (
    <>
      {/* Date separator if needed */}
      {showDateSeparator && dateSeparatorValue && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            my: 2,
          }}
        >
          <Divider sx={{ flex: 1 }} />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              px: 2,
              py: 0.5,
              borderRadius: 1,
              backgroundColor: "background.paper",
              boxShadow: 1,
            }}
          >
            {dateSeparatorValue}
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>
      )}

      {/* Message container */}
      <Box
        className={className}
        sx={{
          position: "relative",
          display: "flex",
          p: compact ? 0.5 : 1,
          borderRadius: 1,
          my: compact ? 0.5 : 1,
          "&:hover": {
            backgroundColor: "action.hover",
          },
          ...(isHighlighted && {
            backgroundColor: (theme) => `${theme.palette.primary.main}15`,
          }),
          ...(isActive && {
            backgroundColor: "action.selected",
          }),
          ...sx,
        }}
        onClick={handleClick}
        id={id}
      >
        {/* Pin indicator */}
        {isPinned && (
          <Box sx={{ position: "absolute", top: 4, right: 4 }}>
            <Tooltip title="Pinned">
              <PinIcon fontSize="small" color="primary" />
            </Tooltip>
          </Box>
        )}

        {/* User avatar */}
        {!compact && (
          <Box sx={{ mr: 1.5, mt: 0.5 }}>
            <UserAvatar
              displayName={userDisplayName}
              imageUrl={userImageUrl}
              status={userStatus}
              size="medium"
              showStatus={true}
            />
          </Box>
        )}

        {/* Message content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Message header */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
            {compact && (
              <Box sx={{ mr: 1 }}>
                <UserAvatar
                  displayName={userDisplayName}
                  imageUrl={userImageUrl}
                  size="small"
                  showStatus={false}
                />
              </Box>
            )}

            <Typography
              variant="subtitle2"
              component="span"
              sx={{ fontWeight: 500, mr: 1 }}
            >
              {userDisplayName}
            </Typography>

            <RelativeTime
              timestamp={timestamp}
              variant="caption"
              color="text.secondary"
              showTooltip={true}
              showDate={showFullDateTime}
              showTime={true}
              relative={!showFullDateTime}
            />

            {isEdited && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 1 }}
              >
                (edited)
              </Typography>
            )}

            {isSystemMessage && (
              <Chip
                label="System"
                size="small"
                variant="outlined"
                sx={{ ml: 1, height: 20 }}
              />
            )}
          </Box>

          {/* Message body */}
          {isEditing ? (
            editFormComponent
          ) : (
            <Box sx={{ wordBreak: "break-word" }}>
              <Markdown content={item.message} />
            </Box>
          )}

          {/* Attachments */}
          {hasAttachments && (
            <Box sx={{ mt: 1 }}>
              <MessageAttachmentsUI
                attachments={attachments}
                fileIds={item.file_ids}
              />
            </Box>
          )}

          {/* Reactions */}
          {showReactions && reactions.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <MessageReactionsUI
                reactions={reactions}
                currentUserId={currentUserId}
                onReactionClick={onReactionClick}
              />
            </Box>
          )}
        </Box>

        {/* Action buttons (visible on hover) */}
        {showActions && (
          <Box
            sx={{
              opacity: 0,
              transition: "opacity 0.2s",
              "&:hover": { opacity: 1 },
              "$:parent:hover &": { opacity: 1 },
              display: "flex",
              alignItems: "center",
              position: "absolute",
              right: 8,
              top: 4,
              backgroundColor: "background.paper",
              borderRadius: 1,
              boxShadow: 1,
              zIndex: 1,
            }}
          >
            {onAddReaction && (
              <Tooltip title="Add Reaction">
                <IconButton size="small" onClick={handleAddReaction}>
                  <EmojiIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {onReply && (
              <Tooltip title="Reply">
                <IconButton size="small" onClick={handleReply}>
                  <ReplyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="More Actions">
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                aria-label="more"
                aria-controls={menuOpen ? "message-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={menuOpen ? "true" : undefined}
              >
                <MoreIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Actions menu */}
      <Menu
        id="message-menu"
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        MenuListProps={{
          "aria-labelledby": "message-actions-button",
          dense: true,
        }}
      >
        {onReply && (
          <MenuItem onClick={handleReply}>
            <ListItemIcon>
              <ReplyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Reply</ListItemText>
          </MenuItem>
        )}

        {onAddReaction && (
          <MenuItem onClick={handleAddReaction}>
            <ListItemIcon>
              <EmojiIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Add Reaction</ListItemText>
          </MenuItem>
        )}

        {onTogglePin && (
          <MenuItem onClick={handleTogglePin}>
            <ListItemIcon>
              {isPinned ? (
                <UnpinIcon fontSize="small" />
              ) : (
                <PinIcon fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText>{isPinned ? "Unpin" : "Pin"}</ListItemText>
          </MenuItem>
        )}

        <MenuItem onClick={handleCopyContent}>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy Text</ListItemText>
        </MenuItem>

        {onSaveMessage && (
          <MenuItem onClick={handleSaveMessage}>
            <ListItemIcon>
              <SaveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Save Message</ListItemText>
          </MenuItem>
        )}

        {isCurrentUserMessage && onEdit && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}

        {(isCurrentUserMessage || onReportMessage) && <Divider />}

        {isCurrentUserMessage && onDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
            <ListItemIcon sx={{ color: "error.main" }}>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}

        {!isCurrentUserMessage && onReportMessage && (
          <MenuItem onClick={handleReportMessage} sx={{ color: "error.main" }}>
            <ListItemIcon sx={{ color: "error.main" }}>
              <ReportIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Report</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default MessageItemUI;
