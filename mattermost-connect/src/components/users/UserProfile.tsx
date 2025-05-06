// src/components/users/UserProfile.tsx
/**
 * User profile component that displays detailed user information and allows editing
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import UserProfileContainer from "../../internal/containers/users/UserProfileContainer";
import { User, UserStatus } from "../../types";

export interface UserProfileProps {
  /** User ID - used to fetch user data from store */
  userId?: string;
  /** User data (if no userId is provided) */
  user?: User;
  /** Profile display variant */
  variant?: "standard" | "compact" | "card";
  /** Size of the avatar */
  avatarSize?: number;
  /** Whether to show the user's status */
  showStatus?: boolean;
  /** Custom tabs to display */
  tabs?: Array<{
    id: string;
    label: string;
    content?: React.ReactNode;
    disabled?: boolean;
  }>;
  /** ID of the initially active tab */
  activeTab?: string;
  /** Which fields can be edited */
  editableFields?: Array<
    "username" | "email" | "firstName" | "lastName" | "nickname"
  >;
  /** Whether the profile is editable */
  editable?: boolean;
  /** Whether to show the edit button */
  showEditButton?: boolean;
  /** Callback for when an action is performed */
  onAction?: (action: string, user: User) => void;
  /** Callback for when the active tab changes */
  onTabChange?: (tabId: string) => void;
  /** Callback for when the user's status changes */
  onStatusChange?: (user: User, newStatus: UserStatus) => void;
  /** Callback for when the profile is updated */
  onProfileUpdate?: (user: User) => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * User profile component that displays detailed user information
 *
 * This component can work in two modes:
 * 1. Connected mode (with userId): Fetches user data from the store
 * 2. Standalone mode (with user object): Uses provided data directly
 *
 * Both modes use the same underlying container to ensure consistent behavior.
 *
 * Features:
 * - Display user information in various formats (standard, compact, card)
 * - Allow editing of user profile information (for current user)
 * - Support for tabbed content display
 * - Status management integration
 *
 * @example
 * ```tsx
 * // Connected mode
 * <UserProfile
 *   userId="user123"
 *   variant="standard"
 *   editable={true}
 *   onProfileUpdate={(user) => console.log('Profile updated', user)}
 * />
 *
 * // Standalone mode
 * <UserProfile
 *   user={userObject}
 *   variant="compact"
 *   editable={false}
 *   showStatus={true}
 * />
 * ```
 */
const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  user,
  variant = "standard",
  avatarSize = 80,
  showStatus = true,
  tabs = [],
  activeTab = "info",
  editableFields = ["firstName", "lastName", "nickname"],
  editable = true,
  showEditButton = true,
  onAction,
  onTabChange,
  onStatusChange,
  onProfileUpdate,
  className,
  sx,
  id,
}) => {
  // If no userId and no user provided, don't render anything
  if (!userId && !user) {
    return null;
  }

  return (
    <UserProfileContainer
      userId={userId}
      user={user}
      variant={variant}
      avatarSize={avatarSize}
      showStatus={showStatus}
      tabs={tabs}
      activeTab={activeTab}
      editableFields={editableFields}
      editable={editable}
      showEditButton={showEditButton}
      onAction={onAction}
      onTabChange={onTabChange}
      onStatusChange={onStatusChange}
      onProfileUpdate={onProfileUpdate}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default UserProfile;
