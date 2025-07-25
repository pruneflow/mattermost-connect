import { useMemo, useCallback } from 'react';
import { findEmojiByName } from '../utils/emojiMartAdapter';

interface RecentEmoji {
  name: string;
  character: string;
}

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

interface UseRecentEmojisReturn {
  recentEmojis: RecentEmoji[];
  addRecentEmoji: (emojiName: string) => void;
}

export const useRecentEmojis = (maxCount: number = 5): UseRecentEmojisReturn => {
  const recentEmojis = useMemo(() => {
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
  }, [maxCount]);

  const addRecentEmoji = useCallback((emojiName: string) => {
    try {
      const stored = localStorage.getItem('emoji-mart.frequently');
      const frequently = stored ? JSON.parse(stored) : {};
      
      frequently[emojiName] = (frequently[emojiName] || 0) + 1;
      
      localStorage.setItem('emoji-mart.frequently', JSON.stringify(frequently));
    } catch (error) {
      console.error('Error adding recent emoji:', error);
    }
  }, []);

  return { recentEmojis, addRecentEmoji };
};