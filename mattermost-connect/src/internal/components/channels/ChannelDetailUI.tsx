// src/internal/components/channels/ChannelDetailUI.tsx
/**
 * Component that displays detailed information about a channel
 */
import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  Button,
  Link,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemIcon,
  Avatar,
  IconButton,
} from "@mui/material";
import {
  Tag as PublicIcon,
  LockOutlined as PrivateIcon,
  Person as DirectIcon,
  Group as GroupIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  People as PeopleIcon,
  PersonAdd as InviteIcon,
  ExitToApp as LeaveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";
import { Channel } from "../../../index";
import { BaseComponentProps } from "../../types/componentTypes";
import UserAvatar from "../../../components/users/UserAvatar";

export interface ChannelDetailUIProps extends BaseComponentProps {
  /** Channel data */
  channel: Channel;
  /** Whether the channel is a favorite */
  isFavorite?: boolean;
  /** Whether the channel is muted */
  isMuted?: boolean;
  /** Member count */
  memberCount?: number;
  /** List of member data to show (preview) */
  memberPreview?: Array<{
    id: string;
    displayName: string;
    imageUrl?: string;
    status?: "online" | "away" | "dnd" | "offline";
  }>;
  /** Whether to show channel actions */
  showActions?: boolean;
  /** Whether the current user can manage this channel */
  canManage?: boolean;
  /** Callback when favorite button is clicked */
  onToggleFavorite?: () => void;
  /** Callback when view members button is clicked */
  onViewMembers?: () => void;
  /** Callback when invite button is clicked */
  onInvite?: () => void;
  /** Callback when edit button is clicked */
  onEdit?: () => void;
  /** Callback when copy link button is clicked */
  onCopyLink?: () => void;
  /** Callback when leave button is clicked */
  onLeave?: () => void;
  /** Callback when delete button is clicked */
  onDelete?: () => void;
}

const ChannelDetailUI: React.FC<ChannelDetailUIProps> = ({
  channel,
  isFavorite = false,
  isMuted = false,
  memberCount = 0,
  memberPreview = [],
  showActions = true,
  canManage = false,
  onToggleFavorite,
  onViewMembers,
  onInvite,
  onEdit,
  onCopyLink,
  onLeave,
  onDelete,
  className,
  sx,
  id,
}) => {
  // Get channel icon based on type
  const getChannelIcon = () => {
    switch (channel.type) {
      case "O":
        return <PublicIcon fontSize="medium" />;
      case "P":
        return <PrivateIcon fontSize="medium" />;
      case "D":
        return <DirectIcon fontSize="medium" />;
      case "G":
        return <GroupIcon fontSize="medium" />;
      default:
        return <PublicIcon fontSize="medium" />;
    }
  };

  // Get channel type label
  const getChannelTypeLabel = (): string => {
    switch (channel.type) {
      case "O":
        return "Public Channel";
      case "P":
        return "Private Channel";
      case "D":
        return "Direct Message";
      case "G":
        return "Group Message";
      default:
        return "Channel";
    }
  };

  // Get channel created date
  const getCreatedDate = (): string => {
    return new Date(channel.create_at).toLocaleDateString();
  };

  // Format total message count
  const formatMessageCount = (): string => {
    if (!channel.total_msg_count) return "0 messages";

    return `${channel.total_msg_count.toLocaleString()} messages`;
  };

  return (
    <Card
      className={className}
      elevation={2}
      sx={{
        width: "100%",
        ...sx,
      }}
      id={id}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 2,
          }}
        >
          {getChannelIcon()}
          <Typography variant="h5" sx={{ ml: 1 }}>
            {channel.display_name}
          </Typography>
          {isFavorite && <StarIcon color="primary" sx={{ ml: 1 }} />}
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Channel Type
            </Typography>
            <Chip
              label={getChannelTypeLabel()}
              size="small"
              color={channel.type === "P" ? "secondary" : "primary"}
              variant="outlined"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Channel Name
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography variant="body2">@{channel.name}</Typography>
              {onCopyLink && (
                <IconButton size="small" onClick={onCopyLink} sx={{ ml: 0.5 }}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Grid>

          {(channel.purpose || channel.header) && (
            <Grid size={{ xs: 12 }}>
              {channel.purpose && (
                <>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Purpose
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {channel.purpose}
                  </Typography>
                </>
              )}

              {channel.header && (
                <>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Header
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {channel.header}
                  </Typography>
                </>
              )}
            </Grid>
          )}

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Created
            </Typography>
            <Typography variant="body2">{getCreatedDate()}</Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Messages
            </Typography>
            <Typography variant="body2">{formatMessageCount()}</Typography>
          </Grid>

          {memberCount > 0 && (
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  Members ({memberCount})
                </Typography>
                {onViewMembers && (
                  <Button
                    size="small"
                    onClick={onViewMembers}
                    endIcon={<PeopleIcon />}
                  >
                    View All
                  </Button>
                )}
              </Box>

              {memberPreview.length > 0 && (
                <List disablePadding>
                  {memberPreview.map((member) => (
                    <ListItem key={member.id} disableGutters>
                      <ListItemAvatar sx={{ minWidth: 40 }}>
                        <UserAvatar
                          displayName={member.displayName}
                          imageUrl={member.imageUrl}
                          status={member.status}
                          size="small"
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={member.displayName}
                        primaryTypographyProps={{ variant: "body2" }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Grid>
          )}
        </Grid>

        {showActions && (
          <>
            <Divider sx={{ my: 2 }} />

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              {onToggleFavorite && (
                <Button
                  size="small"
                  startIcon={isFavorite ? <StarIcon /> : <StarBorderIcon />}
                  variant="outlined"
                  color={isFavorite ? "primary" : "inherit"}
                  onClick={onToggleFavorite}
                >
                  {isFavorite ? "Remove Favorite" : "Favorite"}
                </Button>
              )}

              {onInvite && (
                <Button
                  size="small"
                  startIcon={<InviteIcon />}
                  variant="outlined"
                  onClick={onInvite}
                >
                  Invite
                </Button>
              )}

              {canManage && onEdit && (
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  variant="outlined"
                  onClick={onEdit}
                >
                  Edit
                </Button>
              )}

              {onLeave && (
                <Button
                  size="small"
                  startIcon={<LeaveIcon />}
                  variant="outlined"
                  color="error"
                  onClick={onLeave}
                >
                  Leave
                </Button>
              )}

              {canManage && onDelete && (
                <Button
                  size="small"
                  startIcon={<DeleteIcon />}
                  variant="outlined"
                  color="error"
                  onClick={onDelete}
                >
                  Delete
                </Button>
              )}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ChannelDetailUI;
