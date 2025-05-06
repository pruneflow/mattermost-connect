// src/components/teams/TeamDetail.tsx
/**
 * Component that displays details about a team
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import TeamDetailContainer from "../../internal/containers/teams/TeamDetailContainer";
import { Team } from "../../types";

export interface TeamDetailProps {
  /** Team ID to display */
  teamId: string;
  /** Whether to show team actions */
  showActions?: boolean;
  /** Size variant */
  variant?: "standard" | "compact" | "card";
  /** Custom tabs configuration */
  tabs?: Array<{
    id: string;
    label: string;
    content?: React.ReactNode;
    disabled?: boolean;
  }>;
  /** Initial active tab */
  activeTab?: string;
  /** Available actions for the team */
  availableActions?: string[];
  /** Callback when an action is performed (notification only) */
  onAction?: (action: string, team: Team) => void;
  /** Callback when tab changes (notification only) */
  onTabChange?: (tabId: string) => void;
  /** Callback when team is deleted (notification only) */
  onDelete?: () => void;
  /** Callback when team is left (notification only) */
  onLeave?: () => void;
  /** Callback when team is updated (notification only) */
  onUpdate?: () => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Team details component that displays information about a team
 *
 * This component provides a detailed view of a team with tabs for different sections:
 * - Info: Basic team information
 * - Members: Team members management
 * - Settings: Team settings management
 *
 * @example
 * ```tsx
 * // Basic usage
 * <TeamDetail
 *   teamId="team123"
 *   onAction={(action, team) => console.log(`Action ${action} on team ${team.name}`)}
 * />
 *
 * // With custom tabs and actions
 * <TeamDetail
 *   teamId="team123"
 *   variant="card"
 *   activeTab="members"
 *   availableActions={["edit", "leave"]}
 *   onTabChange={(tabId) => console.log(`Tab changed to ${tabId}`)}
 *   onUpdate={() => fetchTeams()}
 * />
 * ```
 */
const TeamDetail: React.FC<TeamDetailProps> = ({
  teamId,
  showActions = true,
  variant = "standard",
  tabs,
  activeTab,
  availableActions,
  onAction,
  onTabChange,
  onDelete,
  onLeave,
  onUpdate,
  className,
  sx,
  id,
}) => {
  return (
    <TeamDetailContainer
      teamId={teamId}
      showActions={showActions}
      variant={variant}
      tabs={tabs}
      activeTab={activeTab}
      availableActions={availableActions}
      onAction={onAction}
      onTabChange={onTabChange}
      onDelete={onDelete}
      onLeave={onLeave}
      onUpdate={onUpdate}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default TeamDetail;
