// src/internal/components/messages/UserMentionUI.tsx
/**
 * Component that displays a user mention in messages
 */
import React from "react";
import { Chip, Tooltip } from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";

export interface UserMentionUIProps extends BaseComponentProps {
  /** Username to display */
  username: string;
  /** User's full name */
  fullName?: string;
  /** Whether this is a mention for "all" */
  isAll?: boolean;
  /** Whether this is a mention for "channel" */
  isChannel?: boolean;
  /** Whether this is a mention for "here" */
  isHere?: boolean;
  /** Whether to show tooltip with full name */
  showTooltip?: boolean;
  /** Callback when mention is clicked */
  onClick?: () => void;
}

const UserMentionUI: React.FC<UserMentionUIProps> = ({
  username,
  fullName,
  isAll = false,
  isChannel = false,
  isHere = false,
  showTooltip = true,
  onClick,
  className,
  sx,
  id,
}) => {
  // Special mentions
  const isSpecialMention = isAll || isChannel || isHere;

  let label = `@${username}`;
  let tooltipText = fullName || username;

  // Handle special mentions
  if (isAll) {
    label = "@all";
    tooltipText = "Notifies everyone in this channel";
  } else if (isChannel) {
    label = "@channel";
    tooltipText = "Notifies everyone in this channel";
  } else if (isHere) {
    label = "@here";
    tooltipText = "Notifies everyone who is online in this channel";
  }

  const mention = (
    <Chip
      label={label}
      size="small"
      color={isSpecialMention ? "primary" : "default"}
      variant="outlined"
      clickable={!!onClick}
      onClick={onClick}
      className={className}
      sx={{
        height: 24,
        fontSize: "0.85rem",
        backgroundColor: (theme) =>
          isSpecialMention
            ? `${theme.palette.primary.main}20`
            : `${theme.palette.primary.main}10`,
        "& .MuiChip-label": {
          px: 1,
        },
        ...sx,
      }}
      id={id}
    />
  );

  if (showTooltip) {
    return (
      <Tooltip title={tooltipText} arrow>
        {mention}
      </Tooltip>
    );
  }

  return mention;
};

export default UserMentionUI;
