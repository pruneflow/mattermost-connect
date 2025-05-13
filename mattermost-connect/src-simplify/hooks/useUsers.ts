import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { User, UserStatus, UserStatusObject } from '../api/types';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  statuses: () => [...userKeys.all, 'status'] as const,
  status: (id: string) => [...userKeys.statuses(), id] as const,
};

/**
 * Hook for fetching multiple users by ID
 */
export function useUsers(userIds: string[] = []) {
  const enabled = userIds.length > 0;
  
  // Fetch users by ID with caching
  const usersQuery = useQuery({
    queryKey: userKeys.list({ ids: userIds }),
    queryFn: async () => {
      if (userIds.length === 0) {
        return [];
      }
      
      const response = await api.post<User[]>('users/ids', userIds);
      const users = response.data;
      
      // Store users in localStorage cache for quicker access
      try {
        // Get existing cached users
        const cachedUsersStr = localStorage.getItem('mattermost_cached_users') || '{}';
        const cachedUsers = JSON.parse(cachedUsersStr);
        
        // Update cache with new users
        let cacheUpdated = false;
        users.forEach(user => {
          if (!cachedUsers[user.id] || cachedUsers[user.id].update_at < user.update_at) {
            cachedUsers[user.id] = user;
            cacheUpdated = true;
          }
        });
        
        // Save updated cache
        if (cacheUpdated) {
          localStorage.setItem('mattermost_cached_users', JSON.stringify(cachedUsers));
        }
      } catch (error) {
        console.error('Error updating user cache:', error);
      }
      
      return users;
    },
    enabled,
  });

  // Fetch user statuses
  const statusesQuery = useQuery({
    queryKey: userKeys.statuses(),
    queryFn: async () => {
      if (userIds.length === 0) {
        return {};
      }
      
      const response = await api.post<UserStatusObject[]>('users/status/ids', userIds);
      
      // Convert to a map for easier lookup
      const statusMap: Record<string, UserStatus> = {};
      response.data.forEach(status => {
        statusMap[status.user_id] = status.status;
      });
      
      return statusMap;
    },
    enabled,
  });

  return {
    // Data
    users: usersQuery.data || [],
    statuses: statusesQuery.data || {},
    
    // Loading states
    isLoading: usersQuery.isLoading || statusesQuery.isLoading,
    isError: usersQuery.isError || statusesQuery.isError,
    error: usersQuery.error || statusesQuery.error,
    
    // Actions
    refetch: () => {
      usersQuery.refetch();
      statusesQuery.refetch();
    },
  };
}

/**
 * Hook for fetching a single user by ID
 */
export function useUser(userId: string | undefined) {
  const queryClient = useQueryClient();
  const enabled = !!userId;
  
  // Fetch user by ID with caching
  const userQuery = useQuery({
    queryKey: userKeys.detail(userId || ''),
    queryFn: async () => {
      // Try to get from cache first
      try {
        const cachedUsersStr = localStorage.getItem('mattermost_cached_users');
        if (cachedUsersStr && userId) {
          const cachedUsers = JSON.parse(cachedUsersStr);
          if (cachedUsers[userId]) {
            // Use cached user but still fetch fresh data
            setTimeout(() => {
              api.get<User>(`users/${userId}`).then(response => {
                // Update cache with fresh data
                const cachedUsers = JSON.parse(localStorage.getItem('mattermost_cached_users') || '{}');
                cachedUsers[userId] = response.data;
                localStorage.setItem('mattermost_cached_users', JSON.stringify(cachedUsers));
                
                // Update query cache
                queryClient.setQueryData(userKeys.detail(userId), response.data);
              }).catch(err => console.error(`Error refreshing user ${userId}:`, err));
            }, 100);
            
            return cachedUsers[userId];
          }
        }
      } catch (error) {
        console.error('Error reading from user cache:', error);
      }
      
      // Fetch from API if not in cache
      const response = await api.get<User>(`users/${userId}`);
      const user = response.data;
      
      // Update cache
      try {
        const cachedUsersStr = localStorage.getItem('mattermost_cached_users') || '{}';
        const cachedUsers = JSON.parse(cachedUsersStr);
        cachedUsers[user.id] = user;
        localStorage.setItem('mattermost_cached_users', JSON.stringify(cachedUsers));
      } catch (error) {
        console.error('Error updating user cache:', error);
      }
      
      return user;
    },
    enabled,
  });

  // Fetch user status avec optimisation pour éviter les appels répétés
  const statusQuery = useQuery({
    queryKey: userKeys.status(userId || ''),
    queryFn: async () => {
      console.log('🔎 Fetching initial status for user:', userId);
      
      // Vérifier d'abord si le statut est déjà dans le cache localStorage
      try {
        const cachedUsersStr = localStorage.getItem('mattermost_cached_users');
        if (cachedUsersStr && userId) {
          const cachedUsers = JSON.parse(cachedUsersStr);
          if (cachedUsers[userId] && cachedUsers[userId].status) {
            console.log('✅ Using cached status for user:', userId, '-', cachedUsers[userId].status);
            return cachedUsers[userId].status;
          }
        }
      } catch (error) {
        console.error('Error reading status from cache:', error);
      }
      
      // Si pas dans le cache, faire un appel API
      const response = await api.get<UserStatusObject>(`users/${userId}/status`);
      const status = response.data.status;
      
      // Mettre à jour le cache
      try {
        const cachedUsersStr = localStorage.getItem('mattermost_cached_users') || '{}';
        const cachedUsers = JSON.parse(cachedUsersStr);
        if (cachedUsers[userId || '']) {
          cachedUsers[userId || ''].status = status;
          localStorage.setItem('mattermost_cached_users', JSON.stringify(cachedUsers));
          console.log('✅ Cached initial status for user:', userId, '-', status);
        }
      } catch (error) {
        console.error('Error updating status in cache:', error);
      }
      
      return status;
    },
    enabled,
    // Ne pas rafraîchir automatiquement - les mises à jour se feront via WebSocket
    // refetchInterval: 30000,
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (updates: Partial<User>) => {
      if (!userId) {
        throw new Error('User ID is required to update a user');
      }
      
      let response;
      // Use different endpoint depending on whether it's the current user or not
      if (userId === 'me' || userId === queryClient.getQueryData<User>(['users', 'me'])?.id) {
        response = await api.put<User>('users/me/patch', updates);
      } else {
        // For other users, use the standard endpoint with user_id
        response = await api.put<User>(`users/${userId}`, {
          ...updates,
          user_id: userId,
        });
      }
      
      return response.data;
    },
    onSuccess: (updatedUser) => {
      // Update user in cache
      queryClient.setQueryData(
        userKeys.detail(updatedUser.id),
        updatedUser
      );
      
      // If the updated user is the current user, also update the me cache
      const currentUserId = queryClient.getQueryData<User>(['users', 'me'])?.id;
      if (updatedUser.id === currentUserId) {
        queryClient.setQueryData(['users', 'me'], updatedUser);
      }
    },
  });

  // Update user status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: UserStatus) => {
      if (!userId) {
        throw new Error('User ID is required to update status');
      }
      
      // Get the current user ID
      // First, try to get it from the current user in cache
      let effectiveUserId = userId;
      
      // If userId is 'me', we need to find the actual user ID
      if (userId === 'me') {
        const currentUser = queryClient.getQueryData<User>(['users', 'me']);
        if (currentUser?.id) {
          effectiveUserId = currentUser.id;
        }
      }
      
      // Make sure we have a valid user ID
      if (!effectiveUserId || effectiveUserId === 'me') {
        throw new Error('Valid user ID is required to update status');
      }
      
      // Use the PUT endpoint with correct format: /users/{user_id}/status
      const response = await api.put<UserStatusObject>(`users/${effectiveUserId}/status`, {
        user_id: effectiveUserId,
        status,
      });
      
      return response.data.status;
    },
    onSuccess: (newStatus, variables) => {
      // Get the effective user ID (resolving 'me' if needed)
      let effectiveUserId = userId;
      if (userId === 'me') {
        const currentUser = queryClient.getQueryData<User>(['users', 'me']);
        if (currentUser?.id) {
          effectiveUserId = currentUser.id;
        }
      }
      
      // Update status in all relevant caches
      if (effectiveUserId && effectiveUserId !== 'me') {
        // Update in the user's status cache
        queryClient.setQueryData(
          userKeys.status(effectiveUserId),
          newStatus
        );
      }
      
      // If this is the current user, update 'me' cache too
      const currentUserId = queryClient.getQueryData<User>(['users', 'me'])?.id;
      if (userId === 'me' || userId === currentUserId) {
        queryClient.setQueryData(
          userKeys.status('me'),
          newStatus
        );
      }
      
      // Also update the status in any status maps that might exist
      queryClient.setQueriesData(
        { queryKey: userKeys.statuses(), exact: false },
        (oldData: any) => {
          if (typeof oldData === 'object' && oldData !== null && effectiveUserId) {
            return {
              ...oldData,
              [effectiveUserId]: newStatus
            };
          }
          return oldData;
        }
      );
      
      // Invalidate queries to ensure UI updates
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: userKeys.status(effectiveUserId || '') });
        if (userId === 'me' || userId === currentUserId) {
          queryClient.invalidateQueries({ queryKey: userKeys.status('me') });
        }
      }, 500);
    },
  });

  return {
    // Data
    user: userQuery.data,
    status: statusQuery.data,
    
    // Loading states
    isLoading: userQuery.isLoading || statusQuery.isLoading,
    isError: userQuery.isError || statusQuery.isError,
    error: userQuery.error || statusQuery.error,
    
    // Actions
    updateUser: updateUserMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    refetch: () => {
      userQuery.refetch();
      statusQuery.refetch();
    },
    isUpdatingStatus: updateStatusMutation.isPending
  };
}