import api from "./api";

export const authService = {
  // Connexion utilisateur
  login: async (email, password) => {
    try {
      const response = await api.post("/authentication", {
        strategy: "local",
        email,
        password,
      });

      // Stocker le token dans le localStorage
      localStorage.setItem("auth-token", response.data.accessToken);

      // Si la réponse ne contient pas l'utilisateur, le récupérer
      if (!response.data.user) {
        const userResponse = await api.get("/users/current");
        response.data.user = userResponse.data;
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Inscription utilisateur
  register: async (userData) => {
    try {
      const response = await api.post("/users", userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Récupérer les informations de l'utilisateur connecté
  getCurrentUser: async () => {
    try {
      const response = await api.get("/users/current");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Déconnexion utilisateur
  logout: () => {
    localStorage.removeItem("auth-token");
  },
};
