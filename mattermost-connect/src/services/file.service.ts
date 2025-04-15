// src/services/file.service.ts
import { MattermostService } from "../types";

/**
 * Interface du service de fichiers
 */
export interface FileService {
  /**
   * Télécharge un fichier en utilisant son ID
   * @param fileId - ID du fichier à télécharger
   * @returns Promise void
   */
  downloadFile: (fileId: string) => Promise<void>;

  /**
   * Crée un lien public pour un fichier
   * @param fileId - ID du fichier
   * @returns URL du lien public
   */
  createPublicLink: (fileId: string) => Promise<string>;

  /**
   * Récupère l'image miniature de manière sécurisée avec l'authentification appropriée
   * @param fileId - ID du fichier
   * @returns Promise avec URL blob pour l'image miniature
   */
  fetchThumbnail: (fileId: string) => Promise<string>;

  /**
   * Récupère le fichier de manière sécurisée avec l'authentification appropriée
   * @param fileId - ID du fichier
   * @returns Promise avec URL blob pour le fichier
   */
  fetchFile: (fileId: string) => Promise<string>;

  /**
   * Vérifie si le service est authentifié
   * @returns true si authentifié, false sinon
   */
  isAuthenticated: () => boolean;

  /**
   * Gère une erreur d'authentification et tente une réauthentification
   * @returns Promise boolean - true si réauthentifié avec succès
   */
  handleAuthError: () => Promise<boolean>;

  /**
   * Ajoute un écouteur pour les changements d'état d'authentification
   * @param listener - Fonction à appeler lors d'un changement d'état
   * @returns Fonction pour supprimer l'écouteur
   */
  addAuthStateListener: (
    listener: (isAuthenticated: boolean) => void,
  ) => () => void;

  /**
   * Libère une URL blob précédemment créée
   * @param url - URL blob à libérer
   */
  revokeObjectURL: (url: string) => void;
}

/**
 * Implémentation du service de fichiers
 */
class FileServiceImpl implements FileService {
  private service: MattermostService;
  private authErrorCount: number = 0;
  private isReauthenticating: boolean = false;
  private readonly MAX_AUTH_RETRIES: number = 3;
  private authListeners: Array<(isAuthenticated: boolean) => void> = [];
  private blobCache: Map<string, string> = new Map(); // Cache pour les URLs blob

  constructor(service: MattermostService) {
    this.service = service;
  }

  /**
   * Ajoute un écouteur pour les changements d'état d'authentification
   */
  public addAuthStateListener(
    listener: (isAuthenticated: boolean) => void,
  ): () => void {
    this.authListeners.push(listener);
    return () => {
      this.authListeners = this.authListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notifie tous les écouteurs d'un changement d'état d'authentification
   */
  private notifyAuthStateChange(isAuthenticated: boolean): void {
    this.authListeners.forEach((listener) => listener(isAuthenticated));
  }

  /**
   * Vérifie si le service est authentifié
   */
  public isAuthenticated(): boolean {
    // Vérifie si un token est disponible (méthode simple)
    if (this.service.mode === "direct") {
      return !!(this.service as any).token;
    }
    return true; // En mode proxy, on suppose toujours authentifié
  }

  /**
   * Libère une URL blob précédemment créée
   */
  public revokeObjectURL(url: string): void {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);

      // Retirer du cache si présent
      for (const [key, value] of this.blobCache.entries()) {
        if (value === url) {
          this.blobCache.delete(key);
          break;
        }
      }
    }
  }

  /**
   * Gère une erreur d'authentification et tente une réauthentification
   */
  public async handleAuthError(): Promise<boolean> {
    // Éviter les tentatives multiples simultanées
    if (this.isReauthenticating) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isReauthenticating) {
            clearInterval(checkInterval);
            resolve(this.isAuthenticated());
          }
        }, 500);
      });
    }

    this.isReauthenticating = true;
    this.authErrorCount++;

    try {
      // Si trop de tentatives échouées, abandonner
      if (this.authErrorCount > this.MAX_AUTH_RETRIES) {
        console.error("Trop de tentatives de réauthentification échouées");
        this.notifyAuthStateChange(false);
        return false;
      }

      console.log("Tentative de réauthentification...");

      // Différentes stratégies selon le mode du service
      if (
        this.service.mode === "direct" &&
        typeof (this.service as any).refreshCurrentUser === "function"
      ) {
        // Si le service a une méthode pour rafraîchir l'utilisateur, l'utiliser
        await (this.service as any).refreshCurrentUser();
        this.notifyAuthStateChange(true);
        this.authErrorCount = 0;

        // Vider le cache après réauthentification
        this.clearBlobCache();

        return true;
      } else if (this.service.mode === "proxy") {
        // En mode proxy, essayer de rafraîchir via l'API proxy
        // Implémentation à adapter selon votre API proxy
        console.log("Réauthentification en mode proxy non implémentée");
        return false;
      }

      // Si aucune méthode de réauthentification n'est disponible
      console.warn("Aucune méthode de réauthentification disponible");
      return false;
    } catch (error) {
      console.error("Erreur lors de la réauthentification:", error);
      return false;
    } finally {
      this.isReauthenticating = false;
    }
  }

  /**
   * Vide le cache des URLs blob
   */
  private clearBlobCache(): void {
    // Libérer toutes les URLs blob
    for (const blobUrl of this.blobCache.values()) {
      URL.revokeObjectURL(blobUrl);
    }
    this.blobCache.clear();
  }

  /**
   * Exécute une fonction avec gestion des erreurs d'authentification
   */
  private async executeWithAuthRetry<T>(
    operation: () => Promise<T>,
    retryCount: number = 0,
  ): Promise<T> {
    const MAX_RETRIES = 2;

    try {
      return await operation();
    } catch (error) {
      // Détecter les erreurs d'authentification
      if (
        error instanceof Error &&
        (error.message.includes("401") ||
          error.message.includes("unauthorized") ||
          error.message.includes("session invalide") ||
          error.message.includes("invalid session")) &&
        retryCount < MAX_RETRIES
      ) {
        console.log(
          "Erreur d'authentification détectée, tentative de récupération...",
        );

        // Tenter une réauthentification
        const reauthSuccess = await this.handleAuthError();

        if (reauthSuccess) {
          console.log(
            "Réauthentification réussie, nouvelle tentative de l'opération",
          );
          // Réessayer l'opération
          return this.executeWithAuthRetry(operation, retryCount + 1);
        }
      }

      // Propager l'erreur si on ne peut pas récupérer
      throw error;
    }
  }

  /**
   * Télécharge un fichier en utilisant son ID
   */
  public async downloadFile(fileId: string): Promise<void> {
    if (!fileId) {
      throw new Error("ID de fichier requis pour le téléchargement");
    }

    return this.executeWithAuthRetry(async () => {
      const baseUrl = this.service.getBaseUrl();
      let url: string;

      // Pour le mode direct, on utilise une approche sécurisée avec fetch pour ajouter l'en-tête d'autorisation
      if (this.service.mode === "direct") {
        url = `${baseUrl}/api/v4/files/${fileId}`;
        const token = (this.service as any).token;

        if (!token) {
          throw new Error("Token requis pour le téléchargement");
        }

        // Faire une requête avec l'en-tête d'autorisation
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(
            `Erreur lors du téléchargement: ${response.status} ${response.statusText}`,
          );
        }

        // Récupérer le nom du fichier depuis les en-têtes de réponse
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = fileId;
        if (contentDisposition) {
          const filenameMatch = /filename="?([^"]*)"?/.exec(contentDisposition);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1];
          }
        }

        // Créer un blob et un lien de téléchargement
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();

        // Nettoyer
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }, 100);
      } else {
        // Mode proxy - plus simple car le proxy gère l'authentification
        url = `${baseUrl}/files/${fileId}`;

        const a = document.createElement("a");
        a.href = url;
        a.download = fileId;
        a.target = "_blank";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  }

  /**
   * Crée un lien public pour un fichier
   */
  public async createPublicLink(fileId: string): Promise<string> {
    if (!fileId) {
      throw new Error("ID de fichier requis pour créer un lien public");
    }

    return this.executeWithAuthRetry(async () => {
      try {
        const baseUrl = this.service.getBaseUrl();
        let url: string;

        if (this.service.mode === "direct") {
          url = `${baseUrl}/api/v4/files/${fileId}/link`;
          const token = (this.service as any).token;

          if (!token) {
            throw new Error("Token requis pour créer un lien public");
          }

          const response = await fetch(url, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(
              `Erreur lors de la création du lien public: ${response.status} ${response.statusText}`,
            );
          }

          const data = await response.json();
          return data.link;
        } else {
          // Mode proxy
          url = `${baseUrl}/files/${fileId}/link`;

          const response = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(
              `Erreur lors de la création du lien public: ${response.status} ${response.statusText}`,
            );
          }

          const data = await response.json();
          return data.link;
        }
      } catch (error) {
        console.error("Erreur lors de la création du lien public:", error);
        throw error;
      }
    });
  }

  /**
   * Récupère l'image miniature d'un fichier de manière sécurisée
   * Cette méthode utilise fetch avec l'en-tête d'autorisation approprié et renvoie une URL blob
   */
  public async fetchThumbnail(fileId: string): Promise<string> {
    if (!fileId) {
      throw new Error("ID de fichier requis pour récupérer la miniature");
    }

    // Vérifier si nous avons déjà cette miniature en cache
    const cacheKey = `thumbnail_${fileId}`;
    if (this.blobCache.has(cacheKey)) {
      return this.blobCache.get(cacheKey)!;
    }

    return this.executeWithAuthRetry(async () => {
      const baseUrl = this.service.getBaseUrl();

      if (this.service.mode === "direct") {
        const url = `${baseUrl}/api/v4/files/${fileId}/thumbnail`;
        const token = (this.service as any).token;

        if (!token) {
          throw new Error("Token requis pour récupérer la miniature");
        }

        // Effectuer la requête avec le bon en-tête d'autorisation
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(
            `Erreur lors de la récupération de la miniature: ${response.status}`,
          );
        }

        // Convertir la réponse en blob et créer une URL
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        // Mettre en cache l'URL blob
        this.blobCache.set(cacheKey, blobUrl);

        return blobUrl;
      } else {
        // Mode proxy - l'authentification est gérée par le proxy
        // Nous pouvons toujours utiliser fetch pour obtenir un contrôle similaire et profiter du cache
        const url = `${baseUrl}/files/${fileId}/thumbnail?_=${Date.now()}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Erreur lors de la récupération de la miniature: ${response.status}`,
          );
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        // Mettre en cache l'URL blob
        this.blobCache.set(cacheKey, blobUrl);

        return blobUrl;
      }
    });
  }

  /**
   * Récupère un fichier de manière sécurisée
   * Cette méthode utilise fetch avec l'en-tête d'autorisation approprié et renvoie une URL blob
   */
  public async fetchFile(fileId: string): Promise<string> {
    if (!fileId) {
      throw new Error("ID de fichier requis pour récupérer le fichier");
    }

    // Vérifier si nous avons déjà ce fichier en cache
    const cacheKey = `file_${fileId}`;
    if (this.blobCache.has(cacheKey)) {
      return this.blobCache.get(cacheKey)!;
    }

    return this.executeWithAuthRetry(async () => {
      const baseUrl = this.service.getBaseUrl();

      if (this.service.mode === "direct") {
        const url = `${baseUrl}/api/v4/files/${fileId}`;
        const token = (this.service as any).token;

        if (!token) {
          throw new Error("Token requis pour récupérer le fichier");
        }

        // Effectuer la requête avec le bon en-tête d'autorisation
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(
            `Erreur lors de la récupération du fichier: ${response.status}`,
          );
        }

        // Convertir la réponse en blob et créer une URL
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        // Mettre en cache l'URL blob
        this.blobCache.set(cacheKey, blobUrl);

        return blobUrl;
      } else {
        // Mode proxy
        const url = `${baseUrl}/files/${fileId}?_=${Date.now()}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Erreur lors de la récupération du fichier: ${response.status}`,
          );
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        // Mettre en cache l'URL blob
        this.blobCache.set(cacheKey, blobUrl);

        return blobUrl;
      }
    });
  }
}

/**
 * Crée un service de fichiers Mattermost
 * @param service - Instance du service Mattermost
 * @returns Service de fichiers
 */
export function createFileService(service: MattermostService): FileService {
  return new FileServiceImpl(service);
}
