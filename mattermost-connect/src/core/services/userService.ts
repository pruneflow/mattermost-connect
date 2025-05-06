// src/core/services/userService.ts
/**
 * User service
 * Provides business logic for user operations, status management, and formatting
 */
import {
  User,
  UserStatus,
  UserWithStatus,
  UserProfileUpdate,
  ErrorSource,
  EventType,
} from "../../types";
import { formatDate } from "../../utils/formatters";
import { handleError } from "../store";
import { emitEvent } from "../api/eventUtils";
import { validateUsername, validateEmail } from "../../utils/authValidation";

/**
 * Typing indicator timeout (5 seconds)
 */
const TYPING_TIMEOUT = 5000;

/**
 * Service for user-related operations
 * Centralizes user business logic and formatting
 */
class UserService {
  /**
   * Formats a user's name for display
   * @param user User object
   * @param preferUsername Whether to prefer username over fullname
   * @returns Formatted display name
   */
  public formatUserName(
    user: User | null | undefined,
    preferUsername: boolean = false,
  ): string {
    console.debug("user", user);
    if (!user) return "Unknown User";
    console.debug("preferUsername", preferUsername);
    try {
      if (!preferUsername && user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
      } else if (!preferUsername && user.nickname) {
        return user.nickname;
      } else if (user.username) {
        return user.username;
      }

      return "Unknown User";
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "formatUserName",
        userId: user?.id,
      });
      return user?.username || "Unknown User";
    }
  }

  /**
   * Gets a user's initials from their name components
   * @param user User object
   * @returns User's initials (1-2 characters)
   */
  public getUserInitials(user: User | null | undefined): string {
    if (!user) return "?";

    try {
      if (user.first_name && user.last_name) {
        return (
          user.first_name.charAt(0) + user.last_name.charAt(0)
        ).toUpperCase();
      } else if (user.first_name) {
        return user.first_name.charAt(0).toUpperCase();
      } else if (user.nickname) {
        return user.nickname.charAt(0).toUpperCase();
      } else if (user.username) {
        return user.username.charAt(0).toUpperCase();
      }

      return "?";
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "getUserInitials",
        userId: user?.id,
      });
      return "?";
    }
  }

  /**
   * Gets the user's profile picture URL
   * @param user User object
   * @param size Optional size parameter
   * @returns Profile picture URL
   */
  public getProfilePictureUrl(user: User, size: number = 128): string {
    if (!user || !user.id) return "";

    try {
      const timestamp = user.last_picture_update || "";
      return `/api/v4/users/${user.id}/image?_=${timestamp}&size=${size}`;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "getProfilePictureUrl",
        userId: user.id,
      });
      return "";
    }
  }

  /**
   * Gets a color based on the user's ID (for avatars without images)
   * @param userId User ID
   * @returns Hex color code
   */
  public getUserColor(userId: string): string {
    if (!userId) return "#000000";

    try {
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
      }

      let color = "#";
      for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff;
        color += ("00" + value.toString(16)).substr(-2);
      }

      return color;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "getUserColor",
        userId,
      });
      return "#cccccc"; // Safe fallback color
    }
  }

  /**
   * Combines a list of users into a comma-separated display string
   * @param users List of users
   * @param maxUsers Maximum number of users to display before truncating
   * @returns Formatted list of user names
   */
  public formatUserList(users: User[], maxUsers: number = 3): string {
    if (!users.length) return "";

    try {
      if (users.length <= maxUsers) {
        return users.map((user) => this.formatUserName(user)).join(", ");
      }

      const visibleUsers = users.slice(0, maxUsers);
      const remaining = users.length - maxUsers;

      return `${visibleUsers.map((user) => this.formatUserName(user)).join(", ")} and ${remaining} more`;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "formatUserList",
        userCount: users.length,
      });
      return `${users.length} users`;
    }
  }

  /**
   * Formats a user status for display
   * @param status User status
   * @returns Human-readable status
   */
  public formatUserStatus(status: UserStatus): string {
    switch (status) {
      case "online":
        return "Online";
      case "away":
        return "Away";
      case "dnd":
        return "Do Not Disturb";
      case "offline":
        return "Offline";
      default:
        return "Offline";
    }
  }

  /**
   * Gets the CSS class for a user status
   * @param status User status
   * @returns CSS class name
   */
  public getUserStatusClass(status: UserStatus): string {
    switch (status) {
      case "online":
        return "status-online";
      case "away":
        return "status-away";
      case "dnd":
        return "status-dnd";
      case "offline":
        return "status-offline";
      default:
        return "status-offline";
    }
  }

  /**
   * Gets the status icon for a user status
   * @param status User status
   * @returns Icon name
   */
  public getUserStatusIcon(status: UserStatus): string {
    switch (status) {
      case "online":
        return "check-circle";
      case "away":
        return "clock";
      case "dnd":
        return "minus-circle";
      case "offline":
        return "circle";
      default:
        return "circle";
    }
  }

  /**
   * Determines if a user is currently typing based on timestamp
   * @param typingTimestamp Timestamp when typing was last recorded
   * @returns Whether the user is currently typing
   */
  public isUserTyping(typingTimestamp: number): boolean {
    return Date.now() - typingTimestamp < TYPING_TIMEOUT;
  }

  /**
   * Gets typing users from typing timestamps
   * @param typingUsers Record of user IDs to typing timestamps
   * @returns Array of user IDs who are currently typing
   */
  public getTypingUsers(typingUsers: Record<string, number>): string[] {
    try {
      const now = Date.now();

      return Object.entries(typingUsers)
        .filter(([_, timestamp]) => now - timestamp < TYPING_TIMEOUT)
        .map(([userId]) => userId);
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "getTypingUsers",
        timestamp: Date.now(),
      });
      return [];
    }
  }

  /**
   * Creates a formatted message for typing indicators
   * @param users List of users typing
   * @param maxUsers Maximum number of users to display before summarizing
   * @returns Formatted typing message
   */
  public formatTypingMessage(users: User[], maxUsers: number = 2): string {
    if (!users.length) return "";

    try {
      if (users.length === 1) {
        return `${this.formatUserName(users[0])} is typing...`;
      }

      if (users.length <= maxUsers) {
        const names = users
          .map((user) => this.formatUserName(user))
          .join(" and ");
        return `${names} are typing...`;
      }

      return `Several people are typing...`;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "formatTypingMessage",
        userCount: users.length,
      });
      return users.length === 1
        ? "Someone is typing..."
        : "People are typing...";
    }
  }

  /**
   * Filters users by search term
   * @param users List of users to filter
   * @param searchTerm Search term
   * @returns Filtered users
   */
  public filterUsersByTerm(users: User[], searchTerm: string): User[] {
    if (!searchTerm) return users;

    try {
      const term = searchTerm.toLowerCase();

      return users.filter(
        (user) =>
          (user.username && user.username.toLowerCase().includes(term)) ||
          (user.first_name && user.first_name.toLowerCase().includes(term)) ||
          (user.last_name && user.last_name.toLowerCase().includes(term)) ||
          (user.nickname && user.nickname.toLowerCase().includes(term)) ||
          (user.email && user.email.toLowerCase().includes(term)),
      );
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "filterUsersByTerm",
        searchTerm,
        userCount: users.length,
      });
      return users;
    }
  }

  /**
   * Sorts users by display name
   * @param users List of users to sort
   * @returns Sorted users
   */
  public sortUsersByDisplayName(users: User[]): User[] {
    try {
      return [...users].sort((a, b) => {
        const nameA = this.formatUserName(a);
        const nameB = this.formatUserName(b);
        return nameA.localeCompare(nameB);
      });
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "sortUsersByDisplayName",
        userCount: users.length,
      });
      return [...users];
    }
  }

  /**
   * Formats user status with timestamp for display
   * @param status User status
   * @param timestamp Status update timestamp
   * @returns Formatted status with time
   */
  public formatUserStatusWithTime(
    status: UserStatus,
    timestamp: number,
  ): string {
    try {
      const formattedTime = formatDate(timestamp, {
        showTime: true,
        relative: true,
      });
      return `${this.formatUserStatus(status)} ${formattedTime}`;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "formatUserStatusWithTime",
        status,
        timestamp,
      });
      return this.formatUserStatus(status);
    }
  }

  /**
   * Checks if a user is a system admin based on roles
   * @param user User to check
   * @returns Whether user is an admin
   */
  public isSystemAdmin(user: User): boolean {
    return user.roles ? user.roles.includes("system_admin") : false;
  }

  /**
   * Creates a UserWithStatus from user and status information
   * @param user User object
   * @param status User status
   * @returns Combined user with status
   */
  public createUserWithStatus(
    user: User,
    status: UserStatus = "offline",
  ): UserWithStatus {
    return {
      user,
      status,
      displayName: this.formatUserName(user),
    };
  }

  /**
   * Validates an email address format
   * @param email Email to validate
   * @returns Whether email format is valid
   */
  public isValidEmail(email: string): boolean {
    if (!email) return false;

    try {
      const result = validateEmail(email);
      return result.isValid;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "isValidEmail",
      });
      return false;
    }
  }

  /**
   * Validates a username format
   * @param username Username to validate
   * @returns Whether username format is valid
   */
  public isValidUsername(username: string): boolean {
    if (!username) return false;

    try {
      const result = validateUsername(username);
      return result.isValid;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "isValidUsername",
      });
      return false;
    }
  }

  /**
   * Gets the roles display text for a user
   * @param user User object
   * @returns Human-readable roles
   */
  public getUserRolesText(user: User): string {
    if (!user.roles) return "Member";

    try {
      const roles = user.roles.split(" ");

      if (roles.includes("system_admin")) return "System Admin";
      if (roles.includes("system_user")) return "System User";

      return "Member";
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "getUserRolesText",
        userId: user.id,
      });
      return "Member";
    }
  }

  /**
   * Creates a sanitized user profile update object
   * @param userData Raw user data
   * @returns Sanitized update object
   */
  public createProfileUpdate(userData: Partial<User>): UserProfileUpdate {
    try {
      const update: UserProfileUpdate = {};

      if (userData.email && this.isValidEmail(userData.email)) {
        update.email = userData.email;
      }

      if (userData.username && this.isValidUsername(userData.username)) {
        update.username = userData.username;
      }

      if (userData.first_name) {
        update.first_name = userData.first_name;
      }

      if (userData.last_name) {
        update.last_name = userData.last_name;
      }

      if (userData.nickname) {
        update.nickname = userData.nickname;
      }

      return update;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "createProfileUpdate",
      });
      return {};
    }
  }

  /**
   * Notifies about user status changes
   * @param userId User ID
   * @param status New status
   * @param previousStatus Previous status
   */
  public notifyStatusChange(
    userId: string,
    status: UserStatus,
    previousStatus?: UserStatus,
  ): void {
    emitEvent(EventType.USER_STATUS_UPDATED, {
      userId,
      status,
      previousStatus,
      timestamp: Date.now(),
    });
  }

  /**
   * Notifies about user profile updates
   * @param user Updated user
   */
  public notifyUserUpdate(user: User): void {
    emitEvent(EventType.USER_UPDATED, {
      user,
      timestamp: Date.now(),
    });
  }

  /**
   * Notifies about typing activity
   * @param userId User who is typing
   * @param channelId Channel where typing occurs
   * @param parentId Optional thread parent ID
   */
  public notifyTyping(
    userId: string,
    channelId: string,
    parentId?: string,
  ): void {
    emitEvent(EventType.USER_TYPING, {
      userId,
      channelId,
      parentId,
      timestamp: Date.now(),
    });
  }

  /**
   * Validates a user profile
   * @param profile User profile data
   * @returns Validation result with error messages by field
   */
  public validateUserProfile(profile: Partial<User>): {
    isValid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};
    let isValid = true;

    try {
      // Validate username if present
      if (profile.username !== undefined) {
        const usernameResult = validateUsername(profile.username);
        if (!usernameResult.isValid) {
          errors.username =
            Object.values(usernameResult.errors)[0] || "Invalid username";
          isValid = false;
        }
      }

      // Validate email if present
      if (profile.email !== undefined) {
        const emailResult = validateEmail(profile.email);
        if (!emailResult.isValid) {
          errors.email =
            Object.values(emailResult.errors)[0] || "Invalid email";
          isValid = false;
        }
      }

      // Validate name fields
      if (profile.first_name && profile.first_name.length > 64) {
        errors.first_name = "First name cannot exceed 64 characters";
        isValid = false;
      }

      if (profile.last_name && profile.last_name.length > 64) {
        errors.last_name = "Last name cannot exceed 64 characters";
        isValid = false;
      }

      if (profile.nickname && profile.nickname.length > 64) {
        errors.nickname = "Nickname cannot exceed 64 characters";
        isValid = false;
      }

      return { isValid, errors };
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "validateUserProfile",
      });
      return {
        isValid: false,
        errors: {
          _general: "An error occurred while validating the profile",
        },
      };
    }
  }
}

/**
 * Singleton instance of the user service
 */
export const userService = new UserService();
