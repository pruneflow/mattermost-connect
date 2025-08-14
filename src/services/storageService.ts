export const saveLastVisitedChannels = (lastVisitedChannels: Record<string, string>) => {
  try {
    localStorage.setItem('mattermostLastVisitedChannels', JSON.stringify(lastVisitedChannels));
  } catch (error) {
  }
};

export const saveLastVisited = (lastVisited: { teamId: string; channelId: string } | null) => {
  try {
    if (lastVisited) {
      localStorage.setItem('mattermostLastVisited', JSON.stringify(lastVisited));
    }
  } catch (error) {
  }
};

export const loadLastVisitedChannels = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem('mattermostLastVisitedChannels');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    return {};
  }
};

export const loadLastVisited = (): { teamId: string; channelId: string } | null => {
  try {
    const stored = localStorage.getItem('mattermostLastVisited');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
};