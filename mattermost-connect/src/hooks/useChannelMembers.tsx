// src/hooks/useChannelMembers.ts
/**
 * Hook spécialisé pour la gestion des membres d'un canal
 */
import { useCallback, useState, useEffect } from "react";
import { useUsers } from "./useUsers";
import { getServices } from "../core/services";

interface ChannelMember {
  user_id: string;
  roles: string;
  last_viewed_at?: number;
  msg_count?: number;
  mention_count?: number;
}

interface UseChannelMembersReturnType {
  members: User[];
  isLoading: boolean;
  error: Error | null;
  loadMembers: (channelId: string) => Promise<User[]>;
}

export function useChannelMembers(): UseChannelMembersReturnType {
  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { apiClient } = getServices();
  const { usersById, getUsers } = useUsers();

  // Charger les membres d'un canal
  const loadMembers = useCallback(
    async (channelId: string) => {
      if (!channelId) {
        return [];
      }

      setIsLoading(true);
      setError(null);

      try {
        // Récupérer les membres du canal
        const response = await apiClient.get<ChannelMember[]>(
          `channels/${channelId}/members`,
        );
        const channelMembers = response.data;

        // Extraire les IDs des utilisateurs
        const userIds = channelMembers.map((member) => member.user_id);

        // Récupérer les informations des utilisateurs
        const users = await getUsers({ userIds });

        setMembers(users);
        return users;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [apiClient, getUsers],
  );

  return {
    members,
    isLoading,
    error,
    loadMembers,
  };
}
