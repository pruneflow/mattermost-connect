// src/components/teams/TeamCreate.tsx
/**
 * Component that provides a form for creating a new team
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import TeamCreateContainer from "../../internal/containers/teams/TeamCreateContainer";
import { Team } from "../../types";

export interface TeamCreateParams {
  /** Team name for display */
  display_name?: string;
  /** Team URL identifier (will be auto-generated if not provided) */
  name?: string;
  /** Team description */
  description?: string;
  /** Team type ('O' for open, 'I' for invite-only) */
  type?: "O" | "I";
  /** Company name */
  company_name?: string;
  /** Allowed email domains for joining */
  allowed_domains?: string;
}

export interface TeamCreateProps {
  /** Initial form data */
  initialData?: TeamCreateParams;
  /** Callback when team creation is successful (notification only) */
  onCreateSuccess?: (team: Team) => void;
  /** Callback when form submission is canceled */
  onCancel?: () => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Team creation component that provides a form for creating new teams
 *
 * This component displays a form with fields for all required and optional
 * team properties, with validation and automatic URL name generation.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <TeamCreate
 *   onCreateSuccess={(team) => {
 *     console.log('Team created:', team.display_name);
 *     navigate(`/teams/${team.id}`);
 *   }}
 *   onCancel={() => navigate('/teams')}
 * />
 *
 * // With initial data
 * <TeamCreate
 *   initialData={{
 *     display_name: 'Engineering',
 *     description: 'Team for engineering discussions',
 *     type: 'O'
 *   }}
 *   onCreateSuccess={handleSuccess}
 * />
 * ```
 */
const TeamCreate: React.FC<TeamCreateProps> = ({
  initialData,
  onCreateSuccess,
  onCancel,
  className,
  sx,
  id,
}) => {
  return (
    <TeamCreateContainer
      initialData={initialData}
      onCreateSuccess={onCreateSuccess}
      onCancel={onCancel}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default TeamCreate;
