// Centralized query keys to avoid circular dependencies

export const messageKeys = {
  all: ["messages"] as const,
  lists: () => [...messageKeys.all, "list"] as const,
  list: (channelId: string) => [...messageKeys.lists(), { channelId }] as const,
  details: () => [...messageKeys.all, "detail"] as const,
  detail: (id: string) => [...messageKeys.details(), id] as const,
  infinite: (channelId: string) =>
    [...messageKeys.list(channelId), "infinite"] as const,
  thread: (messageId: string) =>
    [...messageKeys.all, "thread", messageId] as const,
};

export const channelKeys = {
  all: ['channels'] as const,
  lists: () => [...channelKeys.all, 'list'] as const,
  list: (teamId: string) => [...channelKeys.lists(), { teamId }] as const,
  details: () => [...channelKeys.all, 'detail'] as const,
  detail: (id: string) => [...channelKeys.details(), id] as const,
  members: (channelId: string) => [...channelKeys.detail(channelId), 'members'] as const,
};

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  status: (userId: string) => [...userKeys.detail(userId), 'status'] as const,
};

export const teamKeys = {
  all: ['teams'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...teamKeys.lists(), { filters }] as const,
  details: () => [...teamKeys.all, 'detail'] as const,
  detail: (id: string) => [...teamKeys.details(), id] as const,
};

export const unreadKeys = {
  all: ['unread'] as const,
  counts: () => [...unreadKeys.all, 'counts'] as const,
};