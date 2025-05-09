/**
 * Emoji utilities for Mattermost
 * These are the emoji names that Mattermost API accepts
 */

// Mapping of Unicode emoji to Mattermost emoji names
export const EMOJI_NAME_MAP: Record<string, string> = {
  "👍": "thumbsup",
  "👎": "thumbsdown",
  "❤️": "heart",
  "🎉": "tada",
  "😄": "smile",
  "😊": "slightly_smiling_face",
  "🙂": "slightly_smiling_face",
  "😂": "joy",
  "😉": "wink",
  "😐": "neutral_face",
  "😕": "confused",
  "😢": "cry",
  "👀": "eyes",
  "🔥": "fire",
  "👏": "clap",
  "🤔": "thinking",
  "👋": "wave",
  "🙌": "raised_hands",
  "🙏": "pray",
  "🚀": "rocket",
  "✅": "white_check_mark",
  "😍": "heart_eyes",
  "🤗": "hugs",
  "😮": "open_mouth",
  "🙄": "rolling_eyes",
  "😆": "laughing",
  "🤣": "rofl",
  "😃": "smiley",
  "😅": "sweat_smile",
  "🙃": "upside_down_face",
  "🤨": "raised_eyebrow",
  "😏": "smirk",
  "😌": "relieved",
  "😔": "pensive",
  "😫": "tired_face",
  "😩": "weary",
  "😭": "sob",
  "😎": "sunglasses",
  "😱": "scream",
  "🤬": "rage",
  "💩": "poop",
  "💯": "100",
  "👑": "crown",
  "⭐": "star",
  "✨": "sparkles",
  "💎": "gem",
  "🤖": "robot_face",
  "👻": "ghost",
  "🖐️": "hand"
};

// Mapping of Mattermost emoji names to Unicode emoji
export const NAME_TO_EMOJI_MAP: Record<string, string> = Object.entries(EMOJI_NAME_MAP).reduce(
  (acc, [emoji, name]) => {
    acc[name] = emoji;
    return acc;
  },
  {} as Record<string, string>
);

// Common emoji reactions for quick access
export const COMMON_REACTIONS = [
  { emoji: "👍", name: "thumbsup" },
  { emoji: "👎", name: "thumbsdown" },
  { emoji: "❤️", name: "heart" },
  { emoji: "🎉", name: "tada" },
  { emoji: "😄", name: "smile" },
  { emoji: "🔥", name: "fire" },
  { emoji: "👀", name: "eyes" },
  { emoji: "👏", name: "clap" },
  { emoji: "🙏", name: "pray" },
  { emoji: "🚀", name: "rocket" },
  { emoji: "😂", name: "joy" },
  { emoji: "👋", name: "wave" }
];

// Categorized emoji reactions for a more complete emoji picker
export const EMOJI_CATEGORIES = {
  smileys: [
    { emoji: "😄", name: "smile" },
    { emoji: "😊", name: "slightly_smiling_face" },
    { emoji: "😂", name: "joy" },
    { emoji: "😍", name: "heart_eyes" },
    { emoji: "🙂", name: "slightly_smiling_face" },
    { emoji: "😉", name: "wink" },
    { emoji: "😎", name: "sunglasses" },
    { emoji: "😐", name: "neutral_face" },
    { emoji: "🙄", name: "rolling_eyes" },
    { emoji: "😕", name: "confused" },
    { emoji: "😢", name: "cry" }
  ],
  gestures: [
    { emoji: "👍", name: "thumbsup" },
    { emoji: "👎", name: "thumbsdown" },
    { emoji: "👏", name: "clap" },
    { emoji: "🙌", name: "raised_hands" },
    { emoji: "🙏", name: "pray" },
    { emoji: "👋", name: "wave" },
    { emoji: "✌️", name: "v" },
    { emoji: "👌", name: "ok_hand" },
    { emoji: "👀", name: "eyes" }
  ],
  objects: [
    { emoji: "❤️", name: "heart" },
    { emoji: "🎉", name: "tada" },
    { emoji: "🔥", name: "fire" },
    { emoji: "🚀", name: "rocket" },
    { emoji: "✅", name: "white_check_mark" },
    { emoji: "⭐", name: "star" },
    { emoji: "💯", name: "100" },
    { emoji: "💪", name: "muscle" }
  ]
};

/**
 * Gets the Mattermost emoji name for a Unicode emoji
 */
export function getEmojiName(emoji: string): string {
  return EMOJI_NAME_MAP[emoji] || emoji;
}

/**
 * Gets the Unicode emoji for a Mattermost emoji name
 */
export function getEmojiFromName(name: string): string {
  return NAME_TO_EMOJI_MAP[name] || name;
}

/**
 * Converts reactions object from API to a friendlier format with emoji characters
 */
export function processReactions(reactions?: Record<string, string[]>): Array<{
  name: string;
  emoji: string;
  count: number;
  userIds: string[];
}> {
  // Return empty array if no reactions
  if (!reactions || typeof reactions !== 'object') return [];

  // If reactions is empty object, return empty array
  if (Object.keys(reactions).length === 0) return [];

  console.debug('Processing reactions format: ', reactions);

  try {
    return Object.entries(reactions).map(([name, userIds]) => {
      // Ensure userIds is always an array
      const validUserIds = Array.isArray(userIds) ? userIds : [];
      
      return {
        name,
        emoji: getEmojiFromName(name) || name,
        count: validUserIds.length,
        userIds: validUserIds
      };
    })
    // Filter out any reactions with count of 0
    .filter(reaction => reaction.count > 0);
  } catch (error) {
    console.error('Error processing reactions: ', error);
    return [];
  }
}

/**
 * Check if a string is a valid emoji name
 * This is a simple check and doesn't guarantee the emoji exists in Mattermost
 */
export function isValidEmojiName(name: string): boolean {
  // Mattermost emoji names only allow alphanumeric characters, underscores, and hyphens
  return /^[a-zA-Z0-9_-]+$/.test(name);
}