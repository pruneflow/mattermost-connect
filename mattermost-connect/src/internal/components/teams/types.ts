// src/internal/components/teams/types.ts

import { Team } from "../../../index";
import { BaseComponentProps } from "../../types/componentTypes";

/**
 * Base props for all team item components
 */
export interface TeamItemProps extends BaseComponentProps {
  /** Team data */
  team: Team;
  /** Whether the team is selected/active */
  isSelected?: boolean;
  /** Callback when team is clicked */
  onClick?: (team: Team) => void;
}

/**
 * Props for configuring team display options
 */
export interface TeamDisplayProps {
  /** Whether to show team icons/avatars */
  showIcons?: boolean;
  /** Whether to show team descriptions */
  showDescription?: boolean;
  /** Whether to show member counts */
  showMemberCount?: boolean;
  /** Maximum name length before truncation */
  maxNameLength?: number;
}

/**
 * Props for unread indicators and badges
 */
export interface TeamUnreadIndicatorProps {
  /** Unread counts by team ID */
  unreadCounts?: Record<string, { msg_count: number; mention_count: number }>;
}

/**
 * Props for team creation and actions
 */
export interface TeamInteractionProps {
  /** Whether to allow team creation */
  allowCreate?: boolean;
  /** Callback when create team button is clicked */
  onCreateTeam?: () => void;
}

/**
 * Props for search functionality
 */
export interface TeamSearchProps {
  /** Whether to show search input */
  showSearch?: boolean;
  /** Current search term */
  searchTerm?: string;
  /** Callback when search changes */
  onSearch?: (term: string) => void;
}

/**
 * Combined props for Team Selector component
 */
export interface TeamSelectorProps
  extends BaseComponentProps,
    TeamDisplayProps,
    TeamUnreadIndicatorProps,
    TeamInteractionProps,
    TeamSearchProps {
  /** Teams to display */
  teams: Team[];
  /** Selected team ID */
  selectedTeamId?: string;
  /** Callback when a team is selected */
  onSelectTeam?: (team: Team) => void;
  /** Display variant */
  variant?: "list" | "grid" | "tabs" | "sidebar";
}

/**
 * Props specifically for variant components (List, Grid, Tabs, Sidebar)
 * These require onSelectTeam to be a required prop
 */
export interface TeamVariantProps
  extends BaseComponentProps,
    TeamDisplayProps,
    TeamUnreadIndicatorProps,
    TeamInteractionProps {
  /** Teams to display */
  teams: Team[];
  /** Currently selected team ID */
  selectedTeamId?: string;
  /** Callback when a team is selected - required in variant components */
  onSelectTeam: (team: Team) => void;
}

/**
 * Props specifically for search-enabled variant components (List, Grid)
 */
export interface TeamSearchableVariantProps
  extends TeamVariantProps,
    TeamSearchProps {}
