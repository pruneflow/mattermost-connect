// tests/integration/mattermost/SpaceList.test.js
import { render, screen, waitFor } from "../../utils/i18n-test-wrapper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SpaceList } from "../../../src/components/mattermost";
import { useMattermostSpaces } from "../../../src/hooks/useMattermostSpaces";

// Mock du hook useMattermostSpaces
jest.mock("../../../src/hooks/useMattermostSpaces");
// Mock du hook useClipboard
jest.mock("../../../src/hooks/useClipboard", () => ({
  __esModule: true,
  default: () => ({
    snackbar: { open: false, message: "" },
    copyToClipboard: jest.fn(),
    closeSnackbar: jest.fn(),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (ui) => {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

describe("SpaceList Component", () => {
  const mockHandlers = {
    onAddClick: jest.fn(),
    onEditClick: jest.fn(),
    onTokenClick: jest.fn(),
    onDeleteClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should display loading state initially", async () => {
    // Configuration du mock pour simuler le chargement
    useMattermostSpaces.mockReturnValue({
      spaces: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    // Rendu du composant
    renderWithProviders(<SpaceList {...mockHandlers} />);

    // Vérifier que l'indicateur de chargement est affiché
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should display empty state when no spaces are available", async () => {
    // Configuration du mock pour simuler un résultat vide
    useMattermostSpaces.mockReturnValue({
      spaces: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    // Rendu du composant
    renderWithProviders(<SpaceList {...mockHandlers} />);

    // Vérifier que le message "aucun espace" est affiché
    await waitFor(() => {
      expect(
        screen.getByText(/vous n'avez pas encore d'espace mattermost/i),
      ).toBeInTheDocument();
    });

    // Vérifier que le bouton pour créer un premier espace est présent
    const createButton = screen.getByText(/créer votre premier espace/i);
    expect(createButton).toBeInTheDocument();

    // Vérifier que le gestionnaire d'événements est appelé correctement
    createButton.click();
    expect(mockHandlers.onAddClick).toHaveBeenCalledTimes(1);
  });

  it("should display spaces when available", async () => {
    // Configuration du mock avec des espaces
    const mockSpaces = [
      {
        id: 1,
        name: "Test Space 1",
        isActive: true,
        createdAt: "2025-03-20T12:00:00Z",
      },
      {
        id: 2,
        name: "Test Space 2",
        isActive: false,
        createdAt: "2025-03-21T12:00:00Z",
      },
    ];

    useMattermostSpaces.mockReturnValue({
      spaces: mockSpaces,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    // Rendu du composant
    const { container } = renderWithProviders(<SpaceList {...mockHandlers} />);

    // Vérifier que les espaces sont affichés par leur nom (qui est unique)
    await waitFor(() => {
      expect(screen.getByText("Test Space 1")).toBeInTheDocument();
      expect(screen.getByText("Test Space 2")).toBeInTheDocument();
    });

    // Vérifier que les éléments de la liste sont présents
    expect(screen.getAllByRole("listitem").length).toBe(2);

    // Vérifier que les deux types de status (actif/inactif) sont présents
    // sans se préoccuper du nombre exact d'occurrences
    expect(screen.getByText(/test space 1/i).closest("li")).toHaveTextContent(
      /actif/i,
    );
    expect(screen.getByText(/test space 2/i).closest("li")).toHaveTextContent(
      /inactif/i,
    );
  });

  it("should display error state when error occurs", async () => {
    // Configuration du mock pour simuler une erreur
    const mockError = new Error("Failed to load spaces");
    const mockRefetch = jest.fn();

    useMattermostSpaces.mockReturnValue({
      spaces: [],
      isLoading: false,
      error: mockError,
      refetch: mockRefetch,
    });

    // Rendu du composant
    renderWithProviders(<SpaceList {...mockHandlers} />);

    // Vérifier que l'erreur est affichée
    await waitFor(() => {
      expect(
        screen.getByText(/erreur lors du chargement/i),
      ).toBeInTheDocument();
    });

    // Vérifier que le bouton de réessai fonctionne
    const retryButton = screen.getByText(/réessayer/i);
    expect(retryButton).toBeInTheDocument();

    retryButton.click();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
