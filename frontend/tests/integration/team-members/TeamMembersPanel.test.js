// tests/integration/team-members/TeamMembersPanel.test.js
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TeamMembersPanel } from "../../../src/components/team-members";
import { useTeamMembers } from "../../../src/hooks/useTeamMembers";
import { useAuth } from "../../../src/hooks/useAuth";

// Mock des hooks
jest.mock("../../../src/hooks/useTeamMembers");
jest.mock("../../../src/hooks/useAuth");

// Mock de i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options) => {
      // Simple mock qui retourne la clé avec les options incorporées
      if (options) {
        let result = key;
        Object.keys(options).forEach((opt) => {
          result = result.replace(`{{${opt}}}`, options[opt]);
        });
        return result;
      }
      return key;
    },
  }),
}));

// Wrapper pour React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("TeamMembersPanel Component", () => {
  const mockSelectedSpace = {
    id: "space123",
    name: "Test Space",
    userId: "owner123",
  };

  const mockMembers = [
    {
      id: "user1",
      username: "user1",
      email: "user1@example.com",
      isAdmin: false,
    },
    {
      id: "user2",
      username: "user2",
      email: "user2@example.com",
      isAdmin: true,
    },
    {
      id: "owner123",
      username: "owner",
      email: "owner@example.com",
      isAdmin: true,
    },
  ];

  const mockUser = {
    id: "user1",
    email: "user1@example.com",
  };

  // Mock mutations
  const mockInviteMutation = {
    mutateAsync: jest.fn(),
    isPending: false,
  };

  const mockUpdateRoleMutation = {
    mutateAsync: jest.fn(),
    isPending: false,
  };

  const mockRemoveMemberMutation = {
    mutateAsync: jest.fn(),
    isPending: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Configuration par défaut du hook useTeamMembers
    useTeamMembers.mockReturnValue({
      members: mockMembers,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      inviteMutation: mockInviteMutation,
      updateRoleMutation: mockUpdateRoleMutation,
      removeMemberMutation: mockRemoveMemberMutation,
      snackbar: { open: false, message: "", severity: "success" },
      closeSnackbar: jest.fn(),
    });

    // Configuration par défaut du hook useAuth
    useAuth.mockReturnValue({
      user: mockUser,
    });
  });

  it("should display a message when no space is selected", () => {
    render(<TeamMembersPanel selectedSpace={null} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("members.selectSpace")).toBeInTheDocument();
  });

  it("should display the members list when a space is selected", () => {
    render(<TeamMembersPanel selectedSpace={mockSelectedSpace} />, {
      wrapper: createWrapper(),
    });

    // Vérifier le titre
    expect(screen.getByText("members.title")).toBeInTheDocument();

    // Vérifier le sous-titre avec le nom de l'espace
    expect(
      screen.getByText("members.subtitle", { exact: false }),
    ).toBeInTheDocument();

    // Vérifier le formulaire d'invitation
    expect(screen.getByText("members.invite.title")).toBeInTheDocument();

    // Vérifier la liste des membres
    expect(screen.getByText("members.currentMembers")).toBeInTheDocument();

    // Vérifier que les membres sont affichés
    expect(screen.getByText("user1")).toBeInTheDocument();
    expect(screen.getByText("user2")).toBeInTheDocument();
    expect(screen.getByText("owner")).toBeInTheDocument();
  });

  it("should handle member invitation", async () => {
    render(<TeamMembersPanel selectedSpace={mockSelectedSpace} />, {
      wrapper: createWrapper(),
    });

    // Simuler la saisie de l'email
    const emailInput = screen.getByLabelText("members.invite.emailLabel");
    fireEvent.change(emailInput, { target: { value: "new@example.com" } });

    // Simuler le clic sur le bouton d'invitation
    const inviteButton = screen.getByText("members.invite.button");
    fireEvent.click(inviteButton);

    // Vérifier que la mutation a été appelée avec le bon email
    await waitFor(() => {
      expect(mockInviteMutation.mutateAsync).toHaveBeenCalledWith(
        "new@example.com",
      );
    });
  });

  it("should handle role updates", async () => {
    render(<TeamMembersPanel selectedSpace={mockSelectedSpace} />, {
      wrapper: createWrapper(),
    });

    // Trouver tous les switchs (bascules)
    const switches = screen.getAllByRole("checkbox");

    // Simuler le changement de rôle pour le premier membre (user1)
    fireEvent.click(switches[0]);

    // Vérifier que la mutation a été appelée avec les bons arguments
    await waitFor(() => {
      expect(mockUpdateRoleMutation.mutateAsync).toHaveBeenCalledWith({
        userId: "user1",
        isAdmin: true,
      });
    });
  });

  it("should handle member removal", async () => {
    render(<TeamMembersPanel selectedSpace={mockSelectedSpace} />, {
      wrapper: createWrapper(),
    });

    // Trouver le bouton de suppression pour le premier membre (data-testid)
    const removeButtons = screen.getAllByTestId("remove-member-button");
    fireEvent.click(removeButtons[0]);

    // Vérifier que la boîte de dialogue de confirmation s'affiche
    expect(screen.getByText("members.remove.title")).toBeInTheDocument();

    // Confirmer la suppression
    const confirmButton = screen.getByText("members.remove.confirm");
    fireEvent.click(confirmButton);

    // Vérifier que la mutation a été appelée avec le bon ID utilisateur
    await waitFor(() => {
      expect(mockRemoveMemberMutation.mutateAsync).toHaveBeenCalledWith(
        "user1",
      );
    });
  });

  it("should display a loading state", () => {
    // Modifier le mock pour simuler un chargement
    useTeamMembers.mockReturnValueOnce({
      members: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
      inviteMutation: mockInviteMutation,
      updateRoleMutation: mockUpdateRoleMutation,
      removeMemberMutation: mockRemoveMemberMutation,
      snackbar: { open: false, message: "", severity: "success" },
      closeSnackbar: jest.fn(),
    });

    render(<TeamMembersPanel selectedSpace={mockSelectedSpace} />, {
      wrapper: createWrapper(),
    });

    // Vérifier la présence de l'indicateur de chargement
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should display an error state and allow retry", async () => {
    const mockError = new Error("Test error");
    const mockRefetch = jest.fn();

    // Modifier le mock pour simuler une erreur
    useTeamMembers.mockReturnValueOnce({
      members: [],
      isLoading: false,
      error: mockError,
      refetch: mockRefetch,
      inviteMutation: mockInviteMutation,
      updateRoleMutation: mockUpdateRoleMutation,
      removeMemberMutation: mockRemoveMemberMutation,
      snackbar: { open: false, message: "", severity: "success" },
      closeSnackbar: jest.fn(),
    });

    render(<TeamMembersPanel selectedSpace={mockSelectedSpace} />, {
      wrapper: createWrapper(),
    });

    // Vérifier la présence du message d'erreur
    expect(
      screen.getByText("common.error", { exact: false }),
    ).toBeInTheDocument();

    // Cliquer sur le bouton de réessai
    const retryButton = screen.getByText("common.retry");
    fireEvent.click(retryButton);

    // Vérifier que la fonction de réessai a été appelée
    expect(mockRefetch).toHaveBeenCalled();
  });
});
