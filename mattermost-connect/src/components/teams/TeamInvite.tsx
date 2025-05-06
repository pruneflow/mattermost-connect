// src/components/teams/TeamInvite.tsx
/**
 * Component that provides functionality for inviting users to a team
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import TeamInviteContainer from "../../internal/containers/teams/TeamInviteContainer";

export interface TeamInviteProps {
  /** Team ID for connected mode */
  teamId: string;
  /** Whether to show email invitation option */
  showEmailInvite?: boolean;
  /** Whether to show invite link generation option */
  showInviteLink?: boolean;
  /** Callback when invitations are sent successfully (notification only) */
  onInviteSuccess?: () => void;
  /** Callback when invitation process is canceled */
  onCancel?: () => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Team invitation component for inviting users to a team
 *
 * This component provides multiple ways to invite users to a team:
 * - Search and select existing platform users
 * - Send email invitations
 * - Generate and share invite links
 *
 * @example
 * ```tsx
 * // Basic usage
 * <TeamInvite
 *   teamId="team123"
 *   onInviteSuccess={() => console.log('Invitations sent')}
 *   onCancel={() => setShowInviteDialog(false)}
 * />
 *
 * // With limited options
 * <TeamInvite
 *   teamId="team123"
 *   showEmailInvite={false}
 *   showInviteLink={true}
 *   onInviteSuccess={handleSuccess}
 * />
 * ```
 */
const TeamInvite: React.FC<TeamInviteProps> = ({
  teamId,
  showEmailInvite = true,
  showInviteLink = true,
  onInviteSuccess,
  onCancel,
  className,
  sx,
  id,
}) => {
  return (
    <TeamInviteContainer
      teamId={teamId}
      showEmailInvite={showEmailInvite}
      showInviteLink={showInviteLink}
      onInviteSuccess={onInviteSuccess}
      onCancel={onCancel}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default TeamInvite;
