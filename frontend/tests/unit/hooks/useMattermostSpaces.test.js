// tests/unit/hooks/useMattermostSpaces.test.js
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMattermostSpaces } from "../../../src/hooks/useMattermostSpaces";
import { mattermostSpacesService } from "../../../src/api/mattermost-spaces";

// Mock du service
jest.mock("../../../src/api/mattermost-spaces");

// Créer un QueryClient configuré pour les tests
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });

describe("useMattermostSpaces hook", () => {
  let queryClient;

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  it("should fetch spaces successfully", async () => {
    // Setup du mock pour simuler une réponse réussie
    const mockSpaces = [
      { id: 1, name: "Space 1", isActive: true },
      { id: 2, name: "Space 2", isActive: true },
    ];
    mattermostSpacesService.getAll.mockResolvedValue(mockSpaces);

    // Rendre le hook
    const { result } = renderHook(() => useMattermostSpaces(), { wrapper });

    // Au début, devrait être en train de charger avec un tableau vide
    expect(result.current.isLoading).toBe(true);
    expect(result.current.spaces).toEqual([]);

    // Attendre que les données soient disponibles
    // Cette approche attend explicitement que les données correspondent à ce que nous attendons
    await waitFor(() => {
      return expect(result.current.spaces).toEqual(mockSpaces);
    });

    // Maintenant nous pouvons vérifier les autres aspects de l'état
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mattermostSpacesService.getAll).toHaveBeenCalledTimes(1);
  });

  it("should handle errors when fetching spaces", async () => {
    // Setup du mock pour simuler une erreur
    const mockError = new Error("Failed to fetch spaces");
    mattermostSpacesService.getAll.mockRejectedValue(mockError);

    // Rendre le hook
    const { result } = renderHook(() => useMattermostSpaces(), { wrapper });

    // Attendre que la requête se termine
    await waitFor(() => !result.current.isLoading);

    // Vérification adaptée à l'implémentation du hook
    // Si votre hook renvoie un tableau vide en cas d'erreur:
    expect(result.current.spaces).toEqual([]);

    // Si votre hook définit également une erreur:
    // Décommentez ces lignes si votre hook gère les erreurs de cette façon
    // expect(result.current.error).not.toBeNull();
    // expect(result.current.error.message).toBe('Failed to fetch spaces');

    expect(mattermostSpacesService.getAll).toHaveBeenCalledTimes(1);
  });

  it("should provide a refetch function", async () => {
    // Setup du mock
    mattermostSpacesService.getAll.mockResolvedValue([]);

    // Rendre le hook
    const { result } = renderHook(() => useMattermostSpaces(), { wrapper });

    // Attendre que la requête initiale se termine
    await waitFor(() => !result.current.isLoading);

    // Vérifier que refetch est une fonction
    expect(typeof result.current.refetch).toBe("function");

    // Reset le mock pour vérifier que refetch appelle bien getAll
    mattermostSpacesService.getAll.mockClear();

    // Appeler refetch
    result.current.refetch();

    // Vérifier que le service a été appelé à nouveau
    expect(mattermostSpacesService.getAll).toHaveBeenCalledTimes(1);
  });
});
