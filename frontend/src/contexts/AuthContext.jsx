import { createContext, useEffect, useState } from "react";
import { authService } from "../api/auth";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vérifier si l'utilisateur est connecté au chargement de l'application
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const token = localStorage.getItem("auth-token");
        if (token) {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        }
      } catch (err) {
        console.error(
          "Erreur lors de la vérification de l'authentification:",
          err,
        );
        localStorage.removeItem("auth-token");
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  // Fonction de connexion
  const login = async (email, password) => {
    try {
      setError(null);
      const data = await authService.login(email, password);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || "Erreur de connexion");
      throw err;
    }
  };

  // Fonction d'inscription
  const register = async (userData) => {
    try {
      setError(null);
      return await authService.register(userData);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur d'inscription");
      throw err;
    }
  };

  // Fonction de déconnexion
  const logout = () => {
    authService.logout();
    setUser(null);
  };

  // Fonction d'inscription avec connexion automatique
  const registerAndLogin = async (userData) => {
    try {
      setError(null);
      // Étape 1: Inscription de l'utilisateur
      await authService.register(userData);

      // Étape 2: Connexion automatique avec les identifiants fournis
      const loginData = await authService.login(
        userData.email,
        userData.password,
      );

      // Étape 3: Mise à jour de l'état utilisateur
      setUser(loginData.user);

      return loginData;
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription");
      throw err;
    }
  };

  const updateUser = (userData) => {
    // Mettre à jour l'état de l'utilisateur
    setUser((prev) => ({
      ...prev,
      ...userData,
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        registerAndLogin,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
