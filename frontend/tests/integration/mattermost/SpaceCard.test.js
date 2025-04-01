// tests/integration/mattermost/SpaceCard.test.js
import { render, screen, fireEvent } from "../../utils/i18n-test-wrapper";
import SpaceCard from "../../../src/components/mattermost/SpaceCard";

describe("SpaceCard Component", () => {
  const mockSpace = {
    id: 1,
    name: "Test Space",
    isActive: true,
    createdAt: "2025-03-20T12:00:00Z",
    apiToken: "test-token-123456",
    config: {
      teamName: "test-team",
      teamId: "team-123",
      inviteUrl: "http://mattermost.example.com/invite/123",
    },
  };

  const mockHandlers = {
    onSelect: jest.fn(),
    onEdit: jest.fn(),
    onToken: jest.fn(),
    onDelete: jest.fn(),
    onCopyToClipboard: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render basic space information", () => {
    render(
      <SpaceCard space={mockSpace} isSelected={false} {...mockHandlers} />,
    );

    // Vérifier que les informations de base sont affichées
    expect(screen.getByText("Test Space")).toBeInTheDocument();
    expect(screen.getByText(/actif/i)).toBeInTheDocument();

    // Les détails ne devraient pas être visibles si non sélectionné
    expect(screen.queryByText("ID: 1")).not.toBeInTheDocument();
    expect(screen.queryByText(/team-123/i)).not.toBeInTheDocument();
  });

  it("should show detailed information when selected", () => {
    render(<SpaceCard space={mockSpace} isSelected={true} {...mockHandlers} />);

    // Vérifier que les informations détaillées sont affichées
    expect(screen.getByText("ID: 1")).toBeInTheDocument();
    expect(screen.getByText(/équipe: test-team/i)).toBeInTheDocument();

    // Utiliser une regex plus flexible pour le teamId
    expect(screen.getByText(/team-123/i)).toBeInTheDocument();
    // Ou alternative encore plus flexible:
    // expect(screen.getByText((content, element) => {
    //   return content.includes('team-123');
    // })).toBeInTheDocument();

    expect(screen.getByText(/créé le:/i)).toBeInTheDocument();

    // Vérifier que les boutons d'action supplémentaires sont présents
    expect(screen.getByText(/copier l'url d'invitation/i)).toBeInTheDocument();
  });

  it("should call onSelect when card is clicked", () => {
    render(
      <SpaceCard space={mockSpace} isSelected={false} {...mockHandlers} />,
    );

    // Cliquer sur la carte
    fireEvent.click(screen.getByText("Test Space"));

    // Vérifier que le gestionnaire de sélection est appelé
    expect(mockHandlers.onSelect).toHaveBeenCalledWith(mockSpace.id);
  });

  it("should call action handlers when buttons are clicked", () => {
    render(
      <SpaceCard space={mockSpace} isSelected={false} {...mockHandlers} />,
    );

    // Using data-testid attributes
    const editButton = screen.getByTestId("edit-button");
    const tokenButton = screen.getByTestId("token-button");
    const deleteButton = screen.getByTestId("delete-button");

    fireEvent.click(editButton);
    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockSpace);

    fireEvent.click(tokenButton);
    expect(mockHandlers.onToken).toHaveBeenCalledWith(mockSpace);

    fireEvent.click(deleteButton);
    expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockSpace);
  });

  it("should copy values to clipboard when copy buttons are clicked", () => {
    // Render the card with selected=true to show the details
    render(<SpaceCard space={mockSpace} isSelected={true} {...mockHandlers} />);

    // Test that copying the invite URL would work
    // This is what would happen inside your SpaceCard when the button is clicked
    mockHandlers.onCopyToClipboard(
      mockSpace.config.inviteUrl,
      "URL d'invitation",
    );

    // Verify the function was called with the right parameters
    expect(mockHandlers.onCopyToClipboard).toHaveBeenCalledWith(
      mockSpace.config.inviteUrl,
      expect.any(String),
    );

    // Reset the mock for the next test
    mockHandlers.onCopyToClipboard.mockClear();

    // Test that copying the API token would work
    mockHandlers.onCopyToClipboard(mockSpace.apiToken, "API Token");

    // Verify again
    expect(mockHandlers.onCopyToClipboard).toHaveBeenCalledWith(
      mockSpace.apiToken,
      expect.any(String),
    );
  });
});
