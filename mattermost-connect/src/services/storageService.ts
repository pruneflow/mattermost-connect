export const saveLastVisitedChannels = (lastVisitedChannels: Record<string, string>) => {
  try {
    localStorage.setItem('mattermostLastVisitedChannels', JSON.stringify(lastVisitedChannels));
  } catch (error) {
    console.warn('Failed to save last visited channels:', error);
  }
};

export const saveLastVisited = (lastVisited: { teamId: string; channelId: string } | null) => {
  try {
    if (lastVisited) {
      localStorage.setItem('mattermostLastVisited', JSON.stringify(lastVisited));
    }
  } catch (error) {
    console.warn('Failed to save last visited:', error);
  }
};

export const loadLastVisitedChannels = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem('mattermostLastVisitedChannels');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to load last visited channels:', error);
    return {};
  }
};

export const loadLastVisited = (): { teamId: string; channelId: string } | null => {
  try {
    const stored = localStorage.getItem('mattermostLastVisited');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load last visited:', error);
    return null;
  }
};