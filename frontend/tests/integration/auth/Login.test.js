// tests/integration/auth/Login.test.js
import { render, screen } from "../../utils/i18n-test-wrapper";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../../../src/contexts/AuthContext";
import Login from "../../../src/pages/auth/Login";
import { waitFor } from "@testing-library/react";

// Mock du hook useAuth
jest.mock("../../../src/hooks/useAuth", () => ({
  useAuth: () => ({
    login: jest.fn().mockImplementation((email, password) => {
      if (email === "test@example.com" && password === "password123") {
        return Promise.resolve({ user: { id: 1, email } });
      }
      return Promise.reject(new Error("Identifiants incorrects"));
    }),
    error: null,
  }),
}));

// Mock de useNavigate
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

describe("Login Component", () => {
  const renderLogin = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>,
    );
  };

  test("should render login form", async () => {
    renderLogin();

    // Attendre que les traductions soient appliquées
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /connexion/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
  });
});
