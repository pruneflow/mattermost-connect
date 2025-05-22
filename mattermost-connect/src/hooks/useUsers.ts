import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
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
 * @returns User ou null si l'utilisateur n'est pas trouvé ou en cas d'erreur
 */
export async function getUser(userId: string): Promise<User | null> {
  // Si l'utilisateur est déjà dans le cache, le retourner immédiatement
  if (userCache[userId]) {
    return userCache[userId];
  }
  
  // Si une requête est déjà en cours, la réutiliser
  if (pendingRequests[userId]) {
    try {
      return await pendingRequests[userId];
    } catch (error) {
      // En cas d'erreur sur une requête en cours, on continue en ignorant l'erreur
      console.warn(`Error on pending request for user ${userId}:`, error);
      return null;
    }
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
      
      // Gérer les erreurs spécifiquement plutôt que de les propager
      if (error instanceof ApiError) {
        if (error.status === 404) {
          console.warn(`User ${userId} not found, returning null`);
        } else {
          console.error(`Error fetching user ${userId}:`, error);
        }
      } else {
        console.error(`Unexpected error fetching user ${userId}:`, error);
      }
      
      // Retourner null au lieu de propager l'erreur
      return null;
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
      
      try {
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
      } catch (error) {
        // Capturer les erreurs et retourner un tableau vide plutôt que de propager
        console.error('Error fetching users by IDs:', error);
        return [];
      }
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
        // Retourner null plutôt que de lancer une exception
        console.warn("User ID is required but was not provided");
        return null;
      }
      
      // Si l'utilisateur est déjà dans le cache, l'utiliser
      if (userCache[userId]) {
        return userCache[userId];
      }
      
      try {
        // Sinon, faire l'appel API
        const user = await getUser(userId);
        
        // Retourner l'utilisateur ou null (jamais d'erreur)
        return user || null;
      } catch (error) {
        // Double protection contre les erreurs
        if (error instanceof ApiError && error.status === 404) {
          console.warn(`User ${userId} not found, returning null`);
        } else {
          console.warn(`Error in userQuery for ${userId}:`, error);
        }
        return null;
      }
    },
    enabled,
    // Gérer les erreurs sans arrêter l'application
    retry: false,
    // Ne pas invalider le cache si l'erreur est simplement que l'utilisateur n'existe pas
    gcTime: 1000 * 60 * 5, // 5 minutes
    // Ne jamais considérer une réponse null comme une erreur
    useErrorBoundary: false
  });

  // Fetch user status
  const statusQuery = useQuery({
    queryKey: userKeys.status(userId || ''),
    queryFn: async () => {
      if (!userId) return null;
      
      try {
        const response = await api.get<UserStatusObject>(`users/${userId}/status`);
        return response.data.status;
      } catch (error) {
        // En cas d'erreur, retourner 'offline' plutôt que de propager l'erreur
        console.warn(`Error fetching status for user ${userId}, defaulting to offline:`, error);
        return 'offline' as UserStatus;
      }
    },
    enabled,
    // Toujours retourner une valeur, donc pas besoin de gérer les erreurs
    retry: false,
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
        
        // Update cache
        if (response.data && response.data.id) {
          userCache[response.data.id] = response.data;
        }
        
        return response.data;
      } catch (error) {
        // Ne pas propager les erreurs
        console.error(`Error updating user ${userId}:`, error);
        return null;
      }
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