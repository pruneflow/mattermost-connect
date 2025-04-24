// src/core/services/auth.service.ts
/**
 * Service d'authentification centralisé
 * Gère la connexion, la déconnexion et la persistance du token
 */

import { ApiClient } from "../api/client";
import { Store } from "../store/store";

export interface User {
  id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  roles?: string;
  props?: Record<string, unknown>;
  last_picture_update?: number;
  update_at: any;
}

export interface AuthState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  token: string | null;
  currentUser: User | null;
  error: Error | null;
  serverUrl?: string;
}

export class AuthService {
  private apiClient: ApiClient;
  private store: Store<any>;
  private storageKey: string;
  private serverStorageKey: string;
  private useLocalStorage: boolean;

  constructor(
    apiClient: ApiClient,
    store: Store<any>,
    options: {
      useLocalStorage?: boolean;
      storageKey?: string;
      serverStorageKey?: string;
    } = {},
  ) {
    this.apiClient = apiClient;
    this.store = store;
    this.useLocalStorage = options.useLocalStorage ?? true;
    this.storageKey = options.storageKey ?? "mattermost_token";
    this.serverStorageKey = options.serverStorageKey ?? "mattermost_server";
  }

  /**
   * Vérifie s'il existe un token stocké
   */
  public hasStoredToken(): boolean {
    if (!this.useLocalStorage) {
      return false;
    }

    return !!localStorage.getItem(this.storageKey);
  }

  /**
   * Récupère le token stocké
   */
  public getStoredToken(): string | null {
    if (!this.useLocalStorage) {
      return null;
    }

    return localStorage.getItem(this.storageKey);
  }

  /**
   * Récupère l'URL du serveur stockée
   */
  public getStoredServerUrl(): string | null {
    if (!this.useLocalStorage) {
      return null;
    }

    return localStorage.getItem(this.serverStorageKey);
  }

  /**
   * Stocke le token et l'URL du serveur
   */
  private storeCredentials(token: string, serverUrl?: string): void {
    if (!this.useLocalStorage) {
      return;
    }

    localStorage.setItem(this.storageKey, token);

    if (serverUrl) {
      localStorage.setItem(this.serverStorageKey, serverUrl);
    }
  }

  /**
   * Supprime les credentials stockés
   */
  private clearStoredCredentials(): void {
    if (!this.useLocalStorage) {
      return;
    }

    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.serverStorageKey);
  }

  /**
   * Authentifie un utilisateur avec un nom d'utilisateur et un mot de passe
   */
  public async login(
    username: string,
    password: string,
  ): Promise<{ token: string; userId: string; serverUrl?: string }> {
    // Dispatch de l'action d'authentification en cours
    this.store.dispatch({
      type: "AUTH_LOGIN_REQUEST",
      payload: { username },
    });

    try {
      // Mode d'authentification selon le type du client API
      if (this.apiClient.getMode() === "direct") {
        // Authentification directe via l'API Mattermost
        const loginResponse = await this.apiClient.post("users/login", {
          login_id: username,
          password,
        });

        // Extraire le token de la réponse
        const token = loginResponse.headers["token"];
        const user = loginResponse.data as User;

        // Initialiser le client API avec le token
        this.apiClient.setToken(token);

        // Stocker le token
        if (this.useLocalStorage) {
          this.storeCredentials(token, this.apiClient.getBaseUrl());
        }

        // Dispatch de l'action de succès
        this.store.dispatch({
          type: "AUTH_LOGIN_SUCCESS",
          payload: {
            token,
            currentUser: user,
            userId: user.id,
            serverUrl: this.apiClient.getBaseUrl(),
          },
        });

        return {
          token,
          userId: user.id,
          serverUrl: this.apiClient.getBaseUrl(),
        };
      } else if (this.apiClient.getMode() === "proxy") {
        // Authentification via le proxy
        const response = await this.apiClient.post("auth/login", {
          username,
          password,
        });

        const { token, user_id } = response.data;

        // Initialiser le client API avec le token
        this.apiClient.setToken(token);
        if (user_id) {
          this.apiClient.setUserId(user_id);
        }

        // Récupérer les informations de l'utilisateur
        const userResponse = await this.apiClient.get("users/me");
        const currentUser = userResponse.data as User;

        // Stocker le token
        if (this.useLocalStorage) {
          this.storeCredentials(token, this.apiClient.getBaseUrl());
        }

        // Dispatch de l'action de succès
        this.store.dispatch({
          type: "AUTH_LOGIN_SUCCESS",
          payload: {
            token,
            currentUser,
            userId: currentUser.id,
            serverUrl: this.apiClient.getBaseUrl(),
          },
        });

        return {
          token,
          userId: currentUser.id,
          serverUrl: this.apiClient.getBaseUrl(),
        };
      } else {
        throw new Error("Unsupported API mode for authentication");
      }
    } catch (error) {
      // Dispatch de l'action d'erreur
      this.store.dispatch({
        type: "AUTH_LOGIN_ERROR",
        payload: { error, username },
      });

      throw error;
    }
  }

  /**
   * Déconnecte l'utilisateur
   */
  public logout(): void {
    // Supprimer le token stocké
    this.clearStoredCredentials();

    // Réinitialiser le client API
    this.apiClient.setToken(null);
    this.apiClient.setUserId(null);

    // Dispatch de l'action de déconnexion
    this.store.dispatch({
      type: "AUTH_LOGOUT",
    });
  }

  /**
   * Initialise l'authentification au démarrage
   */
  public async initializeAuth(): Promise<boolean> {
    if (!this.useLocalStorage) {
      return false;
    }

    // Vérifier s'il existe un token stocké
    const token = this.getStoredToken();
    const serverUrl = this.getStoredServerUrl();

    if (!token) {
      return false;
    }

    // Dispatch de l'action de vérification du token
    this.store.dispatch({
      type: "AUTH_VALIDATE_TOKEN_REQUEST",
    });

    try {
      // Initialiser le client API avec le token
      this.apiClient.setToken(token);

      // Récupérer les informations de l'utilisateur pour valider le token
      const response = await this.apiClient.get("users/me");
      const currentUser = response.data as User;

      // Mise à jour de l'ID utilisateur pour le client API
      this.apiClient.setUserId(currentUser.id);

      // Dispatch de l'action de succès
      this.store.dispatch({
        type: "AUTH_VALIDATE_TOKEN_SUCCESS",
        payload: {
          token,
          currentUser,
          userId: currentUser.id,
          serverUrl,
        },
      });

      return true;
    } catch (error) {
      // Si le token est invalide, le supprimer
      this.clearStoredCredentials();
      this.apiClient.setToken(null);

      // Dispatch de l'action d'erreur
      this.store.dispatch({
        type: "AUTH_VALIDATE_TOKEN_ERROR",
        payload: { error },
      });

      return false;
    }
  }

  /**
   * Récupère l'utilisateur courant
   */
  public async getCurrentUser(): Promise<User | null> {
    try {
      const response = await this.apiClient.get("users/me");
      const currentUser = response.data as User;

      // Mise à jour de l'ID utilisateur pour le client API
      this.apiClient.setUserId(currentUser.id);

      // Dispatch de l'action de mise à jour de l'utilisateur courant
      this.store.dispatch({
        type: "AUTH_SET_CURRENT_USER",
        payload: { currentUser },
      });

      return currentUser;
    } catch (error) {
      // Si l'erreur est liée à l'authentification, déconnecter l'utilisateur
      if ((error as any).status === 401) {
        this.logout();
      }

      return null;
    }
  }
}
