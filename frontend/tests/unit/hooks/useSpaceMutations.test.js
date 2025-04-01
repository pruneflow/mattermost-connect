// tests/unit/hooks/useSpaceMutations.test.js
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import useSpaceMutations from "../../../src/hooks/useSpaceMutations";
import { mattermostSpacesService } from "../../../src/api/mattermost-spaces";

// Mock des services
jest.mock("../../../src/api/mattermost-spaces");
// Mock de i18n
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, params) => {
      // Simuler la traduction
      if (key === "spaces.create.success")
        return "Nouvel espace créé avec succès";
      if (key === "spaces.create.error")
        return `Erreur lors de la création de l'espace: ${params.message}`;
      if (key === "spaces.update.success")
        return "Espace mis à jour avec succès";
      if (key === "spaces.update.error")
        return `Erreur lors de la mise à jour de l'espace: ${params.message}`;
      return key;
    },
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useSpaceMutations hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it("should create a space successfully", async () => {
    // Setup du mock pour simuler une création réussie
    const mockSpace = { id: 1, name: "New Space" };
    mattermostSpacesService.create.mockResolvedValue(mockSpace);

    // Mettre en place un espion pour queryClient.invalidateQueries
    const invalidateQueriesSpy = jest.spyOn(queryClient, "invalidateQueries");

    // Rendre le hook
    const { result } = renderHook(() => useSpaceMutations(), { wrapper });

    // Vérifier l'état initial
    expect(result.current.createMutation.isPending).toBe(false);
    expect(result.current.snackbar.open).toBe(false);

    // Exécuter la mutation
    await act(async () => {
      result.current.createMutation.mutate({ name: "New Space" });
    });

    // Vérifier que la mutation est terminée et le succès affiché
    expect(mattermostSpacesService.create).toHaveBeenCalledWith({
      name: "New Space",
    });
    expect(result.current.createMutation.isPending).toBe(false);
    expect(result.current.snackbar.open).toBe(true);
    expect(result.current.snackbar.message).toBe(
      "Nouvel espace créé avec succès",
    );
    expect(result.current.snackbar.severity).toBe("success");
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["mattermostSpaces"],
    });
  });

  it("should handle errors when creating a space", async () => {
    // Setup du mock pour simuler une erreur
    const mockError = new Error("Server error");
    mattermostSpacesService.create.mockRejectedValue(mockError);

    // Rendre le hook
    const { result } = renderHook(() => useSpaceMutations(), { wrapper });

    // Exécuter la mutation
    await act(async () => {
      result.current.createMutation.mutate({ name: "New Space" });
    });

    // Vérifier que l'erreur est affichée
    expect(mattermostSpacesService.create).toHaveBeenCalledWith({
      name: "New Space",
    });
    expect(result.current.createMutation.isPending).toBe(false);
    expect(result.current.snackbar.open).toBe(true);
    expect(result.current.snackbar.message).toBe(
      "Erreur lors de la création de l'espace: Server error",
    );
    expect(result.current.snackbar.severity).toBe("error");
  });

  // Ajoutez des tests similaires pour les autres mutations: update, delete, token
});
