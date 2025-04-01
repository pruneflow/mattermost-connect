// tests/unit/hooks/useAuth.test.js
import { renderHook } from "@testing-library/react";
import { AuthProvider } from "../../../src/contexts/AuthContext";
import { useAuth } from "../../../src/hooks/useAuth";

// Mock du service d'authentification
jest.mock("../../../src/api/auth", () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    getCurrentUser: jest.fn(),
    logout: jest.fn(),
  },
}));

describe("useAuth hook", () => {
  it("should throw error when used outside of AuthProvider", () => {
    // Capturer l'erreur avant qu'elle ne soit levée
    let error;
    try {
      renderHook(() => useAuth());
    } catch (e) {
      error = e;
    }

    // Vérifier que l'erreur est correcte
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(
      "useAuth doit être utilisé à l'intérieur d'un AuthProvider",
    );
  });

  it("should provide authentication context when used within AuthProvider", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current).toHaveProperty("user");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("login");
    expect(result.current).toHaveProperty("register");
    expect(result.current).toHaveProperty("registerAndLogin");
    expect(result.current).toHaveProperty("logout");
  });
});
