import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import { User, UserStatus, UserStatusObject } from '../api/types';
import { userCache as userCacheService } from '../api/userCache';

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
 * Récupère un utilisateur par son ID - BATCH AUTOMATIQUE avec debounce
 * Utilise le nouveau système de queue pour batching intelligent
 * @returns User ou null si l'utilisateur n'est pas trouvé ou en cas d'erreur
 */
export async function getUser(userId: string): Promise<User | null> {
  return userCacheService.queueUserForBatch(userId);
}

/**
 * Récupère le statut d'un utilisateur par son ID - BATCH AUTOMATIQUE avec debounce
 * Utilise le nouveau système de queue pour batching intelligent
 * @returns UserStatus ou 'offline' par défaut
 */
export async function getUserStatus(userId: string): Promise<UserStatus> {
  return userCacheService.queueStatusForBatch(userId);
}

/**
 * Hook for fetching multiple users by ID - UTILISE LE NOUVEAU SYSTÈME DE BATCH
 * Plus d'appels individuels, tout passe par le système de queue intelligent
 */
export function useUsers(userIds: string[] = []) {
  const enabled = userIds.length > 0;
  
  // Fetch users par le système de queue (batching automatique)
  const usersQuery = useQuery({
    queryKey: userKeys.list({ ids: userIds.sort().join(',') }), // Clé stable basée sur les IDs triés
    queryFn: async () => {
      if (userIds.length === 0) {
        return [];
      }
      
      try {
        // NOUVEAU: Utiliser le système de queue pour chaque user
        // Cela déclenchera automatiquement un batch après 100ms
        const userPromises = userIds.map(userId => userCacheService.queueUserForBatch(userId));
        const users = await Promise.all(userPromises);
        
        // Filtrer les nulls et retourner seulement les users trouvés
        return users.filter((user): user is User => user !== null);
      } catch (error) {
        console.error('Error fetching users via batch system:', error);
        return [];
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - les données user changent peu souvent
  });

  // Fetch user statuses par le système de queue
  const statusesQuery = useQuery({
    queryKey: userKeys.list({ statusIds: userIds.sort().join(',') }),
    queryFn: async () => {
      if (userIds.length === 0) {
        return {};
      }
      
      try {
        // NOUVEAU: Utiliser le système de queue pour chaque status
        const statusPromises = userIds.map(userId => userCacheService.queueStatusForBatch(userId));
        const statuses = await Promise.all(statusPromises);
        
        // Convertir en map pour faciliter l'accès
        const statusMap: Record<string, UserStatus> = {};
        userIds.forEach((userId, index) => {
          statusMap[userId] = statuses[index];
        });
        
        return statusMap;
      } catch (error) {
        console.error('Error fetching statuses via batch system:', error);
        return {};
      }
    },
    enabled,
    staleTime: 30 * 1000, // 30 secondes - les statuts changent plus souvent
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
 * Hook for fetching a single user by ID - UTILISE LE SYSTÈME DE BATCH
 * Plus d'appels individuels, utilise le queue system intelligent
 */
export function useUser(userId: string | undefined) {
  const queryClient = useQueryClient();
  const enabled = !!userId;
  
  // Fetch user by ID via batch system
  const userQuery = useQuery<User | null>({
    queryKey: userKeys.detail(userId || ''),
    queryFn: async () => {
      if (!userId) {
        return null;
      }
      
      try {
        // NOUVEAU: Utiliser le système de queue (batching automatique)
        const user = await getUser(userId);
        return user;
      } catch (error) {
        console.warn(`Error in userQuery for ${userId}:`, error);
        return null;
      }
    },
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch user status via batch system
  const statusQuery = useQuery<UserStatus>({
    queryKey: userKeys.status(userId || ''),
    queryFn: async () => {
      if (!userId) return 'offline';
      
      try {
        // NOUVEAU: Utiliser le système de queue (batching automatique)
        const status = await getUserStatus(userId);
        return status;
      } catch (error) {
        console.warn(`Error fetching status for user ${userId}, defaulting to offline:`, error);
        return 'offline' as UserStatus;
      }
    },
    enabled,
    retry: false,
    staleTime: 30 * 1000, // 30 secondes
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (updates: Partial<User>) => {
      if (!userId) {
        console.warn('User ID is required to update a user');
        return null;
      }
      
      try {
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
        
        // Update cache via service
        if (response.data && response.data.id) {
          userCacheService.setUser(response.data.id, response.data);
        }
        
        return response.data;
      } catch (error) {
        // Ne pas propager les erreurs
        console.error(`Error updating user ${userId}:`, error);
        return null;
      }
    },
    onSuccess: (updatedUser) => {
      // Update user in cache only if update was successful
      if (updatedUser) {
        queryClient.setQueryData(
          userKeys.detail(updatedUser.id),
          updatedUser
        );
        
        // If the updated user is the current user, also update the me cache
        const currentUserId = queryClient.getQueryData<User>(['users', 'me'])?.id;
        if (updatedUser.id === currentUserId) {
          queryClient.setQueryData(['users', 'me'], updatedUser);
        }
      }
    },
  });

  // Update user status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: UserStatus) => {
      if (!userId) {
        console.warn('User ID is required to update status');
        return null;
      }
      
      try {
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
          console.warn('Valid user ID is required to update status');
          return null;
        }
        
        // Use the PUT endpoint with correct format: /users/{user_id}/status
        const response = await api.put<UserStatusObject>(`users/${effectiveUserId}/status`, {
          user_id: effectiveUserId,
          status,
        });
        
        return response.data.status;
      } catch (error) {
        // Ne pas propager les erreurs
        console.error(`Error updating status for user ${userId}:`, error);
        return null;
      }
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