// src/components/teams/TeamSettings.tsx
/**
 * Component that provides a form for editing team settings
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import TeamSettingsContainer from "../../internal/containers/teams/TeamSettingsContainer";
import { Team } from "../../types";

export type TeamSettingField =
  | "display_name"
  | "description"
  | "company_name"
  | "allowed_domains"
  | "allow_open_invite";

export interface TeamSettingsProps {
  /** Team ID for connected mode */
  teamId: string;
  /** Fields that can be edited */
  editableFields?: TeamSettingField[];
  /** Whether to start in edit mode */
  editMode?: boolean;
  /** Callback when settings are updated successfully (notification only) */
  onUpdate?: (team: Team) => void;
  /** Callback when editing is canceled */
  onCancel?: () => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Team settings component for editing team properties
 *
 * This component provides a form for editing various team settings such as
 * name, description, and invitation settings. It supports specifying which
 * fields can be edited.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <TeamSettings
 *   teamId="team123"
 *   onUpdate={(team) => console.log('Team updated:', team)}
 *   onCancel={() => console.log('Editing canceled')}
 * />
 *
 * // With limited editable fields
 * <TeamSettings
 *   teamId="team123"
 *   editableFields={["display_name", "description"]}
 *   onUpdate={handleTeamUpdate}
 * />
 * ```
 */
const TeamSettings: React.FC<TeamSettingsProps> = ({
  teamId,
  editableFields = [
    "display_name",
    "description",
    "company_name",
    "allowed_domains",
    "allow_open_invite",
  ],
  editMode = false,
  onUpdate,
  onCancel,
  className,
  sx,
  id,
}) => {
  return (
    <TeamSettingsContainer
      teamId={teamId}
      editableFields={editableFields}
      onUpdate={onUpdate}
      onCancel={onCancel}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default TeamSettings;
