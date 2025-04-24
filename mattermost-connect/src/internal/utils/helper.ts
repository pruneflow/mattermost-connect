// src/internal/utils/helpers.ts
/**
 * Helper functions for internal components
 */

/**
 * Creates a debounced function
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<F extends (...args: any[]) => any>(
  func: F,
  wait: number,
): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<F>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttles a function
 * @param func Function to throttle
 * @param limit Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<F extends (...args: any[]) => any>(
  func: F,
  limit: number,
): (...args: Parameters<F>) => void {
  let lastFunc: ReturnType<typeof setTimeout> | null = null;
  let lastRan = 0;

  return function (...args: Parameters<F>) {
    const context = this;
    const now = Date.now();

    if (now - lastRan >= limit) {
      func.apply(context, args);
      lastRan = now;
    } else {
      if (lastFunc !== null) {
        clearTimeout(lastFunc);
      }

      lastFunc = setTimeout(
        () => {
          if (Date.now() - lastRan >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        },
        limit - (now - lastRan),
      );
    }
  };
}

/**
 * Truncates text to a specific length with ellipsis
 * @param text Text to truncate
 * @param length Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, length: number): string {
  if (text.length <= length) {
    return text;
  }

  return text.substring(0, length) + "...";
}

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
