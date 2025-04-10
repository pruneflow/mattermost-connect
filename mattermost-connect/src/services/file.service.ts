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

    try {
      // Mode direct: utiliser l'API directe
      if (this.service.mode === "direct") {
        return await this._createPublicLinkDirect(fileId);
      }
      // Mode proxy: utiliser le service proxy
      else {
        return await this._createPublicLinkProxy(fileId);
      }
    } catch (error) {
      console.error("Error creating public link:", error);
      throw error;
    }
  }

  /**
   * Implémentation de la création de lien public en mode direct
   * @param fileId ID du fichier
   * @returns Le lien public créé
   * @private
   */
  private async _createPublicLinkDirect(fileId: string): Promise<string> {
    const baseUrl = this.service.getBaseUrl();
    const url = `${baseUrl}/api/v4/files/${fileId}/link`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await this.service.getWebsocketToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create public link: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as PublicLinkResponse;
    return data.link;
  }

  /**
   * Implémentation de la création de lien public en mode proxy
   * @param fileId ID du fichier
   * @returns Le lien public créé
   * @private
   */
  private async _createPublicLinkProxy(fileId: string): Promise<string> {
    const baseUrl = this.service.getBaseUrl();

    // Simulation d'un appel proxy
    // Dans une implémentation réelle, vous utiliseriez l'API proxy appropriée
    await new Promise((resolve) => setTimeout(resolve, 500));
    return `${baseUrl}/files/public/${fileId}`;
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
