import axios from "axios";

// Créer une instance axios avec la configuration de base
const api = axios.create({
  baseURL: "http://localhost:3030/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercepteur pour ajouter le token JWT à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Au lieu d'une redirection forcée, distinguer le cas d'une tentative de connexion
      const isLoginRequest = error.config.url.includes("/authentication");

      if (!isLoginRequest) {
        // Seulement rediriger si ce n'est pas déjà une tentative de connexion
        localStorage.removeItem("auth-token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
