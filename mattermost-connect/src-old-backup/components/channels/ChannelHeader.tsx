import React from "react";
import { Box, Typography, IconButton, Tooltip, Paper } from "@mui/material";
import {
  Search as SearchIcon,
  InfoOutlined as InfoIcon,
  PeopleOutline as MembersIcon,
  ExitToApp as LeaveIcon,
  Star as StarIcon,
  StarOutline as StarOutlineIcon,
} from "@mui/icons-material";

import { Channel } from "../../api/types";
import { useChannels, useTeams } from "../../hooks";
import ChannelTypingIndicator from "../common/ChannelTypingIndicator";
import { isDirectChannel, isGroupChannel } from "../../utils/channelUtils";

export interface ChannelHeaderProps {
  /**
   * Show channel search button
   */
  showSearch?: boolean;

  /**
   * Show channel info button
   */
  showInfo?: boolean;

  /**
   * Show channel members button
   */
  showMembers?: boolean;

  /**
   * Show favorite toggle button
   */
  showFavorite?: boolean;

  /**
   * Show leave channel button
   */
  showLeave?: boolean;

  /**
   * Called when search is clicked
   */
  onSearchClick?: () => void;

  /**
   * Called when info is clicked
   */
  onInfoClick?: () => void;

  /**
   * Called when members is clicked
   */
  onMembersClick?: () => void;

  /**
   * Called when favorite is toggled
   */
  onFavoriteToggle?: (isFavorite: boolean) => void;

  /**
   * Called when leave is clicked
   */
  onLeaveClick?: () => void;

  /**
   * Whether channel is currently a favorite
   */
  isFavorite?: boolean;

  /**
   * Additional content for the header
   */
  children?: React.ReactNode;
}

/**
 * Channel header component that displays channel info and actions
 */
export function Header({
  channel,
  showSearch = true,
  showInfo = true,
  showMembers = true,
  showFavorite = false,
  showLeave = false,
  onSearchClick,
  onInfoClick,
  onMembersClick,
  onFavoriteToggle,
  onLeaveClick,
  isFavorite = false,
  children,
}: ChannelHeaderProps & { channel: Channel }) {
  // Get channel header/purpose text
  const getChannelHeader = () => {
    return (
      channel.header ||
      (isDirectChannel(channel) ? "Direct Message" : "") ||
      (isGroupChannel(channel) ? "Group Message" : "") ||
      channel.purpose ||
      ""
    );
  };

  // Handle favorite toggle
  const handleFavoriteToggle = () => {
    if (onFavoriteToggle) {
      onFavoriteToggle(!isFavorite);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        flexDirection: "column",
        p: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
        {/* Channel name with typing indicator */}
        <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {channel.display_name}
          </Typography>
          <ChannelTypingIndicator channelId={channel.id} />

          {/* Favorite button */}
          {showFavorite && (
            <IconButton
              size="small"
              onClick={handleFavoriteToggle}
              sx={{ ml: 1 }}
            >
              {isFavorite ? <StarIcon color="warning" /> : <StarOutlineIcon />}
            </IconButton>
          )}
        </Box>

        {/* Channel actions */}
        <Box sx={{ display: "flex" }}>
          {/* Search */}
          {showSearch && (
            <Tooltip title="Search in channel">
              <IconButton size="small" onClick={onSearchClick}>
                <SearchIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Channel info */}
          {showInfo && (
            <Tooltip title="Channel info">
              <IconButton size="small" onClick={onInfoClick}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Channel members */}
          {showMembers && (
            <Tooltip title="View members">
              <IconButton size="small" onClick={onMembersClick}>
                <MembersIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Leave channel */}
          {showLeave && (
            <Tooltip title="Leave channel">
              <IconButton size="small" onClick={onLeaveClick}>
                <LeaveIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Channel header/purpose text */}
      {getChannelHeader() && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {getChannelHeader()}
        </Typography>
      )}

      {/* Custom content */}
      {children}
    </Paper>
  );
}

export const ChannelHeader = (props: ChannelHeaderProps) => {
  const { activeTeam } = useTeams();
  const { activeChannel, getChannelDisplayName } = useChannels(activeTeam?.id);
  if (!activeChannel) {
    return null;
  }

  const displayName = getChannelDisplayName(activeChannel);

  return (
    <Header
      channel={{ ...activeChannel, display_name: displayName }}
      {...props}
    />
  );
};

export default ChannelHeader;
