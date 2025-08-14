export interface ParsedUrl {
  teamName?: string;
  channelName?: string;
  postId?: string;
  isRoot: boolean;
  isTeamRoot: boolean;
}

export const parseUrl = (url: string): ParsedUrl => {
  const path = url.replace(/^\//, '');
  const parts = path.split('/').filter(Boolean);
  
  if (parts.length === 0) {
    return { isRoot: true, isTeamRoot: false };
  }
  
  const teamName = parts[0];
  const channelName = parts[1];
  const postId = parts[2];
  
  return {
    teamName,
    channelName,
    postId,
    isRoot: false,
    isTeamRoot: !channelName,
  };
};

export const buildUrl = (teamName?: string, channelName?: string, postId?: string): string => {
  let url = '/';
  
  if (teamName) {
    url += teamName;
    
    if (channelName) {
      url += `/${channelName}`;
      
      if (postId) {
        url += `/${postId}`;
      }
    }
  }
  
  return url;
};

export const getCurrentLocation = (currentUrl: string): ParsedUrl => {
  return parseUrl(currentUrl);
};

export const isAtTeam = (currentUrl: string, teamName: string): boolean => {
  const location = getCurrentLocation(currentUrl);
  return location.teamName === teamName;
};

export const isAtChannel = (currentUrl: string, teamName: string, channelName: string): boolean => {
  const location = getCurrentLocation(currentUrl);
  return location.teamName === teamName && location.channelName === channelName;
};