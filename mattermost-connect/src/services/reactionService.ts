import { store } from '../store';
import { toggleReaction } from '../store/slices/postsSlice';
import { findEmojiByName } from '../utils/emojiMartAdapter';

interface RecentEmoji {
  name: string;
  character: string;
}

export const toggleReactionOnPost = async (postId: string, emojiName: string): Promise<boolean> => {
  try {
    await store.dispatch(toggleReaction({ postId, emojiName })).unwrap();
    return true;
  } catch (error) {
    console.error('Failed to toggle reaction:', error);
    throw error;
  }
};

// Recent emojis functions
const createEmojiFromName = (name: string): RecentEmoji => {
  const emojiData = findEmojiByName(name);
  return {
    name,
    character: emojiData?.emoji || '😊',
  };
};

const getDefaultEmojis = (): RecentEmoji[] => {
  const defaultEmojis = ['+1', 'heart', 'laughing', 'tada', 'fire'];
  return defaultEmojis.map(createEmojiFromName);
};

export const getRecentEmojis = (maxCount: number = 5): RecentEmoji[] => {
  try {
    const stored = localStorage.getItem('emoji-mart.frequently');
    if (!stored) {
      return getDefaultEmojis();
    }

    const frequently = JSON.parse(stored);
    return Object.entries(frequently)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, maxCount)
      .map(([name]) => createEmojiFromName(name));
  } catch (error) {
    console.error('Error parsing recent emojis:', error);
    return getDefaultEmojis();
  }
};

export const addRecentEmoji = (emojiName: string): void => {
  try {
    const stored = localStorage.getItem('emoji-mart.frequently');
    const frequently = stored ? JSON.parse(stored) : {};
    
    frequently[emojiName] = (frequently[emojiName] || 0) + 1;
    
    localStorage.setItem('emoji-mart.frequently', JSON.stringify(frequently));
  } catch (error) {
    console.error('Error adding recent emoji:', error);
  }
};