// src/services/file/file.service.ts (Refactored)
import { HttpClient } from "../http";
import { ErrorHandlerInterface } from "../error/error-handler";

/**
 * Interface pour le service de gestion des fichiers
 * Centralise toutes les opérations liées aux fichiers
 */
export interface FileServiceInterface {
  /**
   * Télécharge un fichier depuis le serveur
   * @param fileId ID du fichier à télécharger
   * @returns Promise qui se résout quand le téléchargement est terminé
   */
  downloadFile(fileId: string): Promise<void>;

  /**
   * Crée un lien public pour un fichier
   * @param fileId ID du fichier
   * @returns URL du lien public
   */
  createPublicLink(fileId: string): Promise<string>;

  /**
   * Récupère l'image miniature de manière sécurisée
   * @param fileId ID du fichier
   * @returns URL blob pour la miniature
   */
  fetchThumbnail(fileId: string): Promise<string>;

  /**
   * Récupère le fichier complet de manière sécurisée
   * @param fileId ID du fichier
   * @returns URL blob pour le fichier
   */
  fetchFile(fileId: string): Promise<string>;

  /**
   * Télécharge des fichiers sur le serveur
   * @param formData FormData contenant les fichiers
   * @returns Information sur les fichiers téléchargés
   */
  uploadFiles(formData: FormData): Promise<{
    file_infos: Array<{
      id: string;
      name: string;
      type?: string;
      size?: number;
      url?: string;
    }>;
  }>;

  /**
   * Libère une URL blob précédemment créée
   * @param url URL blob à libérer
   */
  revokeObjectURL(url: string): void;

  /**
   * Vérifie si le service est authentifié
   * @returns true si le service est authentifié
   */
  isAuthenticated(): boolean;
}

/**
 * Implémentation du service de gestion des fichiers
 */
export class FileService implements FileServiceInterface {
  private httpClient: HttpClient;
  private errorHandler: ErrorHandlerInterface;
  private blobUrlsRef: Set<string> = new Set<string>();
  private token: string | null = null;
  private tokenProvider?: () => string | null;
  private baseUrl: string;
  private mode: "direct" | "proxy" | "custom";

  /**
   * Crée une nouvelle instance du service de fichiers
   * @param httpClient Client HTTP pour les appels API
   * @param errorHandler Gestionnaire d'erreurs
   * @param baseUrl URL de base du serveur
   * @param mode Mode de fonctionnement (direct, proxy, custom)
   * @param tokenProvider Fonction fournissant le token d'authentification
   */
  constructor(
    httpClient: HttpClient,
    errorHandler: ErrorHandlerInterface,
    baseUrl: string,
    mode: "direct" | "proxy" | "custom",
    tokenProvider?: () => string | null,
  ) {
    this.httpClient = httpClient;
    this.errorHandler = errorHandler;
    this.baseUrl = baseUrl;
    this.mode = mode;
    this.tokenProvider = tokenProvider;
  }

  /**
   * Définit le token d'authentification
   * @param token Token d'authentification
   */
  setToken(token: string | null): void {
    this.token = token;
  }

  /**
   * Récupère le token courant via le tokenProvider ou le token stocké
   * @returns Token d'authentification
   */
  private getToken(): string | null {
    if (this.tokenProvider) {
      return this.tokenProvider();
    }
    return this.token;
  }

  /**
   * Vérifie si le service est authentifié
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Libère une URL blob précédemment créée
   */
  revokeObjectURL(url: string): void {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
      this.blobUrlsRef.delete(url);
    }
  }

  /**
   * Libère toutes les URLs blob créées par ce service
   * Utile pour nettoyer les ressources lors du démontage des composants
   */
  cleanup(): void {
    this.blobUrlsRef.forEach((url) => {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });
    this.blobUrlsRef.clear();
  }

  /**
   * Télécharge un fichier depuis le serveur
   */
  async downloadFile(fileId: string): Promise<void> {
    if (!fileId) {
      throw new Error("ID de fichier requis pour le téléchargement");
    }

    try {
      const token = this.getToken();
      if (this.mode === "direct" && !token) {
        throw new Error("Token requis pour le téléchargement en mode direct");
      }

      let url: string;
      if (this.mode === "direct") {
        url = `${this.baseUrl}/api/v4/files/${fileId}`;

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
        this.blobUrlsRef.add(blobUrl);

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();

        // Nettoyer
        setTimeout(() => {
          document.body.removeChild(a);
          this.revokeObjectURL(blobUrl);
        }, 100);
      } else {
        // Mode proxy - plus simple car le proxy gère l'authentification
        url = `${this.baseUrl}/files/${fileId}`;

        const a = document.createElement("a");
        a.href = url;
        a.download = fileId;
        a.target = "_blank";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(
        `Erreur lors du téléchargement du fichier ${fileId}:`,
        typedError,
      );
      throw typedError;
    }
  }

  /**
   * Crée un lien public pour un fichier
   */
  async createPublicLink(fileId: string): Promise<string> {
    if (!fileId) {
      throw new Error("ID de fichier requis pour créer un lien public");
    }

    try {
      const token = this.getToken();
      let url: string;

      if (this.mode === "direct") {
        url = `${this.baseUrl}/api/v4/files/${fileId}/link`;

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
        url = `${this.baseUrl}/files/${fileId}/link`;

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
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(
        `Erreur lors de la création du lien public pour ${fileId}:`,
        typedError,
      );
      throw typedError;
    }
  }

  /**
   * Récupère l'image miniature d'un fichier de manière sécurisée
   */
  async fetchThumbnail(fileId: string): Promise<string> {
    if (!fileId) {
      throw new Error("ID de fichier requis pour récupérer la miniature");
    }

    try {
      const token = this.getToken();
      const baseUrl = this.baseUrl;

      if (this.mode === "direct") {
        const url = `${baseUrl}/api/v4/files/${fileId}/thumbnail`;

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
        this.blobUrlsRef.add(blobUrl);

        return blobUrl;
      } else {
        // Mode proxy - l'authentification est gérée par le proxy
        const url = `${baseUrl}/files/${fileId}/thumbnail?_=${Date.now()}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Erreur lors de la récupération de la miniature: ${response.status}`,
          );
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        this.blobUrlsRef.add(blobUrl);

        return blobUrl;
      }
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(
        `Erreur lors de la récupération de la miniature pour ${fileId}:`,
        typedError,
      );
      throw typedError;
    }
  }

  /**
   * Récupère un fichier complet de manière sécurisée
   */
  async fetchFile(fileId: string): Promise<string> {
    if (!fileId) {
      throw new Error("ID de fichier requis pour récupérer le fichier");
    }

    try {
      const token = this.getToken();
      const baseUrl = this.baseUrl;

      if (this.mode === "direct") {
        const url = `${baseUrl}/api/v4/files/${fileId}`;

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
        this.blobUrlsRef.add(blobUrl);

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
        this.blobUrlsRef.add(blobUrl);

        return blobUrl;
      }
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error(
        `Erreur lors de la récupération du fichier ${fileId}:`,
        typedError,
      );
      throw typedError;
    }
  }

  /**
   * Télécharge des fichiers sur le serveur
   */
  async uploadFiles(formData: FormData): Promise<{
    file_infos: Array<{
      id: string;
      name: string;
      type?: string;
      size?: number;
      url?: string;
    }>;
  }> {
    if (!formData) {
      throw new Error("FormData requis pour télécharger des fichiers");
    }

    try {
      const token = this.getToken();
      let url: string;
      let headers: Record<string, string> = {};

      if (this.mode === "direct") {
        url = `${this.baseUrl}/api/v4/files`;

        if (!token) {
          throw new Error("Token requis pour télécharger des fichiers");
        }

        headers = {
          Authorization: `Bearer ${token}`,
        };
      } else {
        // Mode proxy
        url = `${this.baseUrl}/files`;

        // Pour le mode proxy, ajouter des en-têtes spécifiques si nécessaire
        // Ces en-têtes devraient être fournis par le créateur du service
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Erreur de téléchargement: ${response.status}`,
        );
      }

      return await response.json();
    } catch (error) {
      const typedError = this.errorHandler.handleHttpError(error);
      console.error("Erreur lors du téléchargement des fichiers:", typedError);
      throw typedError;
    }
  }
}

/**
 * Crée un service de gestion des fichiers
 * @param httpClient Client HTTP pour les appels API
 * @param errorHandler Gestionnaire d'erreurs
 * @param baseUrl URL de base du serveur
 * @param mode Mode de fonctionnement (direct, proxy, custom)
 * @param tokenProvider Fonction fournissant le token d'authentification
 * @returns Service de fichiers
 */
export function createFileService(
  httpClient: HttpClient,
  errorHandler: ErrorHandlerInterface,
  baseUrl: string,
  mode: "direct" | "proxy" | "custom",
  tokenProvider?: () => string | null,
): FileServiceInterface {
  return new FileService(
    httpClient,
    errorHandler,
    baseUrl,
    mode,
    tokenProvider,
  );
}

export default {
  FileService,
  createFileService,
};
