// src/services/file.service.ts
import { MattermostService } from "../types";

/**
 * Interface pour les réponses de l'API de lien public
 */
export interface PublicLinkResponse {
  link: string;
}

/**
 * Classe utilitaire pour les opérations liées aux fichiers
 * Fournit des méthodes pour télécharger et créer des liens publics
 */
export class FileService {
  private service: MattermostService;

  constructor(service: MattermostService) {
    this.service = service;
  }

  /**
   * Obtient l'URL de téléchargement pour un fichier
   * @param fileId ID du fichier à télécharger
   * @returns URL de téléchargement
   */
  getDownloadUrl(fileId: string): string {
    const baseUrl = this.service.getBaseUrl();
    return `${baseUrl}/api/v4/files/${fileId}?download=1`;
  }

  /**
   * Télécharge un fichier en ouvrant l'URL dans un nouvel onglet
   * @param fileId ID du fichier à télécharger
   */
  downloadFile(fileId: string): void {
    if (!fileId) {
      throw new Error("File ID is required for download");
    }

    const downloadUrl = this.getDownloadUrl(fileId);
    window.open(downloadUrl, "_blank");
  }

  /**
   * Crée un lien public pour un fichier
   * @param fileId ID du fichier pour lequel créer un lien
   * @returns Promesse avec l'URL du lien public
   */
  async createPublicLink(fileId: string): Promise<string> {
    if (!fileId) {
      throw new Error("File ID is required to create a public link");
    }

    const baseUrl = this.service.getBaseUrl();
    const url = `${baseUrl}/api/v4/files/${fileId}/link`;

    // Utiliser le mode du service pour déterminer la méthode d'appel API
    if (this.service.mode === "direct") {
      // Mode direct: appel direct à l'API
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await this.service.getWebsocketToken()}`, // Utiliser le token comme authorization
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to create public link: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as PublicLinkResponse;
      return data.link;
    } else {
      // Mode proxy: utiliser le service proxy
      // L'implémentation exacte dépend de l'API proxy
      try {
        // Simulation d'un appel proxy
        // Dans une implémentation réelle, vous utiliseriez l'API proxy appropriée
        await new Promise((resolve) => setTimeout(resolve, 500));
        return `${baseUrl}/files/public/${fileId}`;
      } catch (error) {
        throw new Error(`Failed to create public link via proxy: ${error}`);
      }
    }
  }
}

/**
 * Crée une instance du service de fichiers
 * @param service Le service Mattermost à utiliser
 * @returns Une instance du service de fichiers
 */
export const createFileService = (service: MattermostService): FileService => {
  return new FileService(service);
};

export default createFileService;
