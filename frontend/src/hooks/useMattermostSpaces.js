import { useQuery } from "@tanstack/react-query";
import { mattermostSpacesService } from "../api/mattermost-spaces";

export const useMattermostSpaces = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["mattermostSpaces"],
    queryFn: async () => {
      try {
        return await mattermostSpacesService.getAll();
      } catch (error) {
        // S'assurer que l'erreur est correctement propagée
        throw error;
      }
    },
    staleTime: 60000,
    retry: 1,
  });

  return {
    spaces: data || [],
    isLoading,
    error, // S'assurer que l'erreur est correctement transmise
    refetch,
  };
};
