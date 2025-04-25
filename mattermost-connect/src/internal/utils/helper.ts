// src/internal/utils/helpers.ts
/**
 * Helper functions for internal components
 */

/**
 * Gets initials from a name
 * @param name Name to get initials from
 * @returns Initials (max 2 characters)
 */
export function getInitials(name: string): string {
  if (!name) return "?";

  const parts = name.trim().split(" ");

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
