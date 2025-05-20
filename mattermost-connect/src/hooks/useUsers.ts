import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { User, UserStatus, UserStatusObject } from '../api/types';

// Cache global pour les utilisateurs
export const userCache: Record<string, User> = {};

// Requêtes en cours pour éviter les requêtes dupliquées
export const pendingRequests: Record<string, Promise<User>> = {};

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
 * Récupère un utilisateur par son ID - garantie de 1 seul appel API par ID
 */
export async function getUser(userId: string): Promise<User> {
  // Si l'utilisateur est déjà dans le cache, le retourner immédiatement
  if (userCache[userId]) {
    return userCache[userId];
  }
  
  // Si une requête est déjà en cours, la réutiliser
  if (pendingRequests[userId]) {
    return pendingRequests[userId];
  }
  
  // Sinon, faire un appel API et mettre en cache le résultat
  const promise = api.get<User>(`users/${userId}`)
    .then(response => {
      const user = response.data;
      userCache[userId] = user;
      delete pendingRequests[userId];
      
      // Mettre à jour le localStorage pour assurer la synchronisation 
      try {
        const cachedUsersStr = localStorage.getItem('mattermost_cached_users') || '{}';
        const cachedUsers = JSON.parse(cachedUsersStr);
        cachedUsers[userId] = user;
        localStorage.setItem('mattermost_cached_users', JSON.stringify(cachedUsers));
      } catch (error) {
        console.error('Error updating localStorage user cache:', error);
      }
      
      return user;
    })
    .catch(error => {
      delete pendingRequests[userId];
      throw error;
    });
  
  // Stocker la promesse pour éviter les appels dupliqués
  pendingRequests[userId] = promise;
  
  return promise;
}

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
      
      // Mettre en cache tous les utilisateurs
      users.forEach(user => {
        userCache[user.id] = user;
      });
      
      // Mettre à jour le localStorage pour assurer la synchronisation avec d'autres composants
      try {
        const cachedUsersStr = localStorage.getItem('mattermost_cached_users') || '{}';
        const cachedUsers = JSON.parse(cachedUsersStr);
        
        // Ajouter les nouveaux utilisateurs au cache
        users.forEach(user => {
          cachedUsers[user.id] = user;
        });
        
        // Sauvegarder dans localStorage
        localStorage.setItem('mattermost_cached_users', JSON.stringify(cachedUsers));
      } catch (error) {
        console.error('Error updating localStorage user cache:', error);
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
      if (!userId) {
        throw new Error("User ID is required");
      }
      
      // Si l'utilisateur est déjà dans le cache, l'utiliser
      if (userCache[userId]) {
        return userCache[userId];
      }
      
      // Sinon, faire l'appel API
      return getUser(userId);
    },
    enabled,
  });

  // Fetch user status
  const statusQuery = useQuery({
    queryKey: userKeys.status(userId || ''),
    queryFn: async () => {
      if (!userId) return null;
      
      const response = await api.get<UserStatusObject>(`users/${userId}/status`);
      return response.data.status;
    },
    enabled,
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
      
      // Update cache
      if (response.data && response.data.id) {
        userCache[response.data.id] = response.data;
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